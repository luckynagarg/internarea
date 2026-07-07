"use client";
import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {
  ArrowUpRight,
  Banknote,
  Calendar,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useLanguage } from "@/i18n/LanguageContext";


type Internship = {
  _id: string;
  title: string;
  company: string;
  location: string;
  stipend: string;
  duration: string;
  category: string;
};

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  CTC: string;
  Experience: string;
  category: string;
};

 // Backend must be running: cd backend && npm run dev
const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://intern-backend-4dlt.onrender.com";

export default function SvgSlider() {
  const { t } = useLanguage();

  const categories = [

    t("home.categories.bigBrands"),
    t("home.categories.workFromHome"),
    t("home.categories.partTime"),
    t("home.categories.mba"),
    t("home.categories.engineering"),
    t("home.categories.media"),
    t("home.categories.design"),
    t("home.categories.dataScience"),
  ];


  const slides = [
    { pattern: "pattern-1", title: t("home.slides.0"), bgColor: "bg-indigo-600" },
    { pattern: "pattern-2", title: t("home.slides.1"), bgColor: "bg-blue-600" },
    { pattern: "pattern-3", title: t("home.slides.2"), bgColor: "bg-purple-600" },
    { pattern: "pattern-4", title: t("home.slides.3"), bgColor: "bg-teal-600" },
  ];

  const stats = [
    { number: "300K+", label: t("home.stats.0") },
    { number: "10K+", label: t("home.stats.1") },
    { number: "21Mn+", label: t("home.stats.2") },
    { number: "600K+", label: t("home.stats.3") },
  ];


  const [internships, setInternships] = useState<Internship[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {


    console.log("API_BASE:", API_BASE);
console.log("Internship URL:", `${API_BASE}/api/internship`);
console.log("Job URL:", `${API_BASE}/api/job`);


    const fetchData = async () => {
      try {
        const [internshipRes, jobRes] = await Promise.all([
          axios.get(`${API_BASE}/api/internship`),
          axios.get(`${API_BASE}/api/job`),
        ]);

        setInternships(internshipRes.data?.data || internshipRes.data || []);
        setJobs(jobRes.data?.data || jobRes.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchData();
  }, []);

  const filteredInternships = useMemo(() => {
    return internships.filter(
      (item) => !selectedCategory || item.category === selectedCategory
    );
  }, [internships, selectedCategory]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(
      (item) => !selectedCategory || item.category === selectedCategory
    );
  }, [jobs, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800">{t("home.hero.title")}</h1>
        <p className="text-xl text-gray-700">{t("home.hero.subtitle")}</p>
      </div>


      {/* SWIPER */}
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        className="rounded-xl overflow-hidden shadow-lg mb-16"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
          <div className={`h-96 ${slide.bgColor} flex items-center justify-center`}>              <h2 className="text-white text-3xl font-bold">
                {slide.title}
              </h2>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* CATEGORY */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-black ">{t("home.sections.internships")}</h2>


        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-4 py-2 rounded-2xl ${
              selectedCategory === "" ? "bg-blue-600 text-black" : "bg-gray-400"
            }`}
          >
            {t("home.filters.all")}

          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-black rounded-2xl ${
                selectedCategory === cat
                  ? "bg-blue-600 text-black"
                  : "bg-gray-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* INTERNSHIPS */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {filteredInternships.map((item) => (
          <div key={item._id} className="bg-white p-5 rounded shadow hover:scale-105 transition">
            <div className="text-blue-600 flex items-center gap-2 ">
              <ArrowUpRight size={18} /> {t("home.cards.hiring")}
            </div>


            <h3 className="font-bold mt-2 text-black">{item.title}</h3>
            <p className="text-gray-700">{item.company}</p>

            <div className="mt-3 text-sm space-y-2">
              <p><MapPin size={14} /> {item.location}</p>
              <p><Banknote size={14} /> {item.stipend}</p>
              <p><Calendar size={14} /> {item.duration}</p>
            </div>

            <Link href={`/detailinternship/${item._id}`} className="text-blue-600 mt-3 block">
              {t("home.cards.viewDetails")}
            </Link>

          </div>
        ))}
      </div>

      {/* JOBS */}
      <h2 className="text-xl font-bold mb-4 text-black">{t("home.sections.jobs")}</h2>


      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {filteredJobs.map((job) => (
          <div key={job._id} className="bg-white p-5 rounded shadow hover:scale-105 transition">
            <div className="text-blue-600 flex items-center gap-2">
              <ArrowUpRight size={18} /> {t("home.cards.hiring")}
            </div>


            <h3 className="font-bold mt-2 text-black">{job.title}</h3>
            <p className="text-gray-700">{job.company}</p>

            <div className="mt-3 text-sm space-y-2 text-black">
              <p><MapPin size={14} /> {job.location}</p>
              <p><Banknote size={14} /> {job.CTC}</p>
              <p><Calendar size={14} /> {job.Experience}</p>
            </div>

            <Link href={`/detailjob/${job._id}`} className="text-blue-600 mt-3 block">
              {t("home.cards.viewDetails")}
            </Link>

          </div>
        ))}
      </div>

      {/* STATS */}
      <div className="bg-white p-8 rounded shadow grid grid-cols-2 md:grid-cols-4 text-center text-black">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-3xl font-bold text-blue-600">{s.number}</div>
            <div className="text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}