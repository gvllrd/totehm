// Country only: Vercel supplies this header from the visitor's public IP.
// This is not GPS and cannot establish an exact physical location (VPNs apply).
const BUILD = '2026-10-28-space-country';
export default function handler(req, res){
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Vary', 'X-Vercel-IP-Country');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if(req.method && !['GET', 'HEAD'].includes(req.method)){
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const raw = req.headers?.['x-vercel-ip-country'];
  const country = typeof raw === 'string' && /^[A-Z]{2}$/.test(raw) ? raw : null;
  const city = country === 'PT' ? 'lisbon' : 'new-york';
  const body = JSON.stringify({ build:BUILD, source:'vercel-ip-country', country, city, path:city === 'lisbon' ? '/lisbon-space' : '/new-york', precise:false });
  return res.status(200).end(req.method === 'HEAD' ? undefined : body);
}
