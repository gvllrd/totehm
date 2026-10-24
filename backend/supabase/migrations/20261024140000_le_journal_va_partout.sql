-- COM · 24/10/2026 — le journal va PARTOUT : le where d'une Habit, le son d'une intention, les liens entre boxes.
-- (Une recommandation Gemini relayée par Wah, retenue parce qu'elle sert « enregistrer TOUT ».) Mêmes règles que
-- `le_journal_et_le_tableau_de_bord` : écrit par la base, jamais bloquant, rattrapé une fois avec les mêmes `ref`.

create function public._journal_where() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.place is distinct from old.place then
    perform public._journal(new.user_id, 'habit', 'where_set', new.habit_text, null,
                            md5(new.user_id::text || '|' || new.habit_text || '|' || new.place), jsonb_build_object('place', left(new.place, 120)),
                            new.updated_at);
  end if;
  return null;
exception when others then return null;
end $$;

create function public._journal_sound() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.active, true) then
    perform public._journal(new.user_id, 'habit', 'sound_set', new.title, new.intention,
                            md5(new.user_id::text || '|' || coalesce(new.intention, '') || '|' || coalesce(new.title, '') || '|' || coalesce(new.artist, '')),
                            jsonb_build_object('artist', left(new.artist, 80), 'platform', new.platform));
  end if;
  return null;
exception when others then return null;
end $$;

create function public._journal_link() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'objective_habits' then
    perform public._journal(new.user_id, 'objective', 'link_added', new.habit_text, null,
                            new.objective_id::text || ':' || lower(btrim(new.habit_text)), '{}'::jsonb, new.created_at);
  else
    perform public._journal(new.user_id, 'repulsion', 'link_added', new.habit_text, null,
                            new.repulsion_id::text || ':' || lower(btrim(new.habit_text)), '{}'::jsonb, new.created_at);
  end if;
  return null;
exception when others then return null;
end $$;

create trigger totehm_journal_where after insert or update of place on public.habit_spots
  for each row execute function public._journal_where();
create trigger totehm_journal_sound after insert or update of active on public.intention_music
  for each row execute function public._journal_sound();
create trigger totehm_journal_link_objective after insert on public.objective_habits
  for each row execute function public._journal_link();
create trigger totehm_journal_link_repulsion after insert on public.repulsion_habits
  for each row execute function public._journal_link();

-- Le rattrapage (une fois), mêmes `ref` — sauf les sons : sans date d'origine, on n'invente pas leur heure.
insert into public.totehm_journal (user_id, at, box, kind, label, intention, ref, detail)
select s.user_id, s.updated_at, 'habit', 'where_set', left(s.habit_text, 140), null,
       md5(s.user_id::text || '|' || s.habit_text || '|' || s.place), jsonb_build_object('place', left(s.place, 120))
  from public.habit_spots s
union all
select l.user_id, l.created_at, 'objective', 'link_added', left(l.habit_text, 140), null,
       l.objective_id::text || ':' || lower(btrim(l.habit_text)), '{}'::jsonb from public.objective_habits l
union all
select l.user_id, l.created_at, 'repulsion', 'link_added', left(l.habit_text, 140), null,
       l.repulsion_id::text || ':' || lower(btrim(l.habit_text)), '{}'::jsonb from public.repulsion_habits l
on conflict do nothing;

revoke execute on function public._journal_where(), public._journal_sound(), public._journal_link() from public, anon, authenticated;
