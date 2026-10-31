// Asistente de IA del panel: títulos, bajada y borrador de crónica con Gemini.
// - Solo responde a administradores (misma función is_admin() de Supabase que usa el panel).
// - La clave vive únicamente en variables de entorno de Vercel: nunca llega al navegador.
// - Modelo por defecto: gemini-3.8-flash (capa gratuita). Si está saturado o agota el límite, prueba el de respaldo.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY          clave creada en Google AI Studio (OBLIGATORIA, sin prefijo VITE_)
//   GEMINI_MODEL            opcional, por defecto gemini-3.8-flash
//   GEMINI_FALLBACK_MODEL   opcional, por defecto gemini-3.6-flash
const API = 'https://generativelanguage.googleapis.com/v1beta/models'
const one = (v, n = 300) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const long = (v, n = 12000) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n)

const SYS = `Sos redactor de MERAKI FÚTBOL, un medio digital de fútbol argentino. Escribís en español rioplatense, directo, pasional y periodístico, sin tono robótico ni exceso de formalidad.
REGLAS INQUEBRANTABLES:
1. Usá ÚNICAMENTE los datos que aparecen en el pedido. No inventes resultados, goleadores, minutos, estadísticas, declaraciones, lesiones, fechas, transferencias ni contexto.
2. Si un dato no está en el pedido, no lo menciones ni lo supongas.
3. No uses comillas ni atribuyas frases a nadie salvo que esa frase esté textual en el pedido.
4. Nada de clickbait vacío ("no vas a creer", "increíble", "urgente"). El título cuenta qué pasó y a quién.
5. Frases cortas y potentes. Preferí "Ganó y dio un paso enorme" a "El conjunto obtuvo una importante victoria".`

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

// ---------- contexto que recibe la IA (solo lo que cargó el redactor) ----------
function contexto(c = {}) {
  const L = []
  const add = (k, v) => { v = one(v, 400); if (v) L.push(`${k}: ${v}`) }
  add('Tipo de nota', c.tipo === 'cronica' ? 'crónica de partido' : 'noticia')
  add('Torneo', c.torneo)
  add('Clubes', (c.clubs || []).filter(Boolean).join(', '))
  add('Local', c.home); add('Visitante', c.away)
  if (c.hg !== '' && c.hg != null && c.ag !== '' && c.ag != null) add('Resultado', `${c.home || 'Local'} ${c.hg} - ${c.ag} ${c.away || 'Visitante'}`)
  add('Protagonista', c.protagonista)
  add('Título actual', c.titulo); add('Bajada actual', c.bajada)
  const t = long(c.texto)
  if (t) L.push(`Texto / apuntes del redactor:\n${t}`)
  return L.join('\n')
}

// Avisa si la IA metió números que no estaban en los datos (posible invento).
function avisos(entrada, salida) {
  const nums = s => new Set(String(s).match(/\d+/g) || [])
  const ok = nums(entrada), extra = [...nums(salida)].filter(n => !ok.has(n))
  return extra.length ? [`Revisá: aparece${extra.length > 1 ? 'n' : ''} el${extra.length > 1 ? 'los' : ''} número${extra.length > 1 ? 's' : ''} ${extra.join(', ')} y no figura${extra.length > 1 ? 'n' : ''} en los datos que cargaste.`] : []
}

