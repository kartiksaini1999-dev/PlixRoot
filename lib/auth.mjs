import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { get, put, rateLimit } from './store.mjs';
export const sha=s=>createHash('sha256').update(s).digest('hex');
export const phoneNumber=s=>{let n=String(s||'').replace(/\D/g,'');if(n.length===10)n='91'+n;if(!/^91[6-9]\d{9}$/.test(n))throw Object.assign(new Error('Enter a valid Indian WhatsApp number.'),{status:400});return '+'+n};
export function previewMode(){return process.env.WHATSAPP_MODE==='preview' && !process.env.VERCEL && process.env.NODE_ENV!=='production'}
export async function twilio(path,fields) {
  const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN;
  if(!sid||!token)throw Object.assign(new Error('WhatsApp messaging is not configured.'),{status:503});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${path}.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(sid+':'+token).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok)throw Object.assign(new Error('WhatsApp provider rejected the request. Please try again later.'),{status:502});return result;
}
// A random browser-scoped owner protects private data without phone authentication.
export async function startSession(req){
  try{const user=await authenticate(req);return {user,token:null}}catch(e){if(e.status!==401)throw e}
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  if(!await rateLimit('session-start:'+sha(ip),50,3600000))throw Object.assign(new Error('Too many new journeys. Please try again later.'),{status:429});
  const userId='guest_'+randomBytes(24).toString('hex'),user={id:userId,mode:'browser-session',createdAt:Date.now()};
  await put('user',userId,userId,user);
  const token=randomBytes(32).toString('base64url');await put('session',sha(token),userId,{id:sha(token),userId,expiresAt:Date.now()+7*86400000,createdAt:Date.now()});return {user,token};
}
export function cookie(req){const v=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('root_session='));return v?.slice(13)||''}
export function sessionCookie(token,expire=false){return `root_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expire?0:604800}${process.env.VERCEL||process.env.APP_URL?.startsWith('https:')?'; Secure':''}`}
export async function authenticate(req){const token=cookie(req);if(!token)throw Object.assign(new Error('Start a browser journey to save your assessment.'),{status:401});const session=await get('session',sha(token));if(!session||session.expiresAt<Date.now())throw Object.assign(new Error('This browser journey has expired. Start a new assessment.'),{status:401});const user=await get('user',session.userId);if(!user)throw Object.assign(new Error('Journey unavailable.'),{status:401});return user}
export function safeEqual(a,b){const aa=Buffer.from(a||''),bb=Buffer.from(b||'');return aa.length===bb.length&&timingSafeEqual(aa,bb)}
export function isReviewer(req){return !!process.env.REVIEWER_API_KEY&&safeEqual(req.headers['x-review-key'],process.env.REVIEWER_API_KEY)}
