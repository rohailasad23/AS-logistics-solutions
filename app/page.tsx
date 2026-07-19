"use client";

import { useEffect, useRef, useState } from "react";
import SkeletonPreview from "./_sites-preview/SkeletonPreview";
import { normalizeMcRange } from "@/lib/mc-range";

type Carrier = {
  mcNumber: string;
  usdotNumber: string;
  legalName: string;
  phone: string;
  email: string;
  physicalAddress: string;
  entityType: string;
  usdotStatus: string;
  authorityStatus: string;
  generalFreight: string;
};

type AuthState = {
  authenticated: boolean;
  loading: boolean;
  user?: { email: string; companyName: string; role: string };
  license?: { plan: string; maxDevices: number; status: string } | null;
  device?: { deviceId: string; name: string; fingerprint: string } | null;
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hashString(value: string) {
  return Array.from(new TextEncoder().encode(value))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Home() {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(25);
  const [rows, setRows] = useState<Carrier[]>([]);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false, loading: true });
  const [deviceId, setDeviceId] = useState<string>("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const stop = useRef(false);

  useEffect(() => {
    const savedDeviceId = window.localStorage.getItem("safer_device_id") || crypto.randomUUID();
    window.localStorage.setItem("safer_device_id", savedDeviceId);
    setDeviceId(savedDeviceId);
    const fingerprintValue = hashString(`${navigator.userAgent}:${savedDeviceId}`);
    setFingerprint(fingerprintValue);

    fetch("/api/auth/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => {
        setAuthState({
          authenticated: Boolean(result.authenticated),
          loading: false,
          user: result.user,
          license: result.license,
          device: result.device,
        });
      })
      .catch(() => setAuthState({ authenticated: false, loading: false }));
  }, []);

  const scannerEnabled = authState.authenticated && authState.license?.status === "active";
  const licenseWarning = authState.authenticated && !scannerEnabled ?
    authState.license ? `Your license is currently ${authState.license.status}. Activate or contact support.` :
    "No active license found. Activate a license to start scanning." : "";

  async function run() {
    if (!scannerEnabled) {
      setStatus(licenseWarning || "Sign in and activate your license to scan.");
      return;
    }

    const { start: normalizedStart, end: normalizedEnd } = normalizeMcRange(start, end);
    setStart(normalizedStart);
    setEnd(normalizedEnd);

    if (normalizedEnd - normalizedStart + 1 > 500) {
      setStatus("Please scan no more than 500 MC numbers at a time.");
      return;
    }
    stop.current = false;
    setRunning(true);
    setRows([]);
    const found: Carrier[] = [];

    for (let mc = normalizedStart; mc <= normalizedEnd && !stop.current; mc++) {
      setStatus(`Checking MC ${mc.toLocaleString()} • ${mc - normalizedStart + 1} of ${normalizedEnd - normalizedStart + 1}`);
      try {
        const response = await fetch(`/api/scrape?mc=${mc}`);
        const data = await response.json();
        if (response.ok && data.match) {
          found.push(data.carrier);
          setRows([...found]);
        } else if (data.error) {
          setStatus(data.error);
          break;
        }
        if (!response.ok && response.status === 429) await pause(4000);
      } catch {
        setStatus(`Connection interrupted at MC ${mc}. You can start again.`);
        break;
      }
      await pause(1100);
    }

    setRunning(false);
    setStatus(stop.current ? `Stopped • ${found.length} matching carriers found` : `Complete • ${found.length} matching carriers found`);

    if (found.length && !stop.current) {
      setStatus("Enriching emails from loadguard.ai…");
      const enriched = [...found];
      for (let i = 0; i < enriched.length; i++) {
        const c = enriched[i];
        try {
          const slug = slugify(c.legalName || c.mcNumber);
          const template = `https://loadguard.ai/trucking-company/${slug}-mc-{mc}`;
          const resp = await fetch(`/api/enrich`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mcs: [c.mcNumber], template }) });
          const json = await resp.json();
          if (resp.ok && Array.isArray(json.results) && json.results[0]) {
            c.email = json.results[0].email || c.email || "";
            setRows((r) => {
              const copy = [...r];
              copy[i] = { ...c };
              return copy;
            });
          }
        } catch {
        }
        await pause(300);
      }
      setStatus(`Complete • ${enriched.length} matching carriers found`);
    }
  }

  function slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function downloadCsv() {
    const headers = ["MC Number","USDOT Number","Legal Name","Phone","Email","Physical Address","Entity Type","USDOT Status","Authority Status","General Freight"];
    const values = rows.map((r) => [r.mcNumber,r.usdotNumber,r.legalName,r.phone,r.email,r.physicalAddress,r.entityType,r.usdotStatus,r.authorityStatus,r.generalFreight]);
    const csv = [headers, ...values].map((line) => line.map((v) => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `safer-scraber-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function createSheet() {
    setStatus("Creating Google Sheet…");
    const response = await fetch("/api/sheets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows, title: `SAFER Carriers MC ${start}-${end}` }) });
    const data = await response.json();
    if (response.ok) {
      setStatus("Google Sheet created");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } else {
      setStatus(data.error || "Google Sheets is not configured yet. See the setup guide.");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  const authBanner = authState.authenticated ?
    `Signed in as ${authState.user?.email}. ${authState.license ? `License status: ${authState.license.status}.` : "License required to scan."}` :
    "Sign in to access secure carrier search and license activation.";

  return (
    <main>
      <SkeletonPreview />
      <meta name="codex-preview" content="development" />
      <div dangerouslySetInnerHTML={{ __html: '<title>Your site is taking shape</title><div style="display:none">Codex is working — Your site is taking shape — Codex is building the first version</div>' }} />
      <header>
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/as-logistics-logo.svg" alt="AS Logistics Solutions" style={{ height: 40 }} />
          <div>
            <strong>AS Logistics Solutions</strong>
            <small style={{ display: "block" }}>FMCSA carrier intelligence</small>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="source">Official SAFER source</span>
          {authState.authenticated ? (
            <button onClick={signOut} style={{ border: "1px solid #d8ddd7", borderRadius: 8, padding: "10px 14px", background: "#fff" }}>Sign out</button>
          ) : (
            <a href="/login" style={{ textDecoration: "none", color: "var(--green)", fontWeight: 700 }}>Sign in</a>
          )}
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">CARRIER DISCOVERY</p>
          <h1>Build a commercial-grade carrier list.</h1>
          <p className="lede">Sign in, activate your license, and scan MC ranges for active U.S. property carriers authorized for General Freight.</p>
          <p style={{ marginTop: "18px", color: "var(--muted)", fontSize: "14px" }}>{authBanner}</p>
        </div>
        <div className="panel">
          <div className="fields">
            <label>Starting MC<input type="number" min="1" value={start} disabled={running} onChange={(e) => setStart(Number(e.target.value) || 1)} /></label>
            <span>to</span>
            <label>Ending MC<input type="number" min="1" value={end} disabled={running} onChange={(e) => setEnd(Number(e.target.value) || 1)} /></label>
          </div>
          <div className="actions">
            {running ? (
              <button className="stop" onClick={() => stop.current = true}>Stop scan</button>
            ) : (
              <button className="primary" onClick={run} disabled={!scannerEnabled}>Start scan</button>
            )}
            <span>{end >= start ? end - start + 1 : 0} records max</span>
          </div>
          {!scannerEnabled && authState.authenticated ? (
            <div style={{ marginTop: "16px", color: "#8b2b28", fontSize: "14px" }}>{licenseWarning}</div>
          ) : null}
          {!authState.authenticated && !authState.loading ? (
            <div style={{ marginTop: "16px", color: "var(--muted)", fontSize: "14px" }}>
              <a href="/login" style={{ color: "var(--green)", textDecoration: "underline" }}>Sign in</a> or <a href="/register" style={{ color: "var(--green)", textDecoration: "underline" }}>register</a> to continue.
            </div>
          ) : null}
        </div>
      </section>
      <section className="filters"><span>FILTERS APPLIED</span><b>Carrier entity</b><b>Active USDOT</b><b>Authorized for property</b><b>U.S. address</b><b>General Freight</b></section>
      <section className="results">
        <div className="resultsHead"><div><h2>Matching carriers</h2><p>{status}</p></div><div><button disabled={!rows.length || running} onClick={downloadCsv}>Download CSV</button><button disabled={!rows.length || running} onClick={createSheet}>Create Google Sheet</button></div></div>
        <div className="tableWrap"><table><thead><tr><th>MC</th><th>USDOT</th><th>Legal name</th><th>Phone</th><th>Email</th><th>Physical address</th></tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={`${r.mcNumber}-${i}`}><td>MC-{r.mcNumber}</td><td>{r.usdotNumber}</td><td><strong>{r.legalName}</strong></td><td>{r.phone || "—"}</td><td>{r.email || "Not published"}</td><td>{r.physicalAddress}</td></tr>) : <tr><td className="empty" colSpan={6}>Matching carriers will appear here as the scan runs.</td></tr>}</tbody></table></div>
      </section>
      <footer>Use responsibly. Data remains subject to FMCSA source accuracy and availability.</footer>
    </main>
  );
}
