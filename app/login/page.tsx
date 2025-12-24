"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Incorrect password");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 24,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>LD Clash</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>Enter the access password.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
          }}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />

        {error && <p style={{ marginTop: 10, color: "#ff6b6b" }}>{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !password}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: "white",
            color: "black",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </main>
  );
}
