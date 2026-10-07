import {useEffect,useMemo,useRef,useState} from 'react'
import {sb} from './supabase'
import {api} from './api'
import {Async,useData,slugify,fdate} from './ui'
import {RichEditor,ImgPick,Vista} from './Editor'
import {isHtml,sanitize,textToHtml,htmlToText,paragraphsOf,suggestSlug,suggestSeoTitle,suggestMeta,detectNames,suggestTopic,review} from './editorUtils'

// Columnas nuevas (se agregan con migracion-seo-noticias.sql). Si todavía no existen, se guarda igual lo básico.
const NEWCOLS=['seo_titulo','meta_descripcion','imagen_alt','tema_principal','temas','updated_at']
const pad=n=>String(n).padStart(2,'0')
const toLocal=d=>{if(!d)return '';const t=new Date(d);return isNaN(t)?'':`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`}
const initHtml=c=>isHtml(c)?sanitize(c):textToHtml(c)
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const Note=({m})=>m?<p className={m.err?'err':''} style={m.err?null:{color:'#7ee39a'}}>{m.t}</p>:null
const Opts=({l,t='nombre'})=>l.map(x=><option key={x.id} value={x.id}>{x[t]}</option>)

// Devuelve un slug que no esté usado por otra noticia (agrega -2, -3…).
async function freeSlug(s,id){
 for(let i=1;i<40;i++){const c=i===1?s:`${s}-${i}`;let q=sb.from('news').select('id').eq('slug',c).limit(1);if(id)q=q.neq('id',id)
  const{data,error}=await q;if(error)return s;if(!data.length)return c}
 return `${s}-${Date.now()}`}

export default function NewsEditor({x,done}){
 const[k,setK]=useState(0),[note,setNote]=useState(null)
 const o=useData(()=>Promise.all([api.clubs(),api.writers(),api.tournaments(),x?sb.from('news_clubs').select('club_id').eq('news_id',x.id).then(r=>(r.data||[]).map(m=>m.club_id)):Promise.resolve([])]),[x?.id])
 return <><Note m={note}/><Async s={o}>{([cl,wr,to,mine])=><Inner key={k} x={x} done={done} cl={cl} wr={wr} to={to} mine={mine} onNew={m=>{setNote(m);setK(n=>n+1)}}/>}</Async></>}

