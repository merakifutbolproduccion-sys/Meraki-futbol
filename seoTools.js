// Herramientas SEO del panel. Todo es local y por reglas: sin IA, sin APIs pagas, sin pedidos a otros sitios.
const strip=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const words=s=>strip(s).replace(/[^a-z0-9ñ\s-]/g,' ').split(/\s+/).filter(Boolean)
const STOP=new Set('el la los las un una unos unas de del al a en y e o u que se su sus por para con sin sobre entre ante tras es son fue fueron ser va van ha han lo le les mas muy ya no si como pero este esta estos estas ese esa asi tras hasta desde cuando donde quien'.split(' '))
const kw=s=>words(s).filter(w=>w.length>2&&!STOP.has(w))
const uniq=a=>[...new Set(a)]
const cap=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s}

// ---------- Relacionadas ----------
export function relatedScore(n,clubSlugs,x,xClubSlugs){
  let s=0
  s+=3*(clubSlugs||[]).filter(c=>(xClubSlugs||[]).includes(c)).length
  if(n.tournament_id&&n.tournament_id===x.tournament_id)s+=2
  const mine=new Set((n.temas||[]).map(strip));s+=2*(x.temas||[]).filter(t=>mine.has(strip(t))).length
  if(n.categoria&&n.categoria===x.categoria)s+=1
  return s}

// ---------- Análisis del título ----------
const GENERIC=['noticias','novedades','importante','increible','urgente','ultimo momento','se confirmo','te sorprendera','no vas a creer','atencion','que paso','todo lo que tenes que saber','informacion']
export function analyzeTitle(titulo,ctx={}){
  const t=String(titulo||'').trim(),n=t.length,out=[]
  if(!n)return{n,items:[{ok:false,t:'Escribí el título para ver las recomendaciones.'}]}
  out.push(n>=50&&n<=65?{ok:true,t:`Largo orientativo correcto (${n} caracteres).`}:{ok:true,neutral:true,t:n<50?`${n} caracteres: es corto. Orientativo: 50 a 65. Si queda claro, está bien así.`:`${n} caracteres: es largo. Orientativo: 50 a 65; Google puede cortarlo en los resultados. No es un error.`})
  const names=uniq([...(ctx.clubs||[]),ctx.protagonista,ctx.home,ctx.away].filter(Boolean))
  const low=strip(t),hit=names.filter(x=>low.includes(strip(x)))
  const early=hit.some(x=>{const i=low.indexOf(strip(x));return i>=0&&i<=25})
  out.push(hit.length?{ok:true,t:`Menciona: ${hit.join(', ')}.`}:{ok:false,t:names.length?`No aparece ningún club ni protagonista de la nota (${names.slice(0,3).join(', ')}…). Sumá al menos uno.`:'Sumá el club o el protagonista al título.'})
  if(hit.length)out.push(early?{ok:true,t:'El club o protagonista aparece al principio.'}:{ok:true,neutral:true,t:'Si queda natural, poné al principio al club o al protagonista.'})
  const gen=GENERIC.filter(g=>low.includes(g)),few=kw(t).length<3
  out.push(gen.length||few?{ok:false,t:`Título genérico${gen.length?` (palabras como «${gen[0]}»)`:''}${few?': tiene pocas palabras concretas':''}. Contá qué pasó y a quién.`}:{ok:true,t:'No parece genérico.'})
  if(ctx.tipo==='cronica'&&ctx.hg!=null&&ctx.ag!=null&&ctx.hg!==''&&ctx.ag!==''&&!/\d\s*[-–]\s*\d/.test(t))out.push({ok:true,neutral:true,t:'Sumar el resultado (por ejemplo 2-1) ayuda: es lo que la gente busca.'})
  out.push({ok:true,neutral:true,t:'No hace falta nombrar el torneo en el título: ya queda en la dirección de la nota, en su ficha y en las secciones.'})
  return{n,items:out}}

