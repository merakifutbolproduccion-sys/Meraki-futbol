import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
export const slugify=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export const fdate=d=>d?new Date(d).toLocaleDateString('es-AR'):''
export function useTitle(t,desc){useEffect(()=>{document.title=t?`Meraki Fútbol | ${t}`:'Meraki Fútbol';const m=document.querySelector('meta[name=description]');if(m&&desc)m.content=desc},[t,desc])}
export function useData(fn,deps=[]){const[s,set]=useState({loading:true});useEffect(()=>{let ok=true;set({loading:true});fn().then(d=>ok&&set({data:d})).catch(e=>ok&&set({error:e.message||String(e)}));return()=>{ok=false}},deps);return s}
export const Async=({s,empty='No hay contenido publicado todavía.',children})=>s.loading?<p className="muted">Cargando…</p>:s.error?<p className="err">No se pudo cargar: {s.error}</p>:s.data==null?<p className="muted">No encontrado.</p>:(Array.isArray(s.data)&&!s.data.length)?<p className="muted">{empty}</p>:children(s.data)
export const Page=({title,children})=>{useTitle(title);return <div className="w"><h2 className="sec pad" style={{marginTop:24}}>{title}</h2>{children}</div>}
export const Sec=({t})=><div className="sec">{t}</div>
export const Grid=({children})=><div className="grid">{children}</div>
export const Card=({to,tag,title,img,time,demo})=><Link className="card" to={to}><div className="ph" role="img" aria-label={title} style={img?{backgroundImage:`url(${img})`,backgroundSize:'cover',backgroundPosition:'center'}:null}/><div className="b"><span className="tag">{tag}</span>{demo&&<span className="tag">Demo</span>}<h3>{title}</h3><small>{time}</small><span className="btn" style={{marginTop:'auto'}}>Leer más →</span></div></Link>
export const NewsCard=n=><Card key={n.id} to={`/noticias/${n.slug}`} tag={n.categoria} title={n.titulo} img={n.imagen_url} time={fdate(n.fecha)} demo={n.es_demo}/>
export const ChrCard=c=><Card key={c.id} to={`/cronicas/${c.slug}`} tag={`${c.matches.home.nombre} vs ${c.matches.away.nombre}`} title={c.titulo} img={c.imagen_url} time={fdate(c.publicada_at)} demo={c.es_demo}/>
export const Chips=({a})=><div className="chips">{a.map(c=><Link key={c.slug} className="tag" to={`/clubes/${c.slug}`}>{c.nombre}</Link>)}</div>
export const MatchRow=({m})=><div className="match"><span>{m.home.nombre}</span><span className="sc">{m.home_goals==null?'vs':`${m.home_goals} - ${m.away_goals}`}</span><span>{m.away.nombre}</span></div>
export const ClubCard=c=><Link key={c.id} className="club" to={`/clubes/${c.slug}`}>{c.escudo_url?<img src={c.escudo_url} alt="" width="96" height="96" style={{width:96,height:96,objectFit:'contain'}}/>:<span style={{width:96,height:96,display:'flex',alignItems:'center',justifyContent:'center'}}><span className="shield" style={{'--c':'#1f6b3a',width:70,height:78}}/></span>}{c.nombre}<small style={{color:'#5b6f62',fontWeight:500}}>{c.ciudad}</small></Link>
export const Table=({rows})=><div className="tw"><table><thead><tr>{['#','Club','PJ','PG','PE','PP','GF','GC','DG','PTS'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.club_id}><td>{r.posicion}</td><td><Link to={`/clubes/${r.clubs.slug}`}>{r.clubs.nombre}</Link></td><td>{r.pj}</td><td>{r.pg}</td><td>{r.pe}</td><td>{r.pp}</td><td>{r.gf}</td><td>{r.gc}</td><td>{r.dg}</td><td><b>{r.pts}</b></td></tr>)}</tbody></table></div>

export function Share({title}){const[ok,setOk]=useState(false),url=typeof location!=='undefined'?location.href:'',wa='https://wa.me/?text='+encodeURIComponent(`${title}\n${url}`)
 async function copy(){try{await navigator.clipboard.writeText(url);setOk(true);setTimeout(()=>setOk(false),2000)}catch{}}
 async function nat(){if(navigator.share){try{await navigator.share({title,url})}catch{}}else copy()}
 return <div className="chips" style={{margin:'14px 0'}}><a className="btn" href={wa} target="_blank" rel="noopener noreferrer">Compartir en WhatsApp</a><button type="button" className="tag" onClick={nat}>Compartir…</button><button type="button" className="tag" onClick={copy}>{ok?'¡Link copiado!':'Copiar link'}</button></div>}

export const Brand=({n})=>{const[a,...b]=String(n||'').toUpperCase().split(' ');return <span>{a}{b.length>0&&<> <b>{b.join(' ')}</b></>}</span>}
