# Entrega SEO — Meraki Fútbol
El repositorio NO tiene carpeta src/: los archivos están en la raíz. Las rutas de abajo son las reales.

## A. GitHub (subir y Vercel despliega solo)
| Ruta | Nuevo | Qué hace |
|---|---|---|
| api/page.js | SÍ | Versión rastreable de noticias/crónicas/entrevistas (SEO completo + texto + JSON-LD) |
| vercel.json | NO (reemplazar) | Todas las notas pasan por api/page; /admin noindex |
| api/robots.js | NO (reemplazar) | Agrega Disallow /buscar |
| Related.jsx | SÍ | Bloque "Te puede interesar" |
| Detail.jsx | NO (reemplazar) | Muestra el bloque y evita etiquetas duplicadas |
| seoTools.js | SÍ | Lógica: títulos, relacionadas, comparador |
| SeoTools.jsx | SÍ | Panel: asistente de títulos, enlaces internos, comparar con otros medios |
| NewsEditor.jsx | NO (reemplazar) | Inserta SeoTools en el editor de noticias |
| Admin.jsx | NO (reemplazar) | Inserta SeoTools en crónicas (goles pasan a campos controlados) |
| migracion-indices-seo.sql, GOOGLE-SEARCH-CONSOLE.md | SÍ | Documentación / SQL |

## B. Supabase
No es obligatorio. Verificar que ya corriste `migracion-seo-noticias.sql`. Opcional: `migracion-indices-seo.sql` (solo crea índices, no destructivo). SQL Editor → New query → Run.

## C. Vercel
Sin cambios manuales. Variables existentes: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Opcional: SITE_URL cuando haya dominio.

## D. Google
Ahora: nada obligatorio. Con dominio: ver GOOGLE-SEARCH-CONSOLE.md.

## E. Pruebas
1. Abrí `https://TU-SITIO/noticias/UN-SLUG` → Ver código fuente: debe aparecer el texto de la nota, canonical y ld+json.
2. `curl -A WhatsApp https://TU-SITIO/noticias/UN-SLUG` o pegá el link en WhatsApp.
3. Al final de una noticia: "Te puede interesar".
4. Admin → Noticias/Crónica: los tres paneles nuevos.
5. /sitemap.xml y /robots.txt.
