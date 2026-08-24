import { selectuser } from "@/Feature/Userslice";
import axiosClient from "@/lib/apiClient";
import {
  ArrowUpRight,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useT } from "@/i18n/runtime";
// export const internships = [
//   {
//     _id: "1",
//     title: "Frontend Developer Intern",
//     company: "Tech Innovators",
//     location: "Remote",
//     stipend: "$500/month",
//     Duration: "3 Months",
//     StartDate: "March 15, 2026",
//     aboutCompany:
//       "Tech Innovators is a leading software development company specializing in modern web applications.",
//     aboutJob:
//       "As a Frontend Developer Intern, you will work on real-world projects using React.js and Tailwind CSS.",
//     Whocanapply:
//       "Students and fresh graduates with knowledge of HTML, CSS, JavaScript, and React.js.",
//     perks: "Certificate, Letter of Recommendation, Flexible Work Hours",
//     AdditionalInfo: "This is a remote internship with flexible working hours.",
//     numberOfopning: "2",
//   },
//   {
//     _id: "2",
//     title: "Backend Developer Intern",
//     company: "Cloud Systems",
//     location: "San Francisco",
//     stipend: "$800/month",
//     Duration: "4 Months",
//     StartDate: "April 1, 2025",
//     aboutCompany:
//       "Cloud Systems focuses on scalable backend solutions and cloud-based applications.",
//     aboutJob:
//       "As a Backend Developer Intern, you will work with Node.js, Express, and MongoDB.",
//     Whocanapply:
//       "Students with experience in backend technologies and databases.",
//     perks: "Certificate, Networking Opportunities, Paid Internship",
//     AdditionalInfo: "A strong foundation in databases is required.",
//     numberOfopning: "3",
//   },
//   {
//     _id: "3",
//     title: "UI/UX Designer Intern",
//     company: "Creative Minds",
//     location: "New York",
//     stipend: "$600/month",
//     Duration: "6 Months",
//     StartDate: "May 10, 2025",
//     aboutCompany:
//       "Creative Minds is a design agency focused on user experience and interface design.",
//     aboutJob:
//       "As a UI/UX Designer Intern, you will work with Figma, Adobe XD, and design systems.",
//     Whocanapply:
//       "Students passionate about designing intuitive user experiences.",
//     perks: "Mentorship, Hands-on Projects, Letter of Recommendation",
//     AdditionalInfo: "A portfolio is required for application.",
//     numberOfopning: "1",
//   },
// ];

