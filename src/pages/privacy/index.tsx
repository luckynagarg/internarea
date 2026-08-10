import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <div className="space-y-5 text-gray-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Information We Collect</h2>
            <p>We collect information you provide when you register, including your name, email, phone number, and profile details. We also collect login history for security purposes.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">How We Use Your Information</h2>
            <p>Your information is used to provide and improve our services, verify authentication, process payments, deliver notifications, and enforce platform rules.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payments</h2>
            <p>Payments are processed securely through Razorpay. We never store your card details.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Security</h2>
            <p>We implement industry-standard security measures including encrypted authentication, server-side authorization, and rate limiting to protect your data.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact</h2>
            <p>For privacy questions, please reach out via our <Link href="/contact" className="text-blue-600">contact page</Link>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
