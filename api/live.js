// Avisa a la web si FM Meraki está transmitiendo en vivo por YouTube.
// Gratis y sin API key: mira la página pública /live del canal. Si algo falla, responde "no en vivo" y suena la radio.
const CANAL = 'UCs-VFLueSgXxofbQ0lYrbKA'
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 5000)
    const r = await fetch(`https://www.youtube.com/channel/${CANAL}/live`, {
      signal: ctl.signal, redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'accept-language': 'es-AR,es;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI' }
    })
    clearTimeout(t)
    const h = await r.text()
    const m = h.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
    const live = /"isLiveNow":true/.test(h) && !!m
    res.status(200).json({ live, id: live ? m[1] : '' })
  } catch {
    res.status(200).json({ live: false, id: '' })
  }
}
