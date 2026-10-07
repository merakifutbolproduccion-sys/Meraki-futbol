// Google Analytics 4 para una SPA de Meraki Fútbol.
// Solo se activa si existe VITE_GA_MEASUREMENT_ID.

export function grupo(path) {
  if (path === '/' || path === '') return 'radio'
  const s = path.split('/')[1]
  return ({
    noticias: 'noticia',
    cronicas: 'cronica',
    clubes: 'club',
    entrevistas: 'entrevista',
    ascenso: 'ascenso',
    copas: 'copas',
    afa: 'afa',
    programas: 'programa',
    futbol: 'futbol',
    grilla: 'grilla',
    'en-vivo': 'en-vivo',
  })[s] || s || 'otro'
}

export function initGA(id) {
  if (!id || typeof window === 'undefined') return false
  if (window.__merakiGAInitialized) return true

  window.__merakiGAInitialized = true
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', id, { send_page_view: false })

  if (!document.querySelector(`script[data-meraki-ga="${id}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    script.dataset.merakiGa = id
    document.head.appendChild(script)
  }

  return true
}

export function trackPage(path, title) {
  if (typeof window === 'undefined' || !window.gtag) return false

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: title || document.title || 'Meraki Fútbol',
    content_group: grupo(path.split('?')[0]),
  })

  return true
}
