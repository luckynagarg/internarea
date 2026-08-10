import { Facebook, Twitter, Instagram } from "lucide-react";
import { useT } from "@/i18n/runtime";

const footerLinks = {
  internshipByPlaces: [
    { label: "New York", href: "/internship" },
    { label: "Los Angeles", href: "/internship" },
    { label: "Chicago", href: "/internship" },
    { label: "San Francisco", href: "/internship" },
    { label: "Miami", href: "/internship" },
    { label: "Seattle", href: "/internship" },
  ],
  internshipByStream: [
    { label: "About us", href: "/about" },
    { label: "Careers", href: "/job" },
    { label: "Contact", href: "/contact" },
    { label: "Help center", href: "/help" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
  jobPlaces: [
    { label: "Find Jobs", href: "/job" },
    { label: "Find Internships", href: "/internship" },
    { label: "Public Space", href: "/public" },
    { label: "Friends", href: "/friends" },
    { label: "Notifications", href: "/notifications" },
    { label: "Profile", href: "/profile" },
  ],
  jobsByStreams: [
    { label: "Startups", href: "/job" },
    { label: "Enterprise", href: "/job" },
    { label: "Government", href: "/job" },
    { label: "SaaS", href: "/job" },
    { label: "Marketplaces", href: "/job" },
    { label: "Ecommerce", href: "/job" },
  ],
};

const bottomLinks = {
  aboutUs: [
    { label: "About us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Help", href: "/help" },
  ],
  teamDiary: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Sign In", href: "/login" },
  ],
  termsAndConditions: [
    { label: "Internships", href: "/internship" },
    { label: "Jobs", href: "/job" },
    { label: "Subscription", href: "/subscription" },
  ],
  sitemap: [
    { label: "Home", href: "/" },
    { label: "Search", href: "/search" },
  ],
};

export default function Footer() {
  const { t } = useT();

  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <FooterSection title={t('footer.internshipByPlaces')} items={footerLinks.internshipByPlaces} />
          <FooterSection title={t('footer.internshipByStream')} items={footerLinks.internshipByStream} links />
          <FooterSection title={t('footer.jobPlaces')} items={footerLinks.jobPlaces} links />
          <FooterSection title={t('footer.jobsByStreams')} items={footerLinks.jobsByStreams} links />
        </div>

        <hr className="my-10 border-gray-600" />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <FooterSection title={t('footer.aboutUs')} items={bottomLinks.aboutUs} links />
          <FooterSection title={t('footer.teamDiary')} items={bottomLinks.teamDiary} links />
          <FooterSection title={t('footer.termsAndConditions')} items={bottomLinks.termsAndConditions} links />
          <FooterSection title={t('footer.sitemap')} items={bottomLinks.sitemap} links />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-between items-center">
          <p className="flex items-center gap-2 border border-white px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-700">
            <i className="bi bi-google-play"></i> {t('footer.getAndroidApp')}
          </p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Facebook className="w-6 h-6 hover:text-blue-400 cursor-pointer" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
              <Twitter className="w-6 h-6 hover:text-blue-400 cursor-pointer" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram className="w-6 h-6 hover:text-pink-400 cursor-pointer" />
            </a>
          </div>
          <p className="mt-4 sm:mt-0 text-sm text-gray-400">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterSection({ title, items, links }: { title: string; items: { label: string; href: string }[]; links?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-300">{title}</h3>
      <div className="flex flex-col items-start mt-4 space-y-3">
        {items.map((item, index) =>
          links ? (
            <a key={index} href={item.href} className="text-gray-400 hover:text-blue-400 hover:underline">
              {item.label}
            </a>
          ) : (
            <a key={index} href={item.href} className="text-gray-400 hover:text-blue-400 hover:underline cursor-pointer">
              {item.label}
            </a>
          )
        )}
      </div>
    </div>
  );
}
