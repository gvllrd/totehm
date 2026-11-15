-- [SPACE] Play the Lisbon Street is unlocked by the existing THP/Stoner grant.
-- The Edge Function signs one canonical clip after checking that grant.
-- Remove both public storage paths; no ownership or payment data changes.
do $$
begin
 if not exists(select 1 from storage.buckets where id='play-signals') then
  raise exception 'play_signals_bucket_missing';
 end if;
end $$;

drop policy if exists "Public read play-signals" on storage.objects;
update storage.buckets set public=false where id='play-signals';
