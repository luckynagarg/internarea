import axiosClient from "@/lib/apiClient";
import {
  ArrowUpRight,
  Clock,
  DollarSign,
  Filter,
  Pin,
  PlayCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useT } from "@/i18n/runtime";

interface Job {
  _id: string;
  title?: string;
  company?: string;
  location?: string;
  CTC?: string;
  Experience?: string;
  category?: string;
  StartDate?: string;
  aboutCompany?: string;
  aboutJob?: string;
  Whocanapply?: string;
  perks?: string;
  AdditionalInfo?: string;
  numberOfopning?: string | number;

  // Keep these optional because the API may or may not return them.
  workFromHome?: boolean;
  partTime?: boolean;
}

interface JobApiResponse {
  data?: Job[] | { data?: Job[] };
}

const Index = () => {
  const { t } = useT();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState({
    category: "",
    location: "",
    workFromHome: false,
    partTime: false,
    salary: 50,
    experience: "",
  });

  /*
   * Fetch jobs
   */
  useEffect(() => {
    let mounted = true;

    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await axiosClient.get("/api/job", {
          skipAuth: true,
        } as any);

        const responseData = response?.data;

        let jobList: Job[] = [];

        if (Array.isArray(responseData)) {
          jobList = responseData;
        } else if (Array.isArray(responseData?.data)) {
          jobList = responseData.data;
        }

        if (!mounted) return;

        setJobs(jobList);
        setFilteredJobs(jobList);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);

        if (!mounted) return;

        setJobs([]);
        setFilteredJobs([]);
        setError("Failed to load jobs.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Apply filters
   */
  useEffect(() => {
    const categoryFilter = filter.category.trim().toLowerCase();
    const locationFilter = filter.location.trim().toLowerCase();
    const experienceFilter = filter.experience.trim().toLowerCase();

    const result = jobs.filter((job) => {
      const category = String(job.category ?? "").toLowerCase();
      const location = String(job.location ?? "").toLowerCase();
      const experience = String(job.Experience ?? "").toLowerCase();

      /*
       * Category
       */
      const matchesCategory =
        categoryFilter === "" || category.includes(categoryFilter);

      /*
       * Location
       */
      const matchesLocation =
        locationFilter === "" || location.includes(locationFilter);

      /*
       * Experience
       */
      const matchesExperience =
        experienceFilter === "" ||
        experience.includes(experienceFilter);

      /*
       * Work from home
       *
       * Only apply this filter when the backend provides
       * a boolean workFromHome field.
       */
      const matchesWorkFromHome =
        !filter.workFromHome || job.workFromHome === true;

      /*
       * Part time
       *
       * Only apply this filter when the backend provides
       * a boolean partTime field.
       */
      const matchesPartTime =
        !filter.partTime || job.partTime === true;

      return (
        matchesCategory &&
        matchesLocation &&
        matchesExperience &&
        matchesWorkFromHome &&
        matchesPartTime
      );
    });

    setFilteredJobs(result);
  }, [jobs, filter]);

  /*
   * Filter input handler
   */
  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = event.target;

    setFilter((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /*
   * Clear filters
   */
  const clearFilters = () => {
    setFilter({
      category: "",
      location: "",
      workFromHome: false,
      partTime: false,
      salary: 50,
      experience: "",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">

          {/* =========================
              DESKTOP FILTER SIDEBAR
          ========================== */}
          <div className="hidden md:block w-64 bg-white rounded-lg shadow-sm p-6 h-fit">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />

                <span className="font-medium text-black">
                  {t("job.filters")}
                </span>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t("job.clearAll")}
              </button>
            </div>

            <div className="space-y-6">

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.category")}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t("job.placeholderCategory")}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.location")}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t("job.placeholderLocation")}
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.experience")}
                </label>

                <input
                  type="text"
                  name="experience"
                  value={filter.experience}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t("job.placeholderExperience")}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    {t("job.workFromHome")}
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    {t("job.partTime")}
                  </span>
                </label>
              </div>

              {/* Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.annualSalary")}
                </label>

                <input
                  type="range"
                  name="salary"
                  min="0"
                  max="100"
                  value={filter.salary}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0L</span>
                  <span>₹50L</span>
                  <span>₹100L</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              JOB LIST
          ========================== */}
          <div className="flex-1">

            {/* Mobile filter button */}
            <div className="md:hidden mb-4">
              <button
                type="button"
                onClick={() => setIsFilterVisible(true)}
                className="w-full flex items-center justify-center space-x-2 bg-white p-3 rounded-lg shadow-sm text-black"
              >
                <Filter className="h-5 w-5" />

                <span>
                  {t("job.showFilters")}
                </span>
              </button>
            </div>

            {/* Jobs found */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <p className="text-center font-medium text-black">
                {t("job.jobsFound", {
                  values: {
                    count: filteredJobs.length,
                  },
                })}
              </p>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">
                  Loading jobs...
                </p>
              </div>
            )}

            {/* Error */}
            {!isLoading && error && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-red-600 mb-4">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading &&
              !error &&
              filteredJobs.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-gray-600">
                    No jobs found matching your filters.
                  </p>
                </div>
              )}

            {/* Job cards */}
            {!isLoading &&
              !error &&
              filteredJobs.length > 0 && (
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <div
                      key={job._id}
                      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      {/* Hiring */}
                      <div className="flex items-center space-x-2 text-blue-600 mb-4">
                        <ArrowUpRight className="h-5 w-5" />

                        <span className="font-medium">
                          {t("job.activelyHiring")}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {job.title || "Untitled Job"}
                      </h2>

                      {/* Company */}
                      <p className="text-gray-600 mb-4">
                        {job.company || "Company"}
                      </p>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

                        {/* Category */}
                        <div className="flex items-center space-x-2 text-gray-600">
                          <PlayCircle className="h-5 w-5 shrink-0" />

                          <div>
                            <p className="text-sm font-medium">
                              {t("job.categoryLabel")}
                            </p>

                            <p className="text-sm">
                              {job.category || "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Pin className="h-5 w-5 shrink-0" />

                          <div>
                            <p className="text-sm font-medium">
                              {t("job.location")}
                            </p>

                            <p className="text-sm">
                              {job.location || "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* CTC */}
                        <div className="flex items-center space-x-2 text-gray-600">
                          <DollarSign className="h-5 w-5 shrink-0" />

                          <div>
                            <p className="text-sm font-medium">
                              {t("job.ctc")}
                            </p>

                            <p className="text-sm">
                              {job.CTC || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            {t("home.jobs")}
                          </span>

                          <div className="flex items-center space-x-1 text-green-600">
                            <Clock className="h-4 w-4" />

                            <span className="text-sm">
                              {t("job.postedRecently")}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/detailjob/${job._id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                        >
                          {t("home.viewDetails")}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* =========================
          MOBILE FILTER MODAL
      ========================== */}
      {isFilterVisible && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden">
          <div className="bg-white h-full w-full max-w-sm ml-auto p-6 overflow-y-auto">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {t("job.filters")}
              </h2>

              <button
                type="button"
                onClick={() => setIsFilterVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.category")}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t("job.placeholderCategory")}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.location")}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t("job.placeholderLocation")}
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.experience")}
                </label>

                <input
                  type="text"
                  name="experience"
                  value={filter.experience}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t("job.placeholderExperience")}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    {t("job.workFromHome")}
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    {t("job.partTime")}
                  </span>
                </label>
              </div>

              {/* Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("job.annualSalary")}
                </label>

                <input
                  type="range"
                  name="salary"
                  min="0"
                  max="100"
                  value={filter.salary}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0L</span>
                  <span>₹50L</span>
                  <span>₹100L</span>
                </div>
              </div>

              {/* Apply */}
              <button
                type="button"
                onClick={() => setIsFilterVisible(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Apply Filters
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={clearFilters}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                {t("job.clearAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;