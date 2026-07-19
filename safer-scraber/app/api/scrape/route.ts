import { NextRequest, NextResponse } from "next/server";
import { getLoadGuardEmail } from "./helpers.js";

export const runtime = "edge";
const clean=(v:string)=>v.replace(/<br\s*\/?\s*>/gi,", ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
function value(html:string,label:string){const safe=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const patterns=[new RegExp(`<t[dh][^>]*>\\s*(?:<[^>]+>)*\\s*${safe}\\s*:?[\\s\\S]*?<\\/t[dh]>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,`i`),new RegExp(`${safe}\\s*:?[\\s\\S]{0,220}?<td[^>]*>([\\s\\S]*?)<\\/td>`,`i`)];for(const p of patterns){const m=html.match(p);if(m)return clean(m[1]);}return "";}
function generalFreight(html:string){const at=html.search(/General Freight/i);if(at<0)return false;const section=clean(html.slice(at,at+500));return /General Freight\s*(?:X|Yes)/i.test(section)||/X\s*General Freight/i.test(clean(html.slice(Math.max(0,at-200),at+300)));}
function usAddress(address:string){return /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/i.test(address)&&!/(Canada|Mexico)\b/i.test(address);}
export async function GET(req:NextRequest){
  const mc=req.nextUrl.searchParams.get("mc")||""; if(!/^\d{1,9}$/.test(mc))return NextResponse.json({error:"Invalid MC number"},{status:400});
  const url=`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
  let res:Response; try{res=await fetch(url,{headers:{"user-agent":"AS Logistics Solutions LLC/1.0 (low-rate carrier research tool)",accept:"text/html"},redirect:"follow"});}catch{return NextResponse.json({error:"FMCSA could not be reached"},{status:502});}
  if(res.status===429)return NextResponse.json({error:"FMCSA asked us to slow down"},{status:429}); if(!res.ok)return NextResponse.json({match:false});
  const html=await res.text(); if(/No records matching/i.test(html)||/record not found/i.test(html))return NextResponse.json({match:false});
  const entity=value(html,"Entity Type"); const status=value(html,"USDOT Status"); const authority=value(html,"Operating Authority Status"); const address=value(html,"Physical Address");
  const isCarrier=/carrier/i.test(entity)&&!/broker|freight forwarder/i.test(entity); const active=/active/i.test(status)&&!/inactive|out.of.service/i.test(status); const authorized=/authorized/i.test(authority)&&!/not authorized|inactive/i.test(authority); const property=/property/i.test(html);
  if(!(isCarrier&&active&&authorized&&property&&usAddress(address)&&generalFreight(html)))return NextResponse.json({match:false});
  const saferEmail=(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||"";
  const legalName=value(html,"Legal Name");
  const loadguardEmail=await getLoadGuardEmail(legalName,mc);
  const email=loadguardEmail||saferEmail;
  return NextResponse.json({match:true,carrier:{mcNumber:mc,usdotNumber:value(html,"USDOT Number"),legalName,phone:value(html,"Phone"),email,physicalAddress:address,entityType:entity,usdotStatus:status,authorityStatus:authority,generalFreight:"Yes"}});
}
