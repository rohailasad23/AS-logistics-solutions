export function slugifyCompany(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractLoadGuardEmail(html) {
  const labelMatch = html.match(/Email Address:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (labelMatch) return labelMatch[1].trim();

  const mailtoMatch = html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (mailtoMatch) return mailtoMatch[1].trim();

  const anyMatch = html.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return anyMatch ? anyMatch[1].trim() : "";
}

export async function getLoadGuardEmail(legalName, mc) {
  const slug = slugifyCompany(legalName);
  if (!slug) return "";

  const url = `https://loadguard.ai/trucking-company/${slug}-mc-${mc}`;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "AS Logistics Solutions LLC/1.0 (loadguard email lookup)",
        accept: "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = await res.text();
    return extractLoadGuardEmail(html);
  } catch {
    return "";
  }
}
