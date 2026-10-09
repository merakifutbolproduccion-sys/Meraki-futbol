// Mapa del sitio (sitemap.xml) generado en el momento con las noticias, crónicas, entrevistas y clubes publicados.
const x=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const FIJAS=['/','/futbol','/cronicas','/clubes','/ascenso','/copas','/afa','/entrevistas','/quienes-somos','/grilla','/programas','/en-vivo','/nosotros','/contacto','/legal','/comentarios']
export default async function handler(req,res){
 const base=(process.env.SITE_URL||process.env.VITE_SITE_URL||`https://${req.headers['x-forwarded-host']||req.headers.host}`).replace(/\/$/,'')
 const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY
 // Prueba cada consulta en orden; si una columna todavía no existe, usa la siguiente.
 const get=async(t,qs)=>{if(!url||!key)return[];for(const q of qs){try{const r=await fetch(`${url}/rest/v1/${t}?${q}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(r.ok)return await r.json()}catch{}}return[]}
 const[news,chr,iv,asc,clubs,progs]=await Promise.all([
  get('news',['select=slug,fecha,updated_at&estado=eq.publicada&order=fecha.desc&limit=5000','select=slug,fecha&estado=eq.publicada&order=fecha.desc&limit=5000']),
  get('chronicles',['select=slug,publicada_at&estado=eq.publicada&limit=5000']),
  get('interviews',['select=slug,fecha&estado=eq.publicada&limit=5000']),
  get('ascenso_updates',['select=slug,fecha&estado=eq.publicada&limit=5000']),
  get('clubs',['select=slug&activo=eq.true&limit=5000']),
  get('programs',['select=slug&activo=eq.true&limit=500'])])
 const d=v=>v?new Date(v).toISOString():null
 const rows=[...FIJAS.map(p=>[p,null]),...news.map(n=>['/noticias/'+n.slug,d(n.updated_at||n.fecha)]),...chr.map(c=>['/cronicas/'+c.slug,d(c.publicada_at)]),
  ...iv.map(i=>['/entrevistas/'+i.slug,d(i.fecha)]),...asc.map(a=>['/ascenso/'+a.slug,d(a.fecha)]),...clubs.map(c=>['/clubes/'+c.slug,null]),...progs.map(p=>['/programas/'+p.slug,null])]
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+rows.filter(([p])=>!/\/(undefined|null)$/.test(p)).map(([p,m])=>`<url><loc>${x(base+p)}</loc>${m?`<lastmod>${m}</lastmod>`:''}</url>`).join('\n')+'\n</urlset>\n'
 res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');res.status(200).send(xml)}
