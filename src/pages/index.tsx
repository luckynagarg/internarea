"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import {
  ArrowUpRight,
  Banknote,
  Calendar,
  ChevronRight,
  MapPin,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/router";
import axiosClient from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useT } from "@/i18n";

export default function SvgSlider() {
  const { t } = useT();
  const router = useRouter();

  // Redirect already-authenticated users to the dashboard so the public
  // marketing/home feed isn't shown after a successful login.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard");
    });
    return () => unsub();
  }, [router]);

  /*
   * IMPORTANT:
   * Keep the actual category values in English because the backend
   * may store categories in English.
   *
   * Only the displayed label is translated.
   */
  const categories = [
    {
      value: "Big Brands",
      label: t("home.categories.bigBrands"),
    },
    {
      value: "Work From Home",
      label: t("home.categories.workFromHome"),
    },
    {
      value: "Part-time",
      label: t("home.categories.partTime"),
    },
    {
      value: "MBA",
      label: t("home.categories.mba"),
    },
    {
      value: "Engineering",
      label: t("home.categories.engineering"),
    },
    {
      value: "Media",
      label: t("home.categories.media"),
    },
    {
      value: "Design",
      label: t("home.categories.design"),
    },
    {
      value: "Data Science",
      label: t("home.categories.dataScience"),
    },
  ];

  /*
   * Slider text comes directly from the translation dictionary.
   */
  const slides = [
    {
      pattern: "pattern-1",
      title: t("home.slide1"),
      bgColor: "bg-indigo-600",
    },
    {
      pattern: "pattern-2",
      title: t("home.slide2"),
      bgColor: "bg-blue-600",
    },
    {
      pattern: "pattern-3",
      title: t("home.slide3"),
      bgColor: "bg-purple-600",
    },
    {
      pattern: "pattern-4",
      title: t("home.slide4"),
      bgColor: "bg-teal-600",
    },
  ];

  /*
   * Statistics.
   * Numbers stay the same; only labels are translated.
   */
  const stats = [
    {
      number: "300K+",
      label: t("home.statCompanies"),
    },
    {
      number: "10K+",
      label: t("home.newOpenings"),
    },
    {
      number: "21Mn+",
      label: t("home.activeStudents"),
    },
    {
      number: "600K+",
      label: t("home.learners"),
    },
  ];

  const [internships, setInternships] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [internshipRes, jobRes] = await Promise.all([
          axiosClient.get("/api/internship", {
            skipAuth: true,
          } as any),

          axiosClient.get("/api/job", {
            skipAuth: true,
          } as any),
        ]);

        const internshipData =
          internshipRes?.data?.data ?? internshipRes?.data ?? [];

        const jobData =
          jobRes?.data?.data ?? jobRes?.data ?? [];

        setInternships(
          Array.isArray(internshipData) ? internshipData : []
        );

        setJobs(
          Array.isArray(jobData) ? jobData : []
        );
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  /*
   * IMPORTANT:
   * Filtering still uses the backend's original category value.
   * The displayed category is translated separately.
   */
  const filteredInternships = internships.filter(
    (item: any) =>
      !selectedCategory || item.category === selectedCategory
  );

  const filteredJobs = jobs.filter(
    (item: any) =>
      !selectedCategory || item.category === selectedCategory
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <div className="text-center mb-12">

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t("home.heroTitle")}
        </h1>

        <p className="text-xl text-gray-600">
          {t("home.heroTrending")}
        </p>

      </div>

      {/* =========================================================
          SWIPER / HERO SLIDER
      ========================================================= */}
      <div className="mb-16">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000 }}
          className="rounded-xl overflow-hidden shadow-lg"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index}>
              <div
                className={`relative h-[400px] ${slide.bgColor}`}
              >

                {/* SVG Pattern Background */}
                <div className="absolute inset-0 opacity-20">
                  <svg
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >

                    {slide.pattern === "pattern-1" && (
                      <pattern
                        id="pattern-1"
                        x="0"
                        y="0"
                        width="20"
                        height="20"
                        patternUnits="userSpaceOnUse"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="3"
                          fill="white"
                        />
                      </pattern>
                    )}

                    {slide.pattern === "pattern-2" && (
                      <pattern
                        id="pattern-2"
                        x="0"
                        y="0"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect
                          x="15"
                          y="15"
                          width="10"
                          height="10"
                          fill="white"
                        />
                      </pattern>
                    )}

                    {slide.pattern === "pattern-3" && (
                      <pattern
                        id="pattern-3"
                        x="0"
                        y="0"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M0 20 L20 0 L40 20 L20 40 Z"
                          fill="white"
                        />
                      </pattern>
                    )}

                    {slide.pattern === "pattern-4" && (
                      <pattern
                        id="pattern-4"
                        x="0"
                        y="0"
                        width="60"
                        height="60"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M30 5 L55 30 L30 55 L5 30 Z"
                          fill="white"
                        />
                      </pattern>
                    )}

                    <rect
                      x="0"
                      y="0"
                      width="100%"
                      height="100%"
                      fill={`url(#${slide.pattern})`}
                    />

                  </svg>
                </div>

                {/* Slide Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="text-4xl font-bold text-white text-center px-6">
                    {slide.title}
                  </h2>
                </div>

              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* =========================================================
          INTERNSHIP / CATEGORY SECTION
      ========================================================= */}
      <div className="mb-12">

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t("home.latestInternships")}
        </h2>

        <div className="flex flex-wrap gap-4">

          <span className="text-gray-700 font-medium">
            {t("home.popularCategories")}
          </span>

          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category.value
                    ? ""
                    : category.value
                )
              }
              className={`px-4 py-2 rounded-full transition-colors ${
                selectedCategory === category.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category.label}
            </button>
          ))}

        </div>
      </div>

      {/* =========================================================
          INTERNSHIP GRID
      ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">

        {filteredInternships.map(
          (internship: any, index: number) => (
            <div
              key={internship._id ?? index}
              className="bg-white rounded-lg shadow-md p-6 transition-transform hover:transform hover:scale-105"
            >

              {/* Hiring Status */}
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <ArrowUpRight size={20} />

                <span className="font-medium">
                  {t("home.activelyHiring")}
                </span>
              </div>

              {/* Internship Title */}
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {internship.title}
              </h3>

              {/* Company */}
              <p className="text-gray-500 mb-4">
                {internship.company}
              </p>

              {/* Internship Details */}
              <div className="space-y-3 text-gray-600">

                <div className="flex items-center gap-2">
                  <MapPin size={18} />

                  <span>
                    {internship.location}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Banknote size={18} />

                  <span>
                    {internship.stipend}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={18} />

                  <span>
                    {internship.duration}
                  </span>
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between mt-6">

                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {t("home.internship")}
                </span>

                <Link
                  href={`/detailinternship/${internship._id}`}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {t("home.viewDetails")}

                  <ChevronRight size={16} />
                </Link>

              </div>

            </div>
          )
        )}

      </div>

      {/* =========================================================
          JOBS SECTION
      ========================================================= */}
      <div className="mb-12">

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t("home.latestJobs")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">

          {filteredJobs.map(
            (job: any, index: number) => (
              <div
                key={job._id ?? index}
                className="bg-white rounded-lg shadow-md p-6 transition-transform hover:transform hover:scale-105"
              >

                {/* Hiring Status */}
                <div className="flex items-center gap-2 text-blue-600 mb-4">

                  <ArrowUpRight size={20} />

                  <span className="font-medium">
                    {t("home.activelyHiring")}
                  </span>

                </div>

                {/* Job Title */}
                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                  {job.title}
                </h3>

                {/* Company */}
                <p className="text-gray-500 mb-4">
                  {job.company}
                </p>

                {/* Job Details */}
                <div className="space-y-3 text-gray-600">

                  <div className="flex items-center gap-2">
                    <MapPin size={18} />

                    <span>
                      {job.location}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Banknote size={18} />

                    <span>
                      {job.CTC}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={18} />

                    <span>
                      {job.Experience}
                    </span>
                  </div>

                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between mt-6">

                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                    {t("home.jobs")}
                  </span>

                  <Link
                    href={`/detailjob/${job._id}`}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {t("home.viewDetails")}

                    <ChevronRight size={16} />
                  </Link>

                </div>

              </div>
            )
          )}

        </div>
      </div>

      {/* =========================================================
          STATISTICS SECTION
      ========================================================= */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-16">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center"
            >

              <div className="text-4xl font-bold text-blue-600 mb-2">
                {stat.number}
              </div>

              <div className="text-gray-600">
                {stat.label}
              </div>

            </div>
          ))}

        </div>
      </div>

    </div>
  );
}