// Local, deterministic recognition. It proposes existing check-in rhythms; never rewrites an Habit.
export const FREQS=[
  {id:'every_minute',      label:'every minute',            w:1},
  {id:'hourly',            label:'every hour',              w:60},
  {id:'several_daily',     label:'several times a day',     w:480},
  {id:'every_morning',     label:'every morning',           w:1436},
  {id:'every_afternoon',   label:'every afternoon',         w:1438},
  {id:'daily',             label:'daily',                   w:1440},
  {id:'every_evening',     label:'every evening',           w:1441},
  {id:'every_weekday',     label:'every weekday',           w:1442},
  {id:'every_night',       label:'every night',             w:1443},
  {id:'every_other_day',   label:'every other day',         w:2880},
  {id:'twice_week',        label:'twice a week',            w:5040},
  {id:'every_weekend',     label:'every weekend',           w:10078},
  {id:'weekly',            label:'weekly',                  w:10080},
  {id:'every_monday',      label:'every monday',            w:10081},
  {id:'every_tuesday',     label:'every tuesday',           w:10082},
  {id:'every_wednesday',   label:'every wednesday',         w:10083},
  {id:'every_thursday',    label:'every thursday',          w:10084},
  {id:'every_friday',      label:'every friday',            w:10085},
  {id:'every_saturday',    label:'every saturday',          w:10086},
  {id:'every_sunday',      label:'every sunday',            w:10087},
  {id:'biweekly',          label:'every two weeks',         w:20160},
  {id:'twice_month',       label:'twice a month',           w:21600},
  {id:'monthly',           label:'monthly',                 w:43200},
  {id:'every_1st_month',   label:'every 1st of the month',  w:43201},
  {id:'every_15th_month',  label:'every 15th of the month', w:43202},
  {id:'seasonal',          label:'every season change',     w:131400},
  {id:'quarterly',         label:'every quarter',           w:129600},
  {id:'semiannual',        label:'every six months',        w:262800},
  {id:'yearly',            label:'yearly',                  w:525600},
  {id:'every_birthday',    label:'every birthday',          w:525601},
  {id:'every_newyear',     label:'every new year',          w:525602},
  {id:'randomly',          label:'randomly',                w:9999998},
  {id:'sometimes',         label:'sometimes',               w:9999999}
];

