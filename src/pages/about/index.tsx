import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">About Internarea</h1>
        <p className="text-gray-700 leading-relaxed mb-6">
          Internarea is a training platform that connects students and fresh graduates
          with internships and jobs. Our mission is to make career discovery simple,
          accessible, and rewarding.
        </p>
        <p className="text-gray-700 leading-relaxed mb-6">
          We provide a Public Space for the community to share ideas, a friend system to
          build professional connections, resume building tools, and subscription plans
          that fit every stage of your career journey.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          Whether you are looking for your first internship or your next big role,
          Internarea is here to help you grow.
        </p>
        <div className="flex gap-4">
          <Link href="/internship" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Explore Internships
          </Link>
          <Link href="/contact" className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
