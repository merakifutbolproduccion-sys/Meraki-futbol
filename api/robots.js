// robots.txt: permite todo el sitio público, bloquea el panel y avisa dónde está el sitemap.
export default function handler(req,res){
 const base=(process.env.SITE_URL||process.env.VITE_SITE_URL||`https://${req.headers['x-forwarded-host']||req.headers.host}`).replace(/\/$/,'')
 res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=86400')
 res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /buscar\n\nSitemap: ${base}/sitemap.xml\n`)}