// Explicit language families, not a promise to understand every possible sentence.
// Recognition is deliberately bounded;
// durations and clock times are not notification schedules. Unknown is not "sometimes".
export const RHYTHM_LANGUAGES=Object.freeze(['en','fr','pt','es','it','de','nl','ru','ar','zh','ja','ko','ca','pl','cs','sk','ro','hu','sv','da','nb','fi','el','uk','tr','bg','hr','sr','sl','et','lv','lt','ga','mt','is']);
const fold=value=>String(value).normalize('NFKC').toLowerCase().normalize('NFKD')
 .replace(/(\p{Script=Latin})\p{M}+/gu,'$1').replace(/[\u064b-\u065f\u0670\u0640]/g,'')
 .replace(/[أإآ]/g,'ا').replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
 .replace(/[’']/g,' ').replace(/[-‐‑–—]/g,' ').replace(/\s+/g,' ').trim().normalize('NFC');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const bounded=s=>new RegExp('(?<![\\p{L}\\p{N}])(?:'+s+')(?![\\p{L}\\p{N}])','u');
const any=words=>words.map(w=>escape(fold(w))).sort((a,b)=>b.length-a.length).join('|');
const wordPoint=/[\p{L}\p{N}]/u;
const rule=(frequency,words,language=null)=>({frequency,language,patterns:words.split('|').map(word=>{
 const text=fold(word),cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text);
 return {find:n=>{
  let index=n.indexOf(text);
  while(index>=0){
   const before=Array.from(n.slice(Math.max(0,index-2),index)).at(-1)??'',after=String.fromCodePoint(n.codePointAt(index+text.length)??32);
   if(cjk||(!wordPoint.test(before)&&!wordPoint.test(after)))return {start:index,end:index+text.length};
   index=n.indexOf(text,index+1);
  }
  return null;
 }};
})});
const RULES=[
 rule('daily','every day|each day|daily|everyday|chaque jour|tous les jours|quotidiennement|tous les jours|todos os dias|diariamente|cada dia|todos los dias|a diario|ogni giorno|tutti i giorni|quotidianamente|jeden tag|taglich|elke dag|dagelijks|каждый день|ежедневно|كل يوم|يوميا|每天|每日|毎日|매일'),
 rule('every_morning','every morning|each morning|chaque matin|tous les matins|todas as manhãs|cada manhã|todas las mañanas|cada mañana|ogni mattina|jeden morgen|elke ochtend|каждое утро|по утрам|كل صباح|每天早上|每天早晨|毎朝|매일 아침'),
 rule('every_afternoon','every afternoon|chaque après midi|tous les après midi|todas as tardes|todas las tardes|ogni pomeriggio|jeden nachmittag|elke middag|каждый день после обеда|كل يوم بعد الظهر|每天下午|毎日午後|매일 오후'),
 rule('every_evening','every evening|each evening|chaque soir|tous les soirs|tous les soirs|ogni sera|jeden abend|elke avond|каждый вечер|по вечерам|كل مساء|每天傍晚|毎夕|매일 저녁'),
 rule('every_night','every night|chaque nuit|toutes les nuits|todas as noites|cada noite|todas las noches|cada noche|ogni notte|jede nacht|elke nacht|каждую ночь|كل ليلة|每天晚上|每晚|毎晩|매일 밤'),
 rule('every_weekday','every weekday|on weekdays|weekdays|chaque jour ouvré|en semaine|tous les jours ouvrables|dias úteis|dias laborables|giorni feriali|werktags|an werktagen|werkdagen|по будням|كل يوم عمل|每个工作日|工作日每天|平日毎日|매주 평일'),
 rule('every_weekend','every weekend|on weekends|chaque week end|tous les week ends|todo fim de semana|todos os fins de semana|cada fin de semana|todos los fines de semana|ogni fine settimana|jedes wochenende|elk weekend|каждые выходные|كل عطلة نهاية اسبوع|每个周末|每週末|毎週末|매주 주말'),
 rule('every_other_day','every other day|every second day|un jour sur deux|tous les deux jours|dia sim dia não|a cada dois dias|cada dos días|dia por medio|a giorni alterni|ogni due giorni|jeden zweiten tag|om de dag|через день|كل يومين|每两天|每兩天|隔天|一日おき|2日に1回|이틀에 한번|이틀에 한 번'),
 rule('weekly','every week|each week|weekly|once a week|chaque semaine|toutes les semaines|hebdomadaire|toda semana|todas as semanas|semanalmente|cada semana|ogni settimana|jede woche|wochentlich|elke week|wekelijks|каждую неделю|еженедельно|كل اسبوع|اسبوعيا|每周|每週|毎週|매주'),
 rule('biweekly','every two weeks|every other week|toutes les deux semaines|tous les quinze jours|a cada duas semanas|cada dos semanas|ogni due settimane|alle zwei wochen|om de twee weken|каждые две недели|كل اسبوعين|每两周|每兩週|2週間ごと|격주'),
 rule('monthly','every month|monthly|once a month|chaque mois|tous les mois|mensuellement|todo mês|todos os meses|mensalmente|cada mes|ogni mese|jeden monat|monatlich|elke maand|maandelijks|каждый месяц|ежемесячно|كل شهر|شهريا|每月|毎月|매월|매달'),
 rule('quarterly','every quarter|quarterly|chaque trimestre|tous les trimestres|a cada trimestre|cada trimestre|ogni trimestre|jedes quartal|elk kwartaal|каждый квартал|كل ثلاثة اشهر|每季度|四半期ごと|분기마다'),
 rule('seasonal','every season change|each change of season|à chaque changement de saison|a cada mudança de estação|cada cambio de estación|a ogni cambio di stagione|bei jedem jahreszeitenwechsel|bij elke seizoenswisseling|каждую смену сезона|كل تغير موسم|每次换季|季節の変わり目ごと|계절이 바뀔 때마다'),
 rule('semiannual','every six months|twice a year|tous les six mois|a cada seis meses|cada seis meses|ogni sei mesi|alle sechs monate|om de zes maanden|каждые полгода|كل ستة اشهر|每半年|半年ごと|6개월마다'),
 rule('yearly','every year|yearly|annually|chaque année|tous les ans|todo ano|anualmente|cada año|ogni anno|jedes jahr|jahrlich|elk jaar|jaarlijks|каждый год|ежегодно|كل سنة|سنويا|每年|毎年|매년'),
 rule('every_birthday','every birthday|on my birthday|chaque anniversaire|à mon anniversaire|todo aniversário|en mi cumpleaños|ogni compleanno|an meinem geburtstag|op mijn verjaardag|каждый день рождения|كل عيد ميلاد|每年生日|毎年の誕生日|생일마다'),
 rule('every_newyear','every new year|every new year s day|chaque nouvel an|todo ano novo|cada año nuevo|ogni capodanno|jedes neujahr|elk nieuwjaar|каждый новый год|كل راس سنة|每年元旦|毎年元日|새해마다'),
 rule('every_1st_month','every 1st of the month|le 1er de chaque mois|le premier du mois|no primeiro dia de cada mês|el primero de cada mes|il primo di ogni mese|am ersten jedes monats|op de eerste van elke maand|первого числа каждого месяца|اول كل شهر|每月1日|毎月1日|매월 1일'),
 rule('every_15th_month','every 15th of the month|le 15 de chaque mois|le 15 du mois|no dia 15 de cada mês|el 15 de cada mes|il 15 di ogni mese|am 15 jedes monats|op de 15e van elke maand|15 числа каждого месяца|يوم 15 من كل شهر|每月15日|毎月15日|매월 15일'),
 rule('hourly','every hour|hourly|chaque heure|toutes les heures|a cada hora|cada hora|ogni ora|jede stunde|elk uur|каждый час|كل ساعة|每小时|毎時間|매시간'),
 rule('every_minute','every minute|chaque minute|toutes les minutes|a cada minuto|cada minuto|ogni minuto|jede minute|elke minuut|каждую минуту|كل دقيقة|每分钟|毎分|매분'),
 rule('sometimes','sometimes|occasionally|from time to time|parfois|de temps en temps|de vez em quando|a veces|de vez en cuando|ogni tanto|manchmal|ab und zu|af en toe|иногда|احيانا|偶尔|ときどき|가끔'),
 rule('randomly','randomly|at random|aléatoirement|aleatoriamente|casualmente|zufallig|willekeurig|случайным образом|عشوائيا|随机|ランダムに|무작위로')
];
// European everyday recurrence expressions. Each family also has a negative / conditional
// guard below: recognizing a positive token must never erase a negation.
const EUROPEAN=[
 ['ca','cada dia|tots els dies|diàriament','cada setmana|setmanalment','cada mes|mensualment','cada any|anualment','cada matí','cada tarda','cada vespre','cada nit'],
 ['pl','codziennie|każdego dnia','co tydzień|każdego tygodnia|tygodniowo','co miesiąc|każdego miesiąca','co roku|każdego roku','każdego ranka|codziennie rano','każdego popołudnia','każdego wieczoru|codziennie wieczorem','każdej nocy'],
 ['cs','každý den|denně','každý týden|týdně','každý měsíc|měsíčně','každý rok|ročně','každé ráno','každé odpoledne','každý večer','každou noc'],
 ['sk','každý deň|denne','každý týždeň|týždenne','každý mesiac|mesačne','každý rok|ročne','každé ráno','každé popoludnie','každý večer','každú noc'],
 ['ro','în fiecare zi|zilnic','în fiecare săptămână|săptămânal','în fiecare lună|lunar','în fiecare an|anual','în fiecare dimineață','în fiecare după amiază','în fiecare seară','în fiecare noapte'],
 ['hu','minden nap|naponta','minden héten|hetente','minden hónapban|havonta','minden évben|évente','minden reggel','minden délután','minden este','minden éjjel'],
 ['sv','varje dag|dagligen','varje vecka|veckovis','varje månad|månadsvis','varje år|årligen','varje morgon','varje eftermiddag','varje kväll','varje natt'],
 ['da','hver dag|dagligt','hver uge|ugentligt','hver måned|månedligt','hvert år|årligt','hver morgen','hver eftermiddag','hver aften','hver nat'],
 ['nb','hver dag|daglig','hver uke|ukentlig','hver måned|månedlig','hvert år|årlig','hver morgen','hver ettermiddag','hver kveld','hver natt'],
 ['fi','joka päivä|päivittäin','joka viikko|viikoittain','joka kuukausi|kuukausittain','joka vuosi|vuosittain','joka aamu','joka iltapäivä','joka ilta','joka yö'],
 ['el','κάθε μέρα|καθημερινά','κάθε εβδομάδα|εβδομαδιαία','κάθε μήνα|μηνιαία','κάθε χρόνο|ετησίως','κάθε πρωί','κάθε απόγευμα','κάθε βράδυ','κάθε νύχτα'],
 ['uk','щодня|кожного дня','щотижня|кожного тижня','щомісяця|кожного місяця','щороку|кожного року','щоранку|кожного ранку','кожного дня після обіду','щовечора|кожного вечора','щоночі|кожної ночі'],
 ['tr','her gün|günlük','her hafta|haftalık','her ay|aylık','her yıl|yıllık','her sabah','her öğleden sonra','her akşam','her gece'],
 ['bg','всеки ден|ежедневно','всяка седмица|ежеседмично','всеки месец|ежемесечно','всяка година|ежегодно','всяка сутрин','всеки следобед','всяка вечер','всяка нощ'],
 ['hr','svaki dan|svakog dana','svaki tjedan|tjedno','svaki mjesec|mjesečno','svake godine|godišnje','svako jutro','svako poslijepodne','svaku večer','svaku noć'],
 ['sr','svaki dan|svakog dana|сваки дан|сваког дана','svake sedmice|sedmično|svake sedmice','svakog meseca|месечно','svake godine|годишње','svako jutro|свако јутро','svako popodne|свако поподне','svake večeri|сваке вечери','svake noći|сваке ноћи'],
 ['sl','vsak dan|dnevno','vsak teden|tedensko','vsak mesec|mesečno','vsako leto|letno','vsako jutro','vsako popoldne','vsak večer','vsako noč'],
 ['et','iga päev|igapäevaselt','iga nädal|iganädalaselt','iga kuu|igakuiselt','iga aasta|igal aastal','igal hommikul','igal pärastlõunal','igal õhtul','igal ööl'],
 ['lv','katru dienu|ik dienu','katru nedēļu|ik nedēļu','katru mēnesi|ik mēnesi','katru gadu|ik gadu','katru rītu','katru pēcpusdienu','katru vakaru','katru nakti'],
 ['lt','kiekvieną dieną|kasdien','kiekvieną savaitę|kas savaitę','kiekvieną mėnesį|kas mėnesį','kiekvienais metais|kasmet','kiekvieną rytą','kiekvieną popietę','kiekvieną vakarą','kiekvieną naktį'],
 ['ga','gach lá','gach seachtain','gach mí','gach bliain','gach maidin','','','gach oíche'],
 ['mt','kuljum|kull jum','kull ġimgħa','kull xahar','kull sena','kull filgħodu','kull waranofsinhar','kull filgħaxija','kull lejl'],
 ['is','á hverjum degi|daglega','í hverri viku|vikulega','í hverjum mánuði|mánaðarlega','á hverju ári|árlega','á hverjum morgni','á hverju síðdegi','á hverju kvöldi','á hverri nóttu']
];
const EUROPEAN_FREQS=['daily','weekly','monthly','yearly','every_morning','every_afternoon','every_evening','every_night'];
for(const [language, ...phrases] of EUROPEAN)phrases.forEach((text,i)=>{if(text)RULES.push(rule(EUROPEAN_FREQS[i],text,language));});
RULES.push(rule('biweekly','fortnightly|every fortnight|once a fortnight|every second week|tous les 15 jours|toutes les 2 semaines|quinzenalmente|de quinze em quinze dias|cada quince días|ogni quindici giorni|alle 14 tage|alle vierzehn tage|varannan vecka|hver anden uge|annenhver uke|joka toinen viikko|co dwa tygodnie|každé dva týdny|každé dva týždne|la fiecare două săptămâni|κάθε δύο εβδομάδες|кожні два тижні|iki haftada bir'));
RULES.push(rule('every_other_day','alternate days|on alternate days|dia sim, dia não|días alternos|a días alternos|um dia sim e outro não|varannan dag|hver anden dag|annenhver dag|joka toinen päivä|co drugi dzień|obden|každý druhý deň|o dată la două zile|minden második nap|κάθε δεύτερη μέρα|через день|iki günde bir'));
RULES.push(rule('every_weekday','Monday to Friday|Monday through Friday|Mon to Fri|Mon through Fri|Monday-Friday|Mon-Fri|du lundi au vendredi|de segunda a sexta|de lunes a viernes|dal lunedì al venerdì|Montag bis Freitag|van maandag tot vrijdag|de dilluns a divendres|od poniedziałku do piątku|od pondělí do pátku|de luni până vineri|måndag till fredag|mandag til fredag|maanantaista perjantaihin'));
RULES.push(rule('every_weekend','at weekends|at the weekend|on the weekends|weekends|le week end|les week ends|aos fins de semana|el fin de semana|los fines de semana|nel fine settimana|am wochenende|in het weekend|caps de setmana|w weekendy|o víkendu|cez víkend|în fiecare weekend|hétvégén|varje helg|hver weekend|hver helg|joka viikonloppu|κάθε σαββατοκύριακο|щовихідних|her hafta sonu'));
RULES.push(rule('every_night','nightly'));
RULES.push(rule('every_morning','mornings|in the mornings|le matin|de manhã|por la mañana|al mattino|morgens|s ochtends'));
RULES.push(rule('every_evening','evenings|in the evenings|le soir|à noite|por la tarde noche|di sera|abends|s avonds'));
const DAYS=[
 ['monday','monday','lundi','segunda feira','lunes','lunedì','montag','maandag','понедельник','الاثنين','一','月','월'],
 ['tuesday','tuesday','mardi','terça feira','martes','martedì','dienstag','dinsdag','вторник','الثلاثاء','二','火','화'],
 ['wednesday','wednesday','mercredi','quarta feira','miércoles','mercoledì','mittwoch','woensdag','среду','الاربعاء','三','水','수'],
 ['thursday','thursday','jeudi','quinta feira','jueves','giovedì','donnerstag','donderdag','четверг','الخميس','四','木','목'],
 ['friday','friday','vendredi','sexta feira','viernes','venerdì','freitag','vrijdag','пятницу','الجمعة','五','金','금'],
 ['saturday','saturday','samedi','sábado','sábado','sabato','samstag','zaterdag','субботу','السبت','六','土','토'],
 ['sunday','sunday','dimanche','domingo','domingo','domenica','sonntag','zondag','воскресенье','الاحد','日','日','일']
];
for(const [id,en,fr,pt,es,it,de,nl,ru,ar,zh,ja,ko] of DAYS)RULES.push(rule('every_'+id,
 `every ${en}|each ${en}|on ${en}s|${en}s|chaque ${fr}|tous les ${fr}s|le ${fr}|les ${fr}s|toda ${pt}|todo ${pt}|às ${pt}s|cada ${es}|los ${es}|ogni ${it}|jeden ${de}|am ${de}|elke ${nl}|${de}s|каждый ${ru}|каждую ${ru}|каждое ${ru}|كل يوم ${ar}|كل ${ar}|每周${zh}|每週${zh}|毎週${ja}曜日|매주 ${ko}요일`));
const EUROPEAN_DAYS=[
 ['cada dilluns','cada dimarts','cada dimecres','cada dijous','cada divendres','cada dissabte','cada diumenge'],
 ['w każdy poniedziałek','w każdy wtorek','w każdą środę','w każdy czwartek','w każdy piątek','w każdą sobotę','w każdą niedzielę'],
 ['každé pondělí','každé úterý','každou středu','každý čtvrtek','každý pátek','každou sobotu','každou neděli'],
 ['každý pondelok','každý utorok','každú stredu','každý štvrtok','každý piatok','každú sobotu','každú nedeľu'],
 ['în fiecare luni','în fiecare marți','în fiecare miercuri','în fiecare joi','în fiecare vineri','în fiecare sâmbătă','în fiecare duminică'],
 ['minden hétfőn','minden kedden','minden szerdán','minden csütörtökön','minden pénteken','minden szombaton','minden vasárnap'],
 ['varje måndag','varje tisdag','varje onsdag','varje torsdag','varje fredag','varje lördag','varje söndag'],
 ['hver mandag','hver tirsdag','hver onsdag','hver torsdag','hver fredag','hver lørdag','hver søndag'],
 ['joka maanantai','joka tiistai','joka keskiviikko','joka torstai','joka perjantai','joka lauantai','joka sunnuntai'],
 ['κάθε Δευτέρα','κάθε Τρίτη','κάθε Τετάρτη','κάθε Πέμπτη','κάθε Παρασκευή','κάθε Σάββατο','κάθε Κυριακή'],
 ['щопонеділка','щовівторка','щосереди','щочетверга','щоп’ятниці','щосуботи','щонеділі'],
 ['her pazartesi','her salı','her çarşamba','her perşembe','her cuma','her cumartesi','her pazar'],
 ['всеки понеделник','всеки вторник','всяка сряда','всеки четвъртък','всеки петък','всяка събота','всяка неделя'],
 ['svaki ponedjeljak','svaki utorak','svaku srijedu','svaki četvrtak','svaki petak','svaku subotu','svaku nedjelju'],
 ['svakog ponedeljka','svakog utorka','svake srede','svakog četvrtka','svakog petka','svake subote','nedeljom'],
 ['vsak ponedeljek','vsak torek','vsako sredo','vsak četrtek','vsak petek','vsako soboto','vsako nedeljo']
];
for(const phrases of EUROPEAN_DAYS)phrases.forEach((text,i)=>RULES.push(rule('every_'+DAYS[i][0],text)));
const UNIT_GROUPS={day:['day','days','jour','jours','dia','dias','giorno','giorni','tag','tage','dag','dagen','день','дня','дней','يوم','ايام'],week:['week','weeks','semaine','semaines','semana','semanas','settimana','settimane','woche','wochen','week','weken','неделю','недели','недель','اسبوع','اسابيع'],month:['month','months','mois','mês','meses','mes','mese','mesi','monat','monate','maand','maanden','месяц','месяца','месяцев','شهر','اشهر'],year:['year','years','an','ans','année','années','ano','anos','año','anno','anni','jahr','jahre','jaar','jaren','год','года','лет','سنة','سنوات']};
const EUROPEAN_UNITS={
 day:['dia','dzien','dni','den','dny','dní','deň','nap','dag','dagen','päivä','päivässä','zi','zile','μέρα','ημέρα','день','дні','gün','dan','dana','дни','день','päev','diena','dieną'],
 week:['setmana','tydzień','tygodniu','tygodnie','týden','týdně','týždeň','týždni','săptămână','săptămâni','hét','hetente','vecka','veckan','uge','ugen','uke','uken','viikko','viikossa','εβδομάδα','εβδομάδες','тиждень','тижні','hafta','tjedan','tjednu','недеља','nedelji','teden','tednu','nädal','nedēļā','savaitę','seachtain','ġimgħa','viku'],
 month:['mes','miesiąc','miesiącu','měsíc','mesiac','lună','hónap','månad','månaden','måned','måneden','kuukausi','kuukaudessa','μήνα','місяць','ay','mjesec','mesec','kuu','mēnesī','mėnesį'],
 year:['any','rok','roku','roce','an','év','år','året','vuosi','vuodessa','χρόνο','рік','yıl','godina','godine','leto','aasta','gadā','metus']
};
for(const [unit,words] of Object.entries(EUROPEAN_UNITS))UNIT_GROUPS[unit].push(...words);
const UNIT=Object.fromEntries(Object.entries(UNIT_GROUPS).flatMap(([key,values])=>values.map(v=>[fold(v),key])));
const UNITS=any(Object.keys(UNIT));
const COUNTS=[['one','un','une','um','uma','uno','una','ein','eine','een','один','одна','واحد'],['two','deux','dois','duas','dos','due','zwei','twee','два','две','اثنين'],['three','trois','três','tres','tre','drei','drie','три','ثلاث'],['four','quatre','quatro','cuatro','quattro','vier','четыре','اربع'],['five','cinq','cinco','cinque','fünf','vijf','пять','خمس'],['six','seis','sei','sechs','zes','шесть','ست'],['seven','sept','sete','siete','sette','sieben','zeven','семь','سبع']];
const EXTRA_COUNTS=[['jedna','jedno','unu','una','egy','ett','yksi','ένα','μια','один','одна','bir'],['dwa','dwie','dva','dvě','dve','doi','două','két','kettő','två','kaksi','δύο','два','дві','iki'],['trzy','tři','tri','trei','három','kolme','τρία','три','üç'],['cztery','čtyři','štyri','patru','négy','fyra','fire','neljä','τέσσερα','чотири','dört'],['pięć','pět','päť','cinci','öt','fem','viisi','πέντε','п’ять','beş'],['sześć','šest','šesť','șase','hat','sex','seks','kuusi','έξι','шість','altı'],['siedem','sedm','sedem','șapte','sju','syv','seitsemän','επτά','сім','yedi']];
EXTRA_COUNTS.forEach((values,i)=>COUNTS[i].push(...values));
COUNTS.push(['eight','huit','oito','ocho','otto','acht','osiem','osm','osem','opt','nyolc','åtta','otte','åtte','kahdeksan','οκτώ','вісім','sekiz'],['nine','neuf','nove','nueve','neun','dziewięć','devět','deväť','nouă','kilenc','nio','ni','yhdeksän','εννέα','дев’ять','dokuz'],['ten','dix','dez','diez','dieci','zehn','tien','dziesięć','deset','desať','zece','tíz','tio','ti','kymmenen','δέκα','десять'],['eleven','onze','undici','elf','jedenaście','jedenáct','jedenásť','unsprezece','tizenegy','elva','elleve','yksitoista','έντεκα','одинадцять'],['twelve','douze','doze','doce','dodici','zwölf','twaalf','dwanaście','dvanáct','dvanásť','doisprezece','tizenkettő','tolv','kaksitoista','δώδεκα','дванадцять']);
const numberRules=COUNTS.map((values,i)=>[bounded(any(values)),String(i+1)]);
// Non-global replacements intentionally target number tokens, not substrings in an Habit.
function numbers(text){
 let n=text;for(const [re,count] of numberRules){let match;let rest=n,out='';while((match=re.exec(rest))){out+=rest.slice(0,match.index)+count;rest=rest.slice(match.index+match[0].length);}n=out+rest;}
 return n.replace(/\bto(?=\s+(?:gange|ganger|times)\b)/gu,'2').replace(/\bonce(?=\s+veces\b)/gu,'11').replace(/\bonce(?=\s+(?:a|per|every|each|daily|weekly|monthly|yearly)\b)/gu,'1 times')
  .replace(new RegExp(bounded(any(['twice','zweimal','zwei mal','dvakrát','dva razy','kétszer'])).source,'gu'),'2 times')
  .replace(new RegExp(bounded(any(['thrice','dreimal','třikrát','trikrát','háromszor'])).source,'gu'),'3 times');
}
const TIMES='times?|fois|vezes|veces|vez|volte|volta|mal|keer|раза?|раз|مرات|مرة|razy|raz|krat|krát|ori|ganger|gange|kertaa|kerta|φορές|рази|разів|defa|kez|[x×]';
const PER='a|an|per|par|por|al|ao|alla|pro|in|every|each|в|في|في ال|на|a la|a l|w|v|na|pe|i|om|på|по|την';
const COUNT=new RegExp('(?<![\\p{L}\\p{N}])(\\d{1,3})\\s*(?:'+TIMES+')\\s*(?:(?:'+PER+')\\s+|/\\s*)?(?:la\\s+|the\\s+|une?\\s+|ال)?('+UNITS+')(?![\\p{L}\\p{N}])','gu');
const ADVERB_UNITS={daily:'day',weekly:'week',monthly:'month',yearly:'year',annually:'year',quotidiennement:'day',hebdomadaire:'week',semanalmente:'week',mensuellement:'month',diariamente:'day',semanal:'week',mensalmente:'month',annualmente:'year',giornalmente:'day',settimanalmente:'week',taeglich:'day',taglich:'day',wochentlich:'week',monatlich:'month',jahrlich:'year',dagelijks:'day',wekelijks:'week',maandelijks:'month',jaarlijks:'year',tygodniowo:'week',tydne:'week',tyzdenne:'week',saptamanal:'week',hetente:'week',veckovis:'week',ugentligt:'week',ukentlig:'week'};
const ADVERB_COUNT=new RegExp('(?<![\\p{L}\\p{N}])(\\d{1,3})\\s*(?:'+TIMES+')\\s*('+any(Object.keys(ADVERB_UNITS))+')(?![\\p{L}\\p{N}])','gu');
const SHORT_COUNT=new RegExp('(?<![\\p{L}\\p{N}])(\\d{1,3})\\s*/\\s*('+UNITS+')(?![\\p{L}\\p{N}])','gu');
const INTERVAL=new RegExp('(?:every|tous les|toutes les|a cada|cada|ogni|alle|elke|каждые|كل)\\s+(\\d{1,3})\\s+('+UNITS+')(?![\\p{L}\\p{N}])','gu');
const DURATION=/(?:\d+\s*(?:minutes?|mins?|minutos?|minuti|minuten|minutt?er?|minuter|minuuttia|minut|min|минут\p{L}*|دقيقة|دقائق|分钟|分鐘|分間|분|hours?|heures?|horas?|ore|stunden|timmar|timer|tuntia|godzin\p{L}*|hodin\p{L}*|час\p{L}*|ساعات?|小时|小時|時間|시간|h)|vingt minutes|twenty minutes|vinte minutos|veinte minutos|venti minuti|zwanzig minuten|half an hour|half hour|demi heure|meia hora|media hora|mezz ora|halbe stunde)/u;
const CLOCK=/(?:\b\d{1,2}\s*:\s*\d{2}\b|\b\d{1,2}h\d{2}\b|\b\d{1,2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)(?![\p{L}])|(?:at|a|as|a las|alle|um|om|kl|klo|в|الساعة)\s*\d{1,2}\b|\d{1,2}\s*[点點時시]|\b(?:noon|midnight|midi|minuit|mezzogiorno|mezzanotte|middernacht)\b)/u;
const QUALIFIER=bounded(any(['from','starting','beginning','after','before','almost','nearly','roughly','about','approximately','at least','at most','up to','minimum','maximum','jusque','jusqu au','dès','après','avant','environ','presque','au moins','au plus','desde','a partir','casi','aproximadamente','al menos','como minimo','desde','quase','pelo menos','a menos','da quando','quasi','almeno','circa','fast','etwa','mindestens','hochstens','vanaf','bijna','ongeveer','minstens','until','through','jusqu','à partir de','a partir de','hasta','fino a','bis','tot en met','до','حتى','not','never','don t','no','non','nicht','nie','niet','nooit','не','никогда','except','unless','if','or','alternating','ne pas','jamais','sauf','si possible','si besoin','ou','não','nunca','exceto','se puder','se chover','sinon','salvo','o bien','oppure','außer','ausser','wenn','oder','behalve','als','если','кроме','или','если','inte','aldrig','utom','om inte','kanske','ikke','aldrig','hvis','unntatt','aldri','dersom','ei','älä','jos','paitsi','ellei','jeśli','jezeli','nie','nigdy','chyba','oprócz','prawie','pokud','ne','nikdy','kromě','jestli','ak','nikdy','okrem','nu','niciodata','daca','exceptand','fara','nem','ne','ha','kiveve','soha','δεν','μην','αν','εκτός','περίπου','не','ніколи','якщо','крім','майже','eğer','degil','asla','hariç','yaklaşık','ако','освен','никога','ako','osim','nikad','če','razen','kui','mitte','välja arvatud','izņemot','nav','ne','jei','nebent','išskyrus','ní','mura','seachas','mhux','jekk','ħlief','ekki','ef','nema','لا','ليس','الا','اذا','او']));
const CJK_QUALIFIER=/(?:如果|除外|除了|或者|直到|截至|不|または|以外|まで|ない|ません|않|제외|까지)/u;
const UNSUPPORTED_PRECISION=/(?:\d+\s*[.,]\s*\d+\s*(?:times?|fois|vezes|veces|volte|mal|keer|razy|[x×])|(?<![\p{L}\p{N}])[.,]\d+\s*(?:times?|[x×])|\d+\s*(?:[-–—~〜]|to|à|a|bis|tot|až|do)\s*\d+\s*(?:times?|fois|vezes|veces|volte|mal|keer|razy|[x×]))/iu;
const COMPOUND_COUNT=new RegExp('(?<![\\p{L}\\p{N}])\\d+\\s+(?:(?:and|et|y|e|und)\\s+)?\\d+\\s*(?:'+TIMES+')(?![\\p{L}])','u');
const UNSUPPORTED_NUMBER=bounded(any(['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','thousand','vingt','trente','quarante','cinquante','soixante','cent','veinte','treinta','cuarenta','cincuenta','cien','ciento','vinte','trinta','quarenta','cinquenta','cem','cento','venti','trenta','quaranta','cinquanta','zwanzig','dreissig','dreißig','vierzig','hundert']));
const REPEAT_MARKER=new RegExp('(?<![\\p{L}])(?:'+TIMES+')(?![\\p{L}])','u');
const AMBIGUOUS_CADENCE=bounded(any(['svake nedelje','сваке недеље','gach tráthnóna','biweekly','bi weekly','bi monthly','bimonthly','semi monthly','semimonthly','bimensuel','bimensuelle','bimensuellement','bimestriel','bimestrielle','biannually','biannual','bi annual','semi weekly','semiweekly']));
const ADJECTIVE_CONTEXT=bounded(any(['daily life','daily bread','daily news','daily newspaper','weekly magazine','monthly bill','monthly bills','weekly news','monthly magazine','weekly newspaper','everyday life','everyday people','everyday language','daglig leder']));
const MAP={day:'daily',week:'weekly',month:'monthly',year:'yearly'};
const PERIOD_LABEL={day:'day',week:'week',month:'month',year:'year'};
export function parseHabitRhythm(value,{mode='habit'}={}){
 const raw=String(value??'');
 const none={status:'none',frequency:null,target:null,hasDuration:false,hasClock:false};
 if(!raw.trim())return none;
 if(raw.length>16000)return {...none,status:'review',reason:'too_long'};
 const text=fold(raw),n=numbers(text),hasDuration=DURATION.test(n),hasClock=CLOCK.test(text);
 const result={...none,hasDuration,hasClock};
 const exact=FREQS.find(f=>fold(f.label)===text||f.id===text);
 if(/\bonce\s+(?:a(?: la)?|al|por|cada)\s+(?:semana|dia|mes|ano|año)\b/u.test(text))return {...result,status:'review',reason:'ambiguous_count'};
 if(AMBIGUOUS_CADENCE.test(text))return {...result,status:'review',reason:'ambiguous_cadence'};
 if(COMPOUND_COUNT.test(n)||UNSUPPORTED_NUMBER.test(text)&&REPEAT_MARKER.test(text))return {...result,status:'review',reason:'unsupported_count'};
 if(UNSUPPORTED_PRECISION.test(raw)||UNSUPPORTED_PRECISION.test(n))return {...result,status:'review',reason:'range_or_fraction'};
 if(ADJECTIVE_CONTEXT.test(text))return {...result,status:'review',reason:'descriptive_context'};
 if(mode==='rhythm'&&exact)return {...result,status:'matched',frequency:exact.id};
 if(/(?:every|toutes les|tous les|a cada|cada|ogni|alle|elke)\s+\d+\s*(?:minutes?|minutos?|minuti|minuten|hours?|heures?|horas?|ore|stunden)/u.test(n))return {...result,status:'review',reason:'unsupported_interval'};
 const boundedPeriod=new RegExp('(?:for|pendant|durante|fur|gedurende|на|لمدة)\\s+\\d+\\s+(?:'+UNITS+')(?![\\p{L}\\p{N}])','u');
 if(boundedPeriod.test(n)||new RegExp('(?:for|pendant|pour|durante|fur|gedurende)\\s+(?:a|an|une?|um|uma|1)\\s+(?:'+UNITS+')(?![\\p{L}\\p{N}])','u').test(n))return {...result,status:'review',reason:'bounded_period'};
 const targets=[],intervals=[];
 // Parse explicit repetition counts before CJK weekday tokens (每周三次 ≠ 每周三).
 let stripped=n;
 COUNT.lastIndex=0;SHORT_COUNT.lastIndex=0;INTERVAL.lastIndex=0;ADVERB_COUNT.lastIndex=0;
 stripped=stripped.replace(ADVERB_COUNT,(all,count,unit)=>{targets.push({count:Number(count),unit:ADVERB_UNITS[unit]});return ' ';});
 stripped=stripped.replace(COUNT,(all,count,unit)=>{targets.push({count:Number(count),unit:UNIT[unit]});return ' ';});
 stripped=stripped.replace(SHORT_COUNT,(all,count,unit)=>{targets.push({count:Number(count),unit:UNIT[unit]});return ' ';});
 const cjkCounts=[[/每(?:周|週|星期)(\d{1,3}|[一二三四五六七])次/gu,'week'],[/每(?:天|日)(\d{1,3}|[一二三四五六七])次/gu,'day'],[/每(?:个)?月(\d{1,3}|[一二三四五六七])次/gu,'month'],[/(?:週に|毎週)(\d{1,3}|[一二三四五六七])回/gu,'week'],[/(?:1週間|一週間)に(\d{1,3}|[一二三四五六七])回/gu,'week'],[/(?:매주|일주일에)\s*(\d{1,3}|한|두|세|네|다섯|여섯|일곱)\s*(?:번|회)/gu,'week']];
 for(const [re,unit] of cjkCounts)stripped=stripped.replace(re,(all,count)=>{targets.push({count:/^\d+$/.test(count)?Number(count):({'한':1,'두':2,'세':3,'네':4,'다섯':5,'여섯':6,'일곱':7}[count]??('一二三四五六七'.indexOf(count)+1)),unit});return ' ';});
 stripped=stripped.replace(INTERVAL,(all,count,unit)=>{intervals.push({count:Number(count),unit:UNIT[unit]});return ' ';});
 if(mode==='rhythm'&&!targets.length&&!intervals.length){
  const bare=Object.entries(UNIT_GROUPS).find(([,values])=>values.some(v=>fold(v)===text));
  if(bare)return {...result,status:'matched',frequency:MAP[bare[0]]};
 }
 const hits=RULES.flatMap(r=>r.patterns.map(p=>{const span=p.find(stripped);return span?{...span,frequency:r.frequency,language:r.language}:null;}).filter(Boolean));
 const found=hits.map(hit=>hit.frequency);
 const intervalMap={day:{1:'daily',2:'every_other_day'},week:{1:'weekly',2:'biweekly'},month:{1:'monthly',3:'quarterly',6:'semiannual'},year:{1:'yearly'}};
 for(const i of intervals){const frequency=intervalMap[i.unit]?.[i.count];if(!frequency)return {...result,status:'review',reason:'unsupported_interval'};found.push(frequency);}
 if(targets.some(t=>t.count<1||t.count>100))return {...result,status:'review',reason:'unsupported_count'};
 if(targets.length>1)return {...result,status:'review',reason:'multiple_targets'};
 const target=targets[0]??null;
 if(target)found.push(MAP[target.unit]);
 // Generic daily/week/month tokens may be contained in a more precise expression.
 let ids=[...new Set(found)];
 const windows=['every_morning','every_afternoon','every_evening','every_night'];
 if(ids.some(id=>windows.includes(id))&&!target)ids=ids.filter(id=>id!=='daily');
 // Drop a generic token only when it belongs to the precise phrase, e.g. 每週水曜日.
 for(const generic of ['daily','weekly']){
  const spans=hits.filter(h=>h.frequency===generic);
  if(spans.length&&!target&&spans.every(h=>hits.some(p=>p.frequency!==generic&&p.start<=h.start&&p.end>=h.end)))ids=ids.filter(id=>id!==generic);
 }
 if(ids.some(id=>id==='every_1st_month'||id==='every_15th_month'))ids=ids.filter(id=>id!=='monthly');
 // A quota plus a different recurring constraint cannot be represented by a single current rhythm.
 // Mask only curated Mon-Fri ranges before checking qualifiers such as 'through' / 'bis'.
 let guardText=text;
 for(const h of hits.filter(h=>h.frequency==='every_weekday')){
  const phrase=stripped.slice(h.start,h.end);guardText=guardText.replace(phrase,' ');
 }
 if((ids.length||hasClock)&&(QUALIFIER.test(guardText)||CJK_QUALIFIER.test(guardText)||hits.some(h=>h.language==='fi')&&bounded(any(['en','et','emme','ette','eivät'])).test(text)||hits.some(h=>h.language==='ga')&&bounded(any(['ná','níl','murach'])).test(text)))return {...result,status:'review',reason:'conditional_or_negative'};
 const mentionedWindows=[['morning','matin','manha','mañana','mattina','morgen','ochtend','утро','صباح'],['afternoon','apres midi','tarde','pomeriggio','nachmittag','middag'],['evening','soir','sera','abend','avond','вечер','مساء'],['night','nuit','noite','noche','notte','nacht','ночь','ليلة']].filter(names=>names.some(name=>bounded(escape(fold(name))).test(n)));
 if(ids.some(id=>windows.includes(id))&&mentionedWindows.length>1)return {...result,status:'review',reason:'multiple_day_windows'};
 const namedDays=DAYS.filter(([, ...names],i)=>[...names.slice(0,9),...EUROPEAN_DAYS.map(row=>row[i].split(' ').at(-1))].some(name=>bounded(escape(fold(name))).test(text)));
 if(ids.some(id=>/^every_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(id))&&namedDays.length>1)return {...result,status:'review',reason:'multiple_weekdays'};
 const dayWindow=bounded(any(['morning','mornings','afternoon','afternoons','evening','evenings','night','nights','matin','soir','nuit','manha','noite','mañana','tarde','noche','mattina','sera','notte','morgen','abend','nacht','ochtend','avond','rano','wieczorem','ráno','večer','dimineața','seară','reggel','este','kväll','aften','kveld','aamu','ilta','πρωί','βράδυ','ранку','вечора','sabah','akşam'])).test(text);
 if(ids.length&&dayWindow&&!ids.some(id=>windows.includes(id)))return {...result,status:'review',reason:'combined_schedule'};
 if(intervals.length&&namedDays.length)return {...result,status:'review',reason:'combined_schedule'};
 if(ids.length&&/\b(?:on the|on|le|el|il|am|op de)\s+(?:\d{1,2}(?:st|nd|rd|th|er|e)?|first|second|third|fourth|last|premier|dernier|ersten|letzten)\b/u.test(text))return {...result,status:'review',reason:'calendar_constraint'};
 if(ids.length&&/\b(?:in|en|im|nel|durante)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/u.test(text))return {...result,status:'review',reason:'calendar_constraint'};
 // A partially parsed repetition phrase must not lose its count or alternating period.
 if(ids.length&&(REPEAT_MARKER.test(stripped)||/[〇零一二三四五六七八九十百千\d]+\s*[次回회번]/u.test(stripped)))return {...result,status:'review',reason:'combined_schedule'};
 if(ids.length>1)return {...result,status:'review',reason:'conflicting_rhythms'};
 if(!ids.length)return {...result,status:hasClock?'review':'none',reason:hasClock?'clock_without_recurrence':hasDuration?'duration_only':null};
 if(['every_1st_month','every_15th_month','every_birthday'].includes(ids[0]))return {...result,status:'review',reason:'calendar_date_needs_manual'};
 return {...result,status:'matched',frequency:ids[0],target:target&&target.count>1?target:null};
}
export function rhythmSummary(result){
 if(result.status!=='matched')return '';
 const label=FREQS.find(f=>f.id===result.frequency)?.label??'';
 return label+' check-in'+(result.target?' · target '+result.target.count+' / '+PERIOD_LABEL[result.target.unit]:'');
}
