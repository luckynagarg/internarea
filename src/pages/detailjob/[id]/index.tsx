import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Book,
  Clock,
  DollarSign,
  MapPin,
  X,
} from "lucide-react";
import axiosClient from "@/lib/apiClient";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useT } from "@/i18n/runtime";
const filteredJobs = [
    {
      _id: "101",
      title: "Frontend Developer",
      company: "Amazon",
      location: "Seattle",
      CTC: "$100K/year",
      Experience: "2+ years",
      category: "Engineering",
      StartDate: "April 1, 2025",
      aboutCompany:
        "Amazon is a global leader in e-commerce and cloud computing, providing cutting-edge technology solutions.",
      aboutJob:
        "Seeking a skilled Frontend Developer proficient in React.js, JavaScript, and UI development.",
      Whocanapply:
        "Developers with experience in JavaScript, React.js, and modern frontend frameworks.",
      perks:
        "Remote work, stock options, health insurance, learning resources.",
      AdditionalInfo: "This role is hybrid with occasional onsite meetings.",
      numberOfopning: "3",
    },
    {
      _id: "102",
      title: "Data Analyst",
      company: "Microsoft",
      location: "Remote",
      CTC: "$90K/year",
      Experience: "1+ years",
      category: "Data Science",
      StartDate: "March 15, 2025",
      aboutCompany:
        "Microsoft is a technology company specializing in software development, cloud computing, and AI.",
      aboutJob:
        "Looking for a Data Analyst with expertise in SQL, Python, and data visualization tools.",
      Whocanapply:
        "Candidates with experience in data analytics, SQL, Python, and Tableau/Power BI.",
      perks: "Flexible hours, remote work, upskilling programs, bonuses.",
      AdditionalInfo: "This is a fully remote role.",
      numberOfopning: "2",
    },
    {
      _id: "103",
      title: "UX Designer",
      company: "Apple",
      location: "California",
      CTC: "$110K/year",
      Experience: "3+ years",
      category: "Design",
      StartDate: "March 30, 2025",
      aboutCompany:
        "Apple is a leader in consumer electronics and software, focusing on design and innovation.",
      aboutJob:
        "Seeking a UX Designer to craft intuitive user experiences for our next-generation products.",
      Whocanapply:
        "Designers with experience in Figma, Adobe XD, user research, and usability testing.",
      perks:
        "Creative environment, free lunches, fitness perks, flexible hours.",
      AdditionalInfo: "Office-based with occasional remote work options.",
      numberOfopning: "1",
    },
    {
      _id: "104",
      title: "Backend Developer",
      company: "NextGen Solutions",
      location: "Austin, TX",
      CTC: "$90,000 - $110,000",
      Experience: "3-5 years",
      category: "Engineering",
      StartDate: "March 20, 2025",
      aboutCompany:
        "NextGen Solutions specializes in building scalable backend systems and APIs for high-performance applications.",
      aboutJob:
        "Looking for a Backend Developer skilled in Node.js, Express.js, and database management.",
      Whocanapply:
        "Developers with experience in server-side programming, databases (SQL, NoSQL), and RESTful APIs.",
      perks: "Stock options, remote work, gym membership, yearly bonuses.",
      AdditionalInfo: "Hybrid role with 2 days of in-office meetings per week.",
      numberOfopning: "3",
    },
    {
      _id: "105",
      title: "UI/UX Designer",
      company: "Design Pro",
      location: "San Francisco, CA",
      CTC: "$70,000 - $85,000",
      Experience: "2+ years",
      category: "Design",
      StartDate: "March 25, 2025",
      aboutCompany:
        "Design Pro is an award-winning UI/UX design agency focusing on innovative user experiences.",
      aboutJob:
        "We need a UI/UX Designer who can create user-friendly interfaces and improve the user experience of our applications.",
      Whocanapply:
        "Designers with proficiency in Figma, Adobe XD, and user research methodologies.",
      perks:
        "Creative workspace, wellness programs, free team lunches, flexible hours.",
      AdditionalInfo: "Office-based with flexible working hours.",
      numberOfopning: "1",
    },
  ];