function Inner({x,done,cl,wr,to,mine,onNew}){
 const bkKey=x?'meraki-noticia-'+x.id:null,canDb=!x||x.estado==='borrador'
 const[f,setF]=useState(()=>({titulo:x?.titulo||'',bajada:x?.bajada||'',html:initHtml(x?.contenido),slug:x?.slug||'',seoTitulo:x?.seo_titulo||'',meta:x?.meta_descripcion||'',alt:x?.imagen_alt||'',tema:x?.tema_principal||'',temas:(x?.temas||[]).join(', '),img:x?.imagen_url||null,cat:x?.categoria||'general',to:x?.tournament_id||'',w:x?.writer_id||'',d:x?toLocal(x.fecha):'',est:x?.estado||'borrador',clubIds:mine}))
 // tch = "lo tocó la persona". Mientras no lo toque, el sistema sugiere y va actualizando el valor.
 const[tch,setTch]=useState(()=>({slug:!!x,seo:!!x?.seo_titulo,meta:!!x?.meta_descripcion,alt:!!x?.imagen_alt,tema:!!x?.tema_principal,temas:!!(x?.temas&&x.temas.length)}))
 const[view,setView]=useState('ed'),[busy,setBusy]=useState(false),[upl,setUpl]=useState(false),[m,setM]=useState(null),[auto,setAuto]=useState(''),[ek,setEk]=useState(0)
 const idRef=useRef(x?.id||null),saving=useRef(false),firstRun=useRef(true),clubsDb=useRef(new Set(mine))
 const set=(a,v)=>setF(p=>({...p,[a]:v}))
 const edit=(a,t,v)=>{set(a,v);setTch(p=>({...p,[t]:v.trim()!==''}))}

 const text=useMemo(()=>htmlToText(f.html),[f.html])
 const struct=useMemo(()=>paragraphsOf(f.html),[f.html])
 const all=f.titulo+' \n '+f.bajada+' \n '+text
 const detClubs=useMemo(()=>detectNames(all,cl),[all,cl]),detTo=useMemo(()=>detectNames(all,to),[all,to])
 const sug={slug:suggestSlug(f.titulo),seoTitulo:suggestSeoTitle(f.titulo),meta:suggestMeta(f.bajada,text),alt:f.titulo.trim(),tema:suggestTopic(f.titulo,cl,to),temas:[...detClubs,...detTo].map(z=>z.nombre).join(', ')}
 const manualSlug=tch.slug&&f.slug.trim()
 const slugBase=manualSlug?slugify(f.slug):(x?x.slug:sug.slug)
 const seoTitulo=tch.seo?f.seoTitulo:sug.seoTitulo,meta=tch.meta?f.meta:sug.meta,alt=tch.alt?f.alt:sug.alt,tema=tch.tema?f.tema:sug.tema,temasStr=tch.temas?f.temas:sug.temas
 const temasArr=temasStr.split(',').map(s=>s.trim()).filter(Boolean)

 // Detecta si el slug ya existe y, si es así, usa una alternativa segura.
 const[chk,setChk]=useState({s:'',taken:false,alt:''})
 useEffect(()=>{if(!slugBase){setChk({s:'',taken:false,alt:''});return}
  let ok=true;const t=setTimeout(async()=>{const a=await freeSlug(slugBase,idRef.current);if(ok)setChk({s:slugBase,taken:a!==slugBase,alt:a})},400)
  return()=>{ok=false;clearTimeout(t)}},[slugBase])
 const conflict=chk.s===slugBase&&chk.taken,slug=conflict?chk.alt:slugBase

 const rv=review({titulo:f.titulo,bajada:f.bajada,text,struct,img:f.img,slug,slugTaken:false,meta,alt,cat:f.cat,writer:f.w,tema})

 async function write(row){
  const run=r=>idRef.current?sb.from('news').update(r).eq('id',idRef.current).select('id').single():sb.from('news').insert(r).select('id').single()
  let r=await run(row),legacy=false
  if(r.error&&/column|PGRST204/i.test((r.error.code||'')+' '+r.error.message)){const lite={...row};NEWCOLS.forEach(c=>delete lite[c]);r=await run(lite);legacy=!r.error}
  if(r.error)throw r.error;idRef.current=r.data.id;return legacy}
 // Guarda siempre sobre la misma fila (no duplica noticias).
 async function persist(estado){
  const now=new Date().toISOString(),finalSlug=await freeSlug(slug||suggestSlug(f.titulo)||'noticia',idRef.current)
  const fecha=f.d?new Date(f.d).toISOString():(x?.estado==='publicada'&&x.fecha?x.fecha:estado==='publicada'?now:(x?.fecha||now))
  const legacy=await write({titulo:f.titulo.trim(),slug:finalSlug,bajada:f.bajada,contenido:sanitize(f.html),imagen_url:f.img,categoria:f.cat,tournament_id:f.to||null,writer_id:f.w||null,fecha,estado,
   seo_titulo:seoTitulo.trim()||null,meta_descripcion:meta.trim()||null,imagen_alt:alt.trim()||null,tema_principal:tema.trim()||null,temas:temasArr,updated_at:now})
  return{legacy,slug:finalSlug}}
 async function syncClubs(){const want=new Set(f.clubIds),id=idRef.current,add=[...want].filter(c=>!clubsDb.current.has(c)),del=[...clubsDb.current].filter(c=>!want.has(c))
  if(add.length){const r=await sb.from('news_clubs').insert(add.map(club_id=>({news_id:id,club_id})));if(r.error)throw new Error('La noticia se guardó, pero fallaron los clubes: '+r.error.message);add.forEach(c=>clubsDb.current.add(c))}
  if(del.length){const r=await sb.from('news_clubs').delete().eq('news_id',id).in('club_id',del);if(r.error)throw new Error('La noticia se guardó, pero no se pudieron quitar clubes: '+r.error.message);del.forEach(c=>clubsDb.current.delete(c))}}

 async function save(e){e.preventDefault();if(busy||upl)return
  if(!f.titulo.trim())return setM({err:1,t:'Falta el título.'})
  if(!text.trim())return setM({err:1,t:'Escribí el contenido de la noticia.'})
  setBusy(true);setM(null);while(saving.current)await sleep(150);saving.current=true
  try{const r=await persist(f.est);await syncClubs();if(bkKey)localStorage.removeItem(bkKey)
   if(r.legacy)return setM({err:1,t:'Guardada, pero la base de datos todavía no tiene los campos SEO. Ejecutá el archivo migracion-seo-noticias.sql en Supabase y volvé a guardar.'})
   if(x)done();else onNew({t:`Noticia guardada (${f.est}). URL: /noticias/${r.slug}`})}
  catch(er){setM({err:1,t:er.message||String(er)})}
  finally{saving.current=false;setBusy(false)}}

 // Autoguardado: noticias nuevas y borradores van a la base como borrador (misma fila). Una noticia ya publicada nunca se toca sola: se guarda una copia en este navegador.
 const snap=JSON.stringify([f,tch])
 useEffect(()=>{if(firstRun.current){firstRun.current=false;return}
  const t=setTimeout(async()=>{if(saving.current||f.titulo.trim().length<3)return
   const hora=()=>new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
   if(canDb){saving.current=true
    try{const r=await persist('borrador');setAuto((r.legacy?'Guardado (faltan los campos SEO en la base) ':'Guardado automáticamente ')+hora())}
    catch(er){setAuto('No se pudo autoguardar: '+(er.message||er))}finally{saving.current=false}}
   else try{localStorage.setItem(bkKey,JSON.stringify({f,tch,t:Date.now()}));setAuto('Copia de seguridad en este navegador '+hora())}catch{}},3000)
  return()=>clearTimeout(t)},[snap])
 const[bak,setBak]=useState(()=>{if(!bkKey)return null;try{const b=JSON.parse(localStorage.getItem(bkKey)||'null');return b&&b.t>new Date(x.updated_at||x.created_at||0).getTime()?b:null}catch{return null}})

 const chips=sug.temas.split(', ').filter(Boolean).filter(c=>!temasArr.includes(c))
 const missingClubs=detClubs.filter(c=>!f.clubIds.includes(c.id))
 const tag=f.cat+(x?.es_demo?' · DEMO':'')
 return <form onSubmit={save} style={x?{background:'var(--bg2)',padding:12,margin:'8px 0'}:null}><h3>{x?'Editar noticia':'Nueva noticia'}</h3>
  {bak&&<div className="seo"><b>Hay cambios sin guardar de la última vez.</b> <button type="button" className="tag" onClick={()=>{setF(bak.f);setTch(bak.tch);setEk(n=>n+1);setBak(null)}}>Recuperar</button> <button type="button" className="tag" onClick={()=>{localStorage.removeItem(bkKey);setBak(null)}}>Descartar</button></div>}
  <label>Título</label><input value={f.titulo} onChange={e=>set('titulo',e.target.value)} required/>
  <label>Bajada</label><input value={f.bajada} onChange={e=>set('bajada',e.target.value)}/>
  <div className="tabs" style={{marginTop:14}}><button type="button" className={'tag'+(view==='ed'?' on':'')} onClick={()=>setView('ed')}>Editor</button><button type="button" className={'tag'+(view==='pv'?' on':'')} onClick={()=>setView('pv')}>Vista previa</button></div>
  <div style={{display:view==='ed'?'block':'none'}}><RichEditor key={ek} initial={f.html} onChange={h=>set('html',h)} onBusy={setUpl}/></div>
  {view==='pv'&&<Vista tag={tag} titulo={f.titulo} bajada={f.bajada} img={f.img} alt={alt} html={f.html} meta={[fdate(f.d||new Date()),wr.find(w=>w.id===f.w)?.nombre_visible].filter(Boolean).join(' · ')}/>}
  <ImgPick value={f.img} onUrl={u=>set('img',u)} onBusy={setUpl}/>
  <label>Categoría</label><select value={f.cat} onChange={e=>set('cat',e.target.value)}>{['general','primera','ascenso','copas','afa'].map(c=><option key={c} value={c}>{c}</option>)}</select>
  <label>Torneo (opcional)</label><select value={f.to} onChange={e=>set('to',e.target.value)}><option value="">—</option><Opts l={to}/></select>
  <label>Redactor (opcional)</label><select value={f.w} onChange={e=>set('w',e.target.value)}><option value="">—</option><Opts l={wr} t="nombre_visible"/></select>
  <label>Fecha (vacío = ahora)</label><input type="datetime-local" value={f.d} onChange={e=>set('d',e.target.value)}/>
  <label>Clubes relacionados (varios)</label><select multiple value={f.clubIds} onChange={e=>set('clubIds',[...e.target.selectedOptions].map(o=>o.value))}><Opts l={cl}/></select>
  {missingClubs.length>0&&<p><button type="button" className="tag" onClick={()=>set('clubIds',[...new Set([...f.clubIds,...detClubs.map(c=>c.id)])])}>Marcar clubes que aparecen en la nota: {missingClubs.map(c=>c.nombre).join(', ')}</button></p>}

  <details className="seo"><summary>Optimización y SEO — {rv.good?'🟢 Publicación bien preparada':`🟡 Hay elementos para mejorar (${rv.missing.length})`}</summary>
   <ul className="chk">{rv.items.map(i=><li key={i.k} style={{color:i.ok?'#7ee39a':'#ffd479'}}>{i.ok?'✓':'○'} {i.label}</li>)}</ul>
   {!rv.good&&<p><b>Falta o conviene revisar:</b> {rv.missing.map(i=>i.label).join(', ')}.</p>}
   <ul className="tips">{rv.tips.map((t,i)=><li key={i}>{t.ok?'✓':'•'} {t.t}</li>)}</ul>
   <label>Slug (dirección de la noticia)</label><input value={tch.slug?f.slug:slug} onChange={e=>edit('slug','slug',e.target.value)} placeholder={sug.slug}/>
   <small className="muted">Queda como /noticias/{slug||'…'} {conflict&&<b style={{color:'#ffd479'}}>— «{slugBase}» ya existía, se usa una alternativa.</b>}</small>
   {x?.estado==='publicada'&&slug!==x.slug&&<small className="err" style={{display:'block'}}>Ojo: cambiar la dirección de una noticia publicada rompe los links que ya se compartieron.</small>}
   <label>Título SEO ({seoTitulo.length}/60 recomendado)</label><input value={seoTitulo} onChange={e=>edit('seoTitulo','seo',e.target.value)}/>
   <label>Meta descripción ({meta.length}/160 recomendado)</label><textarea rows="3" value={meta} onChange={e=>edit('meta','meta',e.target.value)}/>
   <label>Tema principal</label><input value={tema} onChange={e=>edit('tema','tema',e.target.value)} placeholder="Ej: Independiente vs Racing"/>
   <label>Temas relacionados (separados por coma)</label><input value={temasStr} onChange={e=>edit('temas','temas',e.target.value)}/>
   {chips.length>0&&<div className="chips" style={{marginTop:6}}>{chips.map(c=><button key={c} type="button" className="tag" onClick={()=>edit('temas','temas',[...temasArr,c].join(', '))}>+ {c}</button>)}</div>}
   <small className="muted" style={{display:'block'}}>Solo se sugieren clubes y torneos que aparecen escritos en la nota.</small>
   <label>ALT de la imagen principal</label><input value={alt} onChange={e=>edit('alt','alt',e.target.value)} disabled={!f.img} placeholder={f.img?'':'Primero cargá la imagen principal'}/>
   <small className="muted" style={{display:'block'}}>Se arma con el título. Cambialo por lo que se ve en la foto, por ejemplo: «Jugadores de Independiente festejando un gol».</small>
   <label>Así se verá al compartir (WhatsApp, Facebook, X)</label>
   <div style={{border:'1px solid var(--line)',maxWidth:420,background:'#fff',color:'#111'}}>{f.img&&<img src={f.img} alt="" style={{width:'100%',aspectRatio:'1.91/1',objectFit:'cover',display:'block'}}/>}<div style={{padding:8}}><small style={{color:'#666'}}>{typeof location!=='undefined'?location.host:''}</small><div style={{fontWeight:700}}>{seoTitulo||f.titulo||'Título'}</div><small style={{color:'#444'}}>{meta}</small></div></div>
   <p className="muted">Los datos estructurados (NewsArticle), la URL canónica y las etiquetas para redes se generan solos al publicar.</p>
  </details>

  <label>Estado</label><select value={f.est} onChange={e=>set('est',e.target.value)}><option value="borrador">borrador</option><option value="publicada">publicada</option></select>
  <Note m={m}/><small className="muted" style={{display:'block'}}>{auto}</small>
  <p><button className="btn" disabled={busy||upl} style={{border:0,cursor:'pointer'}}>{busy?'Guardando…':upl?'Subiendo imagen…':'Guardar'}</button>{x&&<> <button type="button" className="tag" onClick={done}>Cancelar</button></>}</p></form>}
