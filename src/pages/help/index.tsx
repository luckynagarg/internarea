import Link from "next/link";

const helpItems = [
  { title: "How do I apply for an internship?", body: "Go to the Internships page, open the details, and click 'Apply Now'. You will need to be logged in and have an active subscription plan with remaining applications." },
  { title: "What are the subscription plans?", body: "Free (₹0, 1 internship/month), Bronze (₹100, 3), Silver (₹300, 5), and Gold (₹1000, unlimited)." },
  { title: "How do I create a resume?", body: "Visit the Resume page, follow the OTP verification, complete the ₹50 payment, fill in your details, and generate your PDF." },
  { title: "How does the Public Space posting limit work?", body: "0 friends = 0 posts/day, 1 friend = 1 post/day, 2 friends = 2 posts/day, 3-9 friends = posts equal to friends count, and 10+ friends = unlimited." },
  { title: "How do I switch to French?", body: "Select French from the language menu and complete the email OTP verification to unlock it." },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Help Center</h1>
        <div className="space-y-4">
          {helpItems.map((item, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/contact" className="text-blue-600 hover:text-blue-700">
            Still need help? Contact us →
          </Link>
        </div>
      </div>
    </div>
  );
}
