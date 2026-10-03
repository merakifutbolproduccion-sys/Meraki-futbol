import logo from './logo.webp'
import {useEffect,useState} from 'react'
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom'
const A=({to,children})=><NavLink to={to} end={to==='/'} className={({isActive})=>isActive?'on':''}>{children}</NavLink>
export default function Layout(){
 const[open,setOpen]=useState(false),[dd,setDd]=useState(false),nav=useNavigate(),loc=useLocation()
 useEffect(()=>{setOpen(false);setDd(false);window.scrollTo(0,0)},[loc.pathname])
 const go=e=>{e.preventDefault();const q=e.target.elements.q.value.trim();if(q)nav('/buscar?q='+encodeURIComponent(q))}
 const links=<><A to="/">Inicio</A><div className={'dd'+(dd?' open':'')}><button type="button" className="ddb" onClick={()=>setDd(!dd)}>Primera ▾</button><div className="ddm"><A to="/cronicas">Crónicas</A><A to="/clubes">Clubes</A><A to="/resultados">Resultados</A><A to="/tablas">Tablas</A></div></div><A to="/ascenso">Ascenso</A><A to="/copas">Copas</A><A to="/afa">AFA</A><A to="/entrevistas">Entrevistas</A><A to="/quienes-somos">¿Quiénes somos?</A></>
 return <><header><div className="w"><div className="bar"><Link className="logo" to="/"><img src={logo} alt="Meraki Fútbol" width="40" height="40"/><span>MERAKI <b>FÚTBOL</b></span></Link><nav>{links}</nav><span className="sp"/>
  <form onSubmit={go}><input name="q" className="s" type="search" placeholder="Buscar…" aria-label="Buscar"/></form><button className="burger" onClick={()=>setOpen(!open)} aria-label="Menú">☰</button></div>
  <div id="m" className={open?'open':''}>{links}<form onSubmit={go}><input name="q" className="s s2" type="search" placeholder="Buscar…" aria-label="Buscar"/></form></div></div></header>
  <main><Outlet/></main><footer><div className="w"><img className="fl" src={logo} alt=""/>© Meraki Fútbol · Medio digital de fútbol argentino · <Link to="/admin">Admin</Link></div></footer></>}
