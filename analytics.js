// Google Analytics 4 para una SPA. Solo se activa si existe el Measurement ID.
export function grupo(path){
  if(path==='/'||path==='')return 'radio'
  const s=path.split('/')[1]
  return({noticias:'noticia',cronicas:'cronica',clubes:'club',entrevistas:'entrevista',ascenso:'ascenso',copas:'copas',afa:'afa',programas:'programa',futbol:'futbol',grilla:'grilla','en-vivo':'en-vivo'})[s]||s||'otro'
}
export function initGA(id){
  if(typeof window==='undefined'||window.__ga)return false
  id=String(id||'').trim()
  if(!/^G-[A-Z0-9]{6,}$/.test(id)){console.warn('[GA4] Measurement ID inválido o vacío:',JSON.stringify(id));return false}
  window.__ga=id
  window.dataLayer=window.dataLayer||[]
  window.gtag=function(){window.dataLayer.push(arguments)}
  window.gtag('js',new Date())
  window.gtag('config',id,{send_page_view:false}) // las páginas vistas se envían a mano en cada cambio de ruta
  const s=document.createElement('script')
  s.async=true
  s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id)
  document.head.appendChild(s)
  return true
}
export function trackPage(path,title){
  if(typeof window==='undefined'||!window.__ga||!window.gtag)return false
  window.gtag('event','page_view',{page_path:path,page_location:window.location.origin+path,page_title:title,content_group:grupo(path.split('?')[0])})
  return true
}
