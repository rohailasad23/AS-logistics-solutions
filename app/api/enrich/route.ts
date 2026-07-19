import { NextRequest, NextResponse } from "next/server";
import { AuthError, LicenseError, requireActiveLicenseFromRequest } from "@/lib/saas";

export const runtime = "edge";

async function lookupByMC(origin: string, mc: string, cookie: string) {
  const res = await fetch(`${origin}/api/scrape?mc=${mc}`, { headers: { accept: "application/json", cookie } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

async function lookupByDOT(origin: string, dot: string, cookie: string) {
  const res = await fetch(`${origin}/api/scrape?dot=${dot}`, { headers: { accept: "application/json", cookie } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

async function lookupByTemplate(template: string, mc: string) {
  try {
    let url = String(template);
    if (url.includes("{mc}")) {
      url = url.replace(/\{mc\}/g, mc);
    } else if (/mc-\d+/i.test(url)) {
      url = url.replace(/mc-\d+/i, `mc-${mc}`);
    } else if (/\d{5,}(?!.*\d)/.test(url)) {
      url = url.replace(/\d{5,}(?!.*\d)/, mc);
    } else {
      url = url.replace(/\/$/, "");
      url = `${url}/mc-${mc}`;
    }

    const res = await fetch(url, { headers: { accept: "text/html", "user-agent": "Safer Scraber/1.0 (enrich)" } });
    if (!res.ok) return null;
    const html = await res.text();
    const email = (html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0] || "";
    return { email: email.trim(), url };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireActiveLicenseFromRequest(req);
  } catch (error) {
    const status = error instanceof AuthError ? 401 : error instanceof LicenseError ? 403 : 401;
    const message = error instanceof Error ? error.message : "Authentication required.";
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await req.json();
    const mcs: string[] = Array.isArray(body?.mcs) ? body.mcs.map(String) : [];
    if (!mcs.length) return NextResponse.json({ error: "No MC numbers provided" }, { status: 400 });

    const origin = req.nextUrl.origin;
    const cookie = req.headers.get("cookie") ?? "";
    const results: { mc: string; email: string }[] = [];

    const template: string = typeof body?.template === "string"
      ? body.template
      : "https://loadguard.ai/trucking-company/legacy-lines-logistics-llc-mc-{mc}";

    for (const mc of mcs) {
      await new Promise((r) => setTimeout(r, 300));

      try {
        const primary = await lookupByMC(origin, mc, cookie);
        let email = "";
        let usdot = "";
        if (primary && primary.match && primary.carrier) {
          email = (primary.carrier.email || "").trim();
          usdot = (primary.carrier.usdotNumber || "").trim();
        }
        try {
          const templ = await lookupByTemplate(template, mc);
          if (templ && templ.email) email = templ.email;
          else if (!email && usdot) {
            const alt = await lookupByDOT(origin, usdot, cookie);
            if (alt && alt.match && alt.carrier) {
              email = (alt.carrier.email || "").trim();
            }
          }
        } catch {
        }

        results.push({ mc, email: email || "" });
      } catch {
        results.push({ mc, email: "" });
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
