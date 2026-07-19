"use client";

import { useRef, useState } from "react";

type Carrier = {
  mcNumber: string; usdotNumber: string; legalName: string; phone: string;
  email: string; physicalAddress: string; entityType: string; usdotStatus: string;
  authorityStatus: string; generalFreight: string;
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(25);
  const [rows, setRows] = useState<Carrier[]>([]);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  async function run() {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      setStatus("Enter a valid MC range."); return;
    }
    if (end - start + 1 > 20000) { setStatus("Please scan no more than 20,000 MC numbers at a time."); return; }
    stop.current = false; setRunning(true); setRows([]);
    const found: Carrier[] = [];
    for (let mc = start; mc <= end && !stop.current; mc++) {
      setStatus(`Checking MC ${mc.toLocaleString()} • ${mc - start + 1} of ${end - start + 1}`);
      try {
        const response = await fetch(`/api/scrape?mc=${mc}`);
        const data = await response.json();
        if (data.match) { found.push(data.carrier); setRows([...found]); }
        if (!response.ok && response.status === 429) await pause(4000);
      } catch { setStatus(`Connection interrupted at MC ${mc}. You can start again.`); break; }
      await pause(1100);
    }
    setRunning(false);
    setStatus(stop.current ? `Stopped • ${found.length} matching carriers found` : `Complete • ${found.length} matching carriers found`);
  }

  function downloadCsv() {
    const headers = ["MC Number","USDOT Number","Legal Name","Phone","Email","Physical Address","Entity Type","USDOT Status","Authority Status","General Freight"];
      const values = rows.map(r => [r.mcNumber,r.usdotNumber,r.legalName,r.phone,r.email,r.physicalAddress,r.entityType,r.usdotStatus,r.authorityStatus,r.generalFreight]);
      const csv = [headers, ...values].map(line => line.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
      a.download = `as-logistics-${start}-${end}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function createSheet() {
    setStatus("Creating Google Sheet…");
    const response = await fetch("/api/sheets", {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({rows, title:`SAFER Carriers MC ${start}-${end}`})});
    const data = await response.json();
    if (response.ok) { setStatus("Google Sheet created"); window.open(data.url, "_blank", "noopener,noreferrer"); }
    else setStatus(data.error || "Google Sheets is not configured yet. See the setup guide.");
  }

  return <main>
    <header><div className="brand"><span className="mark">A</span><div><strong>AS Logistics Solutions LLC</strong><small>FMCSA carrier intelligence</small></div></div><span className="source">Official SAFER source</span></header>
    <section className="hero">
      <div><p className="eyebrow">CARRIER DISCOVERY</p><h1>Build a cleaner carrier list.</h1><p className="lede">Scan an MC-number range and keep only active U.S. property carriers authorized for hire that carry General Freight.</p></div>
      <div className="panel">
        <div className="fields"><label>Starting MC<input type="number" min="1" value={start} disabled={running} onChange={e=>setStart(Number(e.target.value))}/></label><span>to</span><label>Ending MC<input type="number" min="1" value={end} disabled={running} onChange={e=>setEnd(Number(e.target.value))}/></label></div>
        <div className="actions">{running ? <button className="stop" onClick={()=>stop.current=true}>Stop scan</button> : <button className="primary" onClick={run}>Start scan</button>}<span>{end >= start ? end-start+1 : 0} records max</span></div>
      </div>
    </section>
    <section className="filters"><span>FILTERS APPLIED</span><b>Carrier entity</b><b>Active USDOT</b><b>Authorized for property</b><b>U.S. address</b><b>General Freight</b></section>
    <section className="results">
      <div className="resultsHead"><div><h2>Matching carriers</h2><p>{status}</p></div><div><button disabled={!rows.length || running} onClick={downloadCsv}>Download CSV</button><button disabled={!rows.length || running} onClick={createSheet}>Create Google Sheet</button></div></div>
      <div className="tableWrap"><table><thead><tr><th>MC</th><th>USDOT</th><th>Legal name</th><th>Phone</th><th>Email</th><th>Physical address</th></tr></thead><tbody>{rows.length ? rows.map((r,i)=><tr key={`${r.mcNumber}-${i}`}><td>MC-{r.mcNumber}</td><td>{r.usdotNumber}</td><td><strong>{r.legalName}</strong></td><td>{r.phone || "—"}</td><td>{r.email || "Not published"}</td><td>{r.physicalAddress}</td></tr>) : <tr><td className="empty" colSpan={6}>Matching carriers will appear here as the scan runs.</td></tr>}</tbody></table></div>
    </section>
    <footer>Use responsibly. Data remains subject to FMCSA source accuracy and availability.</footer>
  </main>;
}
