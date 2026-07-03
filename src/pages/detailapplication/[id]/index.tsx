import axios from "axios";
import { Building2, Calendar, FileText, Loader2, User } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setloading] = useState(false);
  const [data, setdata] = useState<any>([]);
  useEffect(() => {
    const fetchdata = async () => {
      try {
        setloading(true);
        const res = await axios.get(
          `https://internshala-clone-y2p2.onrender.com/api/application/${id}`
        );
        console.log(res.data);
        setdata(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    if (id) {
      fetchdata();
    }
  }, [id]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          Loading application details...
        </span>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <section key={data._id} className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Section */}
            <div className="relative">
              <img
                alt="Applicant photo"
                className="w-full h-full object-cover"
                src={data?.user?.photo}
              />
              {data.status && (
                <div
                  className={`absolute top-4 right-4 px-4 py-2 rounded-full ${
                    data.status === "accepted"
                      ? "bg-green-100 text-green-600"
                      : data.status === "rejected"
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  <span className="font-semibold capitalize">
                    {data.status}
                  </span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-sm font-medium text-gray-500">Company</h2>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {data.company}
                </h1>
              </div>

              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-sm font-medium text-gray-500">
                    Cover Letter
                  </h2>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {data.coverLetter}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-500">
                      Application Date
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {new Date(data.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <User className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-500">
                      Applied By
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {data.user?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default index;
