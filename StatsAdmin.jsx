import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {sb} from './supabase'

// Estadísticas reales de Google Analytics. Los datos llegan de /api/analytics (función segura de Vercel):
// acá no hay claves ni números de ejemplo. Si algo no se puede obtener, se avisa en vez de inventarlo.
const NA='Esta métrica no está disponible mediante la integración actual.'
const RANGES=[['today','Hoy'],['7d','7 días'],['30d','30 días'],['90d','90 días']]
const GRANS=[['day','Días'],['week','Semanas'],['month','Meses']]
const METRICS=[['users','Usuarios'],['sessions','Visitas'],['views','Páginas vistas']]
const VS={today:'vs ayer','7d':'vs los 7 días anteriores','30d':'vs los 30 días anteriores','90d':'vs los 90 días anteriores'}
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const CANALES={'Direct':'Directo','Organic Search':'Búsqueda (Google y otros)','Organic Social':'Redes sociales','Paid Social':'Redes (publicidad)','Paid Search':'Búsqueda paga','Referral':'Links desde otros sitios','Email':'Email','Organic Video':'Video','Display':'Display','Unassigned':'Sin clasificar','Cross-network':'Multired'}
const DISPOSITIVOS={mobile:'Celular',desktop:'Computadora',tablet:'Tablet','smart tv':'Smart TV'}
const PAGINAS={'/':'Inicio (radio)','/grilla':'Grilla','/programas':'Programas','/en-vivo':'En vivo','/contacto':'Contacto','/nosotros':'Nosotros','/futbol':'Meraki Fútbol (inicio)','/cronicas':'Crónicas','/clubes':'Clubes','/ascenso':'Ascenso','/copas':'Copas','/afa':'AFA','/entrevistas':'Entrevistas','/quienes-somos':'¿Quiénes somos?','/buscar':'Buscador'}

const HELP={
 not_configured:['Falta conectar Google Analytics','En Vercel → Settings → Environment Variables hay que crear las variables que se listan abajo. Después, en Deployments, hacé Redeploy.'],
 no_access:['Google no deja leer esta propiedad','Revisá dos cosas. 1) GA_PROPERTY_ID tiene que ser el ID de la PROPIEDAD (Analytics → Administrar → Configuración de la propiedad), no el del flujo de datos ni el que empieza con G-. 2) El email GA_CLIENT_EMAIL tiene que estar agregado como Lector en Administrar → Administración de acceso a la propiedad.'],
 api_disabled:['Falta activar la API de Google','En console.cloud.google.com, dentro del mismo proyecto de la cuenta de servicio, buscá “Google Analytics Data API” y tocá Habilitar. Esperá unos minutos y reintentá.'],
 bad_key:['La clave privada está mal pegada','GA_PRIVATE_KEY tiene que ser el campo private_key del archivo JSON, completo, desde -----BEGIN PRIVATE KEY----- hasta -----END PRIVATE KEY-----. Corregila en Vercel y hacé Redeploy.'],
 auth_failed:['Google rechazó las credenciales','Revisá que GA_CLIENT_EMAIL sea el client_email del JSON y que GA_PRIVATE_KEY pertenezca a esa misma cuenta de servicio.'],
 no_function:['La consulta segura todavía no está publicada','Falta subir la carpeta api (archivo analytics.js) a GitHub y esperar que Vercel termine el despliegue. En el entorno local de desarrollo esta pantalla no funciona: solo en la web publicada.'],
 forbidden:['Esta cuenta no es administradora','Entrá con una cuenta con permisos de administración.'],
 no_auth:['Tu sesión venció','Cerrá sesión y volvé a entrar.'],
 server_config:['Falta configuración del servidor','No se pudo verificar tu sesión. Revisá que las variables de Supabase estén cargadas en Vercel.']
}

const n=v=>Number(v||0).toLocaleString('es-AR')
const dur=s=>{s=Math.round(s||0);return s<60?`${s} s`:`${Math.floor(s/60)}m ${s%60}s`}
const hhmm=d=>d?d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):''

async function call(params){
  const {data}=await sb.auth.getSession(),token=data.session?.access_token
  if(!token)throw {code:'no_auth'}
  const r=await fetch('/api/analytics?'+new URLSearchParams(params),{headers:{authorization:'Bearer '+token}})
  const j=await r.json().catch(()=>null)
  if(!j||typeof j!=='object'||(r.ok&&!j.ok))throw {code:'no_function'} // la web devolvió HTML: la función no está publicada
  if(!r.ok)throw {code:j.error||'ga_error',missing:j.missing}
  return j
}
function label(k,kind,long){
  if(kind==='hour')return `${k} h`
  if(kind==='day')return `${k.slice(6)}/${k.slice(4,6)}`
  if(kind==='week')return `Sem ${k.slice(4)}`
  return `${MESES[+k.slice(4)-1]||''} ${long?k.slice(0,4):k.slice(2,4)}`
}

