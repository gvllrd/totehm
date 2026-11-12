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

// EN FR PT ES IT DE NL RU AR ZH JA KO. Recognition is deliberately bounded;
// durations and clock times are not notification schedules. Unknown is not "sometimes".
export const RHYTHM_LANGUAGES=Object.freeze(['en','fr','pt','es','it','de','nl','ru','ar','zh','ja','ko']);
const fold=value=>String(value).normalize('NFKC').toLowerCase().normalize('NFKD')
 .replace(/(\p{Script=Latin})\p{M}+/gu,'$1').replace(/[\u064b-\u065f\u0670\u0640]/g,'')
 .replace(/[أإآ]/g,'ا').replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
 .replace(/[’']/g,' ').replace(/[-‐‑–—]/g,' ').replace(/\s+/g,' ').trim().normalize('NFC');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const bounded=s=>new RegExp('(?<![\\p{L}\\p{N}])(?:'+s+')(?![\\p{L}\\p{N}])','u');
const any=words=>words.map(w=>escape(fold(w))).sort((a,b)=>b.length-a.length).join('|');
const rule=(frequency,words)=>({frequency,patterns:words.split('|').map(word=>{
 const text=fold(word),cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text),re=cjk?null:bounded(escape(text));
 return {find:n=>{const match=re?re.exec(n):null,index=re?(match?.index??-1):n.indexOf(text);return index<0?null:{start:index,end:index+text.length};}};
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
 `every ${en}|on ${en}s|chaque ${fr}|tous les ${fr}s|le ${fr}|les ${fr}s|toda ${pt}|todo ${pt}|às ${pt}s|cada ${es}|los ${es}|ogni ${it}|jeden ${de}|am ${de}|elke ${nl}|каждый ${ru}|каждую ${ru}|каждое ${ru}|كل يوم ${ar}|كل ${ar}|每周${zh}|每週${zh}|毎週${ja}曜日|매주 ${ko}요일`));
const UNIT_GROUPS={day:['day','days','jour','jours','dia','dias','giorno','giorni','tag','tage','dag','dagen','день','дня','дней','يوم','ايام'],week:['week','weeks','semaine','semaines','semana','semanas','settimana','settimane','woche','wochen','week','weken','неделю','недели','недель','اسبوع','اسابيع'],month:['month','months','mois','mês','meses','mes','mese','mesi','monat','monate','maand','maanden','месяц','месяца','месяцев','شهر','اشهر'],year:['year','years','an','ans','année','années','ano','anos','año','anno','anni','jahr','jahre','jaar','jaren','год','года','лет','سنة','سنوات']};
const UNIT=Object.fromEntries(Object.entries(UNIT_GROUPS).flatMap(([key,values])=>values.map(v=>[fold(v),key])));
const UNITS=any(Object.keys(UNIT));
const COUNTS=[['one','un','une','um','uma','uno','una','ein','eine','een','один','одна','واحد'],['two','deux','dois','duas','dos','due','zwei','twee','два','две','اثنين'],['three','trois','três','tres','tre','drei','drie','три','ثلاث'],['four','quatre','quatro','cuatro','quattro','vier','четыре','اربع'],['five','cinq','cinco','cinque','fünf','vijf','пять','خمس'],['six','seis','sei','sechs','zes','шесть','ست'],['seven','sept','sete','siete','sette','sieben','zeven','семь','سبع']];
const numberRules=COUNTS.map((values,i)=>[bounded(any(values)),String(i+1)]);
// Non-global replacements intentionally target number tokens, not substrings in an Habit.
function numbers(text){
 let n=text;for(const [re,count] of numberRules){let match;let rest=n,out='';while((match=re.exec(rest))){out+=rest.slice(0,match.index)+count;rest=rest.slice(match.index+match[0].length);}n=out+rest;}
 return n.replace(/\bonce\b/gu,'1 times').replace(/\b(twice|zweimal)\b/gu,'2 times').replace(/\b(thrice|dreimal)\b/gu,'3 times');
}
const COUNT=new RegExp('(?<![\\p{L}\\p{N}])(\\d{1,3})\\s*(?:times?|fois|vezes|veces|vez|volte|volta|mal|keer|раза?|раз|مرات|مرة|[x×])\\s*(?:(?:a|an|per|par|por|al|ao|alla|pro|in|в|في|في ال|на)\\s+|/\\s*)?(?:la\\s+|the\\s+|une?\\s+|ال)?('+UNITS+')(?![\\p{L}\\p{N}])','gu');
const SHORT_COUNT=new RegExp('(?<![\\p{L}\\p{N}])(\\d{1,3})\\s*/\\s*('+UNITS+')(?![\\p{L}\\p{N}])','gu');
const INTERVAL=new RegExp('(?:every|tous les|toutes les|a cada|cada|ogni|alle|elke|каждые|كل)\\s+(\\d{1,3})\\s+('+UNITS+')(?![\\p{L}\\p{N}])','gu');
const DURATION=/(?:\d+\s*(?:minutes?|mins?|minutos?|minuti|minuten|минут\p{L}*|دقيقة|دقائق|分钟|分鐘|分間|분|hours?|heures?|horas?|ore|stunden|час\p{L}*|ساعات?|小时|小時|時間|시간)|vingt minutes|twenty minutes|vinte minutos|veinte minutos|venti minuti|zwanzig minuten)/u;
const CLOCK=/(?:\b\d{1,2}\s*[:h]\s*\d{0,2}\b|\b\d{1,2}\s*(?:am|pm)\b|(?:at|à|às|a las|alle|um|om|в|الساعة)\s*\d{1,2}\b|\d{1,2}\s*[点點時시])/u;
const QUALIFIER=bounded(any(['not','never','don t','no','non','nicht','nie','niet','nooit','не','никогда','except','unless','if','or','alternating','ne pas','jamais','sauf','si possible','si besoin','ou','não','nunca','exceto','se puder','se chover','sinon','salvo','o bien','oppure','außer','ausser','wenn','oder','behalve','als','если','кроме','или','если','لا','ليس','الا','اذا','او']));
const CJK_QUALIFIER=/(?:如果|除外|除了|或者|不|または|以外|ない|ません|않|제외)/u;
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
 if(mode==='rhythm'&&exact)return {...result,status:'matched',frequency:exact.id};
 if(/(?:every|toutes les|tous les|a cada|cada|ogni|alle|elke)\s+\d+\s*(?:minutes?|minutos?|minuti|minuten|hours?|heures?|horas?|ore|stunden)/u.test(n))return {...result,status:'review',reason:'unsupported_interval'};
 const targets=[],intervals=[];
 // Parse explicit repetition counts before CJK weekday tokens (每周三次 ≠ 每周三).
 let stripped=n;
 COUNT.lastIndex=0;SHORT_COUNT.lastIndex=0;INTERVAL.lastIndex=0;
 stripped=stripped.replace(COUNT,(all,count,unit)=>{targets.push({count:Number(count),unit:UNIT[unit]});return ' ';});
 stripped=stripped.replace(SHORT_COUNT,(all,count,unit)=>{targets.push({count:Number(count),unit:UNIT[unit]});return ' ';});
 const cjkCounts=[[/每(?:周|週|星期)(\d{1,3}|[一二三四五六七])次/gu,'week'],[/每(?:天|日)(\d{1,3}|[一二三四五六七])次/gu,'day'],[/每(?:个)?月(\d{1,3}|[一二三四五六七])次/gu,'month'],[/(?:週に|毎週)(\d{1,3}|[一二三四五六七])回/gu,'week'],[/(?:1週間|一週間)に(\d{1,3}|[一二三四五六七])回/gu,'week'],[/(?:매주|일주일에)\s*(\d{1,3}|한|두|세|네|다섯|여섯|일곱)\s*(?:번|회)/gu,'week']];
 for(const [re,unit] of cjkCounts)stripped=stripped.replace(re,(all,count)=>{targets.push({count:/^\d+$/.test(count)?Number(count):({'한':1,'두':2,'세':3,'네':4,'다섯':5,'여섯':6,'일곱':7}[count]??('一二三四五六七'.indexOf(count)+1)),unit});return ' ';});
 stripped=stripped.replace(INTERVAL,(all,count,unit)=>{intervals.push({count:Number(count),unit:UNIT[unit]});return ' ';});
 if(mode==='rhythm'&&!targets.length&&!intervals.length){
  const bare=Object.entries(UNIT_GROUPS).find(([,values])=>values.some(v=>fold(v)===text));
  if(bare)return {...result,status:'matched',frequency:MAP[bare[0]]};
 }
 const hits=RULES.flatMap(r=>r.patterns.map(p=>{const span=p.find(stripped);return span?{...span,frequency:r.frequency}:null;}).filter(Boolean));
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
 if((ids.length||hasClock)&&(QUALIFIER.test(n)||CJK_QUALIFIER.test(n)))return {...result,status:'review',reason:'conditional_or_negative'};
 const mentionedWindows=[['morning','matin','manha','mañana','mattina','morgen','ochtend','утро','صباح'],['afternoon','apres midi','tarde','pomeriggio','nachmittag','middag'],['evening','soir','sera','abend','avond','вечер','مساء'],['night','nuit','noite','noche','notte','nacht','ночь','ليلة']].filter(names=>names.some(name=>bounded(escape(fold(name))).test(n)));
 if(ids.some(id=>windows.includes(id))&&mentionedWindows.length>1)return {...result,status:'review',reason:'multiple_day_windows'};
 const namedDays=DAYS.filter(([, ...names])=>names.slice(0,9).some(name=>bounded(escape(fold(name))).test(n)));
 if(ids.some(id=>/^every_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(id))&&namedDays.length>1)return {...result,status:'review',reason:'multiple_weekdays'};
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
