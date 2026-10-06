import {useEffect,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {api} from './api'
import logo from './logo.webp'
import {Async,useData,Sec,Grid} from './ui'
export const DIAS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const SOC=[['instagram_url','Instagram'],['facebook_url','Facebook'],['youtube_url','YouTube'],['tiktok_url','TikTok'],['x_url','X']]
const hm=t=>String(t||'').slice(0,5)
const wa=v=>/^https?:/i.test(v)?v:'https://wa.me/'+String(v).replace(/\D/g,'')
const useT=t=>useEffect(()=>{document.title=t?`FM Meraki | ${t}`:'FM Meraki'},[t])
const bg=u=>u?{backgroundImage:`url(${u})`,backgroundSize:'cover',backgroundPosition:'center'}:null
const Head=({t})=>{useT(t);return <h2 className="sec pad" style={{marginTop:24}}>{t}</h2>}
export const Social=({d})=>{const has=SOC.some(([k])=>d?.[k])||d?.whatsapp;return has?<div className="chips">{SOC.filter(([k])=>d[k]).map(([k,n])=><a key={k} className="tag" href={d[k]} target="_blank" rel="noopener noreferrer">{n}</a>)}{d.whatsapp&&<a className="tag" href={wa(d.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div>:null}
const MSG='Holaa, soy el o la oyente '
const waMsg=v=>{const s=String(v||'').trim();if(!s)return '';const m=s.match(/wa\.me\/(\d+)/i),d=m?m[1]:(/^https?:/i.test(s)?'':s.replace(/\D/g,''));return d?'https://wa.me/'+d+'?text='+encodeURIComponent(MSG):(/^https?:/i.test(s)?s:'')}
const Oyente=({r})=>{const h=waMsg(r.whatsapp);return h?<a className="btn" href={h} target="_blank" rel="noopener noreferrer">💬 Mandanos tu mensaje</a>:null}
const AR=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return{d:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(p.weekday)+1,m:+p.hour*60+ +p.minute}}
const mins=t=>{const[h,m]=String(t||'').slice(0,5).split(':');return +h*60+ +m}
function OnAir({style}){const s=useData(()=>Promise.all([api.schedule(),api.programs()])),[,tick]=useState(0)
 useEffect(()=>{const i=setInterval(()=>tick(x=>x+1),60000);return()=>clearInterval(i)},[])
 if(!s.data)return null;const[l,ps]=s.data,sin=new Set(ps.filter(p=>p.sin_horario).map(p=>p.id)),b=l.filter(x=>!sin.has(x.program_id)),n=AR()
 const cur=b.find(x=>x.dia===n.d&&mins(x.hora_inicio)<=n.m&&n.m<mins(x.hora_fin))
 const off=x=>{let o=(x.dia-n.d)*1440+mins(x.hora_inicio)-n.m;return o>0?o:o+10080}
 const nx=b.filter(x=>x!==cur).sort((a,c)=>off(a)-off(c))[0]
 if(!cur&&!nx)return null
 const dd=nx&&(nx.dia===n.d&&off(nx)<1440?'':nx.dia===n.d%7+1&&off(nx)<2880?'Mañana ':DIAS[nx.dia-1]+' ')
 return <div style={{border:'1px solid #1f6b3a',borderRadius:10,padding:'10px 14px',background:'rgba(7,19,13,.6)',display:'flex',flexDirection:'column',gap:4,...style}}>
  {cur&&<span>🔴 <b>Ahora:</b> <Link to={'/programas/'+cur.programs.slug}>{cur.programs.nombre}</Link> <small className="muted">({hm(cur.hora_inicio)} - {hm(cur.hora_fin)})</small></span>}
  {nx&&<span>⏭️ <b>Sigue:</b> <Link to={'/programas/'+nx.programs.slug}>{nx.programs.nombre}</Link> <small className="muted">({dd}{hm(nx.hora_inicio)})</small></span>}</div>}
const Live=({children='Escuchar en vivo →'})=><Link className="btn" to="/en-vivo">{children}</Link>
const PCard=(p,emo)=><Link key={p.id} className="card" to={'/programas/'+p.slug}><div className={'ph'+(emo?' pe':'')} data-emo={emo?(p.emoji||''):undefined} role="img" aria-label={p.nombre} style={bg(p.logo_url)}/><div className="b"><span className="tag">Programa</span>{p.es_demo&&<span className="tag">Demo</span>}<h3>{p.nombre}</h3><small>{p.conductores||''}</small><span className="btn" style={{marginTop:'auto'}}>Ver programa →</span></div></Link>
export function RadioHome(){useT('');const s=useData(()=>Promise.all([api.radio(),api.programs()]))
 return <Async s={s}>{([r,ps])=><><section className="hero ph"><div className="w" style={{width:'100%',display:'flex',flexDirection:'column',gap:10}}><span className="tag">Radio</span><h1>{r.titulo_portada||r.nombre||'FM Meraki'}</h1><p>{r.texto_portada||r.descripcion||'[Demo] Completá el texto de la portada desde /admin > FM Radio.'}</p><OnAir style={{alignSelf:'flex-start'}}/><div className="chips"><Live r={r}/><Link className="btn" to="/grilla">Ver la grilla</Link><Oyente r={r}/></div></div></section>
  <div className="w"><Sec t="Programas destacados"/>{ps.filter(p=>p.destacado).length?<Grid>{ps.filter(p=>p.destacado).map(p=>PCard(p,true))}</Grid>:<p className="muted">Todavía no hay programas destacados.</p>}<p><Link className="tag" to="/programas">Ver todos los programas</Link></p>
  {r.quienes_somos&&<><Sec t="¿Quiénes somos?"/><p style={{whiteSpace:'pre-wrap'}}>{r.quienes_somos}</p></>}<Sec t="Meraki Fútbol"/><Link className="tile" to="/futbol">Entrar al portal de Meraki Fútbol<span>→</span></Link>
  <div className="radio" style={{margin:'28px 0'}}><img className="lg" src={r.logo||logo} alt={r.nombre||'FM Meraki'} width="120" height="120" style={{width:120,height:120,borderRadius:'50%'}}/><b>{r.nombre||'FM Meraki'}</b>{r.descripcion&&<span className="muted" style={{whiteSpace:'pre-wrap'}}>{r.descripcion}</span>}<Social d={r}/></div></div></>}</Async>}
export function Grilla(){const s=useData(()=>Promise.all([api.schedule(),api.programs()]));return <div className="w"><Head t="Grilla"/><Async s={s}>{([l0,ps])=>{const sin=ps.filter(p=>p.sin_horario),ids=new Set(sin.map(p=>p.id)),l=l0.filter(x=>!ids.has(x.program_id))
 if(!l.length&&!sin.length)return <p className="muted">Todavía no hay programación cargada.</p>
 return <>{DIAS.map((d,i)=>{const b=l.filter(x=>x.dia===i+1);return b.length>0&&<div key={d}><Sec t={d}/>{b.map(x=><Link key={x.id} className="match" to={'/programas/'+x.programs.slug} style={{gridTemplateColumns:'auto 1fr'}}><span style={{textAlign:'left'}}>{hm(x.hora_inicio)} - {hm(x.hora_fin)}</span><span style={{textAlign:'left'}}>{x.programs.nombre}{x.programs.es_demo&&' · Demo'}</span></Link>)}</div>})}
 {sin.length>0&&<div><Sec t="Programas sin día ni horario fijo"/>{sin.map(p=><Link key={p.id} className="match" to={'/programas/'+p.slug} style={{gridTemplateColumns:'auto 1fr'}}><span style={{textAlign:'left'}}>{p.nombre}{p.es_demo&&' · Demo'}</span><span className="muted" style={{textAlign:'left'}}>Programación especial / sin horario fijo</span></Link>)}</div>}</>}}</Async></div>}
export function Programas(){const s=useData(api.programs);return <div className="w"><Head t="Programas"/><Async s={s} empty="Todavía no hay programas cargados.">{l=><Grid>{l.map(p=>PCard(p))}</Grid>}</Async></div>}
function PV({p,r,b}){useT(p.nombre);const has=SOC.some(([k])=>p[k])||p.whatsapp
 return <article className="w art paper"><span className="tag">Programa{p.es_demo?' · DEMO':''}</span><h1>{p.nombre}</h1>{p.logo_url&&<img className="cover" src={p.logo_url} alt={p.nombre}/>}
  {p.sin_horario?<><Sec t="Días y horarios"/><p>Sin día ni horario fijo · Programación especial</p></>:b.length>0&&<><Sec t="Días y horarios"/>{b.map(x=><p key={x.id}>{DIAS[x.dia-1]} · {hm(x.hora_inicio)} - {hm(x.hora_fin)}</p>)}</>}
  {p.conductores&&<><Sec t="Conductores"/><p>{p.conductores}</p></>}{p.descripcion&&<><Sec t="Sobre el programa"/><p style={{whiteSpace:'pre-wrap'}}>{p.descripcion}</p></>}
  {p.quienes_somos&&<><Sec t="¿Quiénes somos?"/><p style={{whiteSpace:'pre-wrap'}}>{p.quienes_somos}</p></>}<Sec t="Redes del programa"/>{has?<Social d={p}/>:<p className="muted">Este programa todavía no cargó sus redes.</p>}
  <div className="chips" style={{marginTop:16}}><Live r={r}/>{p.link_externo&&<a className="btn" href={p.link_externo} target="_blank" rel="noopener noreferrer">Más información →</a>}{p.slug==='meraki-futbol'&&<Link className="btn" to="/futbol">Entrar a Meraki Fútbol →</Link>}</div></article>}
export function Programa(){const{slug}=useParams(),s=useData(async()=>{const[p,sc,r]=await Promise.all([api.program(slug),api.schedule(),api.radio()]);return p&&p.activo?{p,r,b:sc.filter(x=>x.program_id===p.id)}:null},[slug]);return <Async s={s}>{d=><PV {...d}/>}</Async>}
const YT_CANAL='UCs-VFLueSgXxofbQ0lYrbKA',YT_URL='https://youtube.com/@fmmeraki'
const ytId=v=>{const x=String(v||'').trim();if(/^[\w-]{11}$/.test(x))return x;const m=x.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);return m?m[1]:''}
const ytCanal=v=>{const m=String(v||'').match(/UC[\w-]{22}/);return m?m[0]:YT_CANAL}
function Player({r}){const[on,setOn]=useState(false),vid=ytId(r.youtube_live_id),src='https://www.youtube.com/embed/'+(vid?vid+'?':'live_stream?channel='+ytCanal(r.youtube_channel_id)+'&')+'autoplay=1&playsinline=1&rel=0'
 return <div style={{maxWidth:760,margin:'0 auto'}}><div style={{position:'relative',aspectRatio:'16/9',borderRadius:12,overflow:'hidden',border:'1px solid #1f6b3a',background:'linear-gradient(135deg,#145c30,#07130d 70%,#020504)'}}>
  {on?<iframe title={'Radio en vivo '+(r.nombre||'FM Meraki')} src={src} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
  :<button type="button" onClick={()=>setOn(true)} aria-label="Reproducir FM Meraki en vivo" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,cursor:'pointer',background:'transparent',color:'inherit',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}><img src={r.logo||logo} alt="" width="96" height="96" style={{width:96,height:96,borderRadius:'50%'}}/><span className="btn" style={{fontSize:'1.1rem'}}>▶ Escuchar en vivo</span><small className="muted">{r.nombre||'FM Meraki'}</small></button>}
 </div><p className="muted" style={{textAlign:'center',fontSize:'.9rem'}}>Si el video no arranca es porque ahora no estamos transmitiendo en vivo.</p>
 <div className="chips" style={{justifyContent:'center'}}><a className="btn" href={r.youtube_url||YT_URL} target="_blank" rel="noopener noreferrer">VER CANAL DE YOUTUBE</a><Oyente r={r}/></div></div>}
export function EnVivo(){const s=useData(api.radio);return <div className="w"><Head t="Escuchar en vivo"/><Async s={s}>{r=><><OnAir style={{maxWidth:760,margin:'0 auto 14px'}}/><Player r={r}/></>}</Async></div>}
export function Contacto(){const s=useData(api.radio);return <div className="w"><Head t="Contacto"/><Async s={s}>{r=>r.contacto||r.whatsapp?<><p style={{whiteSpace:'pre-wrap'}}>{r.contacto}</p><Social d={r}/></>:<p className="muted">[Provisional] Datos de contacto a definir desde /admin &gt; FM Radio.</p>}</Async></div>}
export function Nosotros(){const s=useData(api.radio);return <div className="w"><Head t="¿Quiénes somos?"/><Async s={s}>{r=>r.quienes_somos?<p style={{whiteSpace:'pre-wrap'}}>{r.quienes_somos}</p>:<p className="muted">[Provisional] El texto de FM Meraki se escribe en Admin &gt; Textos y sitio.</p>}</Async></div>}
