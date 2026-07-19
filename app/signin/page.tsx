"use client";

import { useEffect, useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("safer_device_id")) {
      window.localStorage.setItem("safer_device_id", crypto.randomUUID());
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Signing in…");

    const deviceId = window.localStorage.getItem("safer_device_id") || crypto.randomUUID();
    window.localStorage.setItem("safer_device_id", deviceId);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, deviceId }),
    });

    const result = await response.json();
    if (response.ok) {
      window.location.href = "/dashboard";
    } else {
      setStatus(result.error || "Sign in failed.");
    }
  }

  return (
    <main style={{ padding: "4rem 6vw" }}>
      <h1>Sign in</h1>
      <p>Access AS Logistics Solutions with your licensed account.</p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginTop: 24, display: "grid", gap: 14 }}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" style={{ padding: "12px 18px", background: "#0c6b4f", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>
          Sign in
        </button>
      </form>
      {status ? <p style={{ marginTop: 16, color: "#8b2b28" }}>{status}</p> : null}
      <p style={{ marginTop: 24 }}>
        New to AS Logistics Solutions? <a href="/register">Create an account</a>.
      </p>
    </main>
  );
}