// ---------- Cinco alternativas con datos reales ----------
export function suggestTitles(ctx){
  const T=cap,{tipo,titulo,bajada,torneo,protagonista,tema}=ctx,clubs=(ctx.clubs||[]).filter(Boolean),tt=String(titulo||'').trim()
  const L=[];const add=(s,why)=>{s=String(s||'').replace(/\s+/g,' ').trim();if(s&&!L.some(x=>strip(x.t)===strip(s)))L.push({t:T(s,110),why})}
  if(tipo==='cronica'&&ctx.home&&ctx.away&&ctx.hg!=null&&ctx.ag!=null&&ctx.hg!==''&&ctx.ag!==''){
    const H=ctx.home,A=ctx.away,hg=+ctx.hg,ag=+ctx.ag,draw=hg===ag,hw=hg>ag,W=hw?H:A,Lo=hw?A:H,gw=Math.max(hg,ag),gl=Math.min(hg,ag)
    add(`${H} ${hg}-${ag} ${A}: crónica y resumen del partido`,'Resultado + palabras que la gente busca')
    add(draw?`${H} y ${A} empataron ${hg}-${ag}`:`${W} venció ${gw}-${gl} a ${Lo}`,'Resultado en formato de frase')
    add(draw?`${H} y ${A} igualaron ${hg}-${ag}: resultado y crónica`:`${W} se impuso ante ${Lo}: resultado y crónica`,'Verbo + «resultado y crónica»')
    add(`${H} vs ${A}: así fue el partido`,'Enfrentamiento + palabras clave')
    add(`Resultado de ${H} y ${A}: ${hg}-${ag}`,'Resultado destacado')
  }else if(tipo==='entrevista'&&protagonista){
    add(`Entrevista a ${protagonista}`,'Nombre del protagonista primero')
    if(tt)add(`${protagonista}: ${tt}`,'Protagonista + tu título')
    if(bajada)add(`${protagonista}: ${cap(bajada,70)}`,'Protagonista + tu bajada')
    if(clubs[0])add(`${protagonista} (${clubs[0]}): entrevista`,'Protagonista + club')
    if(tt)add(`Qué dijo ${protagonista}: ${tt}`,'Pregunta que la gente busca')
  }else if(tipo==='ascenso'){
    if(ctx.fecha)add(`Ascenso: resultados de la fecha ${ctx.fecha}`,'Sección + fecha real')
    if(ctx.fecha)add(`Ascenso, fecha ${ctx.fecha}: lo que dejó la jornada`,'Sección + fecha + frase')
    if(clubs.length)add(`${clubs.slice(0,2).join(' y ')}: ${tt||'lo que dejó la fecha'}`,'Clubes al principio')
    if(tt)add(`Ascenso: ${tt}`,'Sección + tu título')
  }else{
    const lead=clubs[0]||protagonista||tema
    if(tt&&lead&&!strip(tt).startsWith(strip(lead)))add(`${lead}: ${tt}`,'Club o protagonista al principio')
    if(tt&&clubs.length>1)add(`${clubs.slice(0,2).join(' y ')}: ${tt}`,'Dos clubes al principio')
    if(tt&&bajada&&bajada.length<80)add(`${tt}: ${bajada}`,'Título + tu bajada')
    if(tt&&lead&&!strip(tt).includes(strip(lead)))add(`${tt} | ${lead}`,'Club o protagonista al final')
    if(tt)add(tt,'Tu título actual')
  }
  return L.slice(0,5)}

// ---------- Búsquedas externas (solo links, no se consulta nada automáticamente) ----------
export function searchQuery(ctx){
  const p=[];const c=(ctx.clubs||[]).filter(Boolean)
  if(ctx.protagonista)p.push(ctx.protagonista)
  if(ctx.home&&ctx.away)p.push(ctx.home,ctx.away);else p.push(...c.slice(0,2))
  if(ctx.torneo)p.push(ctx.torneo)
  const q=uniq(p).join(' ')
  return q.trim().length>=6?q:(ctx.tema||ctx.titulo||'').trim()}
export const googleNewsUrl=q=>'https://news.google.com/search?q='+encodeURIComponent(q)+'&hl=es-419&gl=AR&ceid=AR%3Aes-419'
export const googleWebUrl=q=>'https://www.google.com/search?q='+encodeURIComponent(q)

// ---------- Comparador local con lo que la persona pega ----------
const ANG={resultado:['vencio','gano','derrota','empate','empataron','goles','victoria','triunfo','se impuso','igualaron','cayo','resultado'],
 mercado:['refuerzo','pase','fichaje','llego','contrato','incorporacion','oferta','renovo','transferencia'],
 lesion:['lesion','lesionado','desgarro','baja','operado'],
 declaraciones:['dijo','hablo','declaro','declaraciones','confeso','aseguro','palabras','entrevista'],
 previa:['previa','horario','formaciones','probable','como llega','donde ver','tv','cuando juega'],
 polemica:['var','arbitro','arbitraje','polemica','expulsion','penal','denuncia','sancion'],
 tabla:['tabla','posiciones','puntos','lider','promedios','descenso','ascenso','clasificacion']}
