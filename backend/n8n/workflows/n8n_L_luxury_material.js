// TOTEHM L — L'ÉTUDE DE MATIÈRE DU LUXE · 11/11/2026
// why : Wah — « il faut que l'on mette en place une analyse automatisée (via
//       l'API ChatGPT/Vision et n8n) qui étudie précisément la texture et la
//       matière de l'objet ». La peinture et les apprêts sont 100 % sur-mesure :
//       il faut d'abord SAVOIR sur quoi on peint.
// how : toutes les 15 minutes — `luxury_material_due` RÉSERVE au plus trois
//       pièces (la ligne prise porte `{"status":"running"}` et ne ressort
//       qu'au bout de 30 minutes si le flux n'est jamais revenu), l'image est
//       SIGNÉE (seau privé, 15 minutes), lue par un modèle de vision, et
//       `luxury_material_set` écrit l'étude — ou la panne, qui dit pourquoi.
//       C'est TOUJOURS une image : d'une vidéo, la page a tiré une image fixe.
//       Les clés viennent de `$env` (SB_KEY, OPENAI_KEY), jamais d'un nœud.
// what : ce fichier EST la source du flux publié sur n8n.higher.boutique
//        (« TOTEHM L — Luxury material study »), écrite avec le SDK n8n et
//        posée par la session cloud (MCP n8n). ⚠️ Le parseur du SDK n'accepte
//        AUCUNE méthode native (`join`, `map`…) hors d'un nœud Code : le code
//        d'un nœud s'écrit en une seule chaîne, avec des `\n`.
//        Mesuré le 11/11 : la chaîne entière a tourné et l'étude est revenue en
//        JSON (matière, grain, finition, préparation, apprêt, pigments, flex,
//        risques, confiance, résumé) avant de s'écrire en base.

import { workflow, node, trigger } from '@n8n/workflow-sdk';

const toutes = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: {
    name: 'Every 15 minutes',
    parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] } },
  },
});

const reserver = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Claim pieces to study',
    parameters: {
      method: 'POST',
      url: 'https://abujjbkbbiumxrokozph.supabase.co/rest/v1/rpc/luxury_material_due',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: '={{ $env.SB_KEY || $vars.SB_KEY }}' },
        { name: 'Authorization', value: '=Bearer {{ $env.SB_KEY || $vars.SB_KEY }}' },
        { name: 'Content-Type', value: 'application/json' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ p_limit: 3 }) }}',
      options: {},
    },
  },
});

const jobs = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Jobs',
    parameters: {
      jsCode: "// Une ligne par piece a etudier. Zero ligne = rien a faire, et la suite\n// ne s'execute pas : c'est le bon comportement pour un flux periodique.\nconst o = $input.first().json || {};\nreturn (o.jobs || []).map(j => ({ json: j }));",
    },
  },
});

const signer = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Sign the image',
    parameters: {
      method: 'POST',
      url: '={{ "https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/luxury-pieces/" + encodeURI($json.photo_path) }}',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: '={{ $env.SB_KEY || $vars.SB_KEY }}' },
        { name: 'Authorization', value: '=Bearer {{ $env.SB_KEY || $vars.SB_KEY }}' },
        { name: 'Content-Type', value: 'application/json' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ expiresIn: 900 }) }}',
      options: {},
    },
  },
});

const demande = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare the question',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: "// La question se prepare ICI, en clair : le noeud HTTP n'envoie qu'elle.\n// Ce qui est demande, c'est ce qui decide la peinture : la matiere, son\n// grain, sa finition, l'appret qui tient dessus et les pigments qui plient.\nconst j = $('Jobs').item.json;\nconst url = 'https://abujjbkbbiumxrokozph.supabase.co/storage/v1' + ($json.signedURL || $json.signedUrl || '');\nconst quoi = [j.brand, j.product].filter(Boolean).join(' ') || (j.piece || 'piece');\nconst body = {\n  model: 'gpt-4o',\n  max_tokens: 700,\n  response_format: { type: 'json_object' },\n  messages: [\n    { role: 'system', content: 'You are a master conservator of luxury leather goods and textiles, and a specialist of bespoke hand-painting on them. You read one photograph of one piece and you answer only with what the image supports. You never invent a material you cannot see. You always answer with a JSON object.' },\n    { role: 'user', content: [\n      { type: 'text', text: 'Piece: ' + quoi + '. Study its material for a hand-painted artwork that must survive folding, rain and UV for decades. Answer with JSON holding exactly these keys: material (the substrate, two or three words), grain, finish (the coating or treatment you can see), preparation (degreasing and abrasion needed), primer (the family of adhesion primer that fits this exact material), pigments (the family of paints that fits), flex (how much the painted zone will bend), risks (array of short strings), confidence (0 to 1), summary (one sentence for the owner, in English).' },\n      { type: 'image_url', image_url: { url: url, detail: 'high' } }\n    ] }\n  ]\n};\nreturn { json: { id: j.id, test: !!j.test, body } };",
    },
  },
});

const lire = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Read the material',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Authorization', value: '=Bearer {{ $env.OPENAI_KEY || $vars.OPENAI_KEY }}' },
        { name: 'Content-Type', value: 'application/json' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.body) }}',
      options: { timeout: 120000 },
    },
  },
});

const relire = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Keep what it said',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: "// Une panne DIT pourquoi : elle ne laisse jamais la piece coincee (la\n// reservation retombe au bout de 30 minutes et le flux la reprend).\nconst id = $('Prepare the question').item.json.id;\nconst r = $json || {};\nlet etude = null, panne = null;\ntry {\n  const c = r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;\n  if (!c) throw new Error(String((r.error && r.error.message) || r.message || 'no answer').slice(0, 110));\n  etude = JSON.parse(c);\n} catch (e) { panne = String((e && e.message) || e).slice(0, 200); }\nreturn { json: { id, etude, panne } };",
    },
  },
});

const ecrire = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Write the study',
    parameters: {
      method: 'POST',
      url: 'https://abujjbkbbiumxrokozph.supabase.co/rest/v1/rpc/luxury_material_set',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: '={{ $env.SB_KEY || $vars.SB_KEY }}' },
        { name: 'Authorization', value: '=Bearer {{ $env.SB_KEY || $vars.SB_KEY }}' },
        { name: 'Content-Type', value: 'application/json' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ p_id: $json.id, p_material: $json.etude, p_error: $json.panne }) }}',
      options: {},
    },
  },
});

export default workflow('totehm-l-luxury-material', 'TOTEHM L — Luxury material study')
  .add(toutes)
  .to(reserver)
  .to(jobs)
  .to(signer)
  .to(demande)
  .to(lire)
  .to(relire)
  .to(ecrire);
