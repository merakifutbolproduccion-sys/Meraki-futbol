// Lógica PURA de la importación de notas (sin DOM, sin red, sin dependencias).
// Convierte "bloques" (que salen de un PDF, un DOCX o un OCR) en: título, bajada, cuerpo, autor y fecha.
// Regla de oro: solo se MUEVEN textos que ya existen en el documento. Nunca se inventa ni se reescribe nada.
//
// Un bloque es: {k:'title'|'sub'|'h'|'p'|'ul'|'ol'|'quote', text, inner?, html?, bold?, italic?, big?}
//   inner = HTML en línea (negritas, cursivas, enlaces) · html = HTML completo (listas) · big = tamaño relativo al texto base

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const escAttr=s=>esc(s).replace(/"/g,'&quot;')
export const N=s=>String(s==null?'':s).replace(/\s+/g,' ').trim()
export const normKey=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()

const MESES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12}
const pad=n=>String(n).padStart(2,'0')

// ---------- Fechas ----------
// Solo acepta líneas que son una fecha (con o sin lugar y hora). Sin año NO se asume ninguno.
export function parseDate(s){
 const t=N(s);let m,d,mo,y,rest=t
 if((m=t.match(/(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(?:de(?:l)?\s+)?(\d{4})/))){mo=MESES[normKey(m[2])];if(!mo)return null;d=+m[1];y=+m[3];rest=t.replace(m[0],' ')}
 else if((m=t.match(/(\d{4})-(\d{2})-(\d{2})/))){y=+m[1];mo=+m[2];d=+m[3];rest=t.replace(m[0],' ')}
 else if((m=t.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})(?!\d)/))){d=+m[1];mo=+m[2];y=+m[3];if(y<100)y+=2000;rest=t.replace(m[0],' ')}
 else return null
 let hh=12,mi=0
 const tm=rest.match(/(\d{1,2})[:.hH](\d{2})\s*(?:hs?\.?|horas)?/)
 if(tm){hh=+tm[1];mi=+tm[2];rest=rest.replace(tm[0],' ')}
 rest=rest.replace(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|a las|hs?|horas|del?)\b/gi,' ').replace(/[,\-–—|·:]/g,' ').trim()
 if(rest&&(rest.split(/\s+/).length>3||/[.!?]/.test(rest)||/\d/.test(rest)))return null // sobra texto: no era una línea de fecha
 const dt=new Date(y,mo-1,d,hh,mi)
 if(y<2000||y>2100||hh>23||mi>59||dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return null
 return{local:`${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${pad(mi)}`,y,m:mo,d,label:`${pad(d)}/${pad(mo)}/${y}`}}

// ---------- Autor ----------
const NAMEW="[A-ZÁÉÍÓÚÑÜ][\\p{L}.'’-]*"
const NAMERX=new RegExp(`^${NAMEW}(?:\\s+(?:de|del|la|las|los|y|da|di|van|von|${NAMEW}))*$`,'u')
const LABEL_AUTH=/^(?:[Pp]or|[Tt]exto|[Aa]utor[ií]a|[Aa]utora|[Aa]utor|[Rr]edacci[oó]n|[Rr]edactora|[Rr]edactor|[Cc]r[oó]nica|[Pp]eriodista)(?:\s*:\s*|\s+)(.+)$/u
// Devuelve {date}, {author,known} o null. "Por Independiente" (1 sola palabra, sin dos puntos) NO se toma como firma.
function classify(part,known){
 const t=N(part);if(!t)return null
 const dt=parseDate(t);if(dt)return{date:dt}
 if(t.length>60)return null
 if(known.includes(normKey(t)))return{author:t,known:true}
 const m=t.match(LABEL_AUTH)
 if(m){const name=N(m[1]).replace(/\.$/,''),toks=name.split(/\s+/),colon=/^[^\s:]+\s*:/.test(t)
  if(name.length<=50&&toks.length<=6&&NAMERX.test(name)&&(colon||toks.length>=2))return{author:name,known:known.includes(normKey(name))}}
 return null}

const looksTitle=(b,B)=>b.text.length>=8&&b.text.length<=150&&!/[.,;:]$/.test(b.text)&&B.length>=3&&B.slice(1).reduce((a,x)=>a+x.text.length,0)>=200

