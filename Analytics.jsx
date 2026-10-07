import {useEffect} from 'react'
import {useLocation} from 'react-router-dom'
import {initGA,trackPage} from './analytics.js'
// ID de medición de la propiedad "Meraki.futbol" en Google Analytics. Es público, no es un secreto.
// Va fijo en el código para que una variable de Vercel mal cargada no pueda desviar los datos a otra propiedad.
const ID='G-928B5KPG90'
// Registra una página vista en cada cambio de ruta (no solo en la carga inicial). No mide /admin.
export default function Analytics(){
  const loc=useLocation()
  useEffect(()=>{initGA(ID)},[])
  useEffect(()=>{
    if(!ID||loc.pathname.startsWith('/admin'))return
    const path=loc.pathname+loc.search
    let done=false,obs=null,t=null
    const send=()=>{if(done)return;done=true;if(obs)obs.disconnect();clearTimeout(t);trackPage(path,document.title)}
    const el=document.querySelector('title')
    if(el){obs=new MutationObserver(()=>setTimeout(send,60));obs.observe(el,{childList:true,characterData:true,subtree:true})} // espera al título real de la nota
    t=setTimeout(send,900)
    return()=>{send()}
  },[loc.pathname,loc.search])
  return null
}
