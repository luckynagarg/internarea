import { useRouter } from "next/router";
import Link from "next/link";

export default function SuccessPage() {
  return (

    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-700 font-bold">✓</div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Password Updated</h1>
            <p className="mt-2 text-gray-600">
              Your password has been updated successfully. You can now sign in again.
            </p>

            <div className="mt-6">
              <Link href="/" className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

