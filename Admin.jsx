import {useEffect,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {sb} from './supabase'
import {api} from './api'
import {Async,useData,useTitle,slugify} from './ui'
function Img({onUrl}){const[p,setP]=useState(null),[st,setSt]=useState('')
 async function pick(e){const f=e.target.files[0];if(!f)return;setP(URL.createObjectURL(f));setSt('Subiendo imagen…');onUrl(null)
  const path=`${Date.now()}-${f.name.replace(/[^a-z0-9.]+/gi,'-')}`,{error}=await sb.storage.from('imagenes').upload(path,f)
  if(error)return setSt('Error al subir la imagen: '+error.message)
  onUrl(sb.storage.from('imagenes').getPublicUrl(path).data.publicUrl);setSt('Imagen subida ✔')}
 return <><label>Imagen principal</label><input type="file" accept="image/*" onChange={pick}/>{p&&<img src={p} alt="Vista previa" style={{maxWidth:'100%',maxHeight:180,marginTop:8}}/>}<small className="muted">{st}</small></>}
const Opts=({l,v='id',t='nombre'})=>l.map(x=><option key={x[v]} value={x[v]}>{x[t]}</option>)
const Msg=({m})=>m?<p className={m.err?'err':''} style={m.err?null:{color:'#7ee39a'}}>{m.t}</p>:null
function NewsForm(){const o=useData(()=>Promise.all([api.clubs(),api.writers(),api.tournaments()])),[img,setImg]=useState(null),[busy,setBusy]=useState(false),[m,setM]=useState(null)
 async function save(e){e.preventDefault();if(busy)return;const fm=e.target,f=new FormData(fm);setBusy(true);setM(null)
  const titulo=f.get('t').trim(),slug=slugify(f.get('slug')||titulo)
  const{data,error}=await sb.from('news').insert({titulo,slug,bajada:f.get('b'),contenido:f.get('c'),imagen_url:img,categoria:f.get('cat'),tournament_id:f.get('to')||null,writer_id:f.get('w')||null,fecha:f.get('d')?new Date(f.get('d')).toISOString():new Date().toISOString(),estado:f.get('est')}).select('id').single()
  if(error){setBusy(false);return setM({err:1,t:error.code==='23505'?'Ya existe una noticia con ese slug.':error.message})}
  const cl=f.getAll('cl');if(cl.length){const r=await sb.from('news_clubs').insert(cl.map(club_id=>({news_id:data.id,club_id})));if(r.error){setBusy(false);return setM({err:1,t:'Noticia guardada, pero fallaron los clubes: '+r.error.message})}}
  setBusy(false);fm.reset();setImg(null);setM({t:`Noticia guardada (${f.get('est')}). URL: /noticias/${slug}`})}
 return <Async s={o}>{([cl,wr,to])=><form onSubmit={save}><h3>Nueva noticia</h3><label>Título</label><input name="t" required/><label>Slug (opcional)</label><input name="slug"/><label>Bajada</label><input name="b"/><label>Contenido</label><textarea name="c" rows="6" required/><Img onUrl={setImg}/>
  <label>Categoría</label><select name="cat"><option value="general">general</option><option value="primera">primera</option><option value="ascenso">ascenso</option><option value="copas">copas</option><option value="afa">afa</option></select>
  <label>Torneo (opcional)</label><select name="to"><option value="">—</option><Opts l={to}/></select><label>Redactor (opcional)</label><select name="w"><option value="">—</option><Opts l={wr} t="nombre_visible"/></select>
  <label>Fecha (vacío = ahora)</label><input name="d" type="datetime-local"/><label>Clubes relacionados (varios)</label><select name="cl" multiple><Opts l={cl}/></select>
  <label>Estado</label><select name="est"><option value="borrador">borrador</option><option value="publicada">publicada</option></select><Msg m={m}/><p><button className="btn" disabled={busy} style={{border:0,cursor:'pointer'}}>{busy?'Guardando…':'Guardar'}</button></p></form>}</Async>}
function ChrForm(){const nav=useNavigate(),o=useData(()=>Promise.all([api.clubs(),api.writers(),api.tournaments()])),[img,setImg]=useState(null),[w,setW]=useState(''),[busy,setBusy]=useState(false),[m,setM]=useState(null)
 function onHome(e,wr){const x=wr.find(r=>r.club_id===e.target.value);if(x)setW(x.id)} // sugerencia: cronista del local
 async function save(e){e.preventDefault();if(busy)return;const f=new FormData(e.target);if(f.get('h')===f.get('a'))return setM({err:1,t:'Local y visitante deben ser distintos.'});if(!w)return setM({err:1,t:'Elegí un redactor.'});if(img===null&&e.target.querySelector('input[type=file]').files.length)return setM({err:1,t:'Esperá a que termine de subir la imagen.'})
  setBusy(true);setM(null)
  const{data,error}=await sb.rpc('publish_chronicle',{p_tournament:f.get('to'),p_fecha_numero:f.get('n')?+f.get('n'):null,p_fecha:f.get('d')?new Date(f.get('d')).toISOString():null,p_home:f.get('h'),p_away:f.get('a'),p_hg:+f.get('hg'),p_ag:+f.get('ag'),p_writer:w,p_titulo:f.get('t'),p_bajada:f.get('b'),p_contenido:f.get('c'),p_imagen:img,p_estado:f.get('est')})
  setBusy(false);if(error)return setM({err:1,t:error.message.includes('ya tiene una crónica')?'Este partido ya tiene una crónica.':error.message});nav('/cronicas/'+data)}
 return <Async s={o}>{([cl,wr,to])=><form onSubmit={save}><h3>Nueva crónica</h3><label>Torneo</label><select name="to" required><Opts l={to}/></select><label>Número de fecha</label><input name="n" type="number" min="1"/><label>Fecha/hora del partido</label><input name="d" type="datetime-local"/>
  <label>Equipo local</label><select name="h" required defaultValue="" onChange={e=>onHome(e,wr)}><option value="" disabled>Elegir…</option><Opts l={cl}/></select><label>Equipo visitante</label><select name="a" required defaultValue=""><option value="" disabled>Elegir…</option><Opts l={cl}/></select>
  <label>Goles local / visitante</label><div style={{display:'flex',gap:8}}><input name="hg" type="number" min="0" defaultValue="0" required/><input name="ag" type="number" min="0" defaultValue="0" required/></div>
  <label>Redactor (único; se sugiere el del local, podés cambiarlo)</label><select value={w} onChange={e=>setW(e.target.value)} required><option value="" disabled>Elegir…</option><Opts l={wr} t="nombre_visible"/></select>
  <label>Título</label><input name="t" required/><label>Bajada</label><input name="b"/><label>Contenido</label><textarea name="c" rows="6" required/><Img onUrl={setImg}/><label>Estado</label><select name="est"><option value="publicada">publicada</option><option value="borrador">borrador</option></select>
  <Msg m={m}/><p><button className="btn" disabled={busy} style={{border:0,cursor:'pointer'}}>{busy?'Publicando…':'Publicar'}</button></p></form>}</Async>}
export default function Admin(){useTitle('Admin');const[s,setS]=useState({loading:true}),[tab,setTab]=useState('n'),[e,setE]=useState(null),[busy,setBusy]=useState(false)
 useEffect(()=>{const chk=async ses=>{if(!ses)return setS({});const{data,error}=await sb.rpc('is_admin');setS({user:ses.user,admin:data===true,error:error?.message})}
  sb.auth.getSession().then(({data})=>chk(data.session));const{data:l}=sb.auth.onAuthStateChange((_,ses)=>setTimeout(()=>chk(ses),0));return()=>l.subscription.unsubscribe()},[])
 async function login(ev){ev.preventDefault();setBusy(true);setE(null);const f=ev.target.elements;const{error}=await sb.auth.signInWithPassword({email:f.email.value,password:f.pass.value});setBusy(false);if(error)setE(error.message)}
 if(s.loading)return <div className="w"><p className="muted">Cargando…</p></div>
 if(!s.user)return <div className="w art"><h1>Admin</h1><form onSubmit={login}><label>Email</label><input name="email" type="email" required autoComplete="email"/><label>Contraseña</label><input name="pass" type="password" required autoComplete="current-password"/>{e&&<p className="err">{e}</p>}<p><button className="btn" disabled={busy} style={{border:0}}>{busy?'Ingresando…':'Iniciar sesión'}</button></p></form><Link to="/">← Volver a la web</Link></div>
 if(!s.admin)return <div className="w art"><h1>Sin permisos</h1><p className="err">{s.error||'Esta cuenta no es administradora.'}</p><button className="btn" onClick={()=>sb.auth.signOut()}>Cerrar sesión</button></div>
 return <div className="w art"><h1>Panel de administración</h1><div className="tabs"><button className={'tag'+(tab==='n'?' on':'')} onClick={()=>setTab('n')}>Nueva noticia</button><button className={'tag'+(tab==='c'?' on':'')} onClick={()=>setTab('c')}>Nueva crónica</button><button className="tag" onClick={()=>sb.auth.signOut()}>Cerrar sesión</button></div>
  {tab==='n'?<NewsForm/>:<ChrForm/>}<p className="muted">Pendiente de implementar: actualizaciones de Ascenso, entrevistas, editar/borrar contenido, gestión de clubes, partidos y tablas.</p></div>}
