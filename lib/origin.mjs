import { fail } from './validation.mjs';

// Vercel forwards the hostname used by the client, including production aliases
// and preview domains. Do not derive the trusted origin from the Origin header.
export function requestOrigin(req, env = process.env) {
  const configured = env.APP_URL?.trim();
  if (configured) {
    let url;
    try { url = new URL(configured); } catch { fail('APP_URL must be a valid application origin, or leave it unset for automatic detection.', 503); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (env.VERCEL && url.protocol !== 'https:')) {
      fail('APP_URL must be the HTTPS site origin on Vercel, or leave it unset for automatic detection.', 503);
    }
    return url.origin;
  }
  const host = req.headers.host;
  if (typeof host !== 'string' || !/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(host)) fail('Invalid request hostname.', 400);
  const protocol = env.VERCEL || req.socket?.encrypted ? 'https:' : 'http:';
  try { return new URL(protocol + '//' + host).origin; } catch { fail('Invalid request hostname.', 400); }
}

export function checkRequestOrigin(req, env = process.env) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return;
  if (req.headers.origin !== requestOrigin(req, env)) fail('Request origin was rejected.', 403);
}