// ---------- Armado de la nota ----------
export function assemble(input,{known=[]}={}){
 const warn=[],notes=[]
 let B=input.map(b=>({...b,text:N(b.text)})).filter(b=>b.text||b.html)
 let titulo='',bajada='',autor=null,fecha=null,titleBig=0

 // A) Campos con etiqueta explícita ("Título: …", "Bajada: …", "Autor: …", "Fecha: …") en los primeros bloques
 const LAB=/^(t[ií]tulo|bajada|copete|subt[ií]tulo|autor|autora|redactor|redactora|fecha)\s*:\s*(.+)$/i
 B=B.filter((b,i)=>{const m=i<8&&(b.k==='p'||b.k==='h'||b.k==='sub')&&b.text.match(LAB);if(!m)return true
  const key=normKey(m[1]),v=N(m[2])
  if(key==='titulo'&&!titulo){titulo=v;notes.push('Título tomado de la línea «Título:».')}
  else if(/^(bajada|copete|subtitulo)$/.test(key)&&!bajada){bajada=v;notes.push('Bajada tomada de la línea «Bajada:».')}
  else if(key==='fecha'){const d=parseDate(v);if(d){if(!fecha)fecha=d}else warn.push(`No se pudo interpretar la fecha «${v}». Cargala a mano si hace falta.`)}
  else if(/^(autor|autora|redactor|redactora)$/.test(key)){if(!autor)autor={name:v,known:known.includes(normKey(v))}}
  else return true
  return false})

 // B) Título
 if(!titulo){
  let idx=B.slice(0,4).findIndex(b=>b.k==='title')
  if(idx<0&&B[0]&&B[0].k==='h')idx=0
  if(idx>=0){titleBig=B[idx].big||0;titulo=B[idx].text;notes.push(B[idx].k==='title'?'Título detectado por su estilo/tamaño.':'Título tomado del primer encabezado.')
   if(idx>0)warn.push('Había texto antes del título: quedó al comienzo del cuerpo. Revisalo.')
   B.splice(idx,1)}
  else if(B[0]&&B[0].k==='p'&&looksTitle(B[0],B)){titulo=B[0].text;titleBig=B[0].big||0;B.shift()
   warn.push('No había un título marcado: se tomó la primera línea como título. Verificá que sea correcto.')}
  else warn.push('No se pudo detectar el título. Escribilo en el campo Título.')}
 if(titulo.length>200)warn.push('El título detectado es muy largo (más de 200 caracteres). Revisá que no incluya parte del texto.')

 // C) Bajada
 const pb=B.filter(x=>x.k==='p'),boldShare=pb.length?pb.filter(x=>x.bold).length/pb.length:0
 if(!bajada&&B[0]){const b=B[0]
  const sizeOk=b.big>=1.05&&(!titleBig||b.big<titleBig)
  const okP=b.k==='p'&&b.text.length>=30&&b.text.length<=350&&B.length>=3&&(b.italic||(b.bold&&boldShare<.5)||sizeOk)
  const okH=b.k==='h'&&b.text.length>=30&&b.text.length<=350&&B.length>=3&&sizeOk&&(b.italic||b.text.length>=70||/[.!?…"”»]$/.test(b.text)) // un subtítulo corto sin punto NO se toma como bajada
  const ok=b.k==='sub'||okP||okH
  if(ok){bajada=b.text;B.shift();notes.push('Bajada detectada (estilo subtítulo, cursiva, negrita o tamaño).')}}

 // D) Firma y fecha: solo al comienzo (hasta 4 bloques) o al final (hasta 2) y solo si la línea ES una firma/fecha
 const scan=i=>{const b=B[i];if(!b||b.k!=='p'||b.text.length>110)return false
  const parts=b.text.split(/\s*[|·•]\s*|\s+[—–-]\s+/).map(N).filter(Boolean)
  if(!parts.length||parts.length>3)return false
  const cl=parts.map(p=>classify(p,known));if(cl.some(c=>!c))return false
  let remove=true
  for(const c of cl){
   if(c.date){if(!fecha)fecha=c.date}
   else{if(!autor)autor={name:c.author,known:c.known};if(!c.known)remove=false}}
  return remove?'remove':'keep'}
 for(let i=0;i<4&&i<B.length;){const r=scan(i);if(r==='remove')B.splice(i,1);else if(r==='keep')i++;else break}
 for(let n=0;n<2&&B.length;n++){const i=B.length-1,r=scan(i);if(r==='remove')B.splice(i,1);else break}
 if(autor&&!autor.known)warn.push(`Firma detectada: «${autor.name}», pero no figura entre los redactores cargados. Elegí el redactor a mano.`)

 // E) Subtítulos internos: los encabezados reales se conservan; una línea corta toda en negrita entre párrafos también
 const pb2=B.filter(x=>x.k==='p'),bs2=pb2.length?pb2.filter(x=>x.bold).length/pb2.length:0
 let promoted=0
 B=B.map((b,i)=>{if(b.k==='p'&&b.bold&&bs2<.6&&b.text.length<=90&&!/[.,;:]$/.test(b.text)&&B[i+1]&&B[i+1].k==='p'&&B[i+1].text.length>=60){promoted++;return{...b,k:'h'}}return b})

 const html=B.map(b=>b.k==='h'?`<h2>${esc(b.text)}</h2>`
  :b.k==='ul'||b.k==='ol'?b.html
  :b.k==='quote'?`<blockquote>${b.inner!=null?b.inner:esc(b.text)}</blockquote>`
  :`<p>${b.inner!=null?b.inner:esc(b.text)}</p>`).join('')
 const stats={paragraphs:B.filter(b=>b.k==='p'||b.k==='quote').length,headings:B.filter(b=>b.k==='h').length,lists:B.filter(b=>b.k==='ul'||b.k==='ol').length,promoted}
 if(stats.headings)notes.push(`Subtítulos internos conservados: ${stats.headings}.`)
 return{titulo:N(titulo),bajada:N(bajada),html,autor,fecha,notes,warn,stats}}

// ---------- PDF: de ítems de texto (posición, tamaño, estilo) a bloques ----------
// pages=[{n,w,h,items:[{s,x,y,w,size,b,i,href}]}]  (coordenadas PDF: y crece hacia arriba)
const BUL=/^(?:[•●○■▪◦·]\s*|[-–—*]\s+)/,NUM=/^\d{1,2}[.)]\s+/,END=/[.!?…:"”»)\]]\s*$/
const pct=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:0
const sortNum=a=>a.slice().sort((x,y)=>x-y)

function buildLines(items){
 const its=items.filter(t=>t.s!==''&&t.size>0).slice().sort((a,b)=>b.y-a.y||a.x-b.x),groups=[]
 for(const t of its){const g=groups[groups.length-1]
  if(g&&Math.abs(g.y-t.y)<=Math.max(1.5,.4*Math.min(g.size,t.size)))g.items.push(t);else groups.push({y:t.y,size:t.size,items:[t]})}
 const out=[]
 for(const g of groups){
  const it=g.items.slice().sort((a,b)=>a.x-b.x),runs=[];let prev=null
  for(const t of it){let s=t.s
   if(prev){const gap=t.x-(prev.x+prev.w);if(gap>.18*Math.min(t.size,prev.size)&&!/\s$/.test(prev.s)&&!/^\s/.test(s))s=' '+s}
   const last=runs[runs.length-1]
   if(last&&last.b===!!t.b&&last.i===!!t.i&&last.href===(t.href||''))last.s+=s;else runs.push({s,b:!!t.b,i:!!t.i,href:t.href||''})
   prev=t}
  if(runs.length){runs[0].s=runs[0].s.replace(/^\s+/,'');runs[runs.length-1].s=runs[runs.length-1].s.replace(/\s+$/,'')}
  const rs=runs.filter(r=>r.s!=='');if(!rs.length)continue
  const text=rs.map(r=>r.s).join(''),w=new Map()
  it.forEach(t=>{const k=Math.round(t.size*2)/2;w.set(k,(w.get(k)||0)+t.s.trim().length)})
  const size=[...w.entries()].sort((a,b)=>b[1]-a[1])[0][0]
  out.push({y:g.y,x0:Math.min(...it.map(t=>t.x)),x1:Math.max(...it.map(t=>t.x+t.w)),size,text,runs:rs,
   bold:it.every(t=>!t.s.trim()||t.b),italic:it.every(t=>!t.s.trim()||t.i)})}
 return out}

// Quita números de página y encabezados/pies repetidos en varias páginas.
function dropRunning(P){
 const key=l=>l.text.replace(/\d+/g,'#').toLowerCase(),zone=(pg,l)=>l.y>pg.h*.93||l.y<pg.h*.07,cnt=new Map()
 P.forEach(pg=>new Set(pg.lines.filter(l=>zone(pg,l)).map(key)).forEach(k=>cnt.set(k,(cnt.get(k)||0)+1)))
 const pn=/^(?:p[aá]g(?:ina|\.)?\s*)?\d{1,4}(?:\s*(?:de|\/)\s*\d{1,4})?$|^-\s*\d{1,4}\s*-$/i
 P.forEach(pg=>{pg.lines=pg.lines.filter(l=>!(zone(pg,l)&&(pn.test(l.text.trim())||(P.length>=2&&cnt.get(key(l))>=Math.max(2,P.length*.6)))))})}

function joinRuns(lines){
 const runs=[]
 lines.forEach((l,i)=>{const rs=l.runs.map(r=>({...r}))
  if(i>0){const last=runs[runs.length-1]
   // Un guion al final de línea se conserva (puede ser un guion real: "ex-jugador"); solo se evita el espacio de más.
   if(!(/\p{L}-$/u.test(last.s)&&/^\p{Ll}/u.test(rs[0].s)))last.s+=' '}
  rs.forEach(r=>{const last=runs[runs.length-1];if(last&&last.b===r.b&&last.i===r.i&&last.href===r.href)last.s+=r.s;else runs.push(r)})})
 return runs}
const inner=runs=>runs.map(r=>{let s=esc(r.s);if(r.i)s=`<em>${s}</em>`;if(r.b)s=`<strong>${s}</strong>`;if(r.href)s=`<a href="${escAttr(r.href)}">${s}</a>`;return s}).join('')

export function pdfLayoutToBlocks(pages){
 const P=pages.map(pg=>({n:pg.n,h:pg.h||842,lines:buildLines(pg.items)}))
 dropRunning(P)
 const lines=P.flatMap(pg=>pg.lines.map(l=>({...l,pg:pg.n})))
 if(!lines.length)return{blocks:[],body:0,chars:0}
 const cnt=new Map();lines.forEach(l=>cnt.set(Math.round(l.size*2)/2,(cnt.get(Math.round(l.size*2)/2)||0)+l.text.length))
 const body=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0][0]
 const bl=lines.filter(l=>Math.abs(l.size-body)<.6&&l.text.length>=25)
 const right=pct(sortNum(bl.map(l=>l.x1)),.9),left=pct(sortNum(bl.map(l=>l.x0)),.1)
 const gaps=[];for(let i=1;i<lines.length;i++){const p=lines[i-1],l=lines[i];if(p.pg===l.pg&&Math.abs(p.size-body)<.6&&Math.abs(l.size-body)<.6){const g=p.y-l.y;if(g>0&&g<body*3)gaps.push(g)}}
 const lead=pct(sortNum(gaps),.3)||body*1.25

 const paras=[];let cur=null
 lines.forEach((l,i)=>{const p=lines[i-1];let brk=!p
  if(p){
   const same=Math.abs(l.size-p.size)<=Math.max(.6,p.size*.06),short=p.x1<right-l.size*2.5,veryShort=p.x1<right-.22*(right-left)
   if(!same)brk=true
   else if(l.pg!==p.pg)brk=END.test(p.text)
   else if(p.y-l.y>lead*(l.size/body)*1.45)brk=true
   else if(veryShort)brk=true // una línea bien corta cierra el párrafo (firma, fecha, subtítulo…) aunque no termine en punto
   else if(BUL.test(l.text)||NUM.test(l.text))brk=true
   else if(l.x0-left>l.size*.9&&END.test(p.text))brk=true
   else if(short&&END.test(p.text))brk=true
   else if(p.bold!==l.bold&&(p.bold?short:(l.text.length<=100&&l.x1<right-l.size*2.5)))brk=true}
  if(brk){cur={lines:[l]};paras.push(cur)}else cur.lines.push(l)})

 const blocks=[];let list=null
 const mk=p=>{const runs=joinRuns(p.lines),text=runs.map(r=>r.s).join(''),size=p.lines[0].size
  return{runs,text,size,big:size/body,bold:runs.every(r=>r.b||!r.s.trim()),italic:runs.every(r=>r.i||!r.s.trim()),nl:p.lines.length}}
 const asP=m=>({k:(m.big>=1.12&&m.text.length<=220&&m.nl<=3)?'h':'p',text:m.text,inner:inner(m.runs),bold:m.bold,italic:m.italic,big:m.big})
 paras.forEach(p=>{const m=mk(p),isB=BUL.test(m.text),isN=!isB&&NUM.test(m.text)
  if(isB||isN){const k=isB?'ul':'ol';if(list&&list.k===k)list.items.push(m);else{list={k,items:[m]};blocks.push(list)}}
  else{list=null;blocks.push(asP(m))}})
 const final=blocks.map(b=>{
  if(b.k!=='ul'&&b.k!=='ol')return b
  if(b.items.length<2)return asP(b.items[0]) // un solo "ítem": era un párrafo que empieza con guion o número
  const strip=m=>{const r=m.runs.map(x=>({...x}));r[0].s=r[0].s.replace(b.k==='ul'?BUL:NUM,'');return inner(r)}
  return{k:b.k,text:b.items.map(m=>m.text).join(' '),html:`<${b.k}>${b.items.map(m=>`<li>${strip(m)}</li>`).join('')}</${b.k}>`}})
 // El título es el texto más grande del documento, si está entre los primeros bloques.
 const mx=Math.max(0,...final.map(b=>b.big||0)),ti=final.slice(0,4).findIndex(b=>b.big&&b.big===mx&&b.k==='h')
 if(mx>=1.25&&ti>=0)final[ti].k='title'
 return{blocks:final,body,chars:lines.reduce((a,l)=>a+l.text.length,0)}}

// OCR: párrafos de texto plano -> bloques (sin información de formato).
export const textToBlocks=paras=>paras.map(t=>N(t)).filter(Boolean).map(t=>({k:'p',text:t,inner:esc(t),big:1}))

// pdf.js junta en un mismo ítem texto con distinto color, así que un enlace puede cubrir solo una parte del ítem.
// Se parte el ítem de forma proporcional y se ajusta a límites de palabra. Solo cambia la metadata (href), nunca el texto.
function applyLinks(item,links){
 let pieces=[item]
 for(const l of links){const[x1,y1,x2,y2]=l.rect,lx=Math.min(x1,x2),hx=Math.max(x1,x2),ly=Math.min(y1,y2)-1.5,hy=Math.max(y1,y2)+1.5,out=[]
  for(const p of pieces){const cy=p.y+p.size*.35
   if(p.href||cy<ly||cy>hy||p.w<=0||p.x+p.w<=lx||p.x>=hx||!p.s.trim()){out.push(p);continue}
   const len=p.s.length,a=Math.max(0,(lx-p.x)/p.w),b=Math.min(1,(hx-p.x)/p.w)
   if(a<=.03&&b>=.97){out.push({...p,href:l.url});continue}
   const bnd=j=>j<=0||j>=len||/\s/.test(p.s[j-1])||/\s/.test(p.s[j])||/[,;:!?)»”"]/.test(p.s[j])||(p.s[j]==='.'&&(j+1>=len||/\s/.test(p.s[j+1])))
   const snap=i=>{for(let d=0;d<=len;d++){if(bnd(i-d))return Math.max(0,i-d);if(bnd(i+d))return Math.min(len,i+d)}return i}
   let c0=snap(Math.round(a*len)),c1=snap(Math.round(b*len))
   while(c0<c1&&/\s/.test(p.s[c0]))c0++
   while(c1>c0&&/\s/.test(p.s[c1-1]))c1--
   if(c1<=c0){out.push(p);continue}
   const seg=(i,j,href)=>{if(j<=i)return;out.push({...p,s:p.s.slice(i,j),x:p.x+p.w*i/len,w:p.w*(j-i)/len,href:href||p.href})}
   seg(0,c0);seg(c0,c1,l.url);seg(c1,len)}
  pieces=out}
 return pieces}

// ---------- PDF: lectura con pdf.js (recibe el documento ya abierto; no toca el DOM) ----------
export async function extractPdfPages(pdf,{max=60,onProgress}={}){
 const n=Math.min(pdf.numPages,max),pages=[],fonts=new Map()
 for(let p=1;p<=n;p++){
  onProgress?.({pct:10+Math.round(60*p/n),msg:`Leyendo página ${p} de ${n}…`})
  const page=await pdf.getPage(p),vp=page.getViewport({scale:1})
  try{await page.getOperatorList()}catch{} // carga las fuentes, así se puede saber cuáles son negrita/cursiva
  const tc=await page.getTextContent()
  let links=[];try{links=(await page.getAnnotations()).filter(a=>a.subtype==='Link'&&a.url&&a.rect&&/^(https?:|mailto:)/i.test(a.url))}catch{}
  const fi=name=>{let f=fonts.get(name);if(f)return f
   let nm='';try{if(page.commonObjs.has(name))nm=page.commonObjs.get(name)?.name||''}catch{}
   f={b:/bold|black|heavy|semibold|demi/i.test(nm),i:/italic|oblique/i.test(nm)};if(nm)fonts.set(name,f);return f}
  const items=[]
  for(const it of tc.items){if(typeof it.str!=='string')continue
   const t=it.transform;if(Math.abs(t[1])>Math.abs(t[0])*.5)continue // texto girado (marcas de agua, márgenes): se ignora
   const f=fi(it.fontName),size=Math.hypot(t[0],t[1])||it.height||0,x=t[4],y=t[5],w=it.width||0
   items.push(...applyLinks({s:it.str,x,y,w,size,b:f.b,i:f.i,href:''},links))}
  pages.push({n:p,w:vp.width,h:vp.height,items})}
 return{pages,total:pdf.numPages,read:n}}
