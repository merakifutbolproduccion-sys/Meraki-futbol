import {useEffect,useRef,useState} from 'react'
import {importFile,importGoogle,findDuplicates,matchWriter,knownNames,googleReady,loadGoogle,ImportError,MAX_MB} from './importer'
import {Vista} from './Editor'

// Panel "Importá tu nota". Se usa dentro del formulario de noticias y del de crónicas (el tipo lo define la sección).
// Props:
//  tipo       'noticia' | 'cronica'
//  writers    lista de redactores (para reconocer la firma)
//  getCurrent () => {titulo,bajada,html,w,d?}  estado actual del formulario (para poder deshacer)
//  isEmpty    () => boolean                    true si el formulario está vacío (si no, se pide confirmación antes de reemplazar)
//  selfId     () => id de la fila que ya se está editando (para no marcarla como duplicado de sí misma)
//  onApply    ({titulo,bajada,html,w?,d?}) => void   completa el formulario existente
export default function ImportNota({tipo,writers,getCurrent,isEmpty,selfId,onApply,nextStep}){
 const label=tipo==='cronica'?'crónica':'noticia'
 const[tab,setTab]=useState('file'),[drag,setDrag]=useState(false),[busy,setBusy]=useState(null),[err,setErr]=useState(null),[pend,setPend]=useState(null),[done,setDone]=useState(null),[pv,setPv]=useState(false),[link,setLink]=useState('')
 const fileRef=useRef(null),undoRef=useRef(null),running=useRef(false)
 useEffect(()=>{if(googleReady())loadGoogle().catch(()=>{})},[]) // se precarga para que la ventana de Google no la bloquee el navegador

 const build=r=>{const w=matchWriter(r.autor,writers),d={titulo:r.titulo,bajada:r.bajada,html:r.html}
  if(w)d.w=w.id
  const useDate=tipo!=='cronica'&&r.fecha
  if(useDate)d.d=r.fecha.local
  return{d,writer:w,useDate:!!useDate}}

 function apply(r,data){undoRef.current=getCurrent();onApply(data.d);setPend(null);setErr(null);setDone({r,data});setPv(false)}
 function undo(){const p=undoRef.current;if(!p)return;onApply({...p});undoRef.current=null;setDone(null)}

 async function run(fn){
  if(running.current)return
  running.current=true;setErr(null);setPend(null);setBusy({pct:2,msg:'Iniciando…'})
  try{
   const r=await fn(p=>setBusy(b=>({...(b||{}),...p})))
   setBusy({pct:96,msg:'Buscando si la nota ya está cargada…'})
   const dups=await findDuplicates({tipo,titulo:r.titulo,html:r.html,selfId:selfId()})
   const data=build(r)
   if(dups.length||!isEmpty())setPend({r,data,dups});else apply(r,data)}
  catch(e){setErr(e instanceof ImportError?e.message:'No se pudo importar el documento'+(e&&e.message?': '+e.message:'.'))}
  finally{running.current=false;setBusy(null)}}

 const known=()=>knownNames(writers)
 const pickFile=f=>{if(f&&!running.current)run(p=>importFile(f,{known:known(),onProgress:p}))}
 const goGoogle=()=>{if(link.trim()&&!running.current)run(p=>importGoogle(link,{known:known(),onProgress:p}))}

 const R=done?.r,D=done?.data
 return <div className="imp" onKeyDown={e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();if(tab==='gdoc')goGoogle()}}}>
  <h4>Importá tu nota y completá la publicación automáticamente</h4>
  <small className="muted">Subí un PDF o un DOCX, o traela desde Google Docs: se cargan título, bajada, texto y formato en el formulario de abajo. No se publica nada hasta que vos lo confirmes.</small>
  <div className="tabs" style={{marginTop:10,marginBottom:0}}>
   <button type="button" className={'tag'+(tab==='file'?' on':'')} onClick={()=>setTab('file')}>Archivo PDF / DOCX</button>
   <button type="button" className={'tag'+(tab==='gdoc'?' on':'')} onClick={()=>setTab('gdoc')}>Google Docs</button></div>

  {tab==='file'&&<>
   <div className={'dz'+(drag?' drag':'')} role="button" tabIndex={0} aria-disabled={!!busy} aria-label="Elegir o arrastrar un archivo PDF o DOCX"
    onClick={()=>!busy&&fileRef.current.click()} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target===e.currentTarget){e.preventDefault();!busy&&fileRef.current.click()}}}
    onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
    onDrop={e=>{e.preventDefault();setDrag(false);const fs=[...e.dataTransfer.files];if(fs.length>1)setErr('Arrastraste más de un archivo. Importá una nota por vez.');else pickFile(fs[0])}}>
    <b>Arrastrá acá tu archivo</b><br/><small className="muted">o tocá para elegirlo desde tu dispositivo · PDF o DOCX · hasta {MAX_MB} MB</small></div>
   <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];e.target.value='';pickFile(f)}}/></>}

  {tab==='gdoc'&&(googleReady()?<>
   <label htmlFor="imp-gdoc">Enlace del documento de Google Docs</label>
   <input id="imp-gdoc" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://docs.google.com/document/d/…" inputMode="url" autoComplete="off" disabled={!!busy}/>
   <p><button type="button" className="btn" style={{border:0,cursor:'pointer'}} disabled={!!busy||!link.trim()} onClick={goGoogle}>Importar desde Google Docs</button></p>
   <small className="muted">Se abre una ventana de Google para autorizar la lectura (solo lectura). Funciona con los documentos a los que tu cuenta de Google tiene acceso; si no lo tiene, te lo avisa.</small></>
   :<p className="err">La importación desde Google Docs todavía no está configurada: falta la variable <b>VITE_GOOGLE_CLIENT_ID</b> (credencial de Google). Los pasos están en <b>IMPORTAR-NOTAS.md</b>. Mientras tanto podés descargar el documento como PDF o DOCX (Archivo → Descargar) y subirlo en la pestaña «Archivo».</p>)}

  {busy&&<div role="status" aria-live="polite" style={{marginTop:10}}><progress max="100" value={busy.pct||0}/><small className="muted" style={{display:'block'}}>{busy.msg}</small></div>}
  {err&&<p className="err" role="alert">{err} <small className="muted">Tu formulario no se modificó; podés volver a intentar.</small></p>}

  {pend&&<div className="seo" style={{marginTop:10}}>
   <b>Revisá antes de cargar</b>
   {pend.dups.length>0&&<div className="err" style={{margin:'8px 0'}}><b>⚠ Esta nota parece estar ya cargada:</b><ul style={{margin:'4px 0 0 18px'}}>{pend.dups.map(d=><li key={d.id}><a href={d.url} target="_blank" rel="noopener noreferrer">{d.titulo}</a> <small>({d.estado}) — {d.same?'mismo texto':'mismo título'}</small></li>)}</ul><small>Si la cargás igual, se va a crear otra publicación al guardarla. Para modificar la existente, editala desde Contenido.</small></div>}
   <ul className="chk"><li>Título: <b>{pend.r.titulo||'(no detectado)'}</b></li>{pend.r.bajada&&<li>Bajada: {pend.r.bajada}</li>}<li>Texto: {pend.r.words} palabras</li></ul>
   {!isEmpty()&&<p className="muted">Esto reemplaza el título, la bajada y el texto que hay ahora en el formulario (podés deshacerlo después).</p>}
   <p><button type="button" className="btn" style={{border:0,cursor:'pointer'}} onClick={()=>apply(pend.r,pend.data)}>{pend.dups.length?'Cargar de todos modos':'Cargar en el formulario'}</button> <button type="button" className="tag" onClick={()=>setPend(null)}>Cancelar</button></p></div>}

  {done&&<div className="seo" style={{marginTop:10}}>
   <b style={{color:'#7ee39a'}}>✔ Nota importada en el formulario</b> <small className="muted">· {R.source}</small>
   <ul className="chk">
    <li style={{color:R.titulo?'#7ee39a':'#ffd479'}}>{R.titulo?'✓':'○'} Título{R.titulo?'':': no detectado, escribilo'}</li>
    <li style={{color:R.bajada?'#7ee39a':'#9fb3a6'}}>{R.bajada?'✓ Bajada':'○ Sin bajada (es opcional)'}</li>
    <li style={{color:'#7ee39a'}}>✓ Texto: {R.words} palabras · {R.stats.paragraphs} párrafos{R.stats.headings?` · ${R.stats.headings} subtítulos`:''}{R.stats.lists?` · ${R.stats.lists} listas`:''}</li>
    {R.autor&&<li style={{color:D.writer?'#7ee39a':'#ffd479'}}>{D.writer?`✓ Redactor: ${D.writer.nombre_visible}`:`○ Firma «${R.autor.name}»: elegí el redactor a mano`}</li>}
    {R.fecha&&<li style={{color:'#7ee39a'}}>{D.useDate?`✓ Fecha: ${R.fecha.label} (podés cambiarla abajo)`:`○ Fecha detectada ${R.fecha.label}: no se aplica a crónicas (ahí va la fecha del partido)`}</li>}</ul>
   {R.warn.length>0&&<div><b style={{color:'#ffd479'}}>Revisá:</b><ul className="tips">{R.warn.map((w,i)=><li key={i}>• {w}</li>)}</ul></div>}
   <p className="muted">{nextStep||'Revisá el texto, subí la imagen principal y publicá.'}</p>
   <p><button type="button" className="tag" onClick={()=>setPv(v=>!v)}>{pv?'Ocultar vista previa':'Ver vista previa de lo importado'}</button> <button type="button" className="tag" onClick={undo}>Deshacer importación</button> <button type="button" className="tag" onClick={()=>setDone(null)}>Cerrar</button></p>
   {pv&&<Vista tag={label} titulo={R.titulo} bajada={R.bajada} img={null} alt="" html={R.html} meta={[D.useDate?R.fecha.label:'',D.writer?.nombre_visible].filter(Boolean).join(' · ')}/>}</div>}
 </div>}