function Delta({v,p,vs}){
  if(p==null)return null
  if(!p)return <span className="st-d">{v?`Sin datos ${vs.replace('vs ','de ')}`:'—'}</span>
  const x=Math.round((v-p)/p*100)
  if(!x)return <span className="st-d">Igual {vs}</span>
  return <span className={'st-d '+(x>0?'up':'down')}>{x>0?'▲':'▼'} {Math.abs(x).toLocaleString('es-AR')}% {vs}</span>
}
const Stat=({l,v,p,vs,f=n,big})=><div className={'st-card'+(big?' big':'')}><span className="st-l">{l}</span><b className="st-n">{f(v)}</b><Delta v={v} p={p} vs={vs}/></div>

function Realtime({rt,onRefresh}){
  const pages=(rt?.pages||[]).filter(p=>p.users>0)
  return <div className="st-live">
    <span className="st-dot" aria-hidden="true"/>
    <div style={{flex:1,minWidth:0}}>
      {!rt?<span className="muted">Consultando usuarios en vivo…</span>
       :rt.error||rt.active==null?<span className="muted">En vivo: {NA}</span>
       :<><b>{n(rt.active)}</b> <span>{rt.active===1?'usuario activo ahora':'usuarios activos ahora'}</span>
         {pages.length>0&&<div className="st-d" style={{marginTop:4}}>{pages.slice(0,3).map(p=>`${p.name} (${p.users})`).join(' · ')}</div>}</>}
    </div>
    <button type="button" className="tag" onClick={onRefresh} title={rt?.at?`Actualizado ${hhmm(rt.at)}`:''}>Actualizar</button>
  </div>
}

function Evolution({d,err,gran,setGran,metric,setMetric}){
  const [sel,setSel]=useState(null)
  const s=d.series||[],vals=s.map(x=>x[metric]),max=Math.max(1,...vals),total=vals.reduce((a,b)=>a+b,0)
  const i=sel!=null&&sel<s.length?sel:s.length-1,cur=s[i]
  function pick(e){const r=e.currentTarget.getBoundingClientRect();setSel(Math.max(0,Math.min(s.length-1,Math.floor((e.clientX-r.left)/r.width*s.length))))}
  if(err)return <p className="muted">{NA}</p>
  return <div>
    <div className="tabs">{METRICS.map(([k,nm])=><button key={k} type="button" className={'tag'+(metric===k?' on':'')} onClick={()=>setMetric(k)}>{nm}</button>)}
      {d.kind!=='hour'&&<span style={{flex:1}}/>}
      {d.kind!=='hour'&&GRANS.map(([k,nm])=><button key={k} type="button" className={'tag'+(gran===k?' on':'')} style={{opacity:gran===k?1:.75}} onClick={()=>{setSel(null);setGran(k)}}>{nm}</button>)}</div>
    {!total?<p className="muted">Todavía no hay datos en este período. Google puede tardar hasta 24–48 h en completar los informes.</p>
     :<><div className="st-chart" role="img" aria-label={`${METRICS.find(m=>m[0]===metric)[1]}: ${n(total)} en total`} onPointerDown={pick} onPointerMove={pick} onPointerLeave={()=>setSel(null)}>
        {s.map((x,j)=><div key={x.k} className={'st-bar'+(j===i?' sel':'')} style={{height:Math.max(2,x[metric]/max*100)+'%'}}/>)}</div>
       <div className="st-axis"><span>{label(s[0].k,d.kind)}</span><span>{label(s[Math.floor((s.length-1)/2)].k,d.kind)}</span><span>{label(s[s.length-1].k,d.kind)}</span></div>
       <p className="st-cap"><b>{label(cur.k,d.kind,true)}</b> · {n(cur.users)} usuarios · {n(cur.sessions)} visitas · {n(cur.views)} páginas vistas</p>
       <p className="st-d">Total del período: {n(total)} {METRICS.find(m=>m[0]===metric)[1].toLowerCase()}</p></>}
  </div>
}

function List({items,err,empty='Todavía no hay datos en este período.',unit}){
  if(err)return <p className="muted">{NA}</p>
  if(!items||!items.length)return <p className="muted">{empty}</p>
  const max=Math.max(1,...items.map(x=>x.value))
  return <div>{items.map((x,k)=><div key={x.key||k} className="st-row" style={{'--p':Math.round(x.value/max*100)+'%'}}>
    {x.to?<Link to={x.to} title={x.name}>{x.name}</Link>:<span title={x.name}>{x.name}</span>}<b>{n(x.value)}{unit?` ${unit}`:''}</b></div>)}</div>
}

function Setup({err,retry}){
  const [t,p]=HELP[err.code]||['No se pudieron cargar las estadísticas','Probá de nuevo en un minuto. Si sigue fallando, revisá los registros de la función en Vercel.']
  return <div className="st-help"><b>{t}</b><p>{p}</p>
    {err.missing?.length>0&&<ul>{err.missing.map(m=><li key={m}><code>{m}</code></li>)}</ul>}
    <button type="button" className="btn" onClick={retry}>Reintentar</button></div>
}

