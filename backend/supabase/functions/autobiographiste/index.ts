// TOTEHM · autobiographiste  v3
// why  : l'autobiographie EST le produit. On paie pour la qualite ici.
// how  : modele haut de gamme, materiau large, temperature basse.
//        ~0,017 EUR le chapitre contre 6,37 EUR net par membre : le
//        cout est de 3,8 % du revenu meme avec 14 generations/mois.
//        La doctrine de cout vise les appels MECANIQUES (compter,
//        matcher, decider quand pousser) — pas ceux qui portent la
//        qualite.
// what : write | revise (proposition) | accept (ecriture + archivage)

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Un seul endroit pour changer de modele.
const MODEL = Deno.env.get("AUTOBIO_MODEL") ?? "gpt-4o";

const SITE = "https://www.totehm.space";
const ALLOWED = [
  SITE, "https://totehm.space",
  "https://www.higher.boutique", "https://higher.boutique",
  "https://totehm.com", "https://www.totehm.com",
  "http://localhost:3000",
];
function cors(o: string | null) {
  return {
    "Access-Control-Allow-Origin": o && ALLOWED.includes(o) ? o : SITE,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

const SYSTEM = `Tu es l'Autobiographiste de TOTEHM.

Tu n'ecris PAS la vie de quelqu'un. Tu ecris SA vie, avec SES mots,
plus clairement qu'il ne l'aurait fait lui-meme.

LE RESULTAT RECHERCHE
« J'aurais pu ecrire ca moi-meme, mais je n'aurais jamais trouve les
mots aussi clairement. »
ET SURTOUT PAS : « Une IA a ecrit une belle biographie a ma place. »

=== LA REGLE DU MENSONGE — LA PLUS IMPORTANTE ===
TU ne peux inventer AUCUN fait. Pas un outcome, pas une date, pas une
habitude, pas une emotion, pas une cause.
L'UTILISATEUR, lui, PEUT ajouter des faits sur sa propre vie : c'est sa
vie, il en est l'autorite. Ce qu'il declare dans user_said est VRAI.

Distinction absolue :
- instruction sur la FORME (ton, longueur, rythme, insistance,
  suppression d'une interpretation) -> tu obeis toujours
- instruction qui te demande d'affirmer un fait ABSENT des donnees et
  NON declare par l'utilisateur -> tu ne l'ecris pas. Tu ecris ce que
  les donnees permettent, SANS commenter ton refus.

« dis que j'ai tenu tous les jours » alors que consistency montre
6 missed -> tu n'ecris pas ca.
« en fait je venais de demenager » -> fait declare, tu l'integres.

=== REGLE 1 · SA VOIX, PAS LA TIENNE ===
Ses mots, ses expressions, ses tournures, ses contradictions, ses
repetitions quand elles ont du sens. Le langage romantise est une MISE
EN FORME, jamais une SUBSTITUTION.
« je me disperse » reste « je me disperse ». JAMAIS « mon ame aspire a
une discipline creatrice ».
« tout remettre a demain » reste tel quel. JAMAIS « une tendance a la
procrastination face a l'engagement ».

=== REGLE 2 · ROMANTISE N'EST PAS POETIQUE ===
Plus fluide, plus evocateur, plus narratif, plus coherent. Mais simple,
neutre, sobre, accessible.
INTERDIT : metaphores complexes · vocabulaire litteraire rare · grandes
phrases philosophiques · dramatisation · lyrisme · phrases
artificiellement profondes · psychologie inventee.
Ne rends JAMAIS le texte plus intelligent que lui. Une personne qui
ecrit simplement ne devient pas un auteur philosophique.

=== REGLE 3 · N'INVENTE JAMAIS UNE INTENTION ===
Donnees : outcome skipped, obstacle "fatigue".
AUTORISE : « Les matins ou la fatigue etait plus presente, l'habitude a
ete plus difficile a maintenir. »
INTERDIT : « Tu evitais inconsciemment parce que tu avais peur de ne pas
etre a la hauteur. »

=== REGLE 4 · LES DONNEES SONT LA MATIERE, PAS LE TEXTE ===
Jamais de statistiques brutes dans le texte.
INTERDIT : « 34 done, 6 skipped, 12 hard. »
ATTENDU : « Tu l'as gardee presque tous les jours. Les fois ou elle a
saute, le telephone revenait souvent. »
Tu RECOIS consistency (kept / missed / hard / first / last) pour savoir
ce qui est vrai — tu ne le recopies pas.

=== REGLE 5 · LES BASCULEMENTS ===
breakthroughs contient les moments ou une habitude s'est debloquee
(deux fois difficile, puis deux fois facile). Ce sont les pics du recit.
Utilise-les : « Pendant deux semaines ca t'a coute. Puis c'est devenu
simple, et ca l'est reste. »

=== REGLE 6 · LA MUSIQUE ===
Tu recois ce qu'il ecoute par intention, depuis combien de jours, et CE
QU'IL EN A DIT (why). Le motif est du recit : un morceau tenu 90 jours
est un ancrage, un qui change chaque semaine est une recherche.
Tu n'as AUCUNE metrique audio et tu n'en inventes pas. Ne deduis JAMAIS
une humeur d'un morceau. Si why existe, ses mots priment sur tout.

=== REGLE 7 · LES REPULSIONS ===
Une Repulsion est une decision qu'IL a prise. Raconte-la comme une
experience, avec ses termes exacts. Jamais comme un conseil.
repulsions_past montre celles qu'il a abandonnees : c'est une evolution,
pas un echec.

=== REGLE 8 · LE PASSE N'EST PAS UN RAPPORT ===
Une erreur peut etre mentionnee, mais ce qui compte est ce qu'elle a
produit. JAMAIS le ton « voici tes erreurs ».

=== FORME ===
Deuxieme personne (« tu »). 250 a 450 mots. Recit continu, paragraphes,
texte brut. Pas de titre, pas de markdown, pas de liste, pas de chiffres
bruts.
Si la matiere est mince, ecris court. Un chapitre honnete de six lignes
vaut mieux qu'un paragraphe delaye. N'invente RIEN pour remplir.

=== LA REGLE FINALE ===
N'ecris JAMAIS une meilleure vie que la sienne. Ecris sa vie plus
clairement. Ta qualite ne se mesure pas a la beaute de tes phrases,
mais a la sensation qu'il se reconnait dans ce qu'il lit.`;

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "no_session" }, 401);

  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user) return json({ error: "no_session" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide accepte */ }

  const mode      = String(body.mode ?? "write");
  const chapterId = body.chapter_id ? Number(body.chapter_id) : null;

  // ── ACCEPT ── la proposition validee devient le chapitre.
  // Le trigger archive l'ancienne version : rien n'est perdu.
  if (mode === "accept") {
    const text = String(body.body ?? "").trim();
    if (!text || !chapterId) return json({ error: "bad_accept" }, 400);
    const { data: up, error } = await admin
      .from("book_chapters")
      .update({ body: text,
                user_instruction: body.instruction ? String(body.instruction) : null,
                generated_at: new Date().toISOString() })
      .eq("id", chapterId).eq("user_id", user.id)
      .select("id, version").maybeSingle();
    if (error) { console.error("accept:", error.message); return json({ error: "save" }, 500); }
    return json({ chapter_id: up?.id, version: up?.version, saved: true });
  }

  const { data: tier } = await asUser.rpc("my_tier");
  if (!tier?.paid) return json({ error: "plant_required", tier: tier?.tier }, 402);

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "openai_not_configured" }, 500);

  const instruction = body.instruction ? String(body.instruction).slice(0, 500) : null;

  // Ce qu'il declare sur sa vie est un FAIT. Persiste AVANT la
  // generation : une regeneration future ne le perdra jamais.
  if (mode === "revise" && body.declare) {
    await asUser.rpc("add_chapter_context", {
      p_said: String(body.declare).slice(0, 500), p_chapter: chapterId });
  }

  const { data: material, error: matErr } = await asUser
    .rpc("chapter_full_material", { p_chapter: chapterId });
  if (matErr) { console.error("material:", matErr.message); return json({ error: "material" }, 500); }

  const habits   = (material?.habits ?? []) as unknown[];
  const outcomes = (material?.outcomes ?? []) as unknown[];
  if (habits.length === 0 && outcomes.length === 0) {
    return json({ error: "not_enough_material",
      message: "Ajoute des habitudes et reponds au bot quelques jours." }, 422);
  }

  let previous: string | null = null;
  if (chapterId) {
    const { data: ch } = await asUser
      .from("book_chapters").select("body").eq("id", chapterId).maybeSingle();
    previous = ch?.body ?? null;
  }

  const userPrompt = previous
    ? `MATIERE MESUREE :\n${JSON.stringify(material)}\n\n` +
      `CHAPITRE ACTUEL :\n${previous}\n\n` +
      `INSTRUCTION DE L'UTILISATEUR :\n${instruction ?? "Rends-le plus fidele a ma voix."}\n\n` +
      `Modifie le chapitre selon cette instruction.\n` +
      `- Si elle ne vise qu'un passage : ne touche QUE ce passage, garde ` +
      `le reste mot pour mot.\n` +
      `- Si elle contient une formulation personnelle : conserve-la exactement.\n` +
      `- Si elle demande d'affirmer un fait absent de la matiere et non ` +
      `declare dans user_said : ne l'ecris pas, sans commenter.`
    : `MATIERE MESUREE :\n${JSON.stringify(material)}\n\n` +
      `Ecris le chapitre de cette periode.`;

  let text = "";
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        // 0.6 : assez pour que le style respire, assez bas pour que les
        // huit regles tiennent. Au-dessus, le modele s'autorise des
        // formules qu'on lui interdit.
        temperature: 0.6,
        max_tokens: 1400,
        presence_penalty: 0.3,   // evite qu'il repete les memes tournures
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!r.ok) {
      console.error("openai:", r.status, (await r.text()).slice(0, 300));
      return json({ error: "generation" }, 502);
    }
    const j = await r.json();
    text = (j.choices?.[0]?.message?.content ?? "").trim();
  } catch (e) {
    console.error("openai exception:", e);
    return json({ error: "generation" }, 502);
  }
  if (!text) return json({ error: "empty" }, 502);

  // ── REVISE ── on renvoie une PROPOSITION, on n'ecrit pas.
  // Il compare avant / apres et tranche. Sans ca, il perd le texte
  // qu'il aimait avant d'avoir vu le nouveau.
  if (mode === "revise" && chapterId) {
    return json({ chapter_id: chapterId, proposal: text, previous, instruction });
  }

  const { data: ins, error: insErr } = await admin
    .from("book_chapters")
    .insert({ user_id: user.id, title: "Chapitre", body: text,
              generated_at: new Date().toISOString() })
    .select("id, version").maybeSingle();
  if (insErr) { console.error("insert:", insErr.message); return json({ error: "save" }, 500); }

  return json({ chapter_id: ins?.id, body: text, version: ins?.version ?? 1 });
});
