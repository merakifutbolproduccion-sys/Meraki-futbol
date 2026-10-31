# Asistente de IA (Gemini 3.8 Flash) — Meraki Fútbol

## Qué agrega
Una pestaña **"Con IA"** dentro del panel SEO (Noticias y Crónicas): 5 títulos + bajada, y borrador de crónica a partir de tus apuntes. Todo es sugerencia: nada se guarda ni se publica solo.

## 1. Clave gratuita
1. Entrá a https://aistudio.google.com con tu cuenta de Google.
2. "Get API key" → crear clave.
3. Mirá en AI Studio → Rate limits cuántos pedidos por minuto y por día te da `gemini-3.8-flash` (Google no los publica en la documentación).

## 2. Vercel (Settings → Environment Variables)
| Variable | Valor |
|---|---|
| GEMINI_API_KEY | la clave (SIN prefijo VITE_) |
| GEMINI_MODEL | gemini-3.8-flash (opcional) |
| GEMINI_FALLBACK_MODEL | gemini-3.6-flash (opcional) |

Después: Deployments → Redeploy.

## 3. GitHub (archivos en la raíz del repo, como el resto)
| Ruta | Nuevo | Qué hace |
|---|---|---|
| api/ia.js | SÍ | Función del servidor: verifica admin y llama a Gemini |
| IaPanel.jsx | SÍ | Pestaña "Con IA" |
| SeoTools.jsx | NO (reemplazar) | Agrega la pestaña |
| vercel.json | NO (reemplazar) | Permite hasta 30 s a la función |
| .env.example | NO (reemplazar) | Documenta las variables |

## Seguridad y calidad
- Solo responde si `is_admin()` de Supabase da true (igual que Analytics).
- La IA solo recibe lo que cargaste en el editor. El prompt le prohíbe inventar datos.
- Si la IA escribe un número que no está en tus datos, la pestaña muestra una advertencia.
- El borrador de crónica exige apuntes (mínimo ~150 caracteres): sin material propio no se genera.
- Si 3.8 Flash está saturado (503) o llegó al límite (429), prueba solo con el modelo de respaldo.

## Ojo con la capa gratuita
Google puede usar lo que enviás para mejorar sus productos. No pegues notas exclusivas o sin publicar. Si querés evitarlo, pasá a la capa paga de Gemini (los precios de 3.8 Flash figuran como promocionales hasta el 31/12/2026).

## Probar
Admin → Noticias → cargar clubes y un título → pestaña "Con IA" → "Sugerir títulos y bajada".