export default function StatsAdmin(){
  const [range,setRange]=useState('7d'),[gran,setGran]=useState('day'),[metric,setMetric]=useState('users')
  const [rep,setRep]=useState(null),[err,setErr]=useState(null),[busy,setBusy]=useState(true),[rt,setRt]=useState(null),[tick,setTick]=useState(0),[rtTick,setRtTick]=useState(0)

  useEffect(()=>{let ok=true;setBusy(true);setErr(null)
    call({range,gran}).then(d=>ok&&setRep(d)).catch(e=>ok&&setErr(e)).finally(()=>ok&&setBusy(false))
    return()=>{ok=false}},[range,gran,tick])

  useEffect(()=>{let ok=true
    const load=()=>{if(document.hidden)return;call({part:'realtime'}).then(d=>ok&&setRt({...d,at:new Date()})).catch(()=>ok&&setRt(r=>r&&!r.error?{...r,at:r.at}:{error:true}))}
    load();const t=setInterval(load,30000)
    return()=>{ok=false;clearInterval(t)}},[tick,rtTick])

  const pickRange=r=>{setRange(r);setGran(r==='90d'?'week':'day')}
  const E=rep?.errors||{},S=rep?.summary,vs=VS[range]
  const total=(rep?.devices||[]).reduce((a,x)=>a+x.value,0)

  return <div className={'st'+(busy&&rep?' busy':'')}>
    <div className="tabs">{RANGES.map(([k,nm])=><button key={k} type="button" className={'tag'+(range===k?' on':'')} onClick={()=>pickRange(k)}>{nm}</button>)}</div>
    {err?<Setup err={err} retry={()=>setTick(x=>x+1)}/>:<>
      <Realtime rt={rt} onRefresh={()=>setRtTick(x=>x+1)}/>
      {!rep?<p className="muted">Cargando estadísticas…</p>:<div className="st-body">
        <div className="sec">Resumen</div>
        {E.summary||!S?<p className="muted">{NA}</p>:<div className="st-cards">
          <Stat l="Visitas" v={S.cur.sessions} p={S.prev.sessions} vs={vs}/>
          <Stat l="Usuarios" v={S.cur.users} p={S.prev.users} vs={vs}/>
          <Stat l="Páginas vistas" v={S.cur.views} p={S.prev.views} vs={vs} big/>
          <Stat l="Tiempo por visita" v={S.cur.avgDuration} p={S.prev.avgDuration} vs={vs} f={dur}/>
          <Stat l="Usuarios nuevos" v={S.cur.newUsers} p={S.prev.newUsers} vs={vs}/></div>}

        <div className="sec">Evolución</div>
        <Evolution d={rep} err={E.series} gran={gran} setGran={setGran} metric={metric} setMetric={setMetric}/>

        <div className="sec">Más visitado</div>
        <h3 className="st-h">Páginas</h3>
        <List err={E.pages} items={(rep.pages||[]).map(x=>({key:x.path,name:PAGINAS[x.path]||x.path,value:x.views,to:x.path}))} unit="vistas"/>
        <h3 className="st-h">Noticias, crónicas y entrevistas</h3>
        <List err={E.contents} items={(rep.contents||[]).map(x=>({key:x.path,name:x.title,value:x.views,to:x.path}))} unit="vistas" empty="Todavía no hay notas con visitas en este período."/>
        <h3 className="st-h">Programas</h3>
        <List err={E.programs} items={(rep.programs||[]).map(x=>({key:x.path,name:x.title,value:x.views,to:x.path}))} unit="vistas" empty="Todavía no hay programas con visitas en este período."/>

        <div className="sec">Origen de las visitas</div>
        <h3 className="st-h">Cómo llegan</h3>
        <List err={E.channels} items={(rep.channels||[]).map(x=>({name:CANALES[x.name]||x.name,value:x.value}))} unit="visitas"/>
        <h3 className="st-h">Desde qué sitio</h3>
        <List err={E.sources} items={(rep.sources||[]).filter(x=>x.name!=='(not set)').map(x=>({name:x.name==='(direct)'?'Directo (escribieron la dirección o abrieron un link guardado)':x.name,value:x.value}))} unit="visitas"/>
        <h3 className="st-h">Palabras buscadas en Google</h3>
        <p className="muted">{NA}</p>

        <div className="sec">Dispositivos</div>
        <List err={E.devices} items={(rep.devices||[]).map(x=>({name:`${DISPOSITIVOS[x.name]||x.name} · ${total?Math.round(x.value/total*100):0}%`,value:x.value}))} unit="visitas"/>

        <div className="sec">Ciudades</div>
        <List err={E.cities} items={(rep.cities||[]).map(x=>({name:x.name==='(not set)'?'Sin dato':x.name,value:x.value}))} unit="usuarios"/>

        <p className="st-d" style={{marginTop:18}}>Datos de Google Analytics · actualizado a las {hhmm(new Date(rep.generatedAt))}. Los números de hoy pueden seguir cambiando durante 24–48 h.{' '}
          <button type="button" className="tag" onClick={()=>setTick(x=>x+1)}>Actualizar todo</button></p>
      </div>}
    </>}
  </div>
}
