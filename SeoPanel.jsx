import {useMemo,useState} from 'react'
import {htmlToText,paragraphsOf,suggestSeoTitle,suggestMeta,suggestTopic,detectNames,review} from './editorUtils'

// Columnas SEO de la tabla chronicles (se agregan con migracion-seo-cronicas.sql).
export const SEO_COLS=['seo_titulo','meta_descripcion','imagen_alt','tema_principal','temas','updated_at']
export const isColumnError=er=>!!er&&/column|PGRST204/i.test((er.code||'')+' '+(er.message||''))

// Sugerencias automáticas + lo que escribió la persona. Mientras no toque un campo, se va actualizando solo.
// lists={cl,to}: detecta clubes/torneos escritos en el texto. Sin lists, usa sugTema / sugTemas.
export function useSeo({x,titulo,bajada,html,img,writer,lists,sugTema,sugTemas}){
 const[v,setV]=useState(()=>({seo:x?.seo_titulo||'',meta:x?.meta_descripcion||'',alt:x?.imagen_alt||'',tema:x?.tema_principal||'',temas:(x?.temas||[]).join(', ')}))
 const[tch,setTch]=useState(()=>({seo:!!x?.seo_titulo,meta:!!x?.meta_descripcion,alt:!!x?.imagen_alt,tema:!!x?.tema_principal,temas:!!(x?.temas&&x.temas.length)}))
 const text=useMemo(()=>htmlToText(html),[html]),struct=useMemo(()=>paragraphsOf(html),[html])
 const all=titulo+' \n '+bajada+' \n '+text
 const det=lists?{tema:suggestTopic(titulo,lists.cl,lists.to),temas:[...detectNames(all,lists.cl),...detectNames(all,lists.to)].map(z=>z.nombre).join(', ')}:{tema:sugTema||'',temas:sugTemas||''}
 const sug={seo:suggestSeoTitle(titulo),meta:suggestMeta(bajada,text),alt:titulo.trim(),tema:det.tema,temas:det.temas}
 const val={seo:tch.seo?v.seo:sug.seo,meta:tch.meta?v.meta:sug.meta,alt:tch.alt?v.alt:sug.alt,tema:tch.tema?v.tema:sug.tema,temas:tch.temas?v.temas:sug.temas}
 const edit=(k,s)=>{setV(p=>({...p,[k]:s}));setTch(p=>({...p,[k]:s.trim()!==''}))}
 const temasArr=val.temas.split(',').map(s=>s.trim()).filter(Boolean)
 const rv=review({titulo,bajada,text,struct,img,slug:'auto',slugTaken:false,meta:val.meta,alt:val.alt,cat:'cronica',writer,tema:val.tema})
 const cols=()=>({seo_titulo:val.seo.trim()||null,meta_descripcion:val.meta.trim()||null,imagen_alt:val.alt.trim()||null,tema_principal:val.tema.trim()||null,temas:temasArr,updated_at:new Date().toISOString()})
 return{val,sug,edit,temasArr,rv,cols}}

export function SeoPanel({s,titulo,img}){
 const{val,sug,edit,temasArr,rv}=s,chips=sug.temas.split(', ').filter(Boolean).filter(c=>!temasArr.includes(c))
 return <details className="seo"><summary>Optimización y SEO — {rv.good?'🟢 Publicación bien preparada':`🟡 Hay elementos para mejorar (${rv.missing.length})`}</summary>
  <ul className="chk">{rv.items.map(i=><li key={i.k} style={{color:i.ok?'#7ee39a':'#ffd479'}}>{i.ok?'✓':'○'} {i.label}</li>)}</ul>
  {!rv.good&&<p><b>Falta o conviene revisar:</b> {rv.missing.map(i=>i.label).join(', ')}.</p>}
  <ul className="tips">{rv.tips.map((t,i)=><li key={i}>{t.ok?'✓':'•'} {t.t}</li>)}</ul>
  <label>Título SEO ({val.seo.length}/60 recomendado)</label><input value={val.seo} onChange={e=>edit('seo',e.target.value)}/>
  <label>Meta descripción ({val.meta.length}/160 recomendado)</label><textarea rows="3" value={val.meta} onChange={e=>edit('meta',e.target.value)}/>
  <label>Tema principal</label><input value={val.tema} onChange={e=>edit('tema',e.target.value)} placeholder="Ej: Independiente vs Racing"/>
  <label>Temas relacionados (separados por coma)</label><input value={val.temas} onChange={e=>edit('temas',e.target.value)}/>
  {chips.length>0&&<div className="chips" style={{marginTop:6}}>{chips.map(c=><button key={c} type="button" className="tag" onClick={()=>edit('temas',[...temasArr,c].join(', '))}>+ {c}</button>)}</div>}
  <label>ALT de la imagen principal</label><input value={val.alt} onChange={e=>edit('alt',e.target.value)} disabled={!img} placeholder={img?'':'Primero cargá la imagen principal'}/>
  <small className="muted" style={{display:'block'}}>Se arma con el título. Cambialo por lo que se ve en la foto, por ejemplo: «Jugadores de Independiente festejando un gol».</small>
  <label>Así se verá al compartir (WhatsApp, Facebook, X)</label>
  <div style={{border:'1px solid var(--line)',maxWidth:420,background:'#fff',color:'#111'}}>{img&&<img src={img} alt="" style={{width:'100%',aspectRatio:'1.91/1',objectFit:'cover',display:'block'}}/>}<div style={{padding:8}}><small style={{color:'#666'}}>{typeof location!=='undefined'?location.host:''}</small><div style={{fontWeight:700}}>{val.seo||titulo||'Título'}</div><small style={{color:'#444'}}>{val.meta}</small></div></div>
  <p className="muted">Los datos estructurados, la URL canónica y las etiquetas para redes se generan solos al publicar. La dirección (slug) de la crónica se arma sola.</p>
 </details>}
