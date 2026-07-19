"use client";

import { useEffect, useState } from "react";

type LicenseRecord = {
  id: number;
  keyHash: string;
  plan: string;
  maxDevices: number;
  status: string;
  assignedUserId: number | null;
};

type AuthStatus = {
  authenticated: boolean;
  user?: { email: string; companyName: string; role: string };
};

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthStatus>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [licenseKey, setLicenseKey] = useState("");
  const [plan, setPlan] = useState("starter");
  const [maxDevices, setMaxDevices] = useState(1);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/auth/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => {
        setAuth(result);
        if (result.authenticated && result.user?.role === "admin") {
          fetch("/api/admin/licenses", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => setLicenses(data.licenses || []))
            .catch(() => setLicenses([]));
        }
      })
      .catch(() => setAuth({ authenticated: false }))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating license…");

    const response = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ licenseKey, plan, maxDevices }),
    });

    const result = await response.json();
    if (response.ok) {
      setStatus("License created successfully.");
      setLicenseKey("");
      setTimeout(() => window.location.reload(), 600);
    } else {
      setStatus(result.error || "License creation failed.");
    }
  }

  if (loading) {
    return <main style={{ padding: "4rem 6vw" }}>Loading admin panel…</main>;
  }

  if (!auth.authenticated || auth.user?.role !== "admin") {
    return (
      <main style={{ padding: "4rem 6vw" }}>
        <h1>Admin panel</h1>
        <p>Admin access is required. Please sign in with an administrator account.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "4rem 6vw", maxWidth: 860 }}>
      <h1>Admin panel</h1>
      <p>Manage licensing, monitor active devices, and receive webhook updates.</p>

      <section style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "#fff", boxShadow: "0 24px 60px rgba(35,76,55,.08)" }}>
        <h2>Create license</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 14, maxWidth: 560 }}>
          <label>
            License key
            <input value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} required />
          </label>
          <label>
            Plan
            <select value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label>
            Max devices
            <input type="number" value={maxDevices} min={1} onChange={(event) => setMaxDevices(Number(event.target.value))} required />
          </label>
          <button type="submit" style={{ padding: "12px 18px", background: "#0c6b4f", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>
            Create license
          </button>
        </form>
        {status ? <p style={{ marginTop: 16, color: "#8b2b28" }}>{status}</p> : null}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Existing licenses</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #d8ddd7" }}>ID</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #d8ddd7" }}>Key hash</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #d8ddd7" }}>Plan</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #d8ddd7" }}>Max devices</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #d8ddd7" }}>Status</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #d8ddd7" }}>Assigned user</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr key={license.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f1ef" }}>{license.id}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f1ef", fontFamily: "monospace", wordBreak: "break-all" }}>{license.keyHash.slice(0, 16)}…</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f1ef" }}>{license.plan}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f1ef" }}>{license.maxDevices}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f1ef" }}>{license.status}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f1ef" }}>{license.assignedUserId ?? "unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
