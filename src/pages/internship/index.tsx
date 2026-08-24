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

type Internship = {
  _id?: string;
  title?: string;
  company?: string;
  startDate?: string;
  duration?: string;
  stipend?: string | number;
  category?: string;
  location?: string;
  workFromHome?: boolean;
  partTime?: boolean;
};

type Filters = {
  category: string;
  location: string;
  workFromHome: boolean;
  partTime: boolean;
  stipend: number;
};

const Index = () => {
  const { t } = useT();

  const [internshipData, setInternshipData] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<
    Internship[]
  >([]);

  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [filter, setFilter] = useState<Filters>({
    category: "",
    location: "",
    workFromHome: false,
    partTime: false,
    stipend: 50,
  });

  // Fetch internships
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/api/internship", {
          skipAuth: true,
        } as any);

        const list = res?.data?.data ?? res?.data ?? [];

        const internships: Internship[] = Array.isArray(list) ? list : [];

        setInternshipData(internships);
        setFilteredInternships(internships);
      } catch (error) {
        console.error("Failed to fetch internships:", error);
        setInternshipData([]);
        setFilteredInternships([]);
      }
    };

    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    const filtered = internshipData.filter((internship) => {
      const category = String(internship.category ?? "").toLowerCase();
      const location = String(internship.location ?? "").toLowerCase();

      const selectedCategory = filter.category.trim().toLowerCase();
      const selectedLocation = filter.location.trim().toLowerCase();

      const matchesCategory = category.includes(selectedCategory);
      const matchesLocation = location.includes(selectedLocation);

      const matchesWorkFromHome =
        !filter.workFromHome || internship.workFromHome === true;

      const matchesPartTime =
        !filter.partTime || internship.partTime === true;

      return (
        matchesCategory &&
        matchesLocation &&
        matchesWorkFromHome &&
        matchesPartTime
      );
    });

    setFilteredInternships(filtered);
  }, [filter, internshipData]);

  // Filter input handler
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;

    setFilter((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilter({
      category: "",
      location: "",
      workFromHome: false,
      partTime: false,
      stipend: 50,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Desktop Filters */}
          <aside className="hidden h-fit w-64 rounded-lg bg-white p-6 shadow-sm md:block">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />

                <span className="font-medium text-black">
                  {t("internship.filters")}
                </span>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t("internship.clearAll")}
              </button>
            </div>

            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("internship.category")}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                  placeholder={t("internship.placeholderCategory")}
                />
              </div>

              {/* Location Filter */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("internship.location")}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                  placeholder={t("internship.placeholderLocation")}
                />
              </div>

              {/* Work Type */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handleFilterChange}
                    className="h-4 w-4 rounded text-blue-600"
                  />

                  <span className="text-gray-700">
                    {t("internship.workFromHome")}
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handleFilterChange}
                    className="h-4 w-4 rounded text-blue-600"
                  />

                  <span className="text-gray-700">
                    {t("internship.partTime")}
                  </span>
                </label>
              </div>

              {/* Stipend */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("internship.monthlyStipend")}
                </label>

                <input
                  type="range"
                  name="stipend"
                  min="0"
                  max="100"
                  value={filter.stipend}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0</span>
                  <span>₹50K</span>
                  <span>₹100K</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Internship Content */}
          <main className="flex-1">
            {/* Mobile Filter Button */}
            <div className="mb-4 md:hidden">
              <button
                type="button"
                onClick={() =>
                  setIsFilterVisible((previous) => !previous)
                }
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-white p-3 text-black shadow-sm"
              >
                <Filter className="h-5 w-5" />

                <span>{t("internship.showFilters")}</span>
              </button>
            </div>

            {/* Result Count */}
            <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
              <p className="text-center font-medium text-black">
                {t("internship.internshipsFound", {
                  values: {
                    count: filteredInternships.length,
                  },
                })}
              </p>
            </div>

            {/* Internship Cards */}
            <div className="space-y-4">
              {filteredInternships.length === 0 ? (
                <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                  <p className="text-gray-500">
                    No internships found.
                  </p>
                </div>
              ) : (
                filteredInternships.map((internship, index) => (
                  <div
                    key={internship._id ?? `internship-${index}`}
                    className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Hiring */}
                    <div className="mb-4 flex items-center space-x-2 text-blue-600">
                      <ArrowUpRight className="h-5 w-5" />

                      <span className="font-medium">
                        {t("internship.activelyHiring")}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="mb-2 text-xl font-bold text-gray-900">
                      {internship.title ?? "Untitled Internship"}
                    </h2>

                    {/* Company */}
                    <p className="mb-4 text-gray-600">
                      {internship.company ?? "Company"}
                    </p>

                    {/* Details */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {/* Start Date */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <PlayCircle className="h-5 w-5 shrink-0" />

                        <div>
                          <p className="text-sm font-medium">
                            {t("internship.startDate")}
                          </p>

                          <p className="text-sm">
                            {internship.startDate ?? "—"}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Pin className="h-5 w-5 shrink-0" />

                        <div>
                          <p className="text-sm font-medium">
                            {t("internship.location")}
                          </p>

                          <p className="text-sm">
                            {internship.location ?? "—"}
                          </p>
                        </div>
                      </div>

                      {/* Stipend */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <DollarSign className="h-5 w-5 shrink-0" />

                        <div>
                          <p className="text-sm font-medium">
                            {t("internship.stipend")}
                          </p>

                          <p className="text-sm">
                            {internship.stipend ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center space-x-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                          {t("home.internship")}
                        </span>

                        <div className="flex items-center space-x-1 text-green-600">
                          <Clock className="h-4 w-4" />

                          <span className="text-sm">
                            {t("internship.postedRecently")}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/detailiternship/${internship._id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {t("home.viewDetails")}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {isFilterVisible && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <div className="ml-auto h-full w-full max-w-sm overflow-y-auto bg-white p-6">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {t("internship.filters")}
              </h2>

              <button
                type="button"
                onClick={() => setIsFilterVisible(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close filters"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("internship.category")}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                  placeholder={t("internship.placeholderCategory")}
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("internship.location")}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                  placeholder={t("internship.placeholderLocation")}
                />
              </div>

              {/* Work Type */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handleFilterChange}
                    className="h-4 w-4 rounded text-blue-600"
                  />

                  <span className="text-gray-700">
                    {t("internship.workFromHome")}
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handleFilterChange}
                    className="h-4 w-4 rounded text-blue-600"
                  />

                  <span className="text-gray-700">
                    {t("internship.partTime")}
                  </span>
                </label>
              </div>

              {/* Stipend */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("internship.monthlyStipend")}
                </label>

                <input
                  type="range"
                  name="stipend"
                  min="0"
                  max="100"
                  value={filter.stipend}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0</span>
                  <span>₹50K</span>
                  <span>₹100K</span>
                </div>
              </div>

              {/* Mobile Apply/Clear */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("internship.clearAll")}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFilterVisible(false)}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;