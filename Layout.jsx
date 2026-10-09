import logo from './logo.webp'
import {api} from './api'
import {Brand} from './ui'
const COPAS=[['copa-argentina','Copa Argentina'],['trofeo-de-campeones','Trofeo de Campeones'],['supercopa-argentina','Supercopa Argentina'],['supercopa-internacional','Supercopa Internacional'],['copa-libertadores','Copa Libertadores'],['copa-sudamericana','Copa Sudamericana'],['recopa-de-campeones','Recopa de Campeones']]
const SOCIAL=[['instagram_url','Instagram'],['youtube_url','YouTube'],['tiktok_url','TikTok'],['x_url','X'],['facebook_url','Facebook']]
import {useEffect,useState} from 'react'
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom'
const A=({to,children})=><NavLink to={to} end={to==='/'} className={({isActive})=>isActive?'on':''}>{children}</NavLink>
export default function Layout(){
 const[open,setOpen]=useState(false),[dd,setDd]=useState(false),[dd2,setDd2]=useState(false),[st,setSt]=useState({}),nav=useNavigate(),loc=useLocation()
 useEffect(()=>{setOpen(false);setDd(false);setDd2(false);window.scrollTo(0,0)},[loc.pathname])
 useEffect(()=>{api.settings().then(setSt)},[])
 const go=e=>{e.preventDefault();const q=e.target.elements.q.value.trim();if(q)nav('/buscar?q='+encodeURIComponent(q))}
 const links=<><Link to="/">← FM Meraki</Link><A to="/futbol">Inicio</A><div className={'dd'+(dd?' open':'')}><button type="button" className="ddb" onClick={()=>{setDd(!dd);setDd2(false)}}>Primera ▾</button><div className="ddm"><A to="/cronicas">Crónicas</A><A to="/clubes">Clubes</A></div></div><A to="/ascenso">Ascenso</A><div className={'dd'+(dd2?' open':'')}><button type="button" className="ddb" onClick={()=>{setDd2(!dd2);setDd(false)}}>Copas ▾</button><div className="ddm">{COPAS.map(([s,n])=><A key={s} to={'/copas/'+s}>{n}</A>)}</div></div><A to="/afa">AFA</A><A to="/entrevistas">Entrevistas</A><A to="/quienes-somos">¿Quiénes somos?</A></>
 return <><header><div className="w"><div className="bar"><Link className="logo" to="/futbol"><img src={st.fut_logo||logo} alt={st.fut_nombre||'Meraki Fútbol'} width="40" height="40"/><Brand n={st.fut_nombre||'Meraki Fútbol'}/></Link><nav>{links}</nav><span className="sp"/>
  <form onSubmit={go}><input name="q" className="s" type="search" placeholder="Buscar…" aria-label="Buscar"/></form><button className="burger" onClick={()=>setOpen(!open)} aria-label="Menú">☰</button></div>
  <div id="m" className={open?'open':''}>{links}<form onSubmit={go}><input name="q" className="s s2" type="search" placeholder="Buscar…" aria-label="Buscar"/></form></div></div></header>
  <main><Outlet/></main><footer><div className="w"><img className="fl" src={logo} alt=""/>© Meraki Fútbol · Medio digital de fútbol argentino {SOCIAL.filter(([k])=>st[k]).map(([k,n])=><span key={k}> · <a href={st[k]} target="_blank" rel="noopener noreferrer">{n}</a></span>)} · <Link to="/comentarios-futbol">Comentarios</Link> · <Link to="/aviso-legal">Legales y copyright</Link> · <Link to="/admin">Admin</Link></div></footer></>}
