import {useEffect} from 'react'
import {useParams} from 'react-router-dom'
import {Cuerpo} from './Editor'
import {GalleryView} from './Galeria'
import {newsJsonLd} from './editorUtils'
import {api} from './api'
import {Link} from 'react-router-dom'
import {Related} from './Related'
import {CommentsBox} from './Comentarios'
import {Async,useData,useTitle,Sec,Grid,NewsCard,ChrCard,Chips,MatchRow,Table,fdate,Share} from './ui'
const CATN={'primera':'Primera','primera-nacional':'Primera Nacional','primera-b-metropolitana':'Primera B Metropolitana','primera-c':'Primera C','federal-a':'Torneo Federal A'}
const T=({t,d})=>{useTitle(t,d);return null}
// Etiquetas de cabecera para buscadores y redes (canónica, Open Graph, Twitter, datos estructurados). Se limpian al salir de la nota.
function useSeoHead(n,seg='noticias'){useEffect(()=>{if(!n)return;const url=location.origin+'/'+seg+'/'+n.slug,made=[]
  document.head.querySelectorAll('link[rel=canonical],meta[property^="og:"],meta[property^="article:"],meta[name^="twitter:"],script[type="application/ld+json"]').forEach(e=>e.remove()) // quita las etiquetas que ya trajo el servidor: así no quedan duplicadas
  const put=(tag,attrs)=>{const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));document.head.appendChild(el);made.push(el);return el}
  const title=n.seo_titulo||n.titulo,desc=n.meta_descripcion||n.bajada||''
  put('link',{rel:'canonical',href:url})
  ;[['og:type','article'],['og:site_name','Meraki Fútbol'],['og:title',title],['og:description',desc],['og:url',url],['og:image',n.imagen_url||''],['twitter:card',n.imagen_url?'summary_large_image':'summary'],['twitter:title',title],['twitter:description',desc]]
   .forEach(([p,c])=>{if(c)put('meta',p.startsWith('og:')?{property:p,content:c}:{name:p,content:c})})
  try{const ld=put('script',{type:'application/ld+json'});ld.textContent=newsJsonLd(n,{url,site:'Meraki Fútbol'})}catch{}
  return()=>made.forEach(el=>el.remove())},[n?.id,n?.slug,n?.updated_at])}
