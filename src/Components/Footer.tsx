import { Facebook, Twitter, Instagram } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-800 text-white py-10 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <FooterSection
            title={t("footer.internshipByPlaces")}
            items={[]}
          />
          <FooterSection
            title={t("footer.internshipByStream")}
            items={[]}
          />
          <FooterSection
            title={t("footer.jobPlaces")}
            items={[]}
            links
          />
          <FooterSection
            title={t("footer.jobsByStreams")}
            items={[]}
            links
          />
        </div>

        <hr className="my-8 sm:my-10 border-gray-600" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <FooterSection title={t("footer.aboutUs")} items={[]} links />
          <FooterSection title={t("footer.teamDiary")} items={[]} links />
          <FooterSection title={t("footer.termsAndConditions")} items={[]} links />
          <FooterSection title={t("footer.sitemap")} items={[]} links />
        </div>

        <div className="mt-8 sm:mt-10 flex flex-col gap-4 sm:flex-row sm:gap-0 justify-between items-center">
          <p className="flex items-center gap-2 border border-white px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-700 text-sm sm:text-base">
            <i className="bi bi-google-play"></i> {t("footer.getAndroidApp")}
          </p>
          <div className="flex space-x-4">
            <Facebook className="w-6 h-6 hover:text-blue-400 cursor-pointer" />
            <Twitter className="w-6 h-6 hover:text-blue-400 cursor-pointer" />
            <Instagram className="w-6 h-6 hover:text-pink-400 cursor-pointer" />
          </div>
          <p className="text-sm text-gray-400 text-center sm:text-right">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterSection({ title, items, links }:any) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-300">{title}</h3>
      <div className="flex flex-col items-start mt-4 space-y-3">
        {items.map((item:any, index:any) =>
          links ? (
            <a key={index} href="/" className="text-gray-400 hover:text-blue-400 hover:underline">
              {item}
            </a>
          ) : (
            <p key={index} className="text-gray-400 hover:text-blue-400 hover:underline cursor-pointer">
              {item}
            </p>
          )
        )}
      </div>
    </div>
  );
}