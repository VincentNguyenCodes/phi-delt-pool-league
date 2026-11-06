create table visits (
  id bigint generated always as identity primary key,
  visitor text not null check (char_length(visitor) between 8 and 64),
  path text not null check (char_length(path) <= 40),
  created_at timestamptz not null default now()
);

alter table visits enable row level security;

create policy "visits insertable" on visits for insert to anon with check (true);

revoke all on visits from anon;
grant insert (visitor, path) on visits to anon;
