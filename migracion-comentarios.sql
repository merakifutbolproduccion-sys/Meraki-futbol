-- Meraki Fútbol / FM Meraki — Comentarios del público (con nombre y apellido).
-- Crea UNA tabla nueva ("comments"). No toca ni borra nada de lo existente.
-- Se puede ejecutar más de una vez.
-- Usa la función public.is_admin() que ya usa tu panel.

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(btrim(nombre))   between 2 and 60),
  apellido   text not null check (char_length(btrim(apellido)) between 2 and 60),
  mensaje    text not null check (char_length(btrim(mensaje))  between 5 and 800),
  aprobado   boolean not null default false,   -- solo los aprobados se ven en la web
  leido      boolean not null default false,   -- para que sepas cuáles ya revisaste
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

grant select, insert on public.comments to anon;
grant select, insert, update, delete on public.comments to authenticated;

-- Cualquier visitante puede ENVIAR un comentario, siempre como "no aprobado".
drop policy if exists comments_insert_publico on public.comments;
create policy comments_insert_publico on public.comments
  for insert to anon, authenticated
  with check (aprobado = false and leido = false);

-- El público solo puede LEER los comentarios aprobados.
drop policy if exists comments_select_publico on public.comments;
create policy comments_select_publico on public.comments
  for select to anon, authenticated
  using (aprobado = true);

-- Solo administradores ven todo, aprueban, marcan como leído y eliminan.
drop policy if exists comments_admin_todo on public.comments;
create policy comments_admin_todo on public.comments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists comments_created_idx on public.comments (created_at desc);

notify pgrst, 'reload schema';
-- Comprobación: select count(*) from public.comments;   (debe dar 0, sin error)
