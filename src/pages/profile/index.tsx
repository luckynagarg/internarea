import { selectuser } from "@/Feature/Userslice";
import { ExternalLink, Mail, User as UserIcon } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

interface User {
  name: string;
  email: string;
  photo: string;
}

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://intern-backend-4dlt.onrender.com";


const index = () => {
  // const [user, setuser] = useState<User | null>({
  //   name: "Rahul",
  //   email: "xyz@gmail.com",
  //   photo:
  //     "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces",
  // });
  const user=useSelector(selectuser)
  const [resumes, setResumes] = useState<any[]>([]);

  useEffect(() => {
    async function loadResumes() {
      try {
        const res = await axios.get(`${BACKEND_BASE}/api/resume/my-resumes`);
setResumes(res.data?.data || []);
      } catch (e) {
        // ignore
      }
    }
    loadResumes();
  }, []);

  function ResumesList() {
    if (!resumes.length) {
      return <div className="text-gray-500 text-sm">No resumes created yet.</div>;
    }

    return (
      <div className="space-y-3">
        {resumes.map((r) => (
          <div key={r._id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Resume</div>
              <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            {r.resumePdfPath ? (
              <a
                href={`${BACKEND_BASE}/api/resume/resumes/${r._id}/download`}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Download
              </a>
            ) : (
              <div className="text-xs text-gray-500">Generating...</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt={user?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
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
                  <span className="text-blue-600 font-semibold text-2xl">0</span>
                  <p className="text-blue-600 text-sm mt-1">Active Applications</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">0</span>
                  <p className="text-green-600 text-sm mt-1">Accepted Applications</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  View Applications
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="/resume/create"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 border border-blue-200 transition-colors duration-200"
                >
                  Create Resume (₹50)
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="/subscription"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 border border-blue-200 transition-colors duration-200"
                >
                  Subscription & Billing
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
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
    </div>
  );
};

export default index;

