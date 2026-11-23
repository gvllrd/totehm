// 23/11 (Wah) — le Time Frequency s'écrit dans sa langue (FR · EN · PT · DE · ES) et choisit SEUL l'option la plus
// proche des 33 (`closestFrequency`). LANCER : node tests/node/time_frequency.mjs
import {closestFrequency as c, FREQS} from '../../com/habit-rhythm.mjs';
const T={
 'tous les matins':'every_morning','chaque soir':'every_evening','3 fois par semaine':'every_other_day','le lundi':'every_monday',
 'deux fois par mois':'twice_month','de temps en temps':'sometimes','tous les jours après le boulot':'every_evening','le week-end':'every_weekend',
 'une fois par an':'yearly','toutes les heures':'hourly','du lundi au vendredi':'every_weekday','tous les 6 mois':'semiannual','chaque trimestre':'quarterly',
 'à mon anniversaire':'every_birthday','le 1er du mois':'every_1st_month','toutes les deux semaines':'biweekly','trois fois par jour':'several_daily',
 'après chaque repas':'several_daily','avant de dormir':'every_night','au réveil':'every_morning','quand je me sens mal':'sometimes',
 'every morning':'every_morning','twice a week':'twice_week','on sundays':'every_sunday','every day at 7am':'daily','now and then':'sometimes',
 'every other day':'every_other_day','once a month':'monthly','2x a day':'several_daily','3x/week':'every_other_day',
 'todas as manhãs':'every_morning','duas vezes por semana':'twice_week','aos domingos':'every_sunday','de vez em quando':'sometimes',
 'todos os dias':'daily','a cada 15 dias':'twice_month','uma vez por mês':'monthly',
 'jeden Morgen':'every_morning','zweimal pro Woche':'twice_week','am Wochenende':'every_weekend','ab und zu':'sometimes','jeden Tag':'daily',
 'montags':'every_monday','alle zwei Wochen':'biweekly','einmal im Monat':'monthly',
 'todas las mañanas':'every_morning','dos veces por semana':'twice_week','los domingos':'every_sunday','a veces':'sometimes','cada día':'daily',
 'cada noche':'every_night','una vez al mes':'monthly','cada dos semanas':'biweekly',
};
let ko=0;
for(const [mot,id] of Object.entries(T)){ const r=c(mot); if(r!==id){ ko++; console.log('FAIL',mot,'→',r,'(attendu '+id+')'); } }
for(const f of FREQS) if(c(f.label)!==f.id){ ko++; console.log('FAIL label',f.label,'→',c(f.label)); }
if(c('')!==null){ ko++; console.log('FAIL vide'); }
if(!FREQS.some(f=>f.id===c('n importe quoi sans rythme'))){ ko++; console.log('FAIL toujours une option'); }
console.log(JSON.stringify({suite:'Time Frequency (5 langues)',checks:Object.keys(T).length+FREQS.length+2,ko}));
process.exit(ko?1:0);
