// Comentarios del público (nombre y apellido). Se muestran solo los aprobados por el administrador.
// - <CommentsBox tipo="noticias" slug="..."/> va al final de cada nota.
// - La página /comentarios usa el mismo bloque para comentarios generales (sin nota).
import {useState} from 'react'
import {sb} from './supabase'
import {useData,useTitle} from './ui'
const fecha=d=>new Date(d).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'})
const lsGet=k=>{try{return +localStorage.getItem(k)||0}catch{return 0}}
const lsSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}}
const sm={fontSize:'.85rem'}

export function CommentsBox({tipo=null,slug=null}){
  const[v,setV]=useState(0),[m,setM]=useState(null),[busy,setBusy]=useState(false)
  const s=useData(async()=>{let q=sb.from('comments').select('id,nombre,apellido,mensaje,created_at').eq('aprobado',true).order('created_at',{ascending:false}).limit(100)
    q=tipo?q.eq('nota_tipo',tipo).eq('nota_slug',slug):q.is('nota_tipo',null)
    const{data,error}=await q;return error?[]:data},[v,tipo,slug])
  async function send(e){e.preventDefault();const form=e.target,f=new FormData(form)
    if(f.get('web'))return setM({ok:true,t:'¡Gracias! Recibimos tu comentario.'})   // campo trampa para robots
    if(Date.now()-lsGet('mk_cm')<60000)return setM({t:'Esperá un minuto antes de enviar otro comentario.'})
    const nombre=String(f.get('n')||'').trim(),apellido=String(f.get('a')||'').trim(),mensaje=String(f.get('m')||'').trim()
    if(nombre.length<2||apellido.length<2)return setM({t:'Escribí tu nombre y tu apellido.'})
    if(mensaje.length<5)return setM({t:'El comentario es muy corto.'})
    if(!f.get('ok'))return setM({t:'Tenés que aceptar que tu nombre y apellido se muestren.'})
    setBusy(true);const{error}=await sb.from('comments').insert({nombre,apellido,mensaje,nota_tipo:tipo,nota_slug:slug});setBusy(false)
    if(error)return setM({t:'No pudimos enviar tu comentario. Probá de nuevo más tarde.'})
    form.reset();lsSet('mk_cm',Date.now());setM({ok:true,t:'¡Gracias! Tu comentario fue recibido y se publicará cuando lo revisemos.'})}
  const rows=s.data||[]
  return <section aria-label="Comentarios" style={{marginTop:28,paddingTop:14,borderTop:'1px solid var(--line)'}}>
    <h3 style={{margin:'0 0 8px',fontSize:'1.05rem'}}>Comentarios{rows.length?` (${rows.length})`:''}</h3>
    <form onSubmit={send} style={{marginBottom:14}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <input name="n" placeholder="Nombre" maxLength="60" required autoComplete="given-name" style={{flex:'1 1 140px',...sm}}/>
        <input name="a" placeholder="Apellido" maxLength="60" required autoComplete="family-name" style={{flex:'1 1 140px',...sm}}/>
      </div>
      <textarea name="m" rows="3" placeholder="Escribí tu comentario…" maxLength="800" required style={{width:'100%',marginTop:8,...sm}}/>
      <input name="web" tabIndex="-1" autoComplete="off" aria-hidden="true" style={{position:'absolute',left:'-9999px',height:0,width:0,opacity:0}}/>
      <label style={{display:'flex',gap:8,alignItems:'flex-start',fontWeight:400,fontSize:'.75rem',marginTop:6}}><input type="checkbox" name="ok" style={{width:'auto',marginTop:2}}/> Acepto que se muestren mi nombre, apellido y mensaje si el comentario se aprueba. Revisamos cada comentario antes de publicarlo.</label>
      <button className="btn" disabled={busy} style={{marginTop:8,...sm}}>{busy?'Enviando…':'Comentar'}</button>
      {m&&<p className={m.ok?'':'err'} style={{...sm,...(m.ok?{color:'#7ee39a'}:null)}}>{m.t}</p>}
    </form>
    {rows.length===0?<p className="muted" style={sm}>Todavía no hay comentarios. ¡Sé el primero!</p>:rows.map(c=><div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)',whiteSpace:'pre-wrap',...sm}}><b>{c.nombre} {c.apellido}</b> <small className="muted">· {fecha(c.created_at)}</small><div style={{marginTop:2}}>{c.mensaje}</div></div>)}
  </section>}

export default function Comentarios(){
  useTitle('Comentarios')
  return <div className="w art"><h1>Comentarios</h1><p>Dejanos tu opinión, tu saludo o tu sugerencia. Pedimos respeto: podemos no publicar o eliminar mensajes ofensivos, con datos de terceros o publicidad.</p><CommentsBox/></div>}
