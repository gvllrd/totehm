// Deterministic multilingual parsing: no model, DOM, network or production data.
import assert from 'node:assert/strict';
import {FREQS,RHYTHM_LANGUAGES,parseHabitRhythm as parse,rhythmSummary} from '../../com/habit-rhythm.mjs';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const match=(text,frequency)=>{const r=parse(text);check(r.status==='matched'&&r.frequency===frequency,text+' → '+JSON.stringify(r));return r;};
const daily=['Read every day','Lire chaque jour','Ler todos os dias','Leer cada día','Leggere ogni giorno','Jeden Tag lesen','Elke dag lezen','Читать каждый день','أقرأ كل يوم','每天读书','毎日読む','매일 읽기'];
daily.forEach(t=>match(t,'daily'));check(RHYTHM_LANGUAGES.length===35,'Thirty-five explicit language families');
const evening=['Read for 20 minutes every evening','Lire vingt minutes chaque soir','Ler 20 minutos todas as noites','Leer 20 minutos todas las noches','Leggere 20 minuti ogni sera','Jeden Abend 20 Minuten lesen','Elke avond 20 minuten lezen','Читать 20 минут каждый вечер','أقرأ ٢٠ دقيقة كل مساء','每天晚上读书20分钟','毎晩20分間読む','매일 저녁 20분 읽기'];
evening.forEach((t,i)=>{const r=match(t,[2,3,9,10].includes(i)?'every_night':'every_evening');check(r.hasDuration,'Duration is evidence, never an every-minute cadence');});
const quotas=['Run three times a week','Courir trois fois par semaine','Correr três vezes por semana','Correr tres veces por semana','Correre tre volte a settimana','Drei mal pro Woche laufen','Drie keer per week lopen','Бегать три раза в неделю','اجري ثلاث مرات في الاسبوع','每周三次跑步','週に三回走る','일주일에 세 번 달리기'];
quotas.forEach(t=>{const r=match(t,'weekly');check(r.target?.count===3&&r.target.unit==='week','Exact target remains separate from the weekly check-in');check(rhythmSummary(r).includes('target 3 / week'),'Target is disclosed rather than converted into three notifications');});
for(const [t,f] of [['Tous les lundis courir','every_monday'],['Correr toda segunda-feira','every_monday'],['Nadar cada miércoles','every_wednesday'],['Ogni sabato nuotare','every_saturday'],['Jeden Freitag trainieren','every_friday'],['Elk weekend fietsen','every_weekend'],['Читать каждую среду','every_wednesday'],['امشي كل يوم الجمعة','every_friday'],['每周三跑步','every_wednesday'],['毎週水曜日に走る','every_wednesday'],['매주 수요일 달리기','every_wednesday'],['Run every other day','every_other_day'],['Walk every 2 days','every_other_day'],['Plan every two weeks','biweekly'],['Plan every 3 months','quarterly'],['Review every six months','semiannual'],['Read once a day','daily'],['Read 2 times a day','daily'],['每周３次跑步','weekly'],['كل يوم اقرأ','daily']])match(t,f);
for(const t of ['Read 20 minutes','Lire vingt minutes','Run a marathon','Learn about the morning sun','Read the Sunday Times','Learn German','睡眠の本を読む','اصنع قهوة','Run 3 km','Meditar 20 minutos'])check(parse(t).frequency===null,'No invented recurrence: '+t);
for(const t of ['Read every morning or every evening','Run every day except Friday','Ne pas courir tous les jours','Run every Monday and Wednesday','If it rains, read every day','Courir chaque jour si possible','Read every 3 days','Le 15 de chaque mois faire le bilan','Every 1st of the month reflect','Every birthday reflect','Read weekly every morning','Run every day every Monday','Read every 15 minutes','Lire toutes les 20 minutes','Correr cada 3 dias','Read at 7:30','Read at 7pm','Run 3 times a week and 2 times a month','Run every morning every night','Read every morning and evening','Lire chaque matin et soir','毎日走らない','每天不要跑步','Не читать каждый день','Do not read every day','Don’t run every morning','Read every day until Friday','Lire chaque jour pendant deux semaines','Read every day for two weeks','毎日金曜日まで読む','每天读书直到周五'])check(parse(t).status==='review'&&parse(t).frequency===null,'Ambiguity/unsupported precision needs a manual choice: '+t);
for(const t of ['Read every day at 07:30','Lire chaque jour à 7h30','每天7点读书']){const r=match(t,'daily');check(r.hasClock,'Exact clock time is disclosed, not installed as a notification');}
for(const text of ['Run 3x/week','Run 3×/week','Run 3 / week'])check(match(text,'weekly').target.count===3,'Compact target syntax preserves its count');
// Major European languages, native scripts and ordinary US/UK cadence expressions.
const europe=[
 ['ca','Llegir cada dia','cada setmana','cada mes','cada any','no llegir cada dia'],
 ['pl','Czytać codziennie','co tydzień','co miesiąc','co roku','Nie czytać codziennie'],
 ['cs','Číst každý den','každý týden','každý měsíc','každý rok','Ne každý den'],
 ['sk','Čítať každý deň','každý týždeň','každý mesiac','každý rok','Nie každý deň'],
 ['ro','Citesc în fiecare zi','în fiecare săptămână','în fiecare lună','în fiecare an','Nu citesc în fiecare zi'],
 ['hu','Olvasás minden nap','minden héten','minden hónapban','minden évben','Nem olvasok minden nap'],
 ['sv','Läsa varje dag','varje vecka','varje månad','varje år','Inte läsa varje dag'],
 ['da','Læse hver dag','hver uge','hver måned','hvert år','Ikke læse hver dag'],
 ['nb','Lese hver dag','hver uke','hver måned','hvert år','Ikke lese hver dag'],
 ['fi','Lue joka päivä','joka viikko','joka kuukausi','joka vuosi','En lue joka päivä'],
 ['el','Διαβάζω κάθε μέρα','κάθε εβδομάδα','κάθε μήνα','κάθε χρόνο','Δεν διαβάζω κάθε μέρα'],
 ['uk','Читати щодня','щотижня','щомісяця','щороку','Не читати щодня'],
 ['tr','Her gün okumak','her hafta','her ay','her yıl','Her gün okumak değil'],
 ['bg','Чета всеки ден','всяка седмица','всеки месец','всяка година','Не чета всеки ден'],
 ['hr','Čitati svaki dan','svaki tjedan','svaki mjesec','svake godine','Ne čitati svaki dan'],
 ['sr','Čitati svakog dana','svake sedmice','svakog meseca','svake godine','Ne čitati svakog dana'],
 ['sl','Brati vsak dan','vsak teden','vsak mesec','vsako leto','Ne brati vsak dan'],
 ['et','Loe iga päev','iga nädal','iga kuu','iga aasta','Mitte iga päev'],
 ['lv','Lasīt katru dienu','katru nedēļu','katru mēnesi','katru gadu','Ne katru dienu'],
 ['lt','Skaityti kiekvieną dieną','kiekvieną savaitę','kiekvieną mėnesį','kiekvienais metais','Ne kiekvieną dieną'],
 ['ga','Léigh gach lá','gach seachtain','gach mí','gach bliain','Ná léigh gach lá'],
 ['mt','Naqra kuljum','kull ġimgħa','kull xahar','kull sena','Mhux kuljum'],
 ['is','Lesa á hverjum degi','í hverri viku','í hverjum mánuði','á hverju ári','Ekki á hverjum degi']
];
for(const [lang,...samples] of europe){
 check(RHYTHM_LANGUAGES.includes(lang),'The supported-family list names '+lang);
 samples.slice(0,4).forEach((s,i)=>match(s,['daily','weekly','monthly','yearly'][i]));
 check(parse(samples[4]).status==='review'&&parse(samples[4]).frequency===null,'A native negation is never silently stripped: '+samples[4]);
}
for(const [text,frequency] of [['Read nightly','every_night'],['Review fortnightly','biweekly'],['Review every fortnight','biweekly'],['Each Monday run','every_monday'],['Mondays I run','every_monday'],['Montags laufen','every_monday'],['Run Monday to Friday','every_weekday'],['Run Monday through Friday','every_weekday'],['Run Mon-Fri','every_weekday'],['Courir du lundi au vendredi','every_weekday'],['Read in the mornings','every_morning'],['Ler de manhã','every_morning'],['Ler em casa todos os dias','daily'],['Lire en ville tous les jours','daily'],['Courir en semaine','every_weekday'],['Cada dilluns córrer','every_monday'],['W każdą środę biegam','every_wednesday'],['Každý pátek běhat','every_friday'],['Každú sobotu plávať','every_saturday'],['În fiecare duminică alerg','every_sunday'],['Minden hétfőn futok','every_monday'],['Varje tisdag springa','every_tuesday'],['Hver torsdag løpe','every_thursday'],['Joka keskiviikko juosta','every_wednesday'],['Κάθε Παρασκευή τρέχω','every_friday'],['Щосереди бігати','every_wednesday'],['Her cumartesi koş','every_saturday']])match(text,frequency);
for(const [s,count,unit] of [['Read twice daily',2,'day'],['Run 3x weekly',3,'week'],['Run twice every week',2,'week'],['Read two times every month',2,'month'],['Train three times weekly',3,'week'],['Trzy razy w tygodniu biegam',3,'week'],['Běhat třikrát týdně',3,'week'],['Citesc trei ori pe săptămână',3,'week'],['Träna tre gånger i veckan',3,'week'],['Træne to gange om ugen',2,'week'],['Løpe tre ganger i uken',3,'week'],['Juosta kolme kertaa viikossa',3,'week'],['Leer once veces por semana',11,'week'],['Courir huit fois par semaine',8,'week'],['Lire neuf fois par semaine',9,'week'],['Lire dix fois par mois',10,'month'],['Lire onze fois par mois',11,'month'],['Lire douze fois par mois',12,'month'],['Háromszor hetente futok',3,'week'],['Kétszer hetente futok',2,'week']]){
 const r=match(s,{day:'daily',week:'weekly',month:'monthly'}[unit]);check(r.target?.count===count&&r.target?.unit===unit,'The complete quota is preserved: '+s);
}
const hazards=['Read twenty-one times weekly','Read one hundred and two times per day','Lire dix-sept fois par semaine','每周十三次跑步','毎週十一回走る','Entrenar once a la semana','Lire vingt fois chaque semaine','Read several times each week','Run 2-3 times a week','Run 2–3 times per week','Read 1.5 times a week','Read 1,5 times a week','Read .5 times per day','Lire deux à trois fois par semaine','Courir deux ou trois fois par semaine','Read twice every other week','Run 10 times every 2 weeks','Read daily for a month','Read daily for a week','Lire chaque jour pendant un mois','Read daily starting tomorrow','Read daily from June 1','Run every Monday in June','Run every 2 weeks on Monday','Run every weekday morning','Run every Monday morning','Read every month on the 10th','Read monthly on the first Monday','Read almost daily','Run at least three times a week','Study daily life','Read weekly news','Read biweekly','Read bi-weekly','Read bimonthly','Read bi-monthly','Read semi-monthly','Lire bimensuellement chaque jour','Inte varje morgon','Hvis det regner, læs hver dag','Jos sataa, lue joka päivä','Jeśli pada, czytać codziennie','Dacă plouă, citesc zilnic','Не щодня','Her gün değil','Nunca ler todos os dias'];
for(const s of hazards)check(parse(s).status==='review'&&parse(s).frequency===null,'Unrepresentable constraints are kept for explicit review: '+s);
for(const s of ['Meet on Monday','Meet next Monday','Learn about the Sunday Times','Plan a three day trip','Learn a new language'])check(parse(s).frequency===null,'A one-off or ordinary noun is not a recurring schedule: '+s);
for(const s of ['Read daily at 7 a.m.','Read daily at 7 p.m.','Read every day at noon','Lire chaque jour à 7h30']){const r=match(s,'daily');check(r.hasClock,'US/European clock notation remains visible, without scheduling it');}
for(const s of ['Read 2h every day','Read for half an hour every day']){const r=match(s,'daily');check(r.hasDuration&&!r.hasClock,'Session length remains distinct from clock time: '+s);}
for(const f of FREQS)check(parse(f.label,{mode:'rhythm'}).frequency===f.id,'Every existing manual rhythm remains available: '+f.id);
check(parse('unrecognized gibberish',{mode:'rhythm'}).frequency===null,'No legacy sometimes fallback');
check(parse('X'.repeat(16001)).status==='review','Input bound is enforced');
for(const text of daily)check(JSON.stringify(parse(text))===JSON.stringify(parse(text)),'Deterministic results');
console.log(JSON.stringify({suite:'Multilingual Habit rhythm',languages:RHYTHM_LANGUAGES.length,checks,passed:checks}));
