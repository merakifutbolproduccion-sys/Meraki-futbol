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
 writers:async()=>{let r=await sb.from('writers').select('*, writer_clubs(club_id)').eq('activo',true).order('apellido');const emb=!r.error;if(r.error)r=await sb.from('writers').select('*').eq('activo',true).order('apellido');if(r.error)throw r.error
  return r.data.map(w=>({...w,club_ids:emb?(w.writer_clubs||[]).map(x=>x.club_id):[w.club_id].filter(Boolean)}))},
 updates:()=>sb.from('ascenso_updates').select('*, ascenso_update_clubs(clubs(nombre,slug))').eq('estado','publicada').order('numero_fecha',{ascending:false}).then(must),
 update:s=>one('ascenso_updates',`*, ascenso_update_clubs(clubs(nombre,slug)), ascenso_update_matches(rol, matches(${MATCH}))`,s),
 interviews:()=>sb.from('interviews').select('*').eq('estado','publicada').order('fecha',{ascending:false}).then(must),
 interview:s=>one('interviews','*',s),
 programs:()=>sb.from('programs').select('*').eq('activo',true).order('orden').order('nombre').then(must),
 program:s=>one('programs','*',s),
 schedule:()=>sb.from('schedule').select('*, programs(nombre,slug,es_demo,activo)').eq('activo',true).order('dia').order('hora_inicio').then(must).then(l=>l.filter(x=>x.programs&&x.programs.activo)),
 radio:()=>sb.from('radio_settings').select('key,value').then(must).then(r=>Object.fromEntries(r.map(x=>[x.key,x.value]))).catch(()=>({})),
 settings:async()=>{const kv=await sb.from('site_settings').select('key,value').then(must).then(r=>Object.fromEntries(r.map(x=>[x.key,x.value]))).catch(()=>({}));const p=await sb.from('programs').select('*').eq('slug','meraki-futbol').maybeSingle().then(r=>r.data).catch(()=>null)
  if(!p)return kv;const soc=['instagram_url','facebook_url','youtube_url','tiktok_url','x_url'].filter(k=>p[k]).map(k=>[k,p[k]]);return{...kv,...Object.fromEntries(soc),quienes_somos:p.quienes_somos||kv.quienes_somos||'',fut_nombre:p.nombre,fut_logo:p.logo_url||''}}}
