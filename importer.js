// Importación de notas desde PDF, DOCX y Google Docs. Todo se procesa en el navegador: el archivo NO se sube a ningún servidor.
// Las librerías pesadas (pdf.js, mammoth, tesseract) se cargan solo cuando se usan.
import {sb} from './supabase'
import {sanitize,htmlToText,isHtml} from './editorUtils'
import {assemble,pdfLayoutToBlocks,extractPdfPages,textToBlocks,normKey,N} from './importCore'

export class ImportError extends Error{}
export const MAX_MB=25,MAX_PAGES=60,MAX_OCR_PAGES=15
const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const GOOGLE_CLIENT_ID=import.meta.env.VITE_GOOGLE_CLIENT_ID||''
export const googleReady=()=>Boolean(GOOGLE_CLIENT_ID)

// ---------- Validación del archivo (extensión + tipo declarado + firma real del contenido) ----------
export async function sniff(file){
 if(!file)throw new ImportError('No se recibió ningún archivo.')
 const ext=(file.name.match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase()||''
 if(ext==='gdoc'||ext==='gsheet'||ext==='gslides')throw new ImportError('Ese archivo es solo un acceso directo a Google Docs. Usá la pestaña «Google Docs» y pegá el enlace del documento, o descargalo como PDF/DOCX.')
 if(ext==='doc')throw new ImportError('El formato .doc (Word antiguo) no está soportado. Abrilo y guardalo como .docx o PDF.')
 if(!['pdf','docx'].includes(ext))throw new ImportError('Formato no permitido. Solo se aceptan archivos PDF o DOCX.')
 if(!file.size)throw new ImportError('El archivo está vacío.')
 if(file.size>MAX_MB*1048576)throw new ImportError(`El archivo pesa más de ${MAX_MB} MB.`)
 const head=new Uint8Array(await file.slice(0,1024).arrayBuffer()),txt=new TextDecoder('latin1').decode(head)
 if(ext==='pdf'){if(!txt.includes('%PDF-'))throw new ImportError('El archivo dice ser PDF pero no lo es (está dañado o tiene otra extensión).');return'pdf'}
 if(!(head[0]===0x50&&head[1]===0x4b))throw new ImportError('El archivo dice ser DOCX pero no lo es (está dañado o tiene otra extensión).')
 if(file.type&&![DOCX_MIME,'application/octet-stream','application/zip','application/x-zip-compressed'].includes(file.type))throw new ImportError('El tipo de archivo no coincide con un DOCX.')
 return'docx'}

// ---------- Cierre común: bloques -> resultado listo para el formulario ----------
function finish(blocks,{known,source,extraWarn=[],extraNotes=[]}){
 const r=assemble(blocks,{known})
 r.html=sanitize(r.html) // mismo saneado que usa todo el panel: solo etiquetas permitidas
 r.text=htmlToText(r.html)
 if(!r.text.trim()&&!r.titulo)throw new ImportError('No se encontró texto en el documento.')
 if(!r.text.trim())r.warn.push('Se detectó el título pero no el cuerpo de la nota. Revisá el documento.')
 r.words=(r.text.match(/\S+/g)||[]).length
 r.source=source
 r.warn.unshift(...extraWarn);r.notes.unshift(...extraNotes)
 return r}
export const knownNames=writers=>writers.flatMap(w=>[normKey(w.nombre_visible),normKey(`${w.nombre||''} ${w.apellido||''}`)]).filter(Boolean)

// ---------- DOCX (y Google Docs, que se exporta a DOCX) ----------
const STYLE_MAP=["p[style-name='Title'] => h1.mk-title:fresh","p[style-name='title'] => h1.mk-title:fresh","p[style-name='Subtitle'] => p.mk-sub:fresh","p[style-name='subtitle'] => p.mk-sub:fresh"]
const frac=(el,sel)=>{const tot=el.textContent.length;if(!tot)return 0;let n=0;el.querySelectorAll(sel).forEach(x=>{n+=x.textContent.length});return n/tot}
function cleanHrefs(root){root.querySelectorAll('a[href]').forEach(a=>{ // Google envuelve algunos enlaces en google.com/url?q=…
 try{const u=new URL(a.getAttribute('href'));if(/(^|\.)google\.com$/.test(u.hostname)&&u.pathname==='/url'&&u.searchParams.get('q'))a.setAttribute('href',u.searchParams.get('q'))}catch{}})}
export function htmlToBlocks(html){
 const doc=new DOMParser().parseFromString('<body>'+html+'</body>','text/html'),B=[];let imgs=0,tables=0
 imgs=doc.body.querySelectorAll('img').length
 cleanHrefs(doc.body)
 for(const el of [...doc.body.children]){
  const tag=el.tagName,text=el.textContent
  if(tag==='TABLE'){tables++;el.querySelectorAll('tr').forEach(tr=>{const t=[...tr.children].map(c=>N(c.textContent)).filter(Boolean).join(' · ');if(t)B.push({k:'p',text:t,inner:t.replace(/&/g,'&amp;').replace(/</g,'&lt;')})});continue}
  if(tag==='UL'||tag==='OL'){if(N(text))B.push({k:tag.toLowerCase(),text:N(text),html:el.outerHTML});continue}
  if(tag==='BLOCKQUOTE'){if(N(text))B.push({k:'quote',text:N(text),inner:el.innerHTML});continue}
  if(/^H[1-6]$/.test(tag)){if(!N(text))continue;B.push({k:el.classList.contains('mk-title')?'title':'h',lv:+tag[1],text:N(text),inner:el.innerHTML});continue}
  if(tag==='P'){if(!N(text))continue
   B.push({k:el.classList.contains('mk-sub')?'sub':'p',text:N(text),inner:el.innerHTML,bold:frac(el,'strong,b')>.98,italic:frac(el,'em,i')>.98});continue}
  if(N(text))B.push({k:'p',text:N(text),inner:el.innerHTML})}
 return{blocks:B,imgs,tables}}

async function readDocx(buf,{known,source,onProgress}){
 onProgress?.({pct:30,msg:'Leyendo el documento…'})
 let mammoth
 try{const m=await import('mammoth/mammoth.browser.min.js');mammoth=m.default||m}catch{throw new ImportError('No se pudo cargar el lector de documentos Word. Recargá la página e intentá de nuevo.')}
 let res
 try{res=await mammoth.convertToHtml({arrayBuffer:buf},{styleMap:STYLE_MAP,convertImage:mammoth.images.imgElement(()=>({src:''}))})}
 catch(e){throw new ImportError('No se pudo leer el DOCX: el archivo está dañado o no es un documento de Word válido.')}
 onProgress?.({pct:75,msg:'Detectando título, bajada y cuerpo…'})
 const{blocks,imgs,tables}=htmlToBlocks(res.value),warn=[]
 if(imgs)warn.push(`El documento tiene ${imgs} imagen(es): no se importan. Subí la imagen principal y, si hace falta, insertá las otras desde el editor.`)
 if(tables)warn.push('El documento tiene tablas: se pasaron a texto, una línea por fila. Revisalas.')
 return finish(blocks,{known,source,extraWarn:warn})}

// ---------- PDF (texto seleccionable) con OCR de respaldo para PDF escaneados ----------
async function loadPdfjs(){
 const m=await import('pdfjs-dist'),lib=m.getDocument?m:m.default
 if(!lib.GlobalWorkerOptions.workerSrc)lib.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.js?url')).default
 return lib}
async function ocr(pdf,onProgress){
 let T;try{T=await import('tesseract.js')}catch{throw new ImportError('Este PDF parece escaneado (sin texto seleccionable) y el lector OCR no está instalado.')}
 const create=T.createWorker||T.default?.createWorker,n=Math.min(pdf.numPages,MAX_OCR_PAGES),paras=[]
 onProgress?.({pct:12,msg:'PDF escaneado: preparando reconocimiento de texto (la primera vez descarga el idioma, ~10 MB)…'})
 const worker=await create('spa')
 try{for(let p=1;p<=n;p++){
   onProgress?.({pct:15+Math.round(70*(p-1)/n),msg:`Reconociendo texto, página ${p} de ${n}… (puede tardar)`})
   const page=await pdf.getPage(p),vp=page.getViewport({scale:2}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height
   await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise
   const{data}=await worker.recognize(c,{},{blocks:true})
   const ps=(data.blocks||[]).flatMap(b=>b.paragraphs||[]).map(x=>x.text),list=ps.length?ps:(data.paragraphs||[]).map(x=>x.text)
   if(list.length)list.forEach(t=>paras.push(String(t).replace(/-\n(?=\p{Ll})/gu,'-').replace(/\s*\n\s*/g,' ')))
   else String(data.text||'').split(/\n\s*\n/).forEach(t=>paras.push(t.replace(/\s*\n\s*/g,' ')))
   c.width=c.height=0}}
 finally{await worker.terminate()}
 return{blocks:textToBlocks(paras),n,total:pdf.numPages}}

async function readPdf(buf,{known,source,onProgress}){
 onProgress?.({pct:8,msg:'Abriendo el PDF…'})
 const lib=await loadPdfjs();let pdf
 try{pdf=await lib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise}
 catch(e){throw new ImportError(e&&e.name==='PasswordException'?'El PDF está protegido con contraseña. Sacale la contraseña y volvé a subirlo.':'No se pudo leer el PDF: está dañado o tiene un formato no compatible.')}
 const warn=[],notes=[]
 const{pages,total,read}=await extractPdfPages(pdf,{max:MAX_PAGES,onProgress})
 if(total>read)warn.push(`El PDF tiene ${total} páginas: solo se leyeron las primeras ${read}.`)
 const lay=pdfLayoutToBlocks(pages)
 if(lay.chars>=Math.max(40,read*25)){
  onProgress?.({pct:85,msg:'Detectando título, bajada y cuerpo…'})
  warn.push('Importaste un PDF: el formato (negritas, subtítulos, párrafos) se deduce del diseño y puede no ser exacto. Para máxima fidelidad usá la pestaña «Google Docs» o un archivo DOCX.')
  return finish(lay.blocks,{known,source,extraWarn:warn,extraNotes:notes})}
 // Sin texto seleccionable: PDF escaneado -> OCR
 const o=await ocr(pdf,onProgress)
 if(!o.blocks.length)throw new ImportError('No se pudo reconocer texto en el PDF. Probá con un archivo con mejor calidad o pegá el texto a mano.')
 if(o.total>o.n)warn.push(`El PDF tiene ${o.total} páginas: el OCR leyó solo las primeras ${o.n}.`)
 warn.push('Texto reconocido por OCR (PDF escaneado): puede haber errores de lectura y no se detecta el formato. Revisá todo con cuidado antes de publicar.')
 return finish(o.blocks,{known,source,extraWarn:warn,extraNotes:notes})}

// ---------- API pública: archivo local ----------
export async function importFile(file,{known=[],onProgress}={}){
 onProgress?.({pct:3,msg:'Verificando el archivo…'})
 const kind=await sniff(file),buf=await file.arrayBuffer()
 const r=kind==='pdf'?await readPdf(buf,{known,source:file.name,onProgress}):await readDocx(buf,{known,source:file.name,onProgress})
 onProgress?.({pct:100,msg:'Listo'});return r}

// ---------- Google Docs: importación REAL con OAuth (respeta los permisos del documento) ----------
// El navegador pide autorización a Google (solo lectura) y descarga el documento exportado a DOCX con la API de Drive.
// Si la cuenta no tiene acceso al documento, Google responde 403/404 y se muestra un mensaje claro.
const GIS='https://accounts.google.com/gsi/client',SCOPE='https://www.googleapis.com/auth/drive.readonly'
let gisP=null,tok=null
export function loadGoogle(){
 if(typeof window==='undefined')return Promise.reject(new Error('sin ventana'))
 if(window.google?.accounts?.oauth2)return Promise.resolve()
 return gisP||(gisP=new Promise((res,rej)=>{const s=document.createElement('script');s.src=GIS;s.async=true;s.onload=()=>res();s.onerror=()=>{gisP=null;rej(new ImportError('No se pudo cargar el servicio de Google. Revisá tu conexión o si un bloqueador de anuncios lo está frenando.'))};document.head.appendChild(s)}))}
export function parseDocId(u){
 const t=String(u||'').trim();if(!t)return null
 const m=t.match(/\/(?:document|file)\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{15,})/)||t.match(/[?&]id=([A-Za-z0-9_-]{15,})/)
 if(m)return m[1];return /^[A-Za-z0-9_-]{25,}$/.test(t)?t:null}
function getToken(force){
 if(!force&&tok&&tok.exp>Date.now()+60000)return Promise.resolve(tok.token)
 return new Promise((res,rej)=>{
  try{const c=window.google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:SCOPE,
    callback:r=>{if(r.error){rej(new ImportError(r.error==='access_denied'?'No autorizaste el acceso a Google. Sin ese permiso no se puede leer el documento.':'Google no autorizó el acceso ('+r.error+').'));return}
     tok={token:r.access_token,exp:Date.now()+(+r.expires_in||3600)*1000};res(tok.token)},
    error_callback:e=>rej(new ImportError(e?.type==='popup_closed'?'Se cerró la ventana de Google antes de autorizar.':e?.type==='popup_failed_to_open'?'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio e intentá de nuevo.':'No se pudo autorizar con Google.'))})
   c.requestAccessToken({prompt:tok?'':'consent'})}
  catch(e){rej(new ImportError('No se pudo iniciar la autorización de Google.'))}})}