// ---------- Gemini ----------
// Presupuesto total de tiempo (ms). Tiene que quedar por debajo del maxDuration de vercel.json (30 s),
// así la función responde con un mensaje claro en vez de que Vercel corte con un 504.
const PRESUPUESTO = () => Number(process.env.IA_BUDGET_MS) || 24000
async function llamar(model, body, key, ms) {
  const r = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ms)
  })
  return { status: r.status, j: await r.json().catch(() => ({})) }
}
async function generar(body, key) {
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash'].filter((m, i, a) => m && a.indexOf(m) === i)
  const t0 = Date.now()
  let last = { status: 0, j: {} }
  for (const model of models) {
    let b = body
    for (let k = 0; k < 2; k++) {
      const left = PRESUPUESTO() - (Date.now() - t0)
      if (left < 3000) return { ...last, timeout: true }
      try { last = await llamar(model, b, key, left) } catch { last = { status: 0, j: {}, timeout: true }; break }
      if (last.status === 200) return { ...last, model }
      if (last.status === 400 && b.generationConfig.thinkingConfig) { // por si el modelo no acepta ese ajuste
        b = { ...b, generationConfig: { ...b.generationConfig } }; delete b.generationConfig.thinkingConfig; continue
      }
      break // saturado, límite o error: pasa directo al modelo de respaldo (no pierde tiempo reintentando)
    }
  }
  return last
}
const textoDe = j => (j?.candidates?.[0]?.content?.parts || []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('').trim()
const errorDe = (st, to) => to ? 'Gemini tardó demasiado en responder. Probá de nuevo en un momento.'
  : st === 429 ? 'Se alcanzó el límite gratuito de Gemini por ahora. Probá de nuevo en unos minutos.'
  : st === 503 || st === 0 ? 'Gemini está saturado en este momento. Probá de nuevo en un rato.'
  : st === 400 || st === 401 || st === 403 ? 'Gemini rechazó el pedido: revisá que GEMINI_API_KEY sea válida.'
  : st === 404 ? 'El modelo configurado no existe. Revisá GEMINI_MODEL.' : `Error de Gemini (${st}).`

const base = (user, extra) => ({
  systemInstruction: { parts: [{ text: SYS }] },
  contents: [{ role: 'user', parts: [{ text: user }] }],
  generationConfig: { temperature: 0.7, thinkingConfig: { thinkingLevel: 'low' }, ...extra }
})

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' })
  const key = String(process.env.GEMINI_API_KEY || '').trim()
  if (!key) return res.status(500).json({ ok: false, hint: 'sin_clave', error: 'Falta configurar GEMINI_API_KEY en Vercel.' })

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ ok: false, error: 'Sin sesión.' })
  const adm = await isAdmin(token)
  if (adm === null) return res.status(500).json({ ok: false, error: 'No se pudo verificar la sesión.' })
  if (!adm) return res.status(403).json({ ok: false, error: 'Solo administradores.' })

  let p = req.body
  if (typeof p === 'string') { try { p = JSON.parse(p) } catch { p = null } }
  if (!p || typeof p !== 'object') return res.status(400).json({ ok: false, error: 'Pedido inválido.' })
  const ctx = contexto(p.ctx)

  // ---------- títulos + bajada ----------
  if (p.modo === 'titulos') {
    if (!/Clubes|Protagonista|Resultado|Título actual|Texto/.test(ctx)) return res.status(400).json({ ok: false, error: 'Faltan datos: elegí clubes o protagonista, o escribí un título o texto.' })
    const user = `${ctx}\n\nTAREA: proponé 5 títulos para esta nota, de 50 a 65 caracteres (nunca más de 90), con el club o el protagonista al principio. Si hay resultado, que al menos un título lo incluya con formato 2-1. Variá el enfoque entre títulos (resultado, protagonista, consecuencia, dato). Indicá en "enfoque" una palabra o frase corta. Además escribí una bajada de 1 o 2 frases (máximo 160 caracteres) que no repita el título. Respondé SOLO con el JSON pedido.`
    const out = await generar(base(user, {
      maxOutputTokens: 1500, responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: {
        titulos: { type: 'ARRAY', items: { type: 'OBJECT', properties: { t: { type: 'STRING' }, enfoque: { type: 'STRING' } }, required: ['t'] } },
        bajada: { type: 'STRING' } }, required: ['titulos'] }
    }), key)
    if (out.status !== 200) return res.status(502).json({ ok: false, error: errorDe(out.status, out.timeout) })
    let d; try { d = JSON.parse(textoDe(out.j).replace(/^```(?:json)?|```$/g, '').trim()) } catch { return res.status(502).json({ ok: false, error: 'La IA devolvió una respuesta ilegible. Probá de nuevo.' }) }
    const seen = new Set(), titulos = []
    for (const x of d.titulos || []) { const t = one(x?.t, 120); const k = t.toLowerCase(); if (t && !seen.has(k)) { seen.add(k); titulos.push({ t, why: one(x?.enfoque, 60) }) } }
    if (!titulos.length) return res.status(502).json({ ok: false, error: 'La IA no devolvió títulos. Probá de nuevo.' })
    const bajada = one(d.bajada, 200)
    return res.status(200).json({ ok: true, modelo: out.model, titulos: titulos.slice(0, 5), bajada, avisos: avisos(ctx, titulos.map(x => x.t).join(' ') + ' ' + bajada) })
  }

  // ---------- borrador de crónica ----------
  if (p.modo === 'cronica') {
    if (long(p.ctx?.texto).length < 150) return res.status(400).json({ ok: false, error: 'Para el borrador hacen falta apuntes del partido (al menos unas 3 o 4 líneas con lo que pasó). Sin material propio la IA inventaría datos.' })
    const user = `${ctx}\n\nTAREA: escribí un borrador de crónica de entre 250 y 400 palabras, en párrafos separados por una línea en blanco, usando SOLO la información de los apuntes. El primer párrafo da el resultado y lo esencial. No agregues nada que no esté en los apuntes (ni minutos, ni nombres, ni contexto). Si los apuntes no alcanzan para una crónica, respondé únicamente "FALTAN_DATOS:" y listá qué datos faltan. No uses títulos ni viñetas.`
    const out = await generar(base(user, { maxOutputTokens: 3000 }), key)
    if (out.status !== 200) return res.status(502).json({ ok: false, error: errorDe(out.status, out.timeout) })
    const texto = textoDe(out.j)
    if (!texto) return res.status(502).json({ ok: false, error: 'La IA no devolvió texto. Probá de nuevo.' })
    if (/^FALTAN_DATOS/i.test(texto)) return res.status(200).json({ ok: false, error: 'Con esos apuntes no alcanza.', faltan: texto.replace(/^FALTAN_DATOS:?\s*/i, '') })
    return res.status(200).json({ ok: true, modelo: out.model, texto, avisos: avisos(ctx, texto) })
  }

  return res.status(400).json({ ok: false, error: 'Modo desconocido.' })
}
