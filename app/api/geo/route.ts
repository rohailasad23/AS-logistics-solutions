import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  PK: "Pakistan",
  IN: "India",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  SG: "Singapore",
  AE: "United Arab Emirates",
};

export async function GET(req: NextRequest) {
  const cf = (req as unknown as { cf?: { country?: string } }).cf;
  const code = cf?.country || req.headers.get("cf-ipcountry") || "";
  const name = COUNTRY_NAMES[code] || code || "Unknown";

  return NextResponse.json({
    countryCode: code || null,
    countryName: code ? name : null,
  });
}
