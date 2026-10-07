import {useEffect,useRef,useState} from 'react'
import {sb} from './supabase'
import {optimizeImage,fmt} from './imagen'
import {isHtml,sanitize,textToHtml,organizeHtml} from './editorUtils'

// Sube una imagen al mismo bucket "imagenes" que ya usa el panel (optimizada en el navegador).
export async function uploadImage(file,max=1600){
 const r=await optimizeImage(file,{maxSide:max})
 const path=`${Date.now()}-${r.file.name.replace(/[^a-z0-9.]+/gi,'-')}`
 const{error}=await sb.storage.from('imagenes').upload(path,r.file,{contentType:r.file.type})
 if(error)throw new Error('Error al subir la imagen: '+error.message)
 return{url:sb.storage.from('imagenes').getPublicUrl(path).data.publicUrl,before:r.before,after:r.after,changed:r.changed}}

// Cuerpo de una nota: HTML limpio si es nueva, texto con saltos de línea si es una nota vieja.
export function Cuerpo({body}){
 if(!isHtml(body))return <div style={{whiteSpace:'pre-wrap'}}>{body}</div>
 return <div className="cuerpo" dangerouslySetInnerHTML={{__html:sanitize(body)}}/>}

// Imagen principal: muestra la actual y permite cambiarla.
export function ImgPick({value,onUrl,onBusy}){
 const[st,setSt]=useState('')
 async function pick(e){const f=e.target.files[0];if(!f)return;onBusy?.(true);setSt('Optimizando y subiendo imagen…')
  try{const r=await uploadImage(f);onUrl(r.url);setSt(r.changed?`Imagen optimizada (${fmt(r.before)} → ${fmt(r.after)}) y subida ✔`:'Imagen subida ✔')}
  catch(er){e.target.value='';setSt('Error: '+er.message)}finally{onBusy?.(false)}}
 return <><label>Imagen principal</label><input type="file" accept="image/*" onChange={pick}/>{value&&<img src={value} alt="Imagen principal actual" style={{maxWidth:'100%',maxHeight:180,marginTop:8}}/>}<small className="muted">{st}</small></>}

// Vista previa aproximada de cómo se ve la nota en la web.
export const Vista=({tag,titulo,bajada,img,alt,html,meta})=><article className="art paper" style={{margin:'8px 0'}}><span className="tag">{tag}</span><h1>{titulo||'(sin título)'}</h1><p className="muted">{meta}</p>{img&&<img className="cover" src={img} alt={alt||titulo||''}/>}{bajada&&<p><b>{bajada}</b></p>}<Cuerpo body={html}/></article>

const BTN={className:'tag',type:'button',onPointerDown:e=>e.preventDefault(),style:{cursor:'pointer'}}

