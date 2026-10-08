import {useEffect,useRef,useState} from 'react'
import {uploadImage} from './Editor'
import {Sec} from './ui'

// Guarda una fila; si la base todavía no tiene alguna columna nueva, la saca y reintenta (así nunca se pierde lo básico).
export async function writeSmart(run,row,optional){
 let r={...row};const dropped=[]
 for(let i=0;i<12;i++){const res=await run(r),er=res.error
  if(!er)return{...res,dropped}
  if(!/column|PGRST204/i.test((er.code||'')+' '+(er.message||'')))return{...res,dropped}
  const m=(er.message||'').match(/'(\w+)' column|column "?(\w+)"?/i),n=m&&(m[1]||m[2])
  const cols=n&&optional.includes(n)?[n]:optional.filter(c=>c in r)
  if(!cols.length)return{...res,dropped}
  cols.forEach(c=>{delete r[c]});dropped.push(...cols)}
 return{error:{message:'No se pudo guardar.'},dropped}}

// ---------- Panel: elegir varias fotos y ordenarlas ----------
export function GalleryEditor({value,onChange,onBusy}){
 const list=Array.isArray(value)?value:[],[st,setSt]=useState(''),[over,setOver]=useState(-1),cur=useRef(list),drag=useRef(-1)
 cur.current=list
 async function pick(e){const files=[...e.target.files];e.target.value='';if(!files.length)return
  onBusy?.(true);let ok=0,fail=[]
  for(let i=0;i<files.length;i++){setSt(`Optimizando y subiendo foto ${i+1} de ${files.length}…`)
   try{const r=await uploadImage(files[i],1600);onChange([...cur.current,{url:r.url,alt:'',cap:''}]);ok++;await new Promise(r=>setTimeout(r,0))}
   catch(er){fail.push(files[i].name+': '+er.message)}}
  onBusy?.(false);setSt(`${ok} foto(s) agregada(s) ✔${fail.length?' · No se pudieron subir: '+fail.join(' | '):''}`)}
 const move=(i,j)=>{if(j<0||j>=list.length)return;const a=[...list],[x]=a.splice(i,1);a.splice(j,0,x);onChange(a)}
 const upd=(i,p)=>onChange(list.map((x,k)=>k===i?{...x,...p}:x))
 const del=i=>onChange(list.filter((_,k)=>k!==i))
 return <div className="gal-ed"><label>Galería de fotos (opcional)</label>
  <input type="file" accept="image/*" multiple onChange={pick}/>
  <small className="muted" style={{display:'block'}}>Podés elegir varias fotos a la vez. Se muestran en la nota en este mismo orden. {st}</small>
  {list.length>0&&<><small className="muted" style={{display:'block',margin:'6px 0'}}>Ordenalas con las flechas ◀ ▶ (o arrastrándolas en la computadora). La foto 1 es la primera que se ve.</small>
  <div className="gal-grid">{list.map((p,i)=><div key={p.url+i} className={'gal-item'+(over===i?' over':'')} draggable onDragStart={()=>{drag.current=i}} onDragOver={e=>{e.preventDefault();setOver(i)}} onDragLeave={()=>setOver(-1)} onDrop={e=>{e.preventDefault();setOver(-1);if(drag.current>=0&&drag.current!==i)move(drag.current,i);drag.current=-1}}>
   <img src={p.url} alt="" draggable={false}/>
   <div className="gal-bar"><b>Foto {i+1}</b><span style={{flex:1}}/><button type="button" aria-label="Mover antes" disabled={!i} onClick={()=>move(i,i-1)}>◀</button><button type="button" aria-label="Mover después" disabled={i===list.length-1} onClick={()=>move(i,i+1)}>▶</button><button type="button" aria-label="Quitar foto" onClick={()=>del(i)}>✕</button></div>
   <input value={p.alt||''} placeholder="Qué se ve en la foto (ALT)" onChange={e=>upd(i,{alt:e.target.value})}/>
   <input value={p.cap||''} placeholder="Epígrafe visible (opcional)" onChange={e=>upd(i,{cap:e.target.value})}/></div>)}</div>
  {list.length>1&&<p style={{margin:'6px 0'}}><button type="button" className="tag" onClick={()=>confirm('¿Quitar todas las fotos de la galería?')&&onChange([])}>Quitar todas</button></p>}</>}
 </div>}

// ---------- Web pública: grilla de fotos con visor ----------
export function GalleryView({items}){
 const l=(Array.isArray(items)?items:[]).filter(i=>i&&i.url),[o,setO]=useState(-1)
 useEffect(()=>{if(o<0)return;const h=e=>{if(e.key==='Escape')setO(-1);if(e.key==='ArrowRight')setO(i=>(i+1)%l.length);if(e.key==='ArrowLeft')setO(i=>(i-1+l.length)%l.length)}
  addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[o,l.length])
 if(!l.length)return null
 const p=l[o]
 return <section className="galeria"><Sec t="Galería de fotos"/>
  <div className={'gal'+(l.length===1?' uno':'')}>{l.map((x,i)=><figure key={x.url+i}><button type="button" aria-label={`Ver foto ${i+1} de ${l.length} en grande`} onClick={()=>setO(i)}><img src={x.url} alt={x.alt||''} loading="lazy" decoding="async"/></button>{x.cap&&<figcaption>{x.cap}</figcaption>}</figure>)}</div>
  {p&&<div className="lbx" role="dialog" aria-modal="true" aria-label="Visor de fotos" onClick={()=>setO(-1)}>
   <img src={p.url} alt={p.alt||''} onClick={e=>e.stopPropagation()}/>
   {p.cap&&<p onClick={e=>e.stopPropagation()}>{p.cap}</p>}
   <span className="lbx-n">{o+1} / {l.length}</span>
   <button type="button" className="lbx-x" aria-label="Cerrar" onClick={()=>setO(-1)}>✕</button>
   {l.length>1&&<><button type="button" className="lbx-p" aria-label="Foto anterior" onClick={e=>{e.stopPropagation();setO((o-1+l.length)%l.length)}}>‹</button><button type="button" className="lbx-s" aria-label="Foto siguiente" onClick={e=>{e.stopPropagation();setO((o+1)%l.length)}}>›</button></>}</div>}
 </section>}
