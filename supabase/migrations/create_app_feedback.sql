-- Internal feedback between app collaborators: one text field, solvable by anyone signed in.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_email text not null,
  body text not null,
  solved boolean not null default false,
  solved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_at_idx
  on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

create policy "app_feedback_select_authenticated"
  on public.app_feedback for select
  to authenticated
  using (true);

create policy "app_feedback_insert_own"
  on public.app_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "app_feedback_update_authenticated"
  on public.app_feedback for update
  to authenticated
  using (true)
  with check (true);