const Art=({tag,title,sub,img,imgAlt,seoT,seoD,meta,body,gal,children})=><article className="w art paper"><T t={seoT||title} d={seoD||sub}/><span className="tag">{tag}</span><h1>{title}</h1><p className="muted">{meta}</p><Share title={title}/>{img&&<img className="cover" src={img} alt={imgAlt||title}/>}{sub&&<p><b>{sub}</b></p>}<Cuerpo body={body}/><GalleryView items={gal}/>{children}</article>
const NoticiaView=({n})=>{useSeoHead(n);return <Art tag={n.categoria+(n.es_demo?' · DEMO':'')} title={n.titulo} sub={n.bajada} img={n.imagen_url} imgAlt={n.imagen_alt} seoT={n.seo_titulo} seoD={n.meta_descripcion} body={n.contenido} gal={n.galeria} meta={[fdate(n.fecha),n.writers?.nombre_visible].filter(Boolean).join(' · ')}>{n.news_clubs.length>0&&<><Sec t="Clubes relacionados"/><Chips a={n.news_clubs.map(x=>x.clubs)}/></>}<Related n={n}/><CommentsBox tipo="noticias" slug={n.slug}/></Art>}
export const Noticia=()=>{const{slug}=useParams(),s=useData(()=>api.newsOne(slug),[slug]);return <Async s={s}>{n=><NoticiaView n={n}/>}</Async>}
const CronicaView=({c,slug})=>{useSeoHead({...c,slug,fecha:c.publicada_at,categoria:'cronica',news_clubs:[c.matches.home,c.matches.away].map(h=>({clubs:h}))},'cronicas');return <Art tag={`Crónica · ${c.matches.tournaments.nombre}${c.matches.instancia?' · '+c.matches.instancia:''}${c.es_demo?' · DEMO':''}`} title={c.titulo} sub={c.bajada} img={c.imagen_url} imgAlt={c.imagen_alt} seoT={c.seo_titulo} seoD={c.meta_descripcion} body={c.contenido} gal={c.galeria} meta={`Por ${c.writers.nombre_visible} · ${fdate(c.publicada_at)}`}><MatchRow m={c.matches}/><Sec t="Clubes relacionados"/><Chips a={[c.matches.home,c.matches.away]}/><Related n={{id:c.id,clubSlugs:[c.matches.home.slug,c.matches.away.slug],tournament_id:c.matches.tournament_id,temas:c.temas,categoria:'primera'}} crono/><CommentsBox tipo="cronicas" slug={slug}/></Art>}
export const Cronica=()=>{const{slug}=useParams(),s=useData(()=>api.chronicle(slug),[slug]);return <Async s={s}>{c=><CronicaView c={c} slug={slug}/>}</Async>}
export const Entrevista=()=>{const{slug}=useParams(),s=useData(()=>api.interview(slug),[slug]);return <Async s={s}>{i=><Art tag={`Entrevista · ${i.tipo_entrevistado}`} title={i.titulo} sub={i.bajada} img={i.imagen_url} body={i.contenido} meta={`${i.entrevistado} · ${fdate(i.fecha)}`}>{i.enlace_url&&<p><a className="btn" href={i.enlace_url} target="_blank" rel="noopener noreferrer">Ver la entrevista →</a></p>}<CommentsBox tipo="entrevistas" slug={slug}/></Art>}</Async>}
export const Ascenso=()=>{const{slug}=useParams(),s=useData(async()=>{const[u,st]=await Promise.all([api.update(slug),api.standings()]);return u&&{u,st:st.filter(r=>r.tournament_id===u.tournament_id)}},[slug]);
 return <Async s={s}>{({u,st})=>{const r=x=>u.ascenso_update_matches.filter(m=>m.rol===x).map(m=><MatchRow key={m.matches.id} m={m.matches}/>);return <Art tag={`Ascenso · Fecha ${u.numero_fecha}`} title={u.titulo} sub={u.resumen} img={u.imagen_url} body={u.contenido} meta={fdate(u.fecha)}>
 <Sec t="Resultados"/>{r('resultado')}<Sec t="Equipos involucrados"/><Chips a={u.ascenso_update_clubs.map(x=>x.clubs)}/>{st.length>0&&<><Sec t="Tabla"/><Table rows={st}/></>}<Sec t="Próxima fecha"/>{r('proximo')}</Art>}}</Async>}
export const Club=()=>{const{slug}=useParams(),s=useData(async()=>{const c=await api.club(slug);if(!c)return null;const[cr,n,m,st]=await Promise.all([api.chronicles(),api.news(null,100),api.matches(),api.standings()]);
 const mine=x=>x.home.slug===slug||x.away.slug===slug,i=st.findIndex?st.find(r=>r.club_id===c.id):null;
 return{c,cr:cr.filter(x=>mine(x.matches)),n:n.filter(x=>x.news_clubs.some(y=>y.clubs.slug===slug)),m:m.filter(mine),pos:i}},[slug]);
 return <Async s={s}>{({c,cr,n,m,pos})=><div className="w art" style={{maxWidth:'none'}}><T t={c.nombre} d={c.descripcion}/><div style={{display:'flex',gap:16,alignItems:'center'}}>{c.escudo_url&&<img src={c.escudo_url} alt={c.nombre} style={{width:112,height:112,objectFit:'contain'}}/>}<h1 style={{margin:0}}>{c.nombre}{c.es_demo?' (demo)':''}</h1></div><p className="muted">{c.ciudad} · Estadio: {c.estadio||'—'}{c.categoria?' · '+(CATN[c.categoria]||c.categoria):''}{pos?` · Posición: ${pos.posicion}º${pos.zona?` (${pos.zona})`:''}`:''}</p><p>{c.descripcion}</p>
 <Sec t="Crónicas"/>{cr.length?<Grid>{cr.map(ChrCard)}</Grid>:<p className="muted">Sin crónicas.</p>}<Sec t="Noticias"/>{n.length?<Grid>{n.map(NewsCard)}</Grid>:<p className="muted">Sin noticias.</p>}
 <Sec t="Resultados"/>{m.filter(x=>x.home_goals!=null).map(x=><MatchRow key={x.id} m={x}/>)}<Sec t="Próximos partidos"/>{m.filter(x=>x.home_goals==null).map(x=><MatchRow key={x.id} m={x}/>)}</div>}</Async>}
