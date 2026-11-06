create table players (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create function all_distinct(a bigint[], b bigint[]) returns boolean
language sql immutable as $$
  select (select count(distinct v) from unnest(a || b) as v) = cardinality(a || b)
$$;

create table reports (
  id bigint generated always as identity primary key,
  format text not null check (format in ('singles', 'doubles')),
  side_a bigint[] not null,
  side_b bigint[] not null,
  wins_a int not null check (wins_a >= 0 and wins_a <= 99),
  wins_b int not null check (wins_b >= 0 and wins_b <= 99),
  created_at timestamptz not null default now(),
  announced_at timestamptz,
  check (wins_a + wins_b >= 1),
  check (
    (format = 'singles' and cardinality(side_a) = 1 and cardinality(side_b) = 1)
    or (format = 'doubles' and cardinality(side_a) = 2 and cardinality(side_b) = 2)
  ),
  check (all_distinct(side_a, side_b))
);

create table poll_votes (
  id bigint generated always as identity primary key,
  week text not null,
  voter_token text not null check (char_length(voter_token) between 8 and 64),
  picks bigint[] not null check (cardinality(picks) = 5),
  created_at timestamptz not null default now(),
  unique (week, voter_token)
);

alter table players enable row level security;
alter table reports enable row level security;
alter table poll_votes enable row level security;

create policy "players readable" on players for select to anon using (true);
create policy "players insertable" on players for insert to anon with check (true);

create policy "reports readable" on reports for select to anon using (true);
create policy "reports insertable" on reports for insert to anon
  with check (announced_at is null);

create policy "votes readable" on poll_votes for select to anon using (true);
create policy "votes insertable" on poll_votes for insert to anon with check (true);

revoke update, delete on players, reports, poll_votes from anon;