const index = () => {
  const user=useSelector(selectuser)
  const { t } = useT();
  const router = useRouter();
  const { id } = router.query;
  const [jobdata, setjob] = useState<any>([]);
useEffect(() => {
    const fetchdata = async () => {
      try {
        const res = await axiosClient.get(`/api/job/${id}`, { skipAuth: true } as any);
        const data = res?.data?.data ?? res?.data;
        setjob(data || []);

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

  if (!jobdata) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  const handlesubmitapplication = async () => {
    if (!coverLetter.trim()) {
      toast.error(t('job.coverLetterRequired'));
      return;
    }
    if (!availability) {
      toast.error(t('job.availabilityRequired'));
      return;
    }
    if (quota && quota.remainingApplications <= 0) {
      toast.error(t('subscription.upgradeInfo'));
      return;
    }
    try {
      const applicationdata = {
        category: jobdata.category,
        company: jobdata.company,
        coverLetter: coverLetter,
        // Ownership/user identity is derived from the Firebase token on backend.
        Application: id,
        availability,
      };
await axiosClient.post("/api/application", applicationdata);

      toast.success(t('job.applicationSubmitted'));
      router.push("/job");
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || t('errors.generic');
      if (status === 403) {
        toast.error(t('subscription.upgradeInfo'));
      } else {
        toast.error(msg);
      }
      console.error(error);
    }
  };
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2 text-blue-600 mb-4">
            <ArrowUpRight className="h-5 w-5" />
            <span className="font-medium">{t('job.activelyHiring')}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {jobdata.title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{jobdata.company}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{jobdata.location}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="h-5 w-5" />
              <span>{t('job.ctc')} {jobdata.CTC}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Book className="h-5 w-5" />
              <span>{jobdata.category}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-green-500 text-sm">
              {t('job.postedOn', { values: { date: jobdata.createAt } })}
            </span>
          </div>
        </div>
        {/* Company Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('job.about', { values: { company: jobdata.company } })}
          </h2>
<div className="flex items-center space-x-2 mb-4">
            <span className="text-gray-500">{t('job.companyProfile')}</span>
          </div>
          <p className="text-gray-600">{jobdata.aboutCompany}</p>
        </div>
        {/* Internship Details Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('postInternship.aboutInternship')}
          </h2>
          <p className="text-gray-600 mb-6">{jobdata.aboutJob}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('postJob.whoCanApply')}
          </h3>
          <p className="text-gray-600 mb-6">{jobdata.whoCanApply}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('postJob.perks')}</h3>
          <p className="text-gray-600 mb-6">{jobdata.perks}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('postJob.additionalInfo')}
          </h3>
          <p className="text-gray-600 mb-6">{jobdata.AdditionalInfo}</p>
        </div>
        {/* Apply Button */}
        <div className="p-6 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-150"
          >
            {t('job.applyNow')}
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
                  {t('job.applyTo', { values: { company: jobdata.company } })}
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
              {/* Resume Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('job.yourResume')}
                </h3>
                <p className="text-gray-600">
                  {t('job.resumeSubmitHint')}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('job.coverLetter')}
                </h3>
                <p className="text-gray-600 mb-2">
                  {t('job.coverLetterPrompt')}
                </p>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder={t('job.coverLetterPlaceholder')}
                ></textarea>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('job.yourAvailability')}
                </h3>
                <div className="space-y-3">
                  {[
                    { value: "Yes, I am available to join immediately", label: t('job.availabilityOption1') },
                    { value: "No, I am currently on notice period", label: t('job.availabilityOption2') },
                    { value: "No, I will have to serve notice period", label: t('job.availabilityOption3') },
                    { value: "Other", label: t('job.availabilityOption4') },
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
                  <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    onClick={handlesubmitapplication}
                  >
                    {t('job.submitApplication')}
                  </button>
                ) : (
<Link
                    href={`/signup`}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {t('job.signupToApply')}
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