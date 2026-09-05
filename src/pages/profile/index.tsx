import { login, selectuser } from "@/Feature/Userslice";
import { ExternalLink, Mail, User as UserIcon, Camera } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
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
}

const index = () => {
  const { ready } = useRequireAuth();
  const user = useSelector(selectuser);
  const { t } = useT();
  const [resumes, setResumes] = useState<any[]>([]);
  const [activeApplications, setActiveApplications] = useState(0);
  const [acceptedApplications, setAcceptedApplications] = useState(0);
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);

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
      toast.error("Please select a valid image file (jpg, png, gif, ...).");
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    e.target.value = ""; // reset so the same file can be selected again
    try {
      const result = await uploadMedia(file);
      const photoUrl = result?.mediaUrl;
      if (!photoUrl) throw new Error("Upload did not return a URL.");

      await axiosClient.patch("/api/profile/photo", { photoUrl });

      // Refresh the avatar in Redux (the profile page / navbar read user.photo).
      if (user) {
        dispatch(login({ ...user, photo: photoUrl }));
      }
      toast.success("Profile photo updated.");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Could not update profile photo."
      );
    } finally {
      setUploading(false);
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
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 relative">
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt={user?.name || "Profile"}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <label
                htmlFor="profile-photo-input"
                className={`absolute bottom-0 right-0 flex items-center justify-center w-7 h-7 rounded-full border-2 border-white bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Upload profile photo"
                aria-label="Upload profile photo"
              >
                <Camera className="h-4 w-4" />
              </label>
              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={handlePhotoUpload}
              />
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 pb-8 px-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <div className="mt-2 flex items-center justify-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <span className="text-blue-600 font-semibold text-2xl">{activeApplications}</span>
                  <p className="text-blue-600 text-sm mt-1">{t('profile.activeApplications')}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">{acceptedApplications}</span>
                  <p className="text-green-600 text-sm mt-1">{t('profile.acceptedApplications')}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {t('profile.viewApplications')}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="/resume/create"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 border border-blue-200 transition-colors duration-200"
                >
                  {t('resume.createTitle')} (₹50)
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="/subscription"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 border border-blue-200 transition-colors duration-200"
                >
                  {t('subscription.title')}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>

              {/* Login History */}
              <div className="mt-10">
                <div className="text-gray-900 font-semibold mb-3">{t('loginHistory.title')}</div>
                <div className="text-sm text-gray-500 mb-4">{t('loginHistory.desc')}</div>
                <div className="bg-white rounded-xl border p-4">
                  <LoginHistory />
                </div>
              </div>

              {/* Resumes */}
              <div className="mt-8">
                <div className="text-gray-900 font-semibold mb-3">{t('profile.yourResumes')}</div>
                <ResumesList />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
