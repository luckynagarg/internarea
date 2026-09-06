import { login, selectuser } from "@/Feature/Userslice";
import { ExternalLink, Mail, User as UserIcon, Camera, Edit2, Check, X, MapPin, Briefcase, GraduationCap, Calendar } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axiosClient from "@/lib/apiClient";
import { API_URL } from "@/config/api";
import LoginHistory from "@/Components/LoginHistory";
import { useT } from '@/i18n/runtime';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { uploadMedia } from "@/firebase/uploadMedia";
import { toast } from "react-toastify";

interface User {
  name: string;
  email: string;
  photo: string;
  headline?: string;
  location?: string;
  bio?: string;
}

const index = () => {
  const { ready } = useRequireAuth();
  const user = useSelector(selectuser) as any;
  const { t } = useT();
  const [resumes, setResumes] = useState<any[]>([]);
  const [activeApplications, setActiveApplications] = useState(0);
  const [acceptedApplications, setAcceptedApplications] = useState(0);
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headlineValue, setHeadlineValue] = useState("");
  const [savingHeadline, setSavingHeadline] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationValue, setLocationValue] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    async function loadResumes() {
      try {
        const res = await axiosClient.get("/api/resume/my-resumes");
        setResumes(res.data?.data || []);
      } catch (e) {
        // ignore
      }
    }
    loadResumes();
  }, []);

  useEffect(() => {
    async function loadApplicationStats() {
      try {
        const res = await axiosClient.get("/api/application");
        const list = res?.data?.data ?? res?.data ?? [];
        const apps = Array.isArray(list) ? list : [];
        setActiveApplications(apps.length);
        setAcceptedApplications(
          apps.filter(
            (a: any) =>
              a?.status === "accepted" || a?.status === "shortlisted"
          ).length
        );
      } catch (e) {
        // ignore
      }
    }
        loadApplicationStats();
  }, []);

  // Update the user's profile photo:
  // 1) Upload the raw image to Firebase Storage (existing uploadMedia helper).
  // 2) Persist the resulting URL in the user's DB record (backend /api/profile/photo).
  // 3) Mirror the URL into Redux so the avatar refreshes immediately, and it
  //    persists across sign-in/out (also saved to the Firebase user photoURL).
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (jpg, png, gif, webp).");
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadMedia(file, 60000); // 60s timeout for photos
      const photoUrl = result?.mediaUrl;
      if (!photoUrl) throw new Error("Upload did not return a URL.");

      await axiosClient.patch("/api/profile/photo", { photoUrl });

      // Refresh the avatar in Redux (the profile page / navbar read user.photo).
      if (user) {
        dispatch(login({ ...user, photo: photoUrl }));
      }
      toast.success("Profile photo updated successfully!");
    } catch (err: any) {
      toast.error(
        err?.message ||
          err?.response?.data?.message ||
          "Could not update profile photo."
      );
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Save profile field helper
  const saveProfileField = async (field: string, value: string) => {
    try {
      await axiosClient.patch("/api/profile", { [field]: value });
      if (user) {
        dispatch(login({ ...user, [field]: value }));
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSavingName(true);
    try {
      await saveProfileField("name", nameValue.trim());
      toast.success("Name updated successfully!");
      setEditingName(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not update name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveHeadline = async () => {
    setSavingHeadline(true);
    try {
      await saveProfileField("headline", headlineValue.trim());
      toast.success("Headline updated successfully!");
      setEditingHeadline(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not update headline.");
    } finally {
      setSavingHeadline(false);
    }
  };

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      await saveProfileField("location", locationValue.trim());
      toast.success("Location updated successfully!");
      setEditingLocation(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not update location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await saveProfileField("bio", bioValue.trim());
      toast.success("Bio updated successfully!");
      setEditingBio(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not update bio.");
    } finally {
      setSavingBio(false);
    }
  };

  function ResumesList() {
    if (!resumes.length) {
      return <div className="text-gray-500 text-sm">{t('common.noResumes')}</div>;
    }

    return (
      <div className="space-y-3">
        {resumes.map((r) => (
          <div key={r._id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{t('resume.homeTitle')}</div>
              <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            {r.resumePdfPath ? (
              <a
                href={API_URL(`/api/resume/resumes/${r._id}/download`)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {t('common.download')}
              </a>
            ) : (
              <div className="text-xs text-gray-500">{t('common.generating')}</div>
            )}
          </div>
        ))}
      </div>
    );
  }


  if (!ready) return null;

  const startEditName = () => {
    setNameValue(user?.name || "");
    setEditingName(true);
  };

  const startEditHeadline = () => {
    setHeadlineValue(user?.headline || "");
    setEditingHeadline(true);
  };

  const startEditLocation = () => {
    setLocationValue(user?.location || "");
    setEditingLocation(true);
  };

  const startEditBio = () => {
    setBioValue(user?.bio || "");
    setEditingBio(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-40 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600">
            <div className="absolute -bottom-16 left-8">
              <div className="relative">
                {user?.photo ? (
                  <img
                    src={user?.photo}
                    alt={user?.name || "Profile"}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`absolute bottom-1 right-1 flex items-center justify-center w-10 h-10 rounded-full border-3 border-white text-white shadow-lg transition-all ${
                    uploading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 hover:scale-110 cursor-pointer"
                  }`}
                  title="Change profile photo"
                  aria-label="Change profile photo"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-20 pb-8 px-8">
            {/* Name Section */}
            <div className="mb-6">
              {editingName ? (
                <div className="flex items-center gap-3">
                  <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="flex-1 text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none pb-1" placeholder="Enter your name" autoFocus />
                  <button onClick={handleSaveName} disabled={savingName} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors">
                    {savingName ? <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setEditingName(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">{user?.name || "Add Your Name"}</h1>
                  <button onClick={startEditName} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
                </div>
              )}
              <div className="mt-2 flex items-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
            </div>

            {/* Headline Section */}
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700 font-medium"><Briefcase className="w-4 h-4" /><span className="text-sm">Headline</span></div>
                {!editingHeadline && <button onClick={startEditHeadline} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>}
              </div>
              {editingHeadline ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={headlineValue} onChange={(e) => setHeadlineValue(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Software Developer" autoFocus />
                  <button onClick={handleSaveHeadline} disabled={savingHeadline} className="p-2 text-green-600 hover:bg-green-50 rounded-full">{savingHeadline ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}</button>
                  <button onClick={() => setEditingHeadline(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">{user?.headline || "Add a headline to tell people what you do"}</p>
              )}
            </div>

            {/* Location Section */}
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700 font-medium"><MapPin className="w-4 h-4" /><span className="text-sm">Location</span></div>
                {!editingLocation && <button onClick={startEditLocation} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>}
              </div>
              {editingLocation ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={locationValue} onChange={(e) => setLocationValue(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Bangalore, India" autoFocus />
                  <button onClick={handleSaveLocation} disabled={savingLocation} className="p-2 text-green-600 hover:bg-green-50 rounded-full">{savingLocation ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}</button>
                  <button onClick={() => setEditingLocation(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">{user?.location || "Add your location"}</p>
              )}
            </div>

            {/* Bio Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700 font-medium"><GraduationCap className="w-4 h-4" /><span className="text-sm">Bio</span></div>
                {!editingBio && <button onClick={startEditBio} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>}
              </div>
              {editingBio ? (
                <div className="space-y-2">
                  <textarea value={bioValue} onChange={(e) => setBioValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" rows={3} placeholder="Tell people about yourself..." autoFocus />
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={handleSaveBio} disabled={savingBio} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{savingBio ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditingBio(false)} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">{user?.bio || "Add a bio to tell people more about yourself"}</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 text-center border border-blue-200">
                <span className="text-blue-600 font-bold text-3xl">{activeApplications}</span>
                <p className="text-blue-700 text-sm mt-1 font-medium">Active Applications</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 text-center border border-green-200">
                <span className="text-green-600 font-bold text-3xl">{acceptedApplications}</span>
                <p className="text-green-700 text-sm mt-1 font-medium">Accepted</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/userapplication" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                View Applications <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/resume/create" className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 border border-blue-200 transition-colors duration-200">
                Create Resume (₹50) <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/subscription" className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 border border-blue-200 transition-colors duration-200">
                Subscription <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>

            {/* Login History */}
            <div className="mt-10">
              <div className="text-gray-900 font-semibold mb-3 flex items-center gap-2"><Calendar className="w-5 h-5" />Login History</div>
              <div className="text-sm text-gray-500 mb-4">Your recent login activity</div>
              <div className="bg-gray-50 rounded-xl border p-4"><LoginHistory /></div>
            </div>

            {/* Resumes */}
            <div className="mt-8">
              <div className="text-gray-900 font-semibold mb-3">Your Resumes</div>
              <ResumesList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
