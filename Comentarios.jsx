// Sección pública de comentarios: nombre, apellido y mensaje. Se publican solo cuando los aprueba el administrador.
import {useState} from 'react'
import {sb} from './supabase'
import {Async,useData,useTitle} from './ui'
const fecha=d=>new Date(d).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})
const lsGet=k=>{try{return +localStorage.getItem(k)||0}catch{return 0}}
const lsSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}}

export default function Comentarios(){
  useTitle('Comentarios')
  const[v,setV]=useState(0),[m,setM]=useState(null),[busy,setBusy]=useState(false)
  const s=useData(async()=>{const{data,error}=await sb.from('comments').select('id,nombre,apellido,mensaje,created_at').eq('aprobado',true).order('created_at',{ascending:false}).limit(50);return error?[]:data},[v])
  async function send(e){e.preventDefault();const form=e.target,f=new FormData(form)
    if(f.get('web'))return setM({ok:true,t:'¡Gracias! Recibimos tu comentario.'})   // campo trampa para robots
    if(Date.now()-lsGet('mk_cm')<60000)return setM({t:'Esperá un minuto antes de enviar otro comentario.'})
    const nombre=String(f.get('n')||'').trim(),apellido=String(f.get('a')||'').trim(),mensaje=String(f.get('m')||'').trim()
    if(nombre.length<2||apellido.length<2)return setM({t:'Escribí tu nombre y tu apellido.'})
    if(mensaje.length<5)return setM({t:'El comentario es muy corto.'})
    if(!f.get('ok'))return setM({t:'Tenés que aceptar que tu nombre y apellido se muestren.'})
    setBusy(true);const{error}=await sb.from('comments').insert({nombre,apellido,mensaje});setBusy(false)
    if(error)return setM({t:'No pudimos enviar tu comentario. Probá de nuevo más tarde.'})
    form.reset();lsSet('mk_cm',Date.now());setM({ok:true,t:'¡Gracias! Recibimos tu comentario. Se publicará cuando lo revisemos.'});setV(x=>x+1)}
  return <div className="w art"><h1>Comentarios</h1>
    <p>Dejanos tu opinión, tu saludo o tu sugerencia. Revisamos cada comentario antes de publicarlo. Pedimos respeto: podemos no publicar o eliminar mensajes ofensivos, con datos de terceros o publicidad.</p>
    <form onSubmit={send}>
      <label>Nombre</label><input name="n" maxLength="60" required autoComplete="given-name"/>
      <label>Apellido</label><input name="a" maxLength="60" required autoComplete="family-name"/>
      <label>Tu comentario</label><textarea name="m" rows="5" maxLength="800" required/>
      <input name="web" tabIndex="-1" autoComplete="off" aria-hidden="true" style={{position:'absolute',left:'-9999px',height:0,width:0,opacity:0}}/>
      <label style={{display:'flex',gap:8,alignItems:'flex-start',fontWeight:400}}><input type="checkbox" name="ok" style={{width:'auto',marginTop:4}}/> Acepto que, si el comentario se aprueba, se muestren mi nombre, mi apellido y mi mensaje en el sitio. Más información en Legales y copyright.</label>
      <button className="btn" disabled={busy}>{busy?'Enviando…':'Enviar comentario'}</button>
      {m&&<p className={m.ok?'':'err'} style={m.ok?{color:'#7ee39a'}:null}>{m.t}</p>}
    </form>
    <h2 className="sec" style={{marginTop:24}}>Lo que dicen</h2>
    <Async s={s}>{rows=>rows.length?rows.map(c=><div key={c.id} className="paper" style={{margin:'0 0 10px',whiteSpace:'pre-wrap'}}><b>{c.nombre} {c.apellido}</b> <small className="muted">· {fecha(c.created_at)}</small><div>{c.mensaje}</div></div>):<p className="muted">Todavía no hay comentarios publicados. ¡Sé el primero!</p>}</Async>
  </div>}
