// Bloque "Te puede interesar": noticias propias ya publicadas, relacionadas por club, torneo, temas y categoría.
import {useData,Sec,Grid,NewsCard} from './ui'
import {sb} from './supabase'
import {relatedScore} from './seoTools'

export async function fetchRelated(n,max=4){
  const clubSlugs=n.clubSlugs||(n.news_clubs||[]).map(x=>x.clubs?.slug).filter(Boolean)
  const{data,error}=await sb.from('news').select('id,titulo,slug,categoria,tournament_id,temas,imagen_url,fecha,es_demo,news_clubs(clubs(slug))').eq('estado','publicada').order('fecha',{ascending:false}).limit(80)
  if(error)return[]
  return data.filter(x=>x.id!==n.id&&x.slug).map(x=>({x,s:relatedScore(n,clubSlugs,x,(x.news_clubs||[]).map(c=>c.clubs?.slug).filter(Boolean))}))
   .filter(r=>r.s>0).sort((a,b)=>b.s-a.s).slice(0,max).map(r=>r.x)}

export function Related({n}){
  const s=useData(()=>fetchRelated(n),[n.id])
  if(!s.data||!s.data.length)return null
  return <><Sec t="Te puede interesar"/><Grid>{s.data.map(NewsCard)}</Grid></>}
