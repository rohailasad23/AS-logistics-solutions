import { NextRequest, NextResponse } from "next/server";
import { AuthError, LicenseError, requireActiveLicenseFromRequest, getActiveVpnServer, fetchViaVpnRelay } from "@/lib/saas";

export const runtime = "edge";
const clean=(v:string)=>v.replace(/<br\s*\/?\s*>/gi,", ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
function value(html:string,label:string){const safe=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const patterns=[new RegExp(`<t[dh][^>]*>\\s*(?:<[^>]+>)*\\s*${safe}\\s*:?[\\s\\S]*?<\\/t[dh]>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,`i`),new RegExp(`${safe}\\s*:?[\\s\\S]{0,220}?<td[^>]*>([\\s\\S]*?)<\\/td>`,`i`)];for(const p of patterns){const m=html.match(p);if(m)return clean(m[1]);}return "";}
function generalFreight(html:string){const at=html.search(/General Freight/i);if(at<0)return false;const section=clean(html.slice(at,at+500));return /General Freight\s*(?:X|Yes)/i.test(section)||/X\s*General Freight/i.test(clean(html.slice(Math.max(0,at-200),at+300)));}
function usAddress(address:string){return /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/i.test(address)&&!/(Canada|Mexico)\b/i.test(address);}

// Fetches through the admin-configured VPN relay when one is active, otherwise
// falls back to a direct fetch from this server.
async function fetchUpstream(url: string): Promise<{ status: number; text: () => Promise<string>; ok: boolean }> {
  const vpn = await getActiveVpnServer();
  if (vpn) {
    const result = await fetchViaVpnRelay(vpn, url, { headers: { accept: "text/html" } });
    return { status: result.status, ok: result.status >= 200 && result.status < 300, text: async () => result.body };
  }
  const res = await fetch(url, { headers: { "user-agent": "Safer Scraber/1.0 (low-rate carrier research tool)", accept: "text/html" }, redirect: "follow" });
  return { status: res.status, ok: res.ok, text: () => res.text() };
}

export async function GET(req:NextRequest){
  try {
    await requireActiveLicenseFromRequest(req);
  } catch (error) {
    const status = error instanceof AuthError ? 401 : error instanceof LicenseError ? 403 : 401;
    const message = error instanceof Error ? error.message : "Authentication required.";
    return NextResponse.json({ error: message }, { status });
  }

  const mc=req.nextUrl.searchParams.get("mc")||"";
  const dot=req.nextUrl.searchParams.get("dot")||"";

  if(dot){
    if(!/^\d{1,9}$/.test(dot))return NextResponse.json({error:"Invalid DOT number"},{status:400});
    const url=`https://ai.fmcsa.dot.gov/SMS/Carrier/${dot}?FirstView=True`;
    let res:{status:number;ok:boolean;text:()=>Promise<string>}; try{res=await fetchUpstream(url);}catch{return NextResponse.json({error:"FMCSA (AI) could not be reached"},{status:502});}
    if(!res.ok) return NextResponse.json({match:false});
    const html=await res.text();
    const email=(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||"";
    const mcFromLabel=(function(){try{ return value(html,"MC Number"); }catch{ return "";}})();
    const mcFromRegex=(html.match(/MC\s*(?:#|No\.?|Number)?\s*[:\s]*?(\d{1,9})/i)||[])[1]||"";
    const foundMc = mcFromLabel||mcFromRegex||"";
    const legalName=(function(){try{return value(html,"Legal Name");}catch{return "";}})()||"";
    const address=(function(){try{return value(html,"Physical Address");}catch{return "";}})()||"";
    const entity=(function(){try{return value(html,"Entity Type");}catch{return "";}})()||"";
    const usdot = dot;
    if(!email && !foundMc) return NextResponse.json({match:false});
    return NextResponse.json({match:true,carrier:{mcNumber:foundMc,usdotNumber:usdot,legalName,phone:"",email,physicalAddress:address,entityType:entity,usdotStatus:"",authorityStatus:"",generalFreight: foundMc?"Unknown":""}});
  }

  const url=`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
  let res:{status:number;ok:boolean;text:()=>Promise<string>}; try{res=await fetchUpstream(url);}catch{return NextResponse.json({error:"FMCSA could not be reached (VPN relay may be offline — check it in the admin panel)."},{status:502});}
  if(res.status===429)return NextResponse.json({error:"FMCSA asked us to slow down"},{status:429});
  if(res.status===403)return NextResponse.json({error:"Your current VPN/IP is not working properly for FMCSA (request blocked). This VPN server is not suitable — please switch to a different VPN server or location and try again.",vpnBlocked:true},{status:403});
  if(!res.ok)return NextResponse.json({error:`FMCSA returned an unexpected status (${res.status}). Try again shortly.`},{status:502});
  const html=await res.text(); if(/No records matching/i.test(html)||/record not found/i.test(html))return NextResponse.json({match:false});
  const entity=value(html,"Entity Type"); const status=value(html,"USDOT Status"); const authority=value(html,"Operating Authority Status"); const address=value(html,"Physical Address");
  const isCarrier=/carrier/i.test(entity)&&!/broker|freight forwarder/i.test(entity); const active=/active/i.test(status)&&!/inactive|out.of.service/i.test(status); const authorized=/authorized/i.test(authority)&&!/not authorized|inactive/i.test(authority); const property=/property/i.test(html);
  if(!(isCarrier&&active&&authorized&&property&&usAddress(address)&&generalFreight(html)))return NextResponse.json({match:false});
  const email=(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||"";
  return NextResponse.json({match:true,carrier:{mcNumber:mc,usdotNumber:value(html,"USDOT Number"),legalName:value(html,"Legal Name"),phone:value(html,"Phone"),email,physicalAddress:address,entityType:entity,usdotStatus:status,authorityStatus:authority,generalFreight:"Yes"}});
}