const index = () => {
  const router = useRouter();
  const { t } = useT();
  const { id } = router.query;
  const [internshipData, setinternship] = useState<any>(null);

useEffect(() => {
    const fetchdata = async () => {
      try {
        const res = await axiosClient.get(`/api/internship/${id}`, { skipAuth: true } as any);
        const data = res?.data?.data ?? res?.data;
        setinternship(data || null);
      } catch (error) {
        console.log(error);
      }
    };

    fetchdata();
  }, [id]);

const [availability, setAvailability] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [quota, setQuota] = useState<any>(null);
  const user=useSelector(selectuser)

useEffect(() => {
    if (user) {
      (async () => {
        try {
          const res = await axiosClient.get("/api/subscription/me");
          setQuota(res.data?.data);
        } catch (e) {
          console.log(e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (internshipData === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  const handlesubmitapplication=async()=>{
    if(!coverLetter.trim()){
      toast.error(t('internship.coverLetterRequired'))
      return
    }
    if(!availability){
      toast.error(t('internship.availabilityRequired'))
      return
    }
    if (quota && quota.remainingApplications <= 0) {
      toast.error(t('subscription.upgradeInfo'))
      return;
    }
    try {
const applicationdata={
        category:internshipData.category,
        company:internshipData.company,
        coverLetter:coverLetter,
        // Ownership/user identity must be derived from JWT/Firebase token on backend.
        // Do NOT send `user` from the client.
        Application:id,
        availability
      }
await axiosClient.post("/api/application", applicationdata);
      toast.success(t('internship.applicationSubmitted'))
      router.push('/internship')

    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || t('errors.generic');
      if (status === 403) {
        toast.error(t('subscription.upgradeInfo'));
      } else {
        toast.error(msg);
      }
      console.error(error)
    }
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2 text-blue-600 mb-4">
            <ArrowUpRight className="h-5 w-5" />
            <span className="font-medium">{t('internship.activelyHiring')}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {internshipData.title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{internshipData.company}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{internshipData.location}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="h-5 w-5" />
              <span>{internshipData.stipend}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <span>{internshipData.startDate}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-green-500 text-sm">
              {t('internship.postedOn', { values: { date: internshipData.createdAt } })}
            </span>
          </div>
        </div>
        {/* Company Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('internship.about', { values: { company: internshipData.company } })}
          </h2>
<div className="flex items-center space-x-2 mb-4">
            <span className="text-gray-500">{t('internship.companyProfile')}</span>
          </div>
          <p className="text-gray-600">{internshipData.aboutCompany}</p>
        </div>
        {/* Internship Details Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('postInternship.aboutInternship')}
          </h2>
          <p className="text-gray-600 mb-6">{internshipData.aboutInternship}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('postInternship.whoCanApply')}
          </h3>
          <p className="text-gray-600 mb-6">{internshipData.whoCanApply}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('postInternship.perks')}</h3>
          <p className="text-gray-600 mb-6">{internshipData.perks}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('postInternship.additionalInfo')}
          </h3>
          <p className="text-gray-600 mb-6">{internshipData.additionalInfo}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('postInternship.numberOfOpenings')}
          </h3>
          <p className="text-gray-600">{internshipData.numberOfOpening}</p>
        </div>
        {/* Apply Button */}
        <div className="p-6 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-150"
          >
            {t('internship.applyNow')}
          </button>
        </div>
      </div>
      {/* Apply Modal */}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('internship.applyTo', { values: { company: internshipData.company } })}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Quota banner */}
              {user && quota && (
                <div className={`rounded-lg p-4 ${(quota.remainingApplications ?? 0) <= 0 ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {quota.planName} {t('subscription.plan')} • {(quota.remainingApplications ?? 0) <= 0 ? t('subscription.noApplicationsRemaining') : `${quota.remainingApplications} ${t('subscription.applicationsRemainingText')}`}
                      </div>
                      {quota.remainingApplications === Number.POSITIVE_INFINITY ? (
                        <div className="text-xs text-gray-600">{t('internship.unlimitedApplications')}</div>
                      ) : (
                        <div className="text-xs text-gray-600">
                          {quota.monthlyLimit === Number.POSITIVE_INFINITY ? t('subscription.unlimited') : t('internship.usedOfTotal', { values: { used: quota.applicationsUsed, total: quota.monthlyLimit } })}
                        </div>
                      )}
                    </div>
                    {(quota.remainingApplications ?? 0) <= 0 && (
                      <Link
                        href="/subscription"
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        {t('subscription.upgradeNow')}
                      </Link>
                    )}
                  </div>
                </div>
              )}
              {/* Resume Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('internship.yourResume')}
                </h3>
                <p className="text-gray-600">
                  {t('internship.resumeSubmitHint')}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('internship.coverLetter')}
                </h3>
                <p className="text-gray-600 mb-2">
                  {t('internship.coverLetterPrompt')}
                </p>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder={t('internship.coverLetterPlaceholder')}
                ></textarea>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('internship.yourAvailability')}
                </h3>
                <div className="space-y-3">
                  {[
                    { value: "Yes, I am available to join immediately", label: t('internship.availabilityOption1') },
                    { value: "No, I am currently on notice period", label: t('internship.availabilityOption2') },
                    { value: "No, I will have to serve notice period", label: t('internship.availabilityOption3') },
                    { value: "Other", label: t('internship.availabilityOption4') },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name=""
                        id=""
                        value={option.value}
                        checked={availability === option.value}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                {user ? (
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700" onClick={handlesubmitapplication}>
                    {t('internship.submitApplication')}
                  </button>
                ) : (
<Link
                    href={`/signup`}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {t('internship.signupToApply')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default index;