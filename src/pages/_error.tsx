import type { NextPageContext } from "next";
import React from "react";

export default function ErrorPage({
  statusCode,
}: {
  statusCode?: number;
}) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h1>
      {typeof statusCode === "number" ? (
        <p style={{ color: "#555" }}>Error code: {statusCode}</p>
      ) : null}
      <p style={{ color: "#555" }}>Please try again later.</p>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? (err as any)?.statusCode ?? 404;
  return { statusCode };
};

