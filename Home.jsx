import logo from './logo.webp'
import {Link} from 'react-router-dom'
import {api} from './api'
import {Async,useData,useTitle,Sec,Grid,NewsCard,ChrCard,ClubCard} from './ui'
export default function Home(){
 useTitle('')
 const n=useData(()=>api.news(null,40)),c=useData(api.chronicles),cl=useData(api.clubs),iv=useData(api.interviews)
 const by=(l,cat)=>l.filter(x=>x.categoria===cat).slice(0,3)
 return <><Async s={n} empty="No hay noticias publicadas todavía.">{l=><>
  <section className="hero ph" style={l[0].imagen_url?{backgroundImage:`url(${l[0].imagen_url})`,backgroundSize:'cover',backgroundPosition:'center'}:null}><div className="w" style={{width:'100%',display:'flex',flexDirection:'column',gap:10}}><span className="tag">Noticia destacada</span><h1>{l[0].titulo}</h1><p>{l[0].bajada}</p><Link className="btn" to={`/noticias/${l[0].slug}`}>Leer más →</Link></div></section>
  <div className="w"><Sec t="Últimas noticias"/><Grid>{l.slice(1,7).map(NewsCard)}</Grid>
  {['primera','ascenso','copas','afa'].map(k=>by(l,k).length>0&&<div key={k}><Sec t={k}/><Grid>{by(l,k).map(NewsCard)}</Grid></div>)}</div></>}</Async>
  <div className="w"><Sec t="Crónicas destacadas"/><Async s={c} empty="No hay crónicas publicadas todavía.">{l=><Grid>{l.slice(0,3).map(ChrCard)}</Grid>}</Async>
  <Sec t="Entrevistas"/><Async s={iv} empty="No hay entrevistas publicadas todavía.">{l=><Grid>{l.slice(0,3).map(i=><Link key={i.id} className="card" to={`/entrevistas/${i.slug}`}><div className="b"><span className="tag">{i.tipo_entrevistado}</span><h3>{i.titulo}</h3><small>{i.entrevistado}</small></div></Link>)}</Grid>}</Async>
  <Sec t="Elegí tu equipo"/><Async s={cl} empty="Todavía no hay clubes cargados.">{l=><div className="clubs">{l.map(ClubCard)}</div>}</Async>
  <div className="radio" style={{margin:'28px 0'}}><img className="lg" src={logo} alt="Meraki Fútbol" width="120" height="120" style={{width:120,height:120,borderRadius:'50%'}}/><span className="muted">Medio digital de fútbol argentino.</span><Link className="btn" to="/quienes-somos">¿Quiénes somos? →</Link></div></div></>}
