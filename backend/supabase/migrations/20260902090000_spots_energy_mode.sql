-- ══ ENERGY_MODE — LE CONTRAT SOCIAL D'UN MEMBER_DROP ══
--
-- Un drop membre n'est pas juste un point sur la carte : c'est une invitation.
-- Silent = « je suis là, tête baissée, seul, laissez-moi. »
-- Social = « je suis là, en présence, venez. »
--
-- Cette information n'existe pas ailleurs. Elle n'est pas déductible du
-- `lieu_type` (un rack de squat 5h vs un cours de Muay Thai partagent
-- l'adresse et pas l'énergie). Elle n'est pas devinable par l'IA — c'est
-- un choix humain, imposé par le bot au moment de la création.
--
-- Colonne nullable en base : les ~125 lignes antérieures ne portent rien,
-- et un backfill aveugle serait faux. Backfill manuel plus tard, à la main,
-- sur `activite` et le vocabulaire du drop. La contrainte au niveau produit
-- (obligatoire à la création) est portée par `bot-reply`, pas par le SGBD.

alter table public.spots
  add column if not exists energy_mode text;

alter table public.spots
  add constraint spots_energy_mode_chk
  check (energy_mode is null or energy_mode in ('silent','social'));

comment on column public.spots.energy_mode is
  'silent = intériorité, un seul; social = en présence, à plusieurs.
   NULL toléré pour les spots antérieurs à la migration ; imposé par
   bot-reply sur toute nouvelle insertion MEMBER_DROP.';
