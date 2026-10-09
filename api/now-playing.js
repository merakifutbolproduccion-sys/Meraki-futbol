// Dice qué está sonando en la radio en este momento (lo que informa el servidor de streaming).
// Se usa para reconocer automáticamente qué programa está en vivo. No guarda nada.
const BASE=(process.env.STREAM_BASE||'https://az03.streaminghd.net.ar/8040').replace(/\/$/,'')
const get=async(p)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),4000);try{const r=await fetch(BASE+p,{signal:c.signal,headers:{'User-Agent':'Mozilla/5.0'}});return r.ok?await r.text():null}catch{return null}finally{clearTimeout(t)}}
export default async function handler(req,res){
  res.setHeader('Cache-Control','public, s-maxage=20, stale-while-revalidate=40')
  let title='',source=''
  const a=await get('/7.html')                     // Shoutcast: <body>oyentes,estado,pico,max,unicos,bitrate,TÍTULO</body>
  if(a){const m=a.match(/<body[^>]*>([\s\S]*?)<\/body>/i);if(m){const f=m[1].split(',');if(f.length>=7){title=f.slice(6).join(',').trim();source='7.html'}}}
  if(!title){const b=await get('/currentsong?sid=1');if(b&&b.length<300&&!/<html/i.test(b)){title=b.trim();source='currentsong'}}
  if(!title){const c=await get('/stats?sid=1&json=1');try{const j=JSON.parse(c||'{}');if(j.songtitle){title=String(j.songtitle);source='stats'}}catch{}}
  res.status(200).json({ok:!!title,title,source})
}
