import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initGA, trackPage } from './analytics_fixed'

const ID = import.meta.env.VITE_GA_MEASUREMENT_ID

export default function Analytics() {
  const loc = useLocation()

  useEffect(() => {
    if (ID) initGA(ID)
  }, [])

  useEffect(() => {
    if (!ID || loc.pathname.startsWith('/admin')) return

    const path = loc.pathname + loc.search
    let sent = false
    let observer

    const send = () => {
      if (sent) return
      sent = true
      if (observer) observer.disconnect()
      trackPage(path, document.title)
    }

    // Give React time to update the document title, but always send within 1s.
    const timer = window.setTimeout(send, 1000)
    const title = document.querySelector('title')

    if (title && window.MutationObserver) {
      observer = new MutationObserver(() => {
        window.clearTimeout(timer)
        window.setTimeout(send, 50)
      })
      observer.observe(title, { childList: true, characterData: true, subtree: true })
    }

    return () => {
      window.clearTimeout(timer)
      if (observer) observer.disconnect()
    }
  }, [loc.pathname, loc.search])

  return null
}
