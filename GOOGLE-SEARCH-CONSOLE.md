# Google Search Console — Meraki Fútbol

## Qué ya está listo (automático, en el código)
- Sitemap en `/sitemap.xml` (noticias, crónicas, entrevistas, ascenso, clubes, programas) y `robots.txt` que lo declara.
- Cada nota devuelve HTML completo con título, descripción, canonical, Open Graph, Twitter, NewsArticle y texto.
- `/admin` con `noindex`.
- El dominio se toma de la variable `SITE_URL` de Vercel (o del host actual si no existe).

## Qué NO hay todavía
Estadísticas de búsquedas, clics o posiciones: no están disponibles hasta conectar Search Console. El panel no muestra números inventados.

## Cuando tengamos el dominio propio
1. Vercel → Project → Settings → Domains → agregar el dominio y copiar los DNS que indica Vercel en el proveedor del dominio.
2. Vercel → Settings → Environment Variables → `SITE_URL` = `https://tudominio.com` (sin barra final) → Redeploy.
3. https://search.google.com/search-console → Agregar propiedad → **Dominio** → copiar el registro TXT y pegarlo en el DNS del dominio. Verificar. (No requiere tocar el código.)
4. Search Console → Sitemaps → escribir `sitemap.xml` → Enviar.
5. Inspección de URL: pegar una nota → "Probar URL publicada" → ver el HTML renderizado → "Solicitar indexación".
6. Si el dominio viejo (vercel.app) estuvo publicado, hacer redirección 301 desde Vercel al dominio nuevo.

## Métricas en el panel (futuro, opcional)
Crear una función `api/search-console.js` que use una cuenta de servicio de Google con la API de Search Console. La clave JSON va SOLO en variables de entorno de Vercel (nunca en GitHub ni en el frontend) y la función exige sesión de admin de Supabase.
