drop table poll_votes;

create function distinct_ids(a bigint[]) returns boolean
language sql immutable as $$
  select (select count(distinct v) from unnest(a) as v) = cardinality(a)
$$;

create function all_players_exist(a bigint[]) returns boolean
language sql stable as $$
  select (select count(*) from players where id = any(a)) = cardinality(a)
$$;

create function pacific_now() returns timestamp
language sql stable as $$
  select now() at time zone 'America/Los_Angeles'
$$;

create function poll_is_open() returns boolean
language sql stable as $$
  select (extract(dow from pacific_now()) = 6 and extract(hour from pacific_now()) >= 9)
    or extract(dow from pacific_now()) = 0
$$;

create function current_poll_id() returns text
language sql stable as $$
  select case extract(dow from pacific_now())
    when 6 then to_char(pacific_now(), 'YYYY-MM-DD')
    when 0 then to_char(pacific_now() - interval '1 day', 'YYYY-MM-DD')
  end
$$;

create table poll_votes (
  id bigint generated always as identity primary key,
  poll text not null,
  voter_id bigint not null references players (id),
  picks bigint[] not null,
  created_at timestamptz not null default now(),
  unique (poll, voter_id),
  check (cardinality(picks) = 5),
  check (distinct_ids(picks)),
  check (not (voter_id = any (picks))),
  check (all_players_exist(picks))
);

alter table poll_votes enable row level security;

create policy "voters readable" on poll_votes for select to anon using (true);
create policy "votes only during the window" on poll_votes for insert to anon
  with check (poll_is_open() and poll = current_poll_id());

revoke all on poll_votes from anon;
grant select (poll, voter_id) on poll_votes to anon;
grant insert (poll, voter_id, picks) on poll_votes to anon;

create table issues (
  id bigint generated always as identity primary key,
  week_start date not null unique,
  published_at timestamptz not null default now(),
  payload jsonb not null
);

alter table issues enable row level security;
create policy "issues readable" on issues for select to anon using (true);
revoke all on issues from anon;
grant select on issues to anon;

create table bot_posts (
  key text primary key,
  posted_at timestamptz not null default now()
);

alter table bot_posts enable row level security;
revoke all on bot_posts from anon;
