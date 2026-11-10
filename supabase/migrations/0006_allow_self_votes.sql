do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'poll_votes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%voter_id%any%picks%'
  loop
    execute format('alter table poll_votes drop constraint %I', c.conname);
  end loop;
end
$$;