export function RichEditor({initial,onChange,onBusy}){
 const ref=useRef(null),saved=useRef(null),file=useRef(null),[msg,setMsg]=useState('')
 const fixFigures=()=>ref.current.querySelectorAll('figure').forEach(f=>f.setAttribute('contenteditable','false'))
 const emit=()=>onChange?.(ref.current.innerHTML)
 const say=t=>{setMsg(t);setTimeout(()=>setMsg(m=>m===t?'':m),6000)}
 useEffect(()=>{const el=ref.current;el.innerHTML=initial||'<p><br></p>';fixFigures()
  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch{}
  const sel=()=>{const s=getSelection();if(s.rangeCount&&el.contains(s.anchorNode))saved.current=s.getRangeAt(0).cloneRange()}
  document.addEventListener('selectionchange',sel);return()=>document.removeEventListener('selectionchange',sel)},[])
 function focus(){const el=ref.current;el.focus();const s=getSelection()
  if(saved.current&&!(s.rangeCount&&el.contains(s.anchorNode))){s.removeAllRanges();s.addRange(saved.current)}}
 const cmd=(c,v)=>{focus();document.execCommand(c,false,v);fixFigures();emit()}
 const blockOf=()=>{const n=getSelection().anchorNode;return(n&&(n.nodeType===3?n.parentElement:n))?.closest?.('h2,h3,blockquote,p,li')}
 function toggle(tag){focus();const b=blockOf()
  if(tag==='blockquote'&&blockOf()?.closest('blockquote'))document.execCommand('outdent')
  else if(b&&b.tagName.toLowerCase()===tag)document.execCommand('formatBlock',false,'p')
  else document.execCommand('formatBlock',false,tag);fixFigures();emit()}
 function link(){focus();const s=getSelection(),a=(s.anchorNode&&(s.anchorNode.nodeType===3?s.anchorNode.parentElement:s.anchorNode))?.closest?.('a')
  if(s.isCollapsed&&!a)return say('Primero seleccioná la palabra o frase que querés enlazar.')
  let u=prompt('Dirección del enlace (ej: https://sitio.com o /noticias/otra-nota).\nDejalo vacío para quitar el enlace.',a?.getAttribute('href')||'https://');if(u===null)return
  u=u.trim();focus()
  if(!u||u==='https://'){document.execCommand('unlink');emit();return}
  if(!/^(https?:\/\/|mailto:|\/)/i.test(u))u='https://'+u
  document.execCommand('createLink',false,u);emit()}
 async function addImage(e){const f=e.target.files[0];e.target.value='';if(!f)return
  onBusy?.(true);say('Optimizando y subiendo imagen…')
  try{const r=await uploadImage(f,1400)
   const alt=prompt('Texto alternativo (ALT): describí lo que se ve en la foto. Es importante para accesibilidad y buscadores.','');if(alt===null)return say('Imagen cancelada.')
   const cap=prompt('Descripción visible debajo de la foto (opcional). Dejalo vacío para no mostrar ninguna.','')
   const q=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')
   focus();{const s=getSelection();if(s.rangeCount&&!s.isCollapsed)s.collapseToEnd()} // no pisar el texto que estaba seleccionado
   document.execCommand('insertHTML',false,`<figure contenteditable="false"><img src="${q(r.url)}" alt="${q(alt.trim())}">${cap&&cap.trim()?`<figcaption>${q(cap.trim())}</figcaption>`:''}</figure><p><br></p>`)
   fixFigures();emit();say('Imagen insertada ✔ (tocala para editar su ALT o eliminarla).')}
  catch(er){say('Error: '+er.message)}finally{onBusy?.(false)}}
 function editImage(fig){const img=fig.querySelector('img'),cap=fig.querySelector('figcaption')
  if(confirm('¿Querés ELIMINAR esta imagen de la noticia?\n\nAceptar = eliminarla.\nCancelar = editar su ALT y descripción.')){fig.remove();emit();return}
  const alt=prompt('Texto alternativo (ALT):',img.getAttribute('alt')||'');if(alt===null)return
  const c=prompt('Descripción visible debajo de la foto (vacío = ninguna):',cap?.textContent||'');img.setAttribute('alt',alt.trim())
  if(c!==null){if(c.trim()){if(cap)cap.textContent=c.trim();else{const n=document.createElement('figcaption');n.textContent=c.trim();fig.appendChild(n)}}else cap?.remove()}
  emit()}
 function paste(e){e.preventDefault();const cd=e.clipboardData,h=cd.getData('text/html'),t=cd.getData('text/plain')
  const out=h&&/<(p|h[1-6]|ul|ol|li|blockquote)[\s>]/i.test(h)?sanitize(h,{images:false}):textToHtml(t)
  if(!out)return;document.execCommand('insertHTML',false,out);fixFigures();emit()}
 function organize(){const r=organizeHtml(ref.current.innerHTML)
  if(!r.html)return say('Todavía no hay texto para organizar.')
  focus();document.execCommand('selectAll');document.execCommand('insertHTML',false,r.html);fixFigures();emit()
  say(r.subs||r.quotes?`Se detectaron ${r.subs} subtítulo(s) y ${r.quotes} cita(s). Revisalos: si algo no va, usá Deshacer ↶.`:'Los párrafos ya están ordenados. No se detectaron subtítulos ni citas claras (ante la duda no se cambia nada).')}
 return <div>
  <div className="tabs" style={{margin:'4px 0'}} role="toolbar" aria-label="Herramientas del editor">
   <button {...BTN} onClick={()=>toggle('p')}>Párrafo</button><button {...BTN} onClick={()=>toggle('h2')}>Subtítulo</button><button {...BTN} onClick={()=>toggle('h3')}>Subtítulo 2</button>
   <button {...BTN} onClick={()=>cmd('bold')}><b>B</b></button><button {...BTN} onClick={()=>cmd('italic')}><i>I</i></button>
   <button {...BTN} onClick={link}>Enlace</button><button {...BTN} onClick={()=>file.current.click()}>Imagen</button>
   <button {...BTN} onClick={()=>toggle('blockquote')}>Cita</button><button {...BTN} onClick={()=>cmd('insertUnorderedList')}>Lista</button>
   <button {...BTN} onClick={()=>cmd('insertOrderedList')}>1. Lista</button><button {...BTN} onClick={()=>cmd('insertHorizontalRule')}>Separador</button>
   <button {...BTN} onClick={()=>cmd('undo')} aria-label="Deshacer">↶</button><button {...BTN} onClick={()=>cmd('redo')} aria-label="Rehacer">↷</button>
   <button {...BTN} onClick={organize}>Organizar texto</button>
   <input ref={file} type="file" accept="image/*" style={{display:'none'}} onChange={addImage}/></div>
  <div ref={ref} className="cuerpo edarea" contentEditable suppressContentEditableWarning spellCheck lang="es" role="textbox" aria-multiline="true" aria-label="Texto de la noticia" onInput={emit} onPaste={paste} onBlur={emit} onClick={e=>{const f=e.target.closest?.('figure');if(f)editImage(f)}}/>
  <small className="muted">Enter = nuevo párrafo. Podés pegar un texto largo: se conservan los párrafos. {msg&&<b style={{color:'#7ee39a'}}>{msg}</b>}</small></div>}