async function gfetch(url,token,asJson){
 let r;try{r=await fetch(url,{headers:{Authorization:'Bearer '+token}})}catch{throw new ImportError('No se pudo conectar con Google. Revisá tu conexión a internet.')}
 if(r.ok)return asJson?r.json():r.arrayBuffer()
 let reason='',msg='';try{const j=await r.json();reason=j.error?.errors?.[0]?.reason||j.error?.status||'';msg=j.error?.message||''}catch{}
 const e=new ImportError('');e.status=r.status;e.reason=reason
 if(r.status===401)e.message='La sesión de Google venció.'
 else if(r.status===404)e.message='No se encontró el documento, o la cuenta de Google con la que autorizaste no tiene acceso. Pedí que lo compartan con esa cuenta (permiso de lector alcanza).'
 else if(/accessNotConfigured|SERVICE_DISABLED/i.test(reason+msg))e.message='La API de Google Drive no está habilitada en el proyecto de Google Cloud. Habilitala (ver IMPORTAR-NOTAS.md).'
 else if(r.status===403&&/rateLimit|quota|userRateLimit/i.test(reason+msg))e.message='Google limitó temporalmente las solicitudes. Esperá un minuto e intentá de nuevo.'
 else if(r.status===403&&/exportSizeLimit|too large/i.test(reason+msg))e.message='El documento es demasiado grande para exportarlo (límite de Google: 10 MB).'
 else if(r.status===403)e.message='Sin permiso para leer este documento con la cuenta de Google autorizada. Pedí que lo compartan con esa cuenta.'
 else e.message=`Google respondió con un error (${r.status}). ${msg}`.trim()
 throw e}
