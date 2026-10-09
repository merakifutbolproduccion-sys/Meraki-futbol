import {useEffect,useState} from 'react'
import {Link,NavLink,Outlet,useLocation,useMatch} from 'react-router-dom'
import logo from './logo.webp'
import {api} from './api'
import {Social} from './Radio'
import {Brand} from './ui'
const A=({to,children})=><NavLink to={to} end={to==='/'} className={({isActive})=>isActive?'on':''}>{children}</NavLink>
export default function RadioLayout(){
 const[open,setOpen]=useState(false),[r,setR]=useState({}),[pg,setPg]=useState(null),loc=useLocation(),mp=useMatch('/programas/:slug'),slug=mp?.params.slug
 useEffect(()=>{setOpen(false);window.scrollTo(0,0)},[loc.pathname])
 useEffect(()=>{api.radio().then(setR)},[])
 useEffect(()=>{if(!slug)return setPg(null);let ok=true;api.program(slug).then(p=>ok&&setPg(p&&p.activo?p:null)).catch(()=>ok&&setPg(null));return()=>{ok=false}},[slug])
 const links=<><A to="/">Inicio</A><A to="/en-vivo">Escuchar en vivo</A><A to="/grilla">Grilla</A><A to="/programas">Programas</A><A to="/nosotros">¿Quiénes somos?</A><Link to="/futbol">Meraki Fútbol</Link></>
 return <><header><div className="w"><div className="bar"><Link className={'logo'+(pg?.logo_url?' prog':'')} to="/"><img src={pg?.logo_url||r.logo||logo} alt={pg?.nombre||r.nombre||'FM Meraki'} width="40" height="40"/><Brand n={pg?pg.nombre:'FM Meraki'}/></Link><nav>{links}</nav><span className="sp"/><button className="burger" onClick={()=>setOpen(!open)} aria-label="Menú">☰</button></div>
  <div id="m" className={open?'open':''}>{links}</div></div></header>
  <main><Outlet/></main>
  <footer><div className="w"><img className="fl" src={r.logo||logo} alt=""/><b>{r.nombre||'FM Meraki'}</b> · <Link to="/en-vivo">Escuchar en vivo</Link> · <Link to="/grilla">Grilla</Link> · <Link to="/programas">Programas</Link> · <Link to="/contacto">Contacto</Link> · <Link to="/legal">Legales</Link><div style={{marginTop:10}}><Social d={r}/></div></div></footer></>}
