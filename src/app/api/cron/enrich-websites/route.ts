import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isPublicIp } from '@/lib/security/ip';

export const runtime = 'nodejs';
export const maxDuration = 10;
const BATCH_SIZE = 2;
const MAX_HTML = 512 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authorized(request: Request) {
  const secret = process.env.WEBSITE_MONITOR_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || secret.length < 32 || !supplied) return false;
  const a = Buffer.from(secret), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function decode(value: string) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).trim();
}
function clean(value: string | undefined, max: number) {
  const v = decode((value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
  return v && v.length >= 3 ? v.slice(0, max) : null;
}
function attr(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = html.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m?.[1];
}
function extract(html: string, base: URL) {
  const meta = (name: string) => {
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
      const key = attr(tag, 'property') ?? attr(tag, 'name');
      if (key?.toLowerCase() === name.toLowerCase()) return attr(tag, 'content');
    }
    return undefined;
  };
  const title = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1], 120);
  const description = clean(meta('description') ?? meta('og:description'), 500);
  const logoRaw = meta('og:image') ?? (() => {
    const tags = html.match(/<link\b[^>]*>/gi) ?? [];
    const icon = tags.find(t => /rel=["'][^"']*(?:icon|apple-touch-icon)/i.test(t));
    return icon ? attr(icon, 'href') : undefined;
  })();
  let logo_url: string | null = null;
  try { if (logoRaw) { const u = new URL(decode(logoRaw), base); if (u.protocol === 'https:') logo_url = u.toString().slice(0, 2048); } } catch {}
  const social: Record<string,string> = {};
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].slice(0, 500);
  for (const match of links) {
    try {
      const u = new URL(decode(match[1]!), base);
      if (u.protocol !== 'https:') continue;
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      const key = host.includes('facebook.com') ? 'facebook' : host.includes('instagram.com') ? 'instagram' :
        host.includes('youtube.com') || host === 'youtu.be' ? 'youtube' : host === 'x.com' || host === 'twitter.com' ? 'x' : null;
      if (key && !social[key]) social[key] = u.toString().slice(0, 2048);
    } catch {}
  }
  const lang = html.match(/<html\b[^>]*\blang=["']([a-z]{2}(?:-[A-Z]{2})?)["']/i)?.[1]?.slice(0,8) ?? null;
  const emails = [...new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
    .map(x => x.toLowerCase()).filter(x => !/\.(png|jpg|jpeg|webp|svg)$/i.test(x)))].slice(0,3);
  const streamLinks = [...html.matchAll(/(?:href|src)=["']([^"']+\.(?:mp3|aac|ogg|m3u8?)(?:\?[^"']*)?)["']/gi)]
    .slice(0,5).flatMap(m => { try { const u = new URL(decode(m[1]!), base); return u.protocol === 'https:' || u.protocol === 'http:' ? [u.toString().slice(0,2048)] : []; } catch { return []; } });
  const candidates: Record<string,unknown> = {};
  const confidence: Record<string,string> = {};
  if (title) { candidates.name = title; confidence.name = 'media'; }
  if (description) { candidates.description = description; confidence.description = 'high'; }
  if (logo_url) { candidates.logo_url = logo_url; confidence.logo_url = 'medium'; }
  if (Object.keys(social).length) { candidates.social_links = social; confidence.social_links = 'high'; }
  if (lang) { candidates.language = lang; confidence.language = 'medium'; }
  if (emails.length) { candidates.contact_emails = emails; confidence.contact_emails = 'medium'; }
  if (streamLinks.length) { candidates.stream_candidates = [...new Set(streamLinks)]; confidence.stream_candidates = 'low'; }
  return { candidates, confidence };
}

async function fetchPage(input: URL): Promise<{ html: string; finalUrl: URL }> {
  let url = input;
  for (let hop=0; hop<=3; hop++) {
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443')
      throw new Error('Solo se permiten sitios HTTPS sin credenciales ni puertos personalizados.');
    const host = url.hostname.replace(/^\[|\]$/g,'');
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Host no permitido.');
    const addresses = net.isIP(host) ? [{address:host,family:net.isIP(host)}] : await dns.lookup(host,{all:true,verbatim:true});
    if (!addresses.length || !addresses.every(a=>isPublicIp(a.address))) throw new Error('El dominio apunta a una IP privada o reservada.');
    const pin = addresses[0]!;
    const response = await new Promise<{status:number;location?:string;body?:string}>((resolve,reject)=>{
      let settled=false; const finish=(fn:()=>void)=>{if(!settled){settled=true;clearTimeout(timer);fn();}};
      const req=https.request({hostname:url.hostname,port:443,path:url.pathname+url.search,method:'GET',
        headers:{'User-Agent':'RadioEternaWebsiteResearch/1.0 (+https://radioeterna.vercel.app)','Accept':'text/html,application/xhtml+xml;q=0.9'},
        lookup:((_h:string,o:{all?:boolean},cb:(...args:unknown[])=>void)=>o?.all?cb(null,[{address:pin.address,family:pin.family}]):cb(null,pin.address,pin.family)) as never
      },res=>{
        if ((res.statusCode??0)>=300 && (res.statusCode??0)<400 && res.headers.location) {
          res.resume(); finish(()=>resolve({status:res.statusCode??0,location:res.headers.location})); return;
        }
        const chunks:Buffer[]=[];let size=0;
        res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>MAX_HTML){req.destroy(new Error('Página demasiado grande.'));return;}chunks.push(chunk);});
        res.on('end',()=>finish(()=>resolve({status:res.statusCode??0,body:Buffer.concat(chunks).toString('utf8')})));
        res.on('error',e=>finish(()=>reject(e)));
      });
      const timer=setTimeout(()=>req.destroy(new Error('Tiempo de espera agotado.')),5000);
      req.on('error',e=>finish(()=>reject(e)));req.end();
    });
    if (response.location) {
      if (hop===3) throw new Error('Demasiadas redirecciones.');
      url=new URL(response.location,url); continue;
    }
    if (response.status<200 || response.status>=300) throw new Error(`El sitio respondió HTTP ${response.status}.`);
    return {html:response.body ?? '',finalUrl:url};
  }
  throw new Error('No se pudo seguir la redirección.');
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({error:'Unauthorized'},{status:401});
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) return NextResponse.json({error:'Monitor is not configured.'},{status:503});
  const cursor=new URL(request.url).searchParams.get('cursor');
  if (cursor && !UUID_RE.test(cursor)) return NextResponse.json({error:'Invalid cursor.'},{status:400});
  const supabase=createClient(supabaseUrl,key,{auth:{autoRefreshToken:false,persistSession:false}});
  let query=supabase.from('stations').select('id,name,website_url').eq('status','published').is('deleted_at',null).not('website_url','is',null).order('id').limit(BATCH_SIZE);
  if(cursor) query=query.gt('id',cursor);
  const {data,error}=await query;
  if(error)return NextResponse.json({error:'Could not load stations.'},{status:500});
  const stations=data??[]; let scanned=0, skipped=0; const issues:string[]=[];
  for(const station of stations) {
    try {
      const pending=await supabase.from('station_website_suggestions').select('id').eq('station_id',station.id).eq('status','pending').limit(1);
      if(pending.data?.length){skipped++;continue;}
      const source=new URL(station.website_url!);
      const {html,finalUrl}=await fetchPage(source);
      const {candidates,confidence}=extract(html,finalUrl);
      const {error:insertError}=await supabase.from('station_website_suggestions').insert({
        station_id:station.id,station_name:station.name,source_url:source.toString(),final_url:finalUrl.toString(),
        suggestions:candidates,confidence,status:Object.keys(candidates).length?'pending':'failed',
        detail:Object.keys(candidates).length?null:'No se encontraron datos aprovechables en la página principal.'
      });
      if(insertError)throw insertError;
      scanned++;
    } catch(e) {
      const detail=(e instanceof Error?e.message:'Error desconocido').slice(0,500);
      await supabase.from('station_website_suggestions').insert({station_id:station.id,station_name:station.name,
        source_url:station.website_url, suggestions:{},confidence:{},status:'failed',detail});
      issues.push(station.name+': '+detail);
    }
  }
  const last=stations[stations.length-1],done=stations.length<BATCH_SIZE;
  return NextResponse.json({checked:stations.length,scanned,skipped,issues,done,nextCursor:done?null:last?.id??null});
}