const angles=s=>{const l=strip(s);return Object.keys(ANG).filter(k=>ANG[k].some(w=>l.includes(w)))}
export function parseExternal(raw){
  return String(raw||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
   const u=l.match(/https?:\/\/\S+/),url=u?u[0]:'',title=l.replace(url,'').replace(/[|·\-–—]\s*$/,'').replace(/^[|·\-–—]\s*/,'').trim()
   let host='';try{host=url?new URL(url).hostname.replace(/^www\./,''):''}catch{}
   return{title,url,host}})}

export function compare({titulo,bajada,text,ctx={}},ext,extTexts=[]){
  const mine=kw(titulo),mineSet=new Set(mine),mineAll=new Set(kw(`${titulo} ${bajada||''} ${text||''}`))
  const withTitle=ext.filter(e=>e.title),noTitle=ext.filter(e=>!e.title&&e.url)
  const rows=withTitle.map(e=>{const k=uniq(kw(e.title)),shared=k.filter(w=>mineSet.has(w)),union=uniq([...k,...mine]).length||1,sim=shared.length/union
   return{...e,shared,sim,angles:angles(e.title)}})
  const freq={};rows.forEach(r=>uniq(kw(r.title)).forEach(w=>freq[w]=(freq[w]||0)+1))
  const minF=rows.length>=3?2:1
  const common=Object.entries(freq).filter(([w,c])=>c>=minF&&!mineSet.has(w)).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([w,c])=>({w,c}))
  const angCount={};rows.forEach(r=>r.angles.forEach(a=>angCount[a]=(angCount[a]||0)+1))
  const myAng=angles(`${titulo} ${bajada||''}`)
  const tips=[],missing=[]
  const similar=rows.filter(r=>r.sim>=0.5)
  if(similar.length)tips.push(`${similar.length} titular(es) externos son muy parecidos al tuyo (comparten la mayoría de las palabras clave). Buscá un dato propio para diferenciarte.`)
  const names=uniq([...(ctx.clubs||[]),ctx.protagonista,ctx.home,ctx.away].filter(Boolean))
  if(rows.length&&names.length){const inExt=names.filter(n=>rows.some(r=>strip(r.title).includes(strip(n)))),inMine=names.filter(n=>strip(titulo).includes(strip(n)))
   const lacking=inExt.filter(n=>!inMine.includes(n));if(lacking.length)tips.push(`Otros titulares nombran «${lacking.join('», «')}» y tu título no.`)
   if(rows.length&&!inMine.length)tips.push('Tu título no nombra al club ni al protagonista, mientras que los externos sí. Es el riesgo de ser demasiado genérico.')}
  Object.entries(angCount).sort((a,b)=>b[1]-a[1]).forEach(([a,c])=>{if(!myAng.includes(a)){missing.push(a);tips.push(`${c} de ${rows.length} titulares enfocan en «${a}». Si tenés información propia sobre eso, podés sumarla (sin copiar su texto).`)}})
  const unique=myAng.filter(a=>!angCount[a]);if(unique.length)tips.push(`Tu enfoque «${unique.join(', ')}» no aparece en los titulares pegados: puede ser un diferencial.`)
  // textos pegados (opcional)
  const texts=extTexts.filter(t=>t.trim().length>80);let faltan=[]
  if(texts.length){const f={};texts.forEach(t=>uniq(kw(t)).forEach(w=>f[w]=(f[w]||0)+1))
   const min=texts.length>=2?2:1;faltan=Object.entries(f).filter(([w,c])=>c>=min&&!mineAll.has(w)&&w.length>3&&!/^\d+$/.test(w)).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([w])=>w)
   if(faltan.length)tips.push('En los textos que pegaste aparecen términos que tu nota no menciona (abajo). Verificá si faltan datos propios; no copies su redacción.')}
  return{rows,noTitle,common,angCount,tips,faltan,textsUsed:texts.length,nTitles:rows.length}}
