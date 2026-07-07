import Link from 'next/link';

export default function ResumeHome() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Premium Resume
          </h1>

          <p className="text-gray-600 mt-2">
            Create a professional resume by paying ₹50 and verifying via email OTP.
          </p>

          <Link href="/resume/create">
            <button className="inline-block mt-6 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
              Create Resume
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}