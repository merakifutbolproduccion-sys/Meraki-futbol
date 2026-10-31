// Pestaña "Con IA" del panel: títulos, bajada y borrador de crónica (Gemini, vía /api/ia).
// Todo queda como sugerencia: nada se publica ni se guarda solo.
import {useState} from 'react'
import {sb} from './supabase'

async function pedir(payload){
  const{data}=await sb.auth.getSession(),tk=data?.session?.access_token
  if(!tk)return{ok:false,error:'Iniciá sesión de nuevo.'}
  try{
    const r=await fetch('/api/ia',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${tk}`},body:JSON.stringify(payload)})
    return(await r.json().catch(()=>null))||{ok:false,error:`Error ${r.status}`}
  }catch{return{ok:false,error:'No se pudo conectar con el servidor.'}}
}
const copiar=async t=>{try{await navigator.clipboard.writeText(t);return true}catch{return false}}

export default function IaPanel({ctx,titulo,bajada,text,setTitulo}){
 const[busy,setBusy]=useState(''),[err,setErr]=useState(''),[msg,setMsg]=useState('')
 const[res,setRes]=useState(null),[cr,setCr]=useState(null),[ap,setAp]=useState('')
 const flash=t=>{setMsg(t);setTimeout(()=>setMsg(''),2200)}
 async function titulos(){
  setBusy('t');setErr('');setRes(null)
  const r=await pedir({modo:'titulos',ctx:{...ctx,titulo,bajada,texto:(text||'').slice(0,6000)}})
  setBusy('');r.ok?setRes(r):setErr(r.error||'No se pudo generar.')}
 async function cronica(){
  setBusy('c');setErr('');setCr(null)
  const r=await pedir({modo:'cronica',ctx:{...ctx,titulo,bajada,texto:ap}})
  setBusy('');if(r.ok)setCr(r);else setErr((r.error||'No se pudo generar.')+(r.faltan?` Falta: ${r.faltan}`:''))}
 return <div>
  <p className="muted" style={{margin:'6px 0'}}>Usa Gemini con <b>solo los datos que cargaste</b> (clubes, resultado, protagonista, texto). Son sugerencias: revisalas siempre antes de publicar. <b>No pegues material exclusivo o sin publicar</b>: en la capa gratuita Google puede usar lo que enviás para mejorar sus productos.</p>
  <p><button type="button" className="tag" disabled={!!busy} onClick={titulos}>{busy==='t'?'Generando…':'Sugerir títulos y bajada'}</button></p>
  {res&&<div>
   <ul style={{listStyle:'none',padding:0}}>{res.titulos.map((a,k)=><li key={k} style={{padding:'6px 0',borderBottom:'1px solid var(--line)'}}>
    <div>{a.t} <small className="muted">({a.t.length} car.)</small></div>{a.why&&<small className="muted">{a.why}</small>}
    <div className="chips" style={{marginTop:4}}><button type="button" className="tag" onClick={()=>{setTitulo(a.t);flash('Título reemplazado.')}}>Usar como título</button><button type="button" className="tag" onClick={async()=>flash(await copiar(a.t)?'Copiado.':'No se pudo copiar.')}>Copiar</button></div></li>)}</ul>
   {res.bajada&&<p><b>Bajada sugerida:</b> {res.bajada} <button type="button" className="tag" onClick={async()=>flash(await copiar(res.bajada)?'Bajada copiada.':'No se pudo copiar.')}>Copiar</button></p>}
   {res.avisos?.map((a,k)=><p key={k} style={{color:'#ffd479'}}>⚠ {a}</p>)}
  </div>}
  <hr style={{border:0,borderTop:'1px solid var(--line)',margin:'12px 0'}}/>
  <label>Apuntes del partido (para el borrador de crónica)</label>
  <textarea rows="5" value={ap} onChange={e=>setAp(e.target.value)} placeholder="Qué pasó, en tus palabras: goles y quién los hizo, jugadas clave, expulsiones, declaraciones textuales… Solo lo que sea cierto."/>
  <p><button type="button" className="tag" disabled={!!busy||ap.trim().length<150} onClick={cronica}>{busy==='c'?'Escribiendo…':'Generar borrador de crónica'}</button> <small className="muted">{ap.trim().length<150?`Mínimo ~150 caracteres (llevás ${ap.trim().length}).`:'Se arma solo con tus apuntes.'}</small></p>
  {cr&&<div><textarea rows="12" readOnly value={cr.texto}/>
   {cr.avisos?.map((a,k)=><p key={k} style={{color:'#ffd479'}}>⚠ {a}</p>)}
   <p><button type="button" className="tag" onClick={async()=>flash(await copiar(cr.texto)?'Borrador copiado: pegalo en el editor y revisalo.':'No se pudo copiar.')}>Copiar borrador</button> <small className="muted">Es un borrador: corregilo y verificá cada dato antes de publicar.</small></p></div>}
  {err&&<p className="err">{err}</p>}
  {msg&&<small style={{color:'#7ee39a'}}>{msg}</small>}
 </div>}
