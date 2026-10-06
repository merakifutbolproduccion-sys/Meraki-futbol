import {Routes,Route,Navigate} from 'react-router-dom'
import {configured} from './supabase'
import Layout from './Layout'
import Home from './Home'
import * as L from './Lists'
import * as D from './Detail'
import Admin from './Admin'
import RadioLayout from './RadioLayout'
import * as R from './Radio'
export default function App(){
 if(!configured)return <div className="w" style={{padding:24}}><h2>Falta configurar Supabase</h2><p className="err">Definí VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env (ver .env.example).</p></div>
 return <Routes><Route element={<RadioLayout/>}><Route index element={<R.RadioHome/>}/><Route path="grilla" element={<R.Grilla/>}/><Route path="programas" element={<R.Programas/>}/><Route path="programas/:slug" element={<R.Programa/>}/><Route path="en-vivo" element={<R.EnVivo/>}/><Route path="contacto" element={<R.Contacto/>}/><Route path="nosotros" element={<R.Nosotros/>}/></Route><Route element={<Layout/>}>
  <Route path="futbol" element={<Home/>}/><Route path="primera" element={<Navigate to="/cronicas" replace/>}/>
  <Route path="cronicas" element={<L.Cronicas/>}/><Route path="cronicas/:slug" element={<D.Cronica/>}/>
  <Route path="clubes" element={<L.Clubes/>}/><Route path="clubes/:slug" element={<D.Club/>}/>
  <Route path="resultados" element={<Navigate to="/cronicas" replace/>}/><Route path="tablas" element={<Navigate to="/cronicas" replace/>}/>
  <Route path="ascenso" element={<L.AscensoList/>}/><Route path="ascenso/:slug" element={<D.Ascenso/>}/>
  <Route path="copas" element={<L.Copas/>}/><Route path="copas/:slug" element={<L.Copa/>}/><Route path="afa" element={<L.Afa/>}/>
  <Route path="entrevistas" element={<L.Entrevistas/>}/><Route path="entrevistas/:slug" element={<D.Entrevista/>}/>
  <Route path="noticias/:slug" element={<D.Noticia/>}/><Route path="buscar" element={<L.Buscar/>}/>
  <Route path="quienes-somos" element={<L.Quienes/>}/><Route path="*" element={<L.NotFound/>}/>
  </Route><Route path="admin" element={<Admin/>}/></Routes>}
