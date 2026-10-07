// Estadísticas reales de Google Analytics 4 para el panel de administración.
// - Solo responde a administradores: verifica la sesión con la misma función is_admin() de Supabase que usa el panel.
// - Las credenciales de Google viven únicamente en variables de entorno de Vercel (nunca llegan al navegador).
// - No agrega dependencias: firma el acceso con el módulo crypto de Node y consulta la API REST de Google.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GA_PROPERTY_ID   ID numérico de la PROPIEDAD de Analytics (no el del flujo de datos, no el que empieza con G-)
//   GA_CLIENT_EMAIL  campo "client_email" del JSON de la cuenta de servicio
//   GA_PRIVATE_KEY   campo "private_key" del JSON de la cuenta de servicio
import crypto from 'node:crypto'

const API = 'https://analyticsdata.googleapis.com/v1beta'
const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'
const RANGES = {
  today: { cur: ['today', 'today'], prev: ['yesterday', 'yesterday'], days: 1 },
  '7d': { cur: ['6daysAgo', 'today'], prev: ['13daysAgo', '7daysAgo'], days: 7 },
  '30d': { cur: ['29daysAgo', 'today'], prev: ['59daysAgo', '30daysAgo'], days: 30 },
  '90d': { cur: ['89daysAgo', 'today'], prev: ['179daysAgo', '90daysAgo'], days: 90 }
}
const GRAN_DIM = { hour: 'hour', day: 'date', week: 'yearWeek', month: 'yearMonth' }

// ---------- utilidades ----------
const dr = a => ({ startDate: a[0], endDate: a[1] })
const rows = j => (j?.rows || []).map(r => ({
  d: (r.dimensionValues || []).map(x => x.value),
  m: (r.metricValues || []).map(x => Number(x.value) || 0)
}))
const clean = t => String(t || '').replace(/^(Meraki Fútbol|FM Meraki)\s*\|\s*/, '').trim()
const GENERIC = /^(Meraki Fútbol|FM Meraki|\(not set\)|)$/
const slugTitle = p => { const s = decodeURIComponent(String(p).split('/').filter(Boolean).pop() || '').replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1) }
const ymd = ms => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '')
function todayUTC(tz) { // fecha de "hoy" en la zona horaria de la propiedad
  let s; try { s = new Intl.DateTimeFormat('en-CA', { timeZone: tz || DEFAULT_TZ }).format(new Date()) } catch { s = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TZ }).format(new Date()) }
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// ---------- configuración ----------
function readConfig() {
  const prop = String(process.env.GA_PROPERTY_ID || '').trim().replace(/^properties\//, '')
  const email = String(process.env.GA_CLIENT_EMAIL || '').trim()
  let key = String(process.env.GA_PRIVATE_KEY || '').trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
  const missing = []
  if (!prop) missing.push('GA_PROPERTY_ID')
  if (!email) missing.push('GA_CLIENT_EMAIL')
  if (!key) missing.push('GA_PRIVATE_KEY')
  return { prop, email, key, missing }
}

// ---------- seguridad: solo administradores ----------
async function isAdmin(token) {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!base || !key) return null
  try {
    const r = await fetch(`${base}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: '{}'
    })
    return r.ok ? (await r.json()) === true : false
  } catch { return null }
}

// ---------- acceso a Google (cuenta de servicio) ----------
const b64 = v => Buffer.from(v).toString('base64url')
let cached = { token: '', exp: 0 }
async function googleToken({ email, key }) {
  const now = Math.floor(Date.now() / 1000)
  if (cached.token && cached.exp - 60 > now) return cached.token
  let jwt
  try {
    const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claim = b64(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
    const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key, 'base64url')
    jwt = `${head}.${claim}.${sig}`
  } catch { throw Object.assign(new Error('clave privada inválida'), { hint: 'bad_key' }) }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.access_token) throw Object.assign(new Error(j.error_description || j.error || 'auth'), { hint: 'auth_failed' })
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600) }
  return cached.token
}

const hintFor = (status, msg) =>
  /has not been used in project|is disabled|SERVICE_DISABLED/i.test(msg) ? 'api_disabled'
    : status === 403 || status === 404 ? 'no_access'
      : 'ga_error'

async function ga(cfg, token, method, body) {
  const r = await fetch(`${API}/properties/${cfg.prop}:${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msg = j?.error?.message || `HTTP ${r.status}`
    throw Object.assign(new Error(msg), { hint: hintFor(r.status, msg) })
  }
  return j
}
const batch = async (cfg, token, requests) => (await ga(cfg, token, 'batchRunReports', { requests })).reports || []

// ---------- armado de cada sección ----------
const byViews = [{ metric: { metricName: 'screenPageViews' }, desc: true }]
const pathIn = prefixes => {
  const f = p => ({ filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: p } } })
  return prefixes.length === 1 ? f(prefixes[0]) : { orGroup: { expressions: prefixes.map(f) } }
}
function topContent(report, n = 10) { // une los títulos distintos de una misma página y se queda con el real
  const map = new Map()
  for (const { d, m } of rows(report)) {
    const [path, raw] = d, title = clean(raw)
    const e = map.get(path) || { path, views: 0, title: '', best: -1 }
    e.views += m[0]
    if (!GENERIC.test(title) && m[0] > e.best) { e.title = title; e.best = m[0] }
    map.set(path, e)
  }
  return [...map.values()].sort((a, b) => b.views - a.views).slice(0, n).map(e => ({ path: e.path, views: e.views, title: e.title || slugTitle(e.path) }))
}
const simple = (report, n) => rows(report).slice(0, n).map(({ d, m }) => ({ name: d[0], value: m[0] }))

