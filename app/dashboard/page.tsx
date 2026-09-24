"use client";

import { useEffect, useState } from "react";

type AuthStatus = {
  authenticated: boolean;
  user?: { email: string; companyName: string; role: string };
  license?: { plan: string; maxDevices: number; status: string } | null;
  device?: { deviceId: string; name: string; fingerprint: string } | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthStatus>({ authenticated: false });
  const [licenseKey, setLicenseKey] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    const savedDeviceId = window.localStorage.getItem("safer_device_id") || crypto.randomUUID();
    window.localStorage.setItem("safer_device_id", savedDeviceId);
    setDeviceId(savedDeviceId);
    setFingerprint(btoa(`${navigator.userAgent}:${savedDeviceId}`));

    fetch("/api/auth/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => {
        // Already signed in with an active license on this device: go straight to the scanner.
        if (result.authenticated && result.license?.status === "active" && result.device?.active) {
          window.location.href = "/";
          return;
        }
        setAuth(result);
      })
      .catch(() => setAuth({ authenticated: false }))
      .finally(() => setLoading(false));
  }, []);

  async function activateLicense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Activating license…");

    const response = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        licenseKey,
        deviceId,
        deviceName: "Browser",
        fingerprint,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      setMessage("License activated. Opening scanner...");
      window.location.href = "/";
    } else {
      setMessage(result.error || "License activation failed.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return <main style={{ padding: "4rem 6vw" }}>Loading dashboard…</main>;
  }

  if (!auth.authenticated) {
    return (
      <main style={{ padding: "4rem 6vw" }}>
        <h1>Dashboard</h1>
        <p>Please <a href="/login">sign in</a> to manage your license and start scanning.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "4rem 6vw", maxWidth: 760 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {auth.user?.companyName || auth.user?.email}.</p>
      <section style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "#fff", boxShadow: "0 24px 60px rgba(35,76,55,.08)" }}>
        <h2>License status</h2>
        <p>{auth.license ? `Plan: ${auth.license.plan}, Status: ${auth.license.status}, Max devices: ${auth.license.maxDevices}` : "No active license assigned."}</p>
        {auth.device ? (
          <p>Current device: {auth.device.name} · ID {auth.device.deviceId}</p>
        ) : (
          <p>This browser is not yet authorized for your license.</p>
        )}
      </section>

      <section style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "#fff", boxShadow: "0 24px 60px rgba(35,76,55,.08)" }}>
        <h2>Activate license</h2>
        <form onSubmit={activateLicense} style={{ display: "grid", gap: 14, maxWidth: 560 }}>
          <label>
            License key
            <input value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} required />
          </label>
          <p style={{ fontSize: 14, color: "#61716b" }}>Device ID: {deviceId}</p>
          <button type="submit" disabled={submitting} style={{ padding: "12px 18px", background: "#0c6b4f", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>
            Activate
          </button>
        </form>
        {message ? <p style={{ marginTop: 16, color: "#8b2b28" }}>{message}</p> : null}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Next steps</h2>
        <ul>
          <li>Return to the <a href="/">main scanner</a> after activation.</li>
          <li>Use one device per license key to enforce single-device access.</li>
          <li>Contact support if your license is suspended or revoked.</li>
        </ul>
      </section>
    </main>
  );
}
