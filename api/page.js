// Versión rastreable de cada nota (noticias, crónicas, entrevistas).
// Devuelve el MISMO index.html de la web, pero con título, descripción, canonical, Open Graph,
// Twitter Cards, datos estructurados (NewsArticle) y el texto completo de la nota ya incluidos.
// Los buscadores y WhatsApp lo leen sin ejecutar JavaScript; las personas ven la web normal
// (React reemplaza ese contenido al cargar). Misma URL para todos => sin contenido duplicado.
const CFG = {
  noticias:   { t: 'news',       sel: '*,writers(nombre_visible),news_clubs(clubs(nombre,slug))', fecha: 'fecha',        sec: r => r.categoria },
  cronicas:   { t: 'chronicles', sel: '*,writers(nombre_visible),matches(tournaments(nombre),home:clubs!matches_home_club_id_fkey(nombre,slug),away:clubs!matches_away_club_id_fkey(nombre,slug))', fecha: 'publicada_at', sec: () => 'Crónicas' },
  entrevistas:{ t: 'interviews', sel: '*',                                                            fecha: 'fecha',        sec: () => 'Entrevistas' }
}
const SITE = 'Meraki Fútbol'
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s }
const abs = (u, o) => !u ? '' : /^https?:\/\//i.test(u) ? u : o + (u.startsWith('/') ? '' : '/') + u

// Limpieza simple del HTML guardado (ya se sanitiza al guardar; esto es una segunda barrera).
function bodyHtml(c) {
  c = String(c || '')
  if (!/<(p|h2|h3|ul|ol|blockquote|figure|hr)[\s>\/]/i.test(c)) {
    const parts = /\n[ \t]*\n/.test(c) ? c.split(/\n[ \t]*\n/) : c.split('\n')
    return parts.map(p => p.trim()).filter(Boolean).map(p => '<p>' + esc(p) + '</p>').join('')
  }
  return c.replace(/<(script|style|iframe|object|embed|noscript|form)[\s\S]*?<\/\1>/gi, '')
          .replace(/<\/?(script|style|iframe|object|embed|noscript|form|input|button)[^>]*>/gi, '')
          .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
          .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2')
}
const plain = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

async function sb(path) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  try { const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }); return r.ok ? await r.json() : null } catch { return null }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const origin = (process.env.SITE_URL || process.env.VITE_SITE_URL || `https://${host}`).replace(/\/$/, '')
  const { tipo, slug } = req.query || {}
  const cfg = CFG[tipo]

  // Plantilla real de la web (index.html compilado por Vite).
  let tpl = ''
  try { const r = await fetch(`https://${host}/index.html`); if (r.ok) tpl = await r.text() } catch {}
  if (!tpl) tpl = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>'

  const rows = cfg && /^[a-z0-9-]+$/i.test(slug || '') ? await sb(`${cfg.t}?slug=eq.${encodeURIComponent(slug)}&estado=eq.publicada&select=${cfg.sel}&limit=1`) : null
  const r = rows && rows[0]
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (!r) { // nota inexistente: la web muestra su "No encontrado" y Google recibe un 404 real
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(404).send(tpl.replace('</head>', '<meta name="robots" content="noindex"></head>'))
  }

  const url = `${origin}/${tipo}/${slug}`
  const title = cut(r.seo_titulo || r.titulo, 110)
  const desc = cut(r.meta_descripcion || r.bajada || r.resumen || plain(bodyHtml(r.contenido)), 160)
  const firstImg = (String(r.contenido || '').match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1]
  const img = abs(r.imagen_url, origin) || abs(firstImg, origin) || `${origin}/compartir-meraki-futbol.png`
  const pub = r[cfg.fecha] || r.created_at, mod = r.updated_at || pub
  const author = r.writers?.nombre_visible
  const m = r.matches
  const clubs = tipo === 'noticias' ? (r.news_clubs || []).map(x => x.clubs).filter(Boolean) : tipo === 'cronicas' && m ? [m.home, m.away].filter(Boolean) : []
  const html = bodyHtml(r.contenido)

  // Noticias relacionadas (enlaces internos rastreables), solo publicadas y existentes.
  let rel = []
  if (tipo === 'noticias') {
    const list = await sb(`news?estado=eq.publicada&slug=neq.${encodeURIComponent(slug)}&select=titulo,slug,categoria,tournament_id,temas&order=fecha.desc&limit=40`) || []
    const mine = new Set((r.temas || []).map(t => t.toLowerCase()))
    rel = list.map(n => ({ n, s: (n.tournament_id && n.tournament_id === r.tournament_id ? 2 : 0) + (n.categoria === r.categoria ? 1 : 0) + (n.temas || []).filter(t => mine.has(String(t).toLowerCase())).length * 2 }))
      .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.n)
  }

  const ld = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url }, url,
    headline: cut(r.titulo, 110), description: desc, image: [img],
    datePublished: pub || undefined, dateModified: mod || undefined,
    author: author ? { '@type': 'Person', name: author } : { '@type': 'Organization', name: SITE },
    publisher: { '@type': 'Organization', name: SITE, logo: { '@type': 'ImageObject', url: `${origin}/logo.webp` } },
    articleSection: cfg.sec(r) || undefined, inLanguage: 'es-AR',
    keywords: r.temas?.length ? r.temas.join(', ') : undefined,
    about: clubs.length ? clubs.map(c => ({ '@type': 'SportsTeam', name: c.nombre })) : undefined
  }
  const head = `<title>${esc(title)} | ${SITE}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="${SITE}"><meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
${pub ? `<meta property="article:published_time" content="${esc(new Date(pub).toISOString())}">` : ''}${mod ? `<meta property="article:modified_time" content="${esc(new Date(mod).toISOString())}">` : ''}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`

  const body = `<article><h1>${esc(r.titulo)}</h1>${r.bajada ? `<p><strong>${esc(r.bajada)}</strong></p>` : ''}${r.imagen_url ? `<img src="${esc(img)}" alt="${esc(r.imagen_alt || r.titulo)}">` : ''}${author ? `<p>Por ${esc(author)}</p>` : ''}${html}${rel.length ? `<h2>Te puede interesar</h2><ul>${rel.map(n => `<li><a href="/noticias/${esc(n.slug)}">${esc(n.titulo)}</a></li>`).join('')}</ul>` : ''}</article>`

  // Quita las etiquetas genéricas del index.html y pone las de la nota.
  let out = tpl.replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/gi, '')
    .replace('</head>', head + '</head>')
    .replace(/<div id="root">\s*<\/div>/, `<div id="root">${body}</div>`)
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(out)
}
