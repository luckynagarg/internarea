import type { NextPageContext } from "next";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  statusCode,
}: {
  statusCode?: number;
}) {
  const router = useRouter();

  const is404 = statusCode === 404;
  const title = is404 ? "Page not found" : "Something went wrong";
  const description = is404
    ? "The page you're looking for doesn't exist or may have been moved."
    : "We couldn't load this page right now. Please try again.";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        {typeof statusCode === "number" && !is404 && (
          <p className="text-sm text-gray-400 mb-2">Error code: {statusCode}</p>
        )}
        <p className="text-gray-500 mb-8">{description}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? (err as any)?.statusCode ?? 404;
  return { statusCode };
};

