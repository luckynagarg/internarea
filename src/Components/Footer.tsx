import { Facebook, Twitter, Instagram } from "lucide-react";
import { useT } from "@/i18n/runtime";

const footerLinks = {
  internshipByPlaces: [
    { labelKey: "footer.links.newYork", href: "/internship" },
    { labelKey: "footer.links.losAngeles", href: "/internship" },
    { labelKey: "footer.links.chicago", href: "/internship" },
    { labelKey: "footer.links.sanFrancisco", href: "/internship" },
    { labelKey: "footer.links.miami", href: "/internship" },
    { labelKey: "footer.links.seattle", href: "/internship" },
  ],
  internshipByStream: [
    { labelKey: "footer.links.about", href: "/about" },
    { labelKey: "footer.links.careers", href: "/job" },
    { labelKey: "footer.links.contact", href: "/contact" },
    { labelKey: "footer.links.helpCenter", href: "/help" },
    { labelKey: "footer.links.privacy", href: "/privacy" },
    { labelKey: "footer.links.terms", href: "/terms" },
  ],
  jobPlaces: [
    { labelKey: "footer.links.findJobs", href: "/job" },
    { labelKey: "footer.links.findInternships", href: "/internship" },
    { labelKey: "footer.links.publicSpace", href: "/public" },
    { labelKey: "footer.links.friends", href: "/friends" },
    { labelKey: "footer.links.notifications", href: "/notifications" },
    { labelKey: "footer.links.profile", href: "/profile" },
  ],
  jobsByStreams: [
    { labelKey: "footer.links.startups", href: "/job" },
    { labelKey: "footer.links.enterprise", href: "/job" },
    { labelKey: "footer.links.government", href: "/job" },
    { labelKey: "footer.links.saas", href: "/job" },
    { labelKey: "footer.links.marketplaces", href: "/job" },
    { labelKey: "footer.links.ecommerce", href: "/job" },
  ],
};

const bottomLinks = {
  aboutUs: [
    { labelKey: "footer.links.about", href: "/about" },
    { labelKey: "footer.links.contact", href: "/contact" },
    { labelKey: "footer.links.helpCenter", href: "/help" },
  ],
  teamDiary: [
    { labelKey: "footer.links.privacy", href: "/privacy" },
    { labelKey: "footer.links.terms", href: "/terms" },
    { labelKey: "navbar.login", href: "/login" },
  ],
  termsAndConditions: [
    { labelKey: "footer.links.internships", href: "/internship" },
    { labelKey: "footer.links.jobs", href: "/job" },
    { labelKey: "footer.links.subscription", href: "/subscription" },
  ],
  sitemap: [
    { labelKey: "footer.links.home", href: "/" },
    { labelKey: "footer.links.search", href: "/search" },
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

function FooterSection({ title, items, links }: { title: string; items: { labelKey: string; href: string }[]; links?: boolean }) {
  const { t } = useT();
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-300">{title}</h3>
      <div className="flex flex-col items-start mt-4 space-y-3">
        {items.map((item, index) =>
          links ? (
            <a key={index} href={item.href} className="text-gray-400 hover:text-blue-400 hover:underline">
              {t(item.labelKey)}
            </a>
          ) : (
            <a key={index} href={item.href} className="text-gray-400 hover:text-blue-400 hover:underline cursor-pointer">
              {t(item.labelKey)}
            </a>
          )
        )}
      </div>
    </div>
  );
}
