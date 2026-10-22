-- Everything now lives in Supabase: the MongoDB side (notes, avatars, food cache, activity log)
-- is replaced by a notes table, a Storage bucket for avatars, and direct Open Food Facts lookups.

create type public.note_kind as enum ('mood', 'period', 'goal');

create table public.notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kind public.note_kind not null,
  text text not null check (length(text) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date, kind)
);

create trigger touch_notes before update on public.notes
  for each row execute function public.touch_updated_at();

alter table public.notes enable row level security;
create policy "own rows" on public.notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Avatars: a Storage object path ("<user id>/<file>") instead of a GridFS id.
alter table public.profiles rename column avatar_file_id to avatar_path;

-- Meals picked from a scan or search keep the product barcode instead of a MongoDB id.
alter table public.meals rename column food_doc_id to food_barcode;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- Each user can only touch files under their own folder.
create policy "own avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own avatar insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own avatar delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