function buildSeries(report, kind, days, tz) {
  const map = new Map(rows(report).map(({ d, m }) => [d[0], { users: m[0], sessions: m[1], views: m[2] }]))
  let keys
  if (kind === 'hour') keys = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  else if (kind === 'day') { const t = todayUTC(tz); keys = Array.from({ length: days }, (_, i) => ymd(t - (days - 1 - i) * 864e5)) }
  else keys = [...map.keys()].sort()
  return keys.map(k => ({ k, ...(map.get(k) || { users: 0, sessions: 0, views: 0 }) }))
}

function summaryOf(report) {
  const out = { cur: null, prev: null }
  for (const { d, m } of rows(report)) {
    const o = { users: m[0], sessions: m[1], views: m[2], avgDuration: m[3], newUsers: m[4] }
    if (d[0] === 'date_range_0') out.cur = o
    else if (d[0] === 'date_range_1') out.prev = o
  }
  const zero = { users: 0, sessions: 0, views: 0, avgDuration: 0, newUsers: 0 }
  return { cur: out.cur || zero, prev: out.prev || zero }
}

// ---------- endpoint ----------
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  const send = (status, body) => res.status(status).json(body)
  if (req.method !== 'GET') return send(405, { error: 'method' })

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return send(401, { error: 'no_auth' })
  const admin = await isAdmin(bearer)
  if (admin === null) return send(500, { error: 'server_config' })
  if (!admin) return send(403, { error: 'forbidden' })

  const cfg = readConfig()
  if (cfg.missing.length) return send(503, { error: 'not_configured', missing: cfg.missing })
  if (!/^\d+$/.test(cfg.prop)) return send(503, { error: 'no_access' })
  if (!/BEGIN [A-Z ]*PRIVATE KEY/.test(cfg.key)) return send(503, { error: 'bad_key' })

  const q = req.query || {}
  const range = RANGES[q.range] ? q.range : '7d'
  const R = RANGES[range]

  try {
    const token = await googleToken(cfg)

    // Tiempo real (se consulta aparte, cada ~30 s, para que sea liviano)
    if (q.part === 'realtime') {
      const [a, b] = await Promise.allSettled([
        ga(cfg, token, 'runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }),
        ga(cfg, token, 'runRealtimeReport', { dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 6 })
      ])
      if (a.status === 'rejected' && b.status === 'rejected') throw a.reason
      return send(200, {
        ok: true,
        active: a.status === 'fulfilled' ? (rows(a.value)[0]?.m[0] || 0) : null,
        pages: b.status === 'fulfilled' ? rows(b.value).map(({ d, m }) => ({ name: clean(d[0]) || 'Sin título', users: m[0] })) : null
      })
    }

    const kind = range === 'today' ? 'hour' : (GRAN_DIM[q.gran] && q.gran !== 'hour' ? q.gran : 'day')
    const cur = dr(R.cur)
    const m3 = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }]

    // Dos consultas agrupadas en paralelo (en vez de 9 sueltas) para respetar los límites de Google.
    const [w1, w2] = await Promise.allSettled([
      batch(cfg, token, [
        { dateRanges: [cur, dr(R.prev)], metrics: [...m3, { name: 'averageSessionDuration' }, { name: 'newUsers' }] },
        { dateRanges: [cur], dimensions: [{ name: GRAN_DIM[kind] }], metrics: m3, orderBys: [{ dimension: { dimensionName: GRAN_DIM[kind] } }], limit: 1000 },
        { dateRanges: [cur], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], orderBys: byViews, limit: 10 },
        { dateRanges: [cur], dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }], dimensionFilter: pathIn(['/noticias/', '/cronicas/', '/entrevistas/']), orderBys: byViews, limit: 60 },
        { dateRanges: [cur], dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }], dimensionFilter: pathIn(['/programas/']), orderBys: byViews, limit: 40 }
      ]),
      batch(cfg, token, [
        { dateRanges: [cur], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 },
        { dateRanges: [cur], dimensions: [{ name: 'sessionSource' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 },
        { dateRanges: [cur], dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 6 },
        { dateRanges: [cur], dimensions: [{ name: 'city' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 10 }
      ])
    ])

    if (w1.status === 'rejected' && w2.status === 'rejected') throw w1.reason
    const errors = {}
    const out = { ok: true, range, kind, generatedAt: new Date().toISOString(), errors }

    if (w1.status === 'fulfilled') {
      const [s, t, p, c, pr] = w1.value
      const tz = s?.metadata?.timeZone || t?.metadata?.timeZone || DEFAULT_TZ
      out.tz = tz
      out.summary = summaryOf(s)
      out.series = buildSeries(t, kind, R.days, tz)
      out.pages = rows(p).map(({ d, m }) => ({ path: d[0], views: m[0], users: m[1] }))
      out.contents = topContent(c)
      out.programs = topContent(pr)
    } else for (const k of ['summary', 'series', 'pages', 'contents', 'programs']) errors[k] = w1.reason?.hint || 'ga_error'

    if (w2.status === 'fulfilled') {
      const [ch, so, dv, ci] = w2.value
      out.channels = simple(ch, 10)
      out.sources = simple(so, 8)
      out.devices = simple(dv, 6)
      out.cities = simple(ci, 8)
    } else for (const k of ['channels', 'sources', 'devices', 'cities']) errors[k] = w2.reason?.hint || 'ga_error'

    return send(200, out)
  } catch (e) {
    console.error('[analytics]', e?.hint || '', e?.message || e) // nunca se registran claves ni tokens
    return send(502, { error: e?.hint || 'ga_error' })
  }
}
