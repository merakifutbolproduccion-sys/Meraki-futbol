// Lógica del editor de noticias de Meraki Fútbol. Sin dependencias externas.
import {slugify} from './ui'

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const norm=s=>' '+String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()+' '

// ---------- Formato del contenido ----------
// Las noticias nuevas se guardan como HTML limpio. Las viejas son texto plano: se siguen mostrando igual.
export const isHtml=s=>/<(p|h2|h3|ul|ol|blockquote|figure|hr)[\s>\/]/i.test(s||'')

// Texto plano -> párrafos. Con líneas en blanco, cada bloque es un párrafo; si no hay, cada línea es un párrafo.
export function textToHtml(t){
 const s=String(t||'').replace(/\r\n?/g,'\n').trim();if(!s)return ''
 const parts=/\n[ \t]*\n/.test(s)?s.split(/\n[ \t]*\n/):s.split('\n')
 return parts.map(p=>p.trim()).filter(Boolean).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')}

const DROP=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','NOSCRIPT','TEMPLATE','SVG','FORM','INPUT','BUTTON','TEXTAREA','SELECT','HEAD','META','LINK','TITLE'])
const MAP={B:'STRONG',I:'EM',H1:'H2',H4:'H3',H5:'H3',H6:'H3',DIV:'P',SECTION:'P',ARTICLE:'P'}
const OK=new Set(['P','H2','H3','BLOCKQUOTE','UL','OL','LI','STRONG','EM','A','FIGURE','IMG','FIGCAPTION','HR','BR'])
const BLOCK=new Set(['P','H2','H3','BLOCKQUOTE','UL','OL','FIGURE','HR'])
const INLINE=new Set(['STRONG','EM','A','BR'])
const plainStyle=n=>/font-weight:\s*(normal|400)|font-style:\s*normal/i.test(n.getAttribute('style')||'') // Google Docs envuelve todo en <b style="font-weight:normal">

// Deja solamente las etiquetas permitidas. Es lo que se guarda y lo que se muestra en la web.
export function sanitize(html,{images=true}={}){
 const doc=new DOMParser().parseFromString('<body>'+(html||'')+'</body>','text/html'),out=document.createElement('div')
 const walk=(src,dst)=>{for(const n of [...src.childNodes]){
  if(n.nodeType===3){dst.appendChild(document.createTextNode(n.nodeValue));continue}
  if(n.nodeType!==1||DROP.has(n.tagName.toUpperCase()))continue
  const tag=MAP[n.tagName]||n.tagName
  if(!OK.has(tag)||((tag==='STRONG'||tag==='EM')&&plainStyle(n))){walk(n,dst);continue}
  const el=document.createElement(tag.toLowerCase())
  if(tag==='A'){const h=(n.getAttribute('href')||'').trim();if(!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(h)){walk(n,dst);continue}
   el.setAttribute('href',h);if(/^https?:/i.test(h)){el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer')}}
  if(tag==='IMG'){const s=(n.getAttribute('src')||'').trim();if(!images||!/^https?:\/\//i.test(s))continue
   el.setAttribute('src',s);el.setAttribute('alt',n.getAttribute('alt')||'');el.setAttribute('loading','lazy');el.setAttribute('decoding','async')}
  if(tag!=='IMG')walk(n,el)
  dst.appendChild(el)}}
 walk(doc.body,out);return normalize(out)}

function normalize(root){
 const res=document.createElement('div');let cur=null
 const inline=n=>{if(!cur){cur=document.createElement('p');res.appendChild(cur)}cur.appendChild(n)}
 const empty=n=>!n.textContent.trim()&&!n.querySelector('img')
 const visit=n=>{
  if(n.nodeType===3){if(n.nodeValue.trim()||cur)inline(n.cloneNode());return}
  const t=n.tagName
  if(INLINE.has(t)){inline(n.cloneNode(true));return}
  cur=null
  if(t==='IMG'){const f=document.createElement('figure');f.appendChild(n.cloneNode());res.appendChild(f);return}
  if(t==='P'&&[...n.children].some(c=>BLOCK.has(c.tagName))){[...n.childNodes].forEach(visit);cur=null;return}
  if(t==='HR'){res.appendChild(n.cloneNode());return}
  if(t==='FIGURE'){if(n.querySelector('img'))res.appendChild(n.cloneNode(true));return}
  if(BLOCK.has(t)){if(!empty(n))res.appendChild(n.cloneNode(true));return}
  [...n.childNodes].forEach(visit)}
 ;[...root.childNodes].forEach(visit)
 res.querySelectorAll('p').forEach(p=>{if(!p.textContent.trim()&&!p.querySelector('img'))p.remove()})
 return res.innerHTML}

export function htmlToText(html){const d=document.createElement('div');d.innerHTML=sanitize(html)
 return [...d.children].map(c=>c.tagName==='FIGURE'?'':c.textContent.trim()).filter(Boolean).join('\n\n')}
export const countWords=t=>(String(t||'').match(/\S+/g)||[]).length
export const paragraphsOf=html=>{const d=document.createElement('div');d.innerHTML=sanitize(html);return{p:d.querySelectorAll('p').length,h:d.querySelectorAll('h2,h3').length,q:d.querySelectorAll('blockquote').length,img:d.querySelectorAll('figure').length}}

// ---------- "Organizar texto" ----------
// Conservador: solo marca como subtítulo o cita lo que es muy claro. Ante la duda, queda como párrafo. No cambia ninguna palabra.
const isQuote=t=>t.length>=25&&/^[«"“].+[»"”]$/s.test(t)&&!/[«»“”"]/.test(t.slice(1,-1))
function looksSubtitle(t,prev,next){
 if(!prev||!next||next.tagName!=='P'||prev.tagName!=='P')return false
 if(t.length<4||t.length>70||t.split(/\s+/).length>10)return false
 if(/[.,;:]$/.test(t)||/\d/.test(t)||/[«»“”"]/.test(t))return false
 if(!/^[A-ZÁÉÍÓÚÑ¿¡]/.test(t))return false
 return next.textContent.trim().length>=80}
export function organizeHtml(html){
 const d=document.createElement('div');d.innerHTML=sanitize(html)
 let subs=0,quotes=0;const kids=[...d.children]
 kids.forEach((el,i)=>{if(el.tagName!=='P'||el.children.length&&[...el.children].some(c=>c.tagName!=='BR'))return
  const t=el.textContent.trim()
  if(isQuote(t)){const b=document.createElement('blockquote');b.textContent=t;el.replaceWith(b);quotes++}
  else if(looksSubtitle(t,kids[i-1],kids[i+1])){const h=document.createElement('h2');h.textContent=t;el.replaceWith(h);subs++}})
 return{html:d.innerHTML,subs,quotes}}

// ---------- Slug y textos SEO sugeridos ----------
const STOP=new Set('a al e el en es la las lo los o para por se su sus un una unos unas y que de del'.split(' '))
export function suggestSlug(title){
 const all=slugify(title||'').split('-').filter(Boolean);let w=all.filter(x=>!STOP.has(x));if(w.length<2)w=all
 const out=[];let len=0;for(const x of w){if(out.length>=8||len+x.length+1>70)break;out.push(x);len+=x.length+1}
 return out.join('-')}
const cut=(s,max)=>{s=String(s||'').replace(/\s+/g,' ').trim();if(s.length<=max)return s
 const c=s.slice(0,max-1),i=c.lastIndexOf(' ');return(i>max*.6?c.slice(0,i):c).replace(/[ ,;:\-–—]+$/,'')+'…'}
export function suggestSeoTitle(t){t=String(t||'').trim();if(t.length<=65)return t
 const seg=t.split(/\s[|–—-]\s|:\s|,\s/)[0];if(seg.length>=25&&seg.length<=65)return seg
 let c=t.slice(0,64);const i=c.lastIndexOf(' ');c=i>30?c.slice(0,i):c;const ws=c.split(' ');while(ws.length>3&&STOP.has(ws[ws.length-1].toLowerCase()))ws.pop();return ws.join(' ')}
export function suggestMeta(bajada,text){
 const b=String(bajada||'').replace(/\s+/g,' ').trim(),first=String(text||'').split('\n\n')[0]||''
 if(b.length>=90)return cut(b,155)
 const base=b?b+' '+first:first;return cut(base,155)}

// ---------- Clubes, torneos y temas (solo lo que realmente aparece en el texto) ----------
const GENERIC=new Set(['club','atletico','deportivo','social','ca','cd','cs','fc'])
const alias=n=>{const w=norm(n).trim().split(' ').filter(x=>!GENERIC.has(x));return w.length&&w.join(' ').length>=5?' '+w.join(' ')+' ':''}
export function detectNames(text,list){
 let w=norm(text);const found=[],byLen=[...list].sort((a,b)=>b.nombre.length-a.nombre.length)
 const pass=(get)=>{for(const it of byLen){if(found.some(f=>f.nombre===it.nombre))continue
  const n=get(it.nombre);if(n.trim().length<3)continue
  const i=w.indexOf(n);if(i>=0){found.push({...it,pos:i});w=w.split(n).join(' ')}}}
 pass(norm)               // primero el nombre completo ("Independiente Rivadavia")
 pass(alias)              // después el nombre corto ("Racing Club" aparece escrito como "Racing")
 return found}
export function suggestTopic(titulo,clubs,tournaments){
 const inTitle=detectNames(titulo,clubs).sort((a,b)=>a.pos-b.pos)
 if(inTitle.length>=2)return inTitle[0].nombre+' vs '+inTitle[1].nombre
 if(inTitle.length===1)return inTitle[0].nombre
 const t=detectNames(titulo,tournaments);return t[0]?.nombre||''}

// ---------- Revisión de la publicación ----------
export function review(p){
 const w=countWords(p.text),st=p.struct,L=[],tips=[]
 const add=(k,ok,label,tip)=>{L.push({k,ok,label});if(tip)tips.push({ok,t:tip})}
 const tl=(p.titulo||'').trim().length
 add('t',tl>=15,'Título',!tl?'Falta el título.':tl<15?'El título es muy corto: sumá quién, qué y contra quién.':tl>110?'El título es largo; en Google se va a cortar (el título SEO puede ser más corto).':'El título está bien.')
 const bl=(p.bajada||'').trim().length
 add('b',bl>=60,'Bajada',!bl?'Falta la bajada: resumí en una frase qué ocurrió.':bl<60?'La bajada podría explicar mejor qué ocurrió.':bl>220?'La bajada es larga; mejor en una o dos frases.':'La bajada está bien.')
 add('c',st.p>=2&&w>=60,'Contenido estructurado',w<60?'El texto es muy corto para una noticia.':st.p<2?'Separá el texto en más de un párrafo.':w>350&&!st.h?'La nota es larga: sumá subtítulos para ordenarla.':st.h?'El contenido tiene subtítulos y está correctamente estructurado.':'El contenido está dividido en párrafos.')
 add('i',!!p.img,'Imagen principal',!p.img?'Falta la imagen principal (también la usan WhatsApp y Facebook al compartir).':null)
 const sl=(p.slug||'').length
 add('s',sl>0&&!p.slugTaken,'Slug',!sl?'Falta el slug (la dirección de la noticia).':sl>60?'El slug puede ser más corto.':null)
 const ml=(p.meta||'').trim().length
 add('m',ml>=70&&ml<=160,'Meta descripción',!ml?'Falta la meta descripción (el resumen que se ve en Google).':ml<70?'La meta descripción es corta: contá un poco más.':ml>160?'La meta descripción es larga: Google la va a cortar.':null)
 add('a',!!p.img&&!!(p.alt||'').trim(),'ALT de la imagen',!p.img?null:!(p.alt||'').trim()?'Falta el texto alternativo de la imagen.':(p.alt||'').trim()===(p.titulo||'').trim()?'El ALT se armó con el título: revisalo y describí lo que se ve en la foto.':null)
 add('k',!!p.cat,'Categoría',!p.cat?'Falta seleccionar una categoría.':null)
 add('w',!!p.writer,'Autor',!p.writer?'No elegiste redactor: la nota va a figurar como Meraki Fútbol.':null)
 add('d',!!(p.titulo&&p.img&&p.meta),'Datos estructurados',null)
 if(!p.tema)tips.push({ok:false,t:'No se detectó un tema principal: escribilo si querés.'})
 const miss=L.filter(x=>!x.ok)
 return{items:L,tips,missing:miss,good:miss.length===0}}

// ---------- Datos estructurados (JSON-LD) de una noticia publicada ----------
export function newsJsonLd(n,{url,site,logo}){
 const clubs=(n.news_clubs||[]).map(x=>x.clubs).filter(Boolean)
 const o={'@context':'https://schema.org','@type':'NewsArticle',mainEntityOfPage:{'@type':'WebPage','@id':url},url,
  headline:String(n.seo_titulo||n.titulo||'').slice(0,110),description:n.meta_descripcion||n.bajada||undefined,
  image:n.imagen_url?[n.imagen_url]:undefined,datePublished:n.fecha||undefined,dateModified:n.updated_at||n.fecha||undefined,
  author:n.writers?.nombre_visible?{'@type':'Person',name:n.writers.nombre_visible}:{'@type':'Organization',name:site},
  publisher:{'@type':'Organization',name:site,logo:logo?{'@type':'ImageObject',url:logo}:undefined},
  articleSection:n.categoria||undefined,inLanguage:'es-AR',
  keywords:(n.temas&&n.temas.length)?n.temas.join(', '):undefined,
  about:clubs.length?clubs.map(c=>({'@type':'SportsTeam',name:c.nombre})):undefined}
 return JSON.stringify(o)}
