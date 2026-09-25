"use client";

import { useEffect, useState } from "react";

type LicenseRecord = {
  id: number;
  keyHash: string;
  licenseKey: string | null;
  ownerName: string | null;
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
  const [ownerName, setOwnerName] = useState("");
  const [plan, setPlan] = useState("starter");
  const [maxDevices, setMaxDevices] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tableOpen, setTableOpen] = useState(true);

  function handleCopyKey(id: number, key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    });
  }

  function generateLicenseKey() {
    const existingKeys = new Set(licenses.map((l) => l.licenseKey).filter(Boolean));
    const segment = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    let candidate = "";
    do {
      candidate = `ASL-${Date.now().toString(36).slice(-4).toUpperCase()}-${segment()}-${segment()}`;
    } while (existingKeys.has(candidate) || candidate === licenseKey);
    setLicenseKey(candidate);
  }

  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDeleteLicense(license: LicenseRecord) {
    const label = license.ownerName || `#${license.id}`;
    if (!window.confirm(`Suspend the license for "${label}"? They will be signed out of the scanner and see a message to contact admin.`)) {
      return;
    }
    setDeletingId(license.id);
    const response = await fetch(`/api/admin/licenses/${license.id}`, { method: "DELETE" });
    if (response.ok) {
      setLicenses((current) =>
        current.map((l) => (l.id === license.id ? { ...l, status: "suspended" } : l)),
      );
    } else {
      const result = await response.json().catch(() => ({}));
      window.alert(result.error || "Could not suspend this license.");
    }
    setDeletingId(null);
  }

  function exportLicensesCsv() {
    const headers = ["ID", "User Name", "License Key", "Max Devices", "Status", "Assigned User"];
    const rows = licenses.map((l) => [l.id, l.ownerName || "", l.licenseKey || "", l.maxDevices, l.status, l.assignedUserId ?? "unassigned"]);
    const csv = [headers, ...rows].map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `as-logistics-licenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const filteredLicenses = licenses.filter((license) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      (license.ownerName || "").toLowerCase().includes(query) ||
      (license.licenseKey || "").toLowerCase().includes(query) ||
      String(license.id).includes(query)
    );
  });

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
    setCreating(true);
    setStatus("Creating license…");

    const response = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ licenseKey, plan, maxDevices, ownerName }),
    });

    const result = await response.json();
    if (response.ok) {
      setStatus("License created successfully.");
      setLicenseKey("");
      setOwnerName("");
      setTimeout(() => window.location.reload(), 600);
    } else {
      setCreating(false);
      setStatus(result.error || "License creation failed.");
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #faf9f5 0%, #f5f3ed 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#61716b" }}>
        Loading admin panel…
      </main>
    );
  }

  if (!auth.authenticated || auth.user?.role !== "admin") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #faf9f5 0%, #f5f3ed 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#141413" }}>Admin panel</h1>
          <p style={{ color: "#61716b" }}>Admin access is required. Please sign in with an administrator account.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        .admin-root { box-sizing: border-box; }
        .admin-root * { box-sizing: border-box; }
        .admin-input, .admin-select {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #d8ddd7;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.25s ease;
          background: #fff;
          color: #141413;
        }
        .admin-input:focus, .admin-select:focus {
          outline: none;
          border-color: #0c6b4f;
          box-shadow: 0 0 0 4px rgba(12, 107, 79, 0.12);
          background: #faf9f5;
        }
        .admin-label {
          display: block;
          font-weight: 600;
          font-size: 13px;
          color: #61716b;
          margin-bottom: 6px;
        }
        .admin-btn {
          background: linear-gradient(135deg, #0c6b4f 0%, #094a39 100%);
          color: #fff;
          padding: 13px 28px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, opacity 0.2s ease;
          box-shadow: 0 6px 18px rgba(12, 107, 79, 0.22);
        }
        .admin-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(12, 107, 79, 0.3); }
        .admin-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .admin-card {
          background: #fff;
          border: 1px solid #ece9dd;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 10px 32px rgba(20, 20, 19, 0.05);
          animation: adminFadeUp 0.5s ease-out both;
        }
        @keyframes adminFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .admin-table th {
          text-align: left; padding: 14px 16px; font-weight: 600; font-size: 12.5px;
          letter-spacing: 0.02em; text-transform: uppercase; color: #61716b;
          background: linear-gradient(90deg, #f5f3ed 0%, #faf9f5 100%);
          border-bottom: 1px solid #e5e3d8;
        }
        .admin-table td { padding: 14px 16px; border-bottom: 1px solid #f0f1ef; color: #141413; }
        .admin-table tr { transition: background 0.2s ease; }
        .admin-table tbody tr:hover { background: #faf9f5; }
        .admin-badge {
          display: inline-block; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
          background: #d4f4e9; color: #0c6b4f;
        }
        .admin-badge.inactive { background: #f3e3e1; color: #8b2b28; }
        .admin-status-msg { margin-top: 14px; font-size: 14px; font-weight: 500; }
        .admin-key-copy {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 13px;
          font-weight: 600;
          color: #0c6b4f;
          background: #f0f8f4;
          padding: 5px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .admin-key-copy:hover {
          background: #d4f4e9;
          border-color: #0c6b4f;
          transform: translateY(-1px);
        }
        .admin-key-copy:active { transform: translateY(0); }
        .admin-copied-badge {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: #141413;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .admin-copied-badge.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .admin-collapse-arrow {
          font-size: 22px;
          color: #61716b;
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }
        .admin-collapse-arrow.open { transform: rotate(180deg); }
        .admin-generate-btn {
          flex-shrink: 0;
          background: #fff;
          color: #0c6b4f;
          border: 1.5px solid #0c6b4f;
          padding: 0 18px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
        }
        .admin-generate-btn:hover { background: #0c6b4f; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 18px rgba(12,107,79,0.22); }
        .admin-delete-btn {
          background: #fdecea;
          color: #8b2b28;
          border: 1.5px solid #f3c4bd;
          padding: 6px 14px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .admin-delete-btn:hover:not(:disabled) { background: #8b2b28; color: #fff; border-color: #8b2b28; }
        .admin-delete-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .admin-container { padding: 48px 6vw 80px; max-width: 1100px; margin: 0 auto; }
        .admin-form { display: grid; gap: 20px; max-width: 480px; margin: 0 auto; }
        @media (max-width: 720px) {
          .admin-container { padding: 28px 5vw 56px; }
          .admin-card { padding: 22px; border-radius: 14px; }
          .admin-header-title { font-size: 24px !important; }
          .admin-form { max-width: 100%; }
          .admin-table th, .admin-table td { padding: 10px 12px; font-size: 13px; }
        }
      `}</style>
      <main className="admin-root" style={{ minHeight: "100vh", background: "linear-gradient(135deg, #faf9f5 0%, #f5f3ed 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#141413" }}>
        <div className="admin-container">
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <img src="/icon.svg" alt="AS Logistics Solutions" style={{ width: 40, height: 40, borderRadius: "50%", boxShadow: "0 6px 16px rgba(12,107,79,0.25)", flexShrink: 0 }} />
              <h1 className="admin-header-title" style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>Admin panel</h1>
            </div>
            <p style={{ margin: 0, color: "#61716b", fontSize: 15 }}>Manage licensing, monitor devices, and configure webhooks.</p>
          </div>

          <div className="admin-card" style={{ marginBottom: 32 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#0c6b4f", textAlign: "center" }}>Create license</h2>
            <p style={{ margin: "0 0 24px", color: "#61716b", fontSize: 14, textAlign: "center" }}>Generate a new license key and assign it to a user.</p>
            <form onSubmit={handleCreate} className="admin-form">
              <div>
                <label className="admin-label">User name</label>
                <input
                  className="admin-input"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="e.g., John Doe or company name"
                />
              </div>
              <div>
                <label className="admin-label">License key</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                    <input
                      className="admin-input"
                      value={licenseKey}
                      readOnly
                      placeholder="Click “Generate key” to create one"
                      required
                      onClick={() => licenseKey && handleCopyKey(-1, licenseKey)}
                      title={licenseKey ? "Click to copy" : undefined}
                      style={{ cursor: licenseKey ? "pointer" : "default", background: licenseKey ? "#faf9f5" : "#fff", width: "100%" }}
                    />
                    <span className={`admin-copied-badge ${copiedId === -1 ? "show" : ""}`}>Copied!</span>
                  </div>
                  <button type="button" className="admin-generate-btn" onClick={generateLicenseKey}>
                    Generate key
                  </button>
                </div>
              </div>
              {/* Plan selector temporarily disabled — keep code for later re-enable */}
              <div style={{ display: "none" }}>
                <label className="admin-label">Plan</label>
                <select className="admin-select" value={plan} onChange={(event) => setPlan(event.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Max devices</label>
                <input
                  className="admin-input"
                  type="number"
                  value={maxDevices}
                  min={1}
                  onChange={(event) => setMaxDevices(Number(event.target.value))}
                  required
                />
              </div>
              <button className="admin-btn" type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create license"}
              </button>
            </form>
            {status ? (
              <p className="admin-status-msg" style={{ color: status.includes("success") ? "#0c6b4f" : "#8b2b28", textAlign: "center", maxWidth: 480, margin: "14px auto 0" }}>
                {status.includes("success") ? "✓ " : ""}{status}
              </p>
            ) : null}
          </div>

          <div className="admin-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ cursor: "pointer", userSelect: "none", flex: 1 }} onClick={() => setTableOpen((open) => !open)}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#0c6b4f" }}>Existing licenses</h2>
                <p style={{ margin: 0, color: "#61716b", fontSize: 14 }}>{filteredLicenses.length} of {licenses.length} license{licenses.length === 1 ? "" : "s"} shown.</p>
              </div>
              <button type="button" className="admin-generate-btn" onClick={exportLicensesCsv} disabled={!licenses.length}>
                Export CSV
              </button>
              <span
                className={`admin-collapse-arrow ${tableOpen ? "open" : ""}`}
                aria-label={tableOpen ? "Collapse" : "Expand"}
                style={{ cursor: "pointer" }}
                onClick={() => setTableOpen((open) => !open)}
              >
                ▾
              </span>
            </div>

            {tableOpen ? (
              <>
                <div style={{ marginTop: 20, marginBottom: 16 }}>
                  <input
                    className="admin-input"
                    style={{ maxWidth: 360 }}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by user name, license key, or ID…"
                  />
                </div>
                <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e3d8" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User name</th>
                        <th>License key</th>
                        <th>Max devices</th>
                        <th>Status</th>
                        <th>Assigned user</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLicenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#61716b" }}>
                            {licenses.length === 0 ? "No licenses yet." : "No licenses match your search."}
                          </td>
                        </tr>
                      ) : (
                        filteredLicenses.map((license) => (
                          <tr key={license.id}>
                            <td>#{license.id}</td>
                            <td style={{ fontWeight: 600 }}>{license.ownerName || "—"}</td>
                            <td>
                              {license.licenseKey ? (
                                <span
                                  className="admin-key-copy"
                                  title="Click to copy"
                                  onClick={() => handleCopyKey(license.id, license.licenseKey as string)}
                                >
                                  {license.licenseKey}
                                  <span className={`admin-copied-badge ${copiedId === license.id ? "show" : ""}`}>Copied!</span>
                                </span>
                              ) : (
                                <span style={{ color: "#61716b" }}>—</span>
                              )}
                            </td>
                            <td>{license.maxDevices}</td>
                            <td>
                              <span className={`admin-badge ${license.status === "active" ? "" : "inactive"}`}>{license.status}</span>
                            </td>
                            <td>{license.assignedUserId ?? "unassigned"}</td>
                            <td>
                              {license.status === "suspended" ? (
                                <span style={{ color: "#61716b", fontSize: 13 }}>Suspended</span>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-delete-btn"
                                  disabled={deletingId === license.id}
                                  onClick={() => handleDeleteLicense(license)}
                                >
                                  {deletingId === license.id ? "…" : "Delete"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
