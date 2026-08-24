import React, { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Mail,
  Tag,
  User,
} from "lucide-react";

import axiosClient from "@/lib/axiosClient";
import { selectuser } from "@/Feature/Userslice";
import { useSelector } from "react-redux";
import { useT } from "@/i18n/runtime";
const Applications = [
  {


    _id: "1",
    company: "Tech Corp",
    category: "Software",
    user: { name: "John Doe", email: "john@example.com" },
    createAt: "2024-03-10T12:00:00Z",
    status: "approved",
  },
  {
    _id: "2",
    company: "Health Solutions",
    category: "Healthcare",
    user: { name: "Rahul", email: "jane@example.com" },
    createAt: "2024-03-08T10:30:00Z",
    status: "pending",
  },
  {
    _id: "3",
    company: "EduLearn",
    category: "Education",
    user: { name: "Rahul", email: "alice@example.com" },
    createAt: "2024-03-05T09:15:00Z",
    status: "rejected",
  },
];
type ApplicationStatus = "pending" | "approved" | "rejected";

type FilterStatus = "all" | ApplicationStatus;

type Application = {
  _id: string;
  company: string;
  category: string;
  user: { name: string; email: string };
  createdAt: string;
  status: ApplicationStatus | string;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {

    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};
const UserApplicationsPage = () => {
  const { t } = useT();
  const [searchTerm, setsearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const user=useSelector(selectuser)
  // const [user, setuser] = useState<any>({
  //   name: "Rahul",
  //   email: "xyz@gmail.com",
  //   photo:
  //     "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces",
  // });

const [data, setdata] = useState<any[]>([]);
  useEffect(() => {
    const fetchdata = async () => {
      try {
        const res = await axiosClient.get("/api/application");
        setdata(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.log(error);
      }
    };
    fetchdata();
  }, []);
// Backend /api/application already scopes results to the authenticated user
  // (via req.user.uid from the Firebase token). The returned documents carry
  // `userId` (a firebaseUid), NOT a nested `user` object. Filtering by
  // `app.user?.name` here would always yield zero results, so we use the full
  // server-returned list directly.
  const userapplication = data;
  const filteredapplications = userapplication.filter((application:any) => {
    const searchmatch =
      application.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "all") return searchmatch;
    return searchmatch && application.status.toLowerCase() === filter;
  });
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('applications.myApplications')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('applications.myApplicationsDesc')}
            </p>
          </div>

          {/* Filters and Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setsearchTerm(e.target.value)}
                    placeholder={t('applications.searchPlaceholder')}
                    className="text-black w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Mail className="absolute top-3 left-3 text-gray-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === "all"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t('applications.all')}
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t('applications.pending')}
                </button>
                <button
                  onClick={() => setFilter("approved")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t('applications.approved')}
                </button>
                <button
                  onClick={() => setFilter("rejected")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t('applications.rejected')}
                </button>
              </div>
            </div>
          </div>
          {/* Applications List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t('applications.companyCategory')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t('applications.applicant')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t('applications.appliedDate')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t('applications.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredapplications.map((application:any) => (
                  <tr key={application._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {application.company}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Tag className="h-4 w-4 mr-1" />
                            {application.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
<div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {application.user?.name || user?.name || "You"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.user?.email || user?.email || "Application"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {
                          new Date(application.createdAt)
                            .toISOString()
                            .split("T")[0]
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          application.status
                        )}`}
                      >
                        {application.status}
                      </span>
                    </td>
                   
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserApplicationsPage;
