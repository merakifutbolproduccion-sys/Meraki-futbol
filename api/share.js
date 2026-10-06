// Vista previa al compartir links (WhatsApp, Facebook, Instagram, etc.).
// Solo la ven los robots de las redes: las personas siguen entrando a la web normal.
const FUT = ['futbol','cronicas','clubes','ascenso','copas','afa','entrevistas','noticias','quienes-somos','buscar','primera','resultados','tablas']
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s }

async function sbGet(path) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    return r.ok ? await r.json() : null
  } catch { return null }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const site = `https://${host}`
  const path = String(req.query.p || '/').split('?')[0]
  const seg = path.split('/').filter(Boolean)
  const IMG_FM = `${site}/compartir-fm-meraki.jpg`
  const IMG_FUT = `${site}/compartir-meraki-futbol.png`

  let title = 'FM Meraki | Radio comunitaria'
  let desc = 'La radio de tu ciudad, el sitio que vos elegís. Escuchá en vivo, mirá la grilla y conocé los programas.'
  let img = IMG_FM

  const first = seg[0] || ''
  if (first === 'programas' && seg[1]) {
    const p = await sbGet(`programs?slug=eq.${encodeURIComponent(seg[1])}&activo=eq.true&select=nombre,descripcion,logo_url,slug&limit=1`)
    const x = p && p[0]
    if (x) {
      if (x.slug === 'meraki-futbol') { title = 'Meraki Fútbol'; img = IMG_FUT; desc = cut(x.descripcion, 200) || 'Medio digital de fútbol argentino.' }
      else { title = `${x.nombre} | FM Meraki`; img = x.logo_url || IMG_FM; desc = cut(x.descripcion, 200) || `${x.nombre}, un programa de FM Meraki.` }
    }
  } else if (FUT.includes(first)) {
    title = 'Meraki Fútbol'
    desc = 'Medio digital de fútbol argentino: crónicas, noticias, clubes, ascenso y entrevistas.'
    img = IMG_FUT
  }

  const url = `${site}${path === '/' ? '' : path}`
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="FM Meraki"><meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
