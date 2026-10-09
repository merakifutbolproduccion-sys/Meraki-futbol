// Herramientas SEO del panel: asistente de títulos, enlaces internos y comparador con OTROS medios.
// Todo funciona sin IA paga ni APIs externas. No consulta Google ni otros sitios por su cuenta.
import {useMemo,useState} from 'react'
import {analyzeTitle,suggestTitles,searchQuery,googleNewsUrl,googleWebUrl,parseExternal,compare} from './seoTools'
import {fetchRelated} from './Related'

const Box=({title,children,open})=><details className="seo" open={open}><summary>{title}</summary>{children}</details>
async function copy(text,html){try{if(html&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})])}else await navigator.clipboard.writeText(text);return true}catch{try{await navigator.clipboard.writeText(text);return true}catch{return false}}}

// ctx: {tipo, clubs[], torneo, protagonista, home, away, hg, ag, fecha, tema}
// rel: {id, clubSlugs[], tournament_id, temas[], categoria}
export default function SeoTools({titulo,setTitulo,bajada,text,ctx,rel}){
 const c={...ctx,titulo,bajada}
 const an=useMemo(()=>analyzeTitle(titulo,c),[titulo,JSON.stringify(ctx)])
 const[alts,setAlts]=useState(null),[msg,setMsg]=useState('')
 const[ext,setExt]=useState(''),[extTx,setExtTx]=useState(''),[res,setRes]=useState(null)
 const[relL,setRelL]=useState(null),[relBusy,setRelBusy]=useState(false)
 const q=searchQuery(c)
 const flash=t=>{setMsg(t);setTimeout(()=>setMsg(''),2500)}
 async function loadRel(){setRelBusy(true);setRelL(await fetchRelated(rel||{},6));setRelBusy(false)}
 const parsed=parseExternal(ext)
 return <div style={{margin:'10px 0'}}>
  <Box title="Asistente de títulos SEO">
   <p style={{margin:'6px 0'}}><b>{an.n}</b> caracteres <small className="muted">(orientativo: 50 a 65; no es obligatorio)</small></p>
   <ul className="tips">{an.items.map((i,k)=><li key={k} style={{color:i.ok?'#7ee39a':'#ffd479'}}>{i.ok?'✓':'•'} {i.t}</li>)}</ul>
   <p><button type="button" className="tag" onClick={()=>setAlts(suggestTitles(c))}>Generar 5 alternativas</button> <small className="muted">Se arman solo con los datos de la nota (clubes, torneo, resultado, protagonista). No inventan nada.</small></p>
   {alts&&(alts.length?<ul style={{listStyle:'none',padding:0}}>{alts.map((a,k)=><li key={k} style={{padding:'6px 0',borderBottom:'1px solid var(--line)'}}><div>{a.t} <small className="muted">({a.t.length} car.)</small></div><small className="muted">{a.why}</small><div className="chips" style={{marginTop:4}}><button type="button" className="tag" onClick={()=>{setTitulo(a.t);flash('Título reemplazado.')}}>Usar como título</button><button type="button" className="tag" onClick={async()=>flash(await copy(a.t)?'Copiado.':'No se pudo copiar.')}>Copiar</button></div></li>)}</ul>:<p className="muted">Faltan datos para armar alternativas: elegí clubes, torneo o protagonista y escribí un título.</p>)}
   {msg&&<small style={{color:'#7ee39a'}}>{msg}</small>}
  </Box>

  <Box title="Noticias relacionadas y enlaces internos">
   <p className="muted" style={{margin:'6px 0'}}>Noticias ya publicadas del mismo club, torneo o tema. Copiá el enlace y pegalo en el texto (o seleccioná una palabra y usá el botón de enlace del editor con la dirección copiada).</p>
   <button type="button" className="tag" disabled={relBusy} onClick={loadRel}>{relBusy?'Buscando…':'Buscar noticias relacionadas'}</button>
   {relL&&(relL.length?<ul style={{listStyle:'none',padding:0}}>{relL.map(n=><li key={n.id} style={{padding:'6px 0',borderBottom:'1px solid var(--line)'}}><a href={`/noticias/${n.slug}`} target="_blank" rel="noopener noreferrer">{n.titulo}</a><div className="chips" style={{marginTop:4}}>
     <button type="button" className="tag" onClick={async()=>flash(await copy(n.titulo,`<a href="/noticias/${n.slug}">${n.titulo.replace(/</g,'&lt;')}</a>`)?'Copiado: pegalo en el texto y queda como enlace.':'No se pudo copiar.')}>Copiar con enlace</button>
     <button type="button" className="tag" onClick={async()=>flash(await copy(`/noticias/${n.slug}`)?'Dirección copiada.':'No se pudo copiar.')}>Copiar dirección</button></div></li>)}</ul>:<p className="muted">No hay noticias relacionadas publicadas todavía.</p>)}
  </Box>

  <Box title="Comparar con otros medios">
   <p className="muted" style={{margin:'6px 0'}}><b>Cómo funciona:</b> esta herramienta <b>no consulta Google ni otros sitios por su cuenta</b> (no hay servicio gratuito y permitido para hacerlo). Abrí la búsqueda, copiá los titulares de otros medios y pegalos abajo: el análisis se hace acá, con reglas.</p>
   <p><small className="muted">Búsqueda armada con los datos de tu nota: <b>{q||'(completá título, clubes o torneo)'}</b></small></p>
   <div className="chips"><a className={'btn'} style={{pointerEvents:q?'auto':'none',opacity:q?1:.5}} href={googleNewsUrl(q)} target="_blank" rel="noopener noreferrer">Abrir en Google Noticias</a><a className="tag" style={{pointerEvents:q?'auto':'none'}} href={googleWebUrl(q)} target="_blank" rel="noopener noreferrer">Búsqueda web</a></div>
   <label>Titulares de otros medios (uno por línea; opcional: «título | https://link»)</label>
   <textarea rows="5" value={ext} onChange={e=>setExt(e.target.value)} placeholder={'Ej:\nAtlanta venció a Quilmes y sigue arriba | https://sitio.com/nota\nhttps://otro-medio.com/nota-sin-titulo'}/>
   <label>Textos de otras notas (opcional, separados por una línea con ---)</label>
   <textarea rows="3" value={extTx} onChange={e=>setExtTx(e.target.value)} placeholder="Solo para ver qué términos aparecen allí y no en tu nota. No se copia nada."/>
   <p><button type="button" className="tag" disabled={!parsed.length} onClick={()=>setRes(compare({titulo,bajada,text,ctx:c},parsed,extTx.split(/^\s*---\s*$/m)))}>Analizar</button> <small className="muted">{parsed.length?`${parsed.length} línea(s) cargadas`:'Pegá al menos un titular.'}</small></p>
   {res&&<div>
    {res.nTitles===0&&<p className="err">No hay titulares con texto para comparar: pegá el título junto al link.</p>}
    {res.noTitle.length>0&&<p className="muted">{res.noTitle.length} link(s) sin título: se listan pero <b>no se analizaron</b> (la herramienta no abre esas páginas).</p>}
    {res.rows.length>0&&<><p style={{margin:'6px 0'}}><b>Coincidencias con tu título</b></p><ul className="tips">{res.rows.map((r,k)=><li key={k}>{r.sim>=0.5?'⚠ ':'• '}{r.title}{r.host&&<small className="muted"> — {r.host}</small>} <small className="muted">· {Math.round(r.sim*100)}% de palabras en común{r.shared.length?` (${r.shared.join(', ')})`:''}</small></li>)}</ul></>}
    {res.common.length>0&&<p><b>Términos que usan otros y tu título no:</b> {res.common.map(x=>`${x.w} (${x.c})`).join(', ')}</p>}
    {Object.keys(res.angCount).length>0&&<p><b>Enfoques detectados:</b> {Object.entries(res.angCount).map(([a,n])=>`${a} (${n})`).join(', ')}</p>}
    {res.faltan.length>0&&<p><b>Términos de los textos pegados que tu nota no menciona:</b> {res.faltan.join(', ')}</p>}
    {res.tips.length>0&&<><p style={{margin:'6px 0'}}><b>Oportunidades</b></p><ul className="tips">{res.tips.map((t,k)=><li key={k}>• {t}</li>)}</ul></>}
    <p className="muted">Es una guía automática por palabras clave, no un juicio periodístico. Usá estos datos para aportar información propia: no copies titulares ni textos de otros medios.</p></div>}
  </Box></div>}