export async function importGoogle(link,{known=[],onProgress}={}){
 const id=parseDocId(link)
 if(!id)throw new ImportError('El enlace no parece ser de un documento de Google Docs. Debe verse como https://docs.google.com/document/d/…')
 if(!googleReady())throw new ImportError('Falta configurar Google (VITE_GOOGLE_CLIENT_ID). Ver IMPORTAR-NOTAS.md.')
 onProgress?.({pct:5,msg:'Conectando con Google…'})
 await loadGoogle()
 let token=await getToken(false)
 const api='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)
 const call=async(path,json)=>{try{return await gfetch(api+path,token,json)}catch(e){if(e.status===401){tok=null;token=await getToken(true);return gfetch(api+path,token,json)}throw e}}
 onProgress?.({pct:20,msg:'Consultando el documento…'})
 const meta=await call('?fields=id,name,mimeType,trashed&supportsAllDrives=true',true)
 if(meta.trashed)throw new ImportError('Ese documento está en la papelera de Drive.')
 onProgress?.({pct:35,msg:'Descargando «'+(meta.name||'documento')+'»…'})
 let r
 if(meta.mimeType==='application/vnd.google-apps.document'){
  const buf=await call('/export?mimeType='+encodeURIComponent(DOCX_MIME),false)
  r=await readDocx(buf,{known,source:'Google Docs: '+(meta.name||id),onProgress})}
 else if(meta.mimeType===DOCX_MIME){r=await readDocx(await call('?alt=media&supportsAllDrives=true',false),{known,source:'Drive: '+meta.name,onProgress})}
 else if(meta.mimeType==='application/pdf'){r=await readPdf(await call('?alt=media&supportsAllDrives=true',false),{known,source:'Drive: '+meta.name,onProgress})}
 else throw new ImportError('Ese enlace no es un documento de Google Docs (es de tipo «'+meta.mimeType+'»). Abrí el documento en Google Docs y copiá su enlace.')
 onProgress?.({pct:100,msg:'Listo'});return r}

