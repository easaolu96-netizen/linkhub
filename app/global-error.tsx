"use client";

/** Last-resort error screen if the root layout itself fails. Must render <html>/<body>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#111827",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
        <p style={{ margin: 0, color: "#52514e" }}>Please refresh the page or try again in a moment.</p>
        <button
          onClick={reset}
          style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#111827", color: "#fff", fontSize: 15, cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
