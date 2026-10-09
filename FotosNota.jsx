import {useRef,useState} from 'react'
import {uploadImage} from './Editor'

// Fotos que acompañan el texto: se suben todas juntas y cada una se coloca donde se quiera dentro del cuerpo de la nota.
export default function FotosNota({onBusy}){
 const[list,setList]=useState([]),[st,setSt]=useState(''),cur=useRef([])
 cur.current=list
 async function pick(e){const files=[...e.target.files];e.target.value='';if(!files.length)return
  onBusy?.(true);const fail=[]
  for(let i=0;i<files.length;i++){setSt(`Optimizando y subiendo foto ${i+1} de ${files.length}…`)
   try{const r=await uploadImage(files[i],1400);setList([...cur.current,{url:r.url,alt:'',cap:'',used:false}]);await new Promise(r=>setTimeout(r,0))}
   catch(er){fail.push(files[i].name+': '+er.message)}}
  onBusy?.(false);setSt(fail.length?'No se pudieron subir: '+fail.join(' | '):'Fotos listas ✔')}
 const upd=(i,p)=>setList(cur.current.map((x,k)=>k===i?{...x,...p}:x))
 const put=i=>{const p=cur.current[i];document.dispatchEvent(new CustomEvent('meraki-insert-figure',{detail:{url:p.url,alt:p.alt,cap:p.cap}}));upd(i,{used:true})}
 const del=i=>setList(cur.current.filter((_,k)=>k!==i))
 return <div className="gal-ed"><label>Fotos para acompañar la nota</label>
  <input type="file" accept="image/*" multiple onChange={pick}/>
  <small className="muted" style={{display:'block'}}>1) Elegí todas las fotos juntas. 2) Tocá en el texto el lugar donde va una foto. 3) Tocá "Insertar Foto N en el texto". Repetí con cada foto. {st}</small>
  {list.length>0&&<div className="gal-grid">{list.map((p,i)=><div key={p.url+i} className="gal-item">
   <img src={p.url} alt="" draggable={false}/>
   <div className="gal-bar"><b>Foto {i+1}</b>{p.used&&<span className="muted"> ✔ ya está en el texto</span>}<span style={{flex:1}}/><button type="button" aria-label="Quitar de esta lista" onClick={()=>del(i)}>✕</button></div>
   <input value={p.alt} placeholder="Qué se ve en la foto (ALT)" onChange={e=>upd(i,{alt:e.target.value})}/>
   <input value={p.cap} placeholder="Epígrafe visible (opcional)" onChange={e=>upd(i,{cap:e.target.value})}/>
   <button type="button" className="btn" style={{border:0,cursor:'pointer',width:'100%'}} onPointerDown={e=>e.preventDefault()} onClick={()=>put(i)}>Insertar Foto {i+1} en el texto</button>
  </div>)}</div>}
 </div>}
