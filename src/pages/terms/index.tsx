import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>
        <div className="space-y-5 text-gray-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceptance of Terms</h2>
            <p>By accessing or using Internarea, you agree to be bound by these terms. If you do not agree, please do not use the platform.</p>
        </div>
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Responsibility</h2>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
        </div>
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscriptions & Payments</h2>
            <p>Subscription plans grant a defined number of internship applications per month. Payments are processed via Razorpay and are subject to the applicable plan terms.</p>
        </div>
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceptable Use</h2>
<p>You agree not to misuse the platform, post unlawful content, or attempt to breach security or access other users&apos; data.</p>
        </div>
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact</h2>
            <p>For questions about these terms, please visit our <Link href="/contact" className="text-blue-600">contact page</Link>.</p>
        </div>
        </div>
    </div>
    </div>
    );
}
