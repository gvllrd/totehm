-- BOUTIQUE · Luxury : le nom 0.{Nom} et le style (06/10/2026 ter).
-- Écrit puis annule tout (exception finale). Attendu : « FAIL={} ».
DO $t$
declare u uuid; st uuid; q uuid; r jsonb; fails text[]:='{}'; dup boolean:=false;
begin
  if not has_function_privilege('anon','public.name_available(text)','EXECUTE')
     or not has_function_privilege('anon','public.reveal_cloth(text)','EXECUTE')
     or has_function_privilege('anon','public.luxury_quotes_admin()','EXECUTE') then fails:=array_append(fails,'grants'); end if;
  select id into u from public.profiles order by created_at limit 1;
  select id into st from public.artistic_styles where active order by position limit 1;
  if not public.name_available('0.SelfTestLux') then fails:=array_append(fails,'free_before'); end if;
  insert into public.luxury_quotes(user_id,email,piece,brand,box_kind,box_ref,box_snapshot,palette,name,style_id)
    values(u,'selftest@example.test','bag','Hermès','habit','Deep practice','{"view":"habits","text":"Deep practice","is":["focus"]}','{}','0.SelfTestLux',st) returning id into q;
  -- un devis vivant réserve son nom, pour Streetwear aussi
  if public.name_available('0.selftestlux ') then fails:=array_append(fails,'taken_live'); end if;
  begin
    insert into public.luxury_quotes(user_id,email,piece,brand,box_kind,box_ref,name) values(u,'selftest@example.test','bag','Gucci','habit','x','0.SELFTESTLUX');
  exception when unique_violation then dup:=true; end;
  if not dup then fails:=array_append(fails,'unique_live'); end if;
  -- pas encore payée : Decode ne la trouve pas
  if (public.reveal_cloth('0.SelfTestLux')->>'found')::boolean then fails:=array_append(fails,'found_unpaid'); end if;
  -- payée : Decode la trouve, dit sa ligne et son style ; un invité ne lit pas la Box
  update public.luxury_quotes set status='paid', paid_at=now() where id=q;
  perform set_config('request.jwt.claims','{}',true);
  r:=public.reveal_cloth('0.selftestlux');
  if not coalesce((r->>'found')::boolean,false) or r->>'line'<>'luxury' or r->>'level'<>'locked' or r->>'text' is not null
     or r->>'style' is distinct from (select name from public.artistic_styles where id=st) then fails:=array_append(fails,'reveal '||coalesce(r::text,'null')); end if;
  -- son propriétaire lit tout
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  r:=public.reveal_cloth('0.SelfTestLux');
  if r->>'level'<>'full' or r->>'text'<>'Deep practice' then fails:=array_append(fails,'owner'); end if;
  if not exists(select 1 from jsonb_array_elements(public.luxury_access()->'quotes') x where x->>'name'='0.SelfTestLux' and x->>'style' is not null) then fails:=array_append(fails,'luxury_access'); end if;
  -- retiré : le nom redevient libre
  update public.luxury_quotes set status='cancelled' where id=q;
  if not public.name_available('0.SelfTestLux') then fails:=array_append(fails,'free_after_cancel'); end if;
  raise exception 'LUXURY_NAME · FAIL=%', fails;
end $t$;
