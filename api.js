import {sb} from './supabase'
const must=({data,error})=>{if(error)throw error;return data}
const MATCH='*, tournaments(nombre), home:clubs!matches_home_club_id_fkey(nombre,slug), away:clubs!matches_away_club_id_fkey(nombre,slug)'
const CHR=`*, writers(nombre_visible), matches(${MATCH})`
const NEWS='*, writers(nombre_visible), news_clubs(clubs(nombre,slug))'
const one=(t,sel,s)=>sb.from(t).select(sel).eq('slug',s).maybeSingle().then(must) // RLS oculta borradores al público
export const api={
 news:(cat,n=40)=>{let q=sb.from('news').select(NEWS).eq('estado','publicada').order('fecha',{ascending:false}).limit(n);if(cat)q=q.eq('categoria',cat);return q.then(must)},
 newsOne:s=>one('news',NEWS,s),
 search:t=>sb.from('news').select('*').eq('estado','publicada').ilike('titulo',`%${t}%`).then(must),
 chronicles:()=>sb.from('chronicles').select(CHR).eq('estado','publicada').order('publicada_at',{ascending:false}).then(must),
 chronicle:s=>one('chronicles',CHR,s),
 matches:()=>sb.from('matches').select(MATCH).order('fecha_partido',{ascending:false,nullsFirst:false}).then(must),
 standings:()=>sb.from('standings').select('*, clubs(nombre,slug), tournaments(nombre)').order('posicion').then(must),
 clubs:()=>sb.from('clubs').select('*').eq('activo',true).order('nombre').then(must),
 club:s=>one('clubs','*',s),
 tournaments:()=>sb.from('tournaments').select('*').order('nombre').then(must),
 writers:()=>sb.from('writers').select('*').eq('activo',true).order('apellido').then(must),
 updates:()=>sb.from('ascenso_updates').select('*, ascenso_update_clubs(clubs(nombre,slug))').eq('estado','publicada').order('numero_fecha',{ascending:false}).then(must),
 update:s=>one('ascenso_updates',`*, ascenso_update_clubs(clubs(nombre,slug)), ascenso_update_matches(rol, matches(${MATCH}))`,s),
 interviews:()=>sb.from('interviews').select('*').eq('estado','publicada').order('fecha',{ascending:false}).then(must),
 interview:s=>one('interviews','*',s),
 settings:()=>sb.from('site_settings').select('key,value').then(must).then(r=>Object.fromEntries(r.map(x=>[x.key,x.value]))).catch(()=>({}))}
