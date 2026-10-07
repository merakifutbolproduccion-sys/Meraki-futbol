-- FM Meraki / Meraki Fútbol — Migración segura para el nuevo editor de noticias.
-- Solo AGREGA columnas nuevas a la tabla "news". No borra ni modifica noticias existentes.
-- Se puede ejecutar más de una vez sin problemas.

alter table public.news add column if not exists seo_titulo        text;
alter table public.news add column if not exists meta_descripcion  text;
alter table public.news add column if not exists imagen_alt        text;
alter table public.news add column if not exists tema_principal    text;
alter table public.news add column if not exists temas             text[] not null default '{}';
alter table public.news add column if not exists updated_at        timestamptz;

-- Fecha de modificación de las noticias que ya existían: se toma su fecha de creación
-- (solo completa la columna nueva, cuando está vacía).
update public.news set updated_at = coalesce(created_at, fecha) where updated_at is null;
alter table public.news alter column updated_at set default now();

-- Avisa a Supabase que hay columnas nuevas.
notify pgrst, 'reload schema';