// ---------- Redactor: solo si el nombre coincide exactamente con uno cargado ----------
export function matchWriter(autor,writers){
 if(!autor)return null;const k=normKey(autor.name)
 return writers.find(w=>normKey(w.nombre_visible)===k||normKey(`${w.nombre||''} ${w.apellido||''}`)===k)||null}

// ---------- Duplicados: busca la misma nota (mismo título o mismo comienzo de texto) ya cargada ----------
const like=s=>String(s).replace(/[\\%_]/g,m=>'\\'+m)
export async function findDuplicates({tipo,titulo,html,selfId}){
 const tbl=tipo==='cronica'?'chronicles':'news',base=tipo==='cronica'?'/cronicas/':'/noticias/',cols='id,titulo,slug,estado,contenido'
 const rows=new Map(),text=normKey(htmlToText(html)),head=text.slice(0,400)
 const add=r=>{if(!r||r.error||!r.data)return;r.data.forEach(x=>{if(x.id!==selfId)rows.set(x.id,x)})}
 try{
  if(titulo.trim())add(await sb.from(tbl).select(cols).ilike('titulo',like(titulo.trim())).limit(5))
  const first=(htmlToText(html).split('\n\n')[0]||'').split(/[&<>"'“”«»]/)[0].trim().slice(0,60)
  if(first.length>=25)add(await sb.from(tbl).select(cols).ilike('contenido','%'+like(first)+'%').limit(5))
 }catch{return[]} // si la consulta falla, no se bloquea la importación
 const out=[]
 for(const x of rows.values()){
  const rb=normKey(isHtml(x.contenido)?htmlToText(x.contenido):x.contenido||'')
  const same=head.length>=40&&rb.length>=40&&(rb===text||rb.startsWith(head)||text.startsWith(rb.slice(0,400)))
  const sameTitle=!!titulo.trim()&&normKey(x.titulo)===normKey(titulo)
  if(same||sameTitle)out.push({id:x.id,titulo:x.titulo,url:base+x.slug,estado:x.estado,same,sameTitle})}
 return out}
