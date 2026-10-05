// Vercel Function: devuelve una "tarjeta" con título y foto de cada nota
// cuando WhatsApp, Instagram, Facebook, Telegram, etc. leen el link.
// Las personas siguen viendo la web normal.
const TABLAS={noticias:'news',cronicas:'chronicles',entrevistas:'interviews'}
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

export default async function handler(req,res){
  const host=req.headers['x-forwarded-host']||req.headers.host
  const origin=`https://${host}`
  const{tipo,slug}=req.query||{}
  let title='Meraki Fútbol',desc='Medio digital de fútbol argentino.',img=`${origin}/logo.webp`,url=origin
  try{
    const tabla=TABLAS[tipo]
    if(tabla&&/^[a-z0-9-]+$/i.test(slug||'')){
      const base=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY
      const r=await fetch(`${base}/rest/v1/${tabla}?slug=eq.${encodeURIComponent(slug)}&estado=eq.publicada&select=titulo,bajada,imagen_url&limit=1`,{headers:{apikey:key}})
      const rows=r.ok?await r.json():[]
      if(rows[0]){
        title=`${rows[0].titulo} | Meraki Fútbol`
        desc=rows[0].bajada||desc
        if(rows[0].imagen_url)img=rows[0].imagen_url
        url=`${origin}/${tipo}/${slug}`
      }
    }
  }catch(e){/* si algo falla, queda la tarjeta general */}
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Meraki Fútbol">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image"></head>
<body><p><a href="${esc(url)}">${esc(title)}</a></p></body></html>`)
}
