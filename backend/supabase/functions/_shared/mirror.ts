// TOTEHM · _shared/mirror.ts — le miroir du Higher Self · 22/10/2026
// why : Wah — « il faut aussi bien prendre en compte les boxes Habit : on demande un WHERE, les intentions et le type
//       de son ; il faut que le LLM reprenne tout cela et le formule à sa sauce… comment les 5 vues sont
//       interconnectées, et comment créer un superbe miroir ». Le Higher Self lisait des listes plates.
// how : PUR (aucun réseau, aucun Deno) — `higher-self` l'importe, `tests/fn/mirror.mjs` le teste sous Node.
//       `contexteMiroir` écrit MON TOTEHM comme un système : chaque box avec ce qu'elle porte et ce qui la relie
//       (→), plus les lieux réels près de moi (Higher). `verifierMiroir` dit si chaque citation existe vraiment ;
//       `lieuDe` ne rend un lieu QUE s'il fait partie de ceux donnés (ou le where de MA Habit) — jamais inventé.
// what : texte · { dir, teach, step } · Lieu | null

export type MHabit = {
  text: string; is?: string[]; freq?: string | null; where?: string | null;
  objectives?: string[]; repulsions?: string[]; media?: number;
  spot?: { state?: string; city?: string | null; at?: string } | null;
};
export type MObj = { text: string; is?: string[]; by?: string | null; days_left?: number | null; habits?: string[]; visions?: string[]; teachings?: string[] };
export type MRep = { text: string; obstacle?: string | null; is?: string[]; habits?: string[]; teachings?: string[] };
export type MVis = { text: string; is?: string[]; objectives?: string[] };
export type MWis = { text: string; is?: string[]; objectives?: string[]; repulsions?: string[] };
export type Sound = { kind?: string | null; artist?: string | null; platform?: string | null };
export type Mirror = { habits?: MHabit[]; objectives?: MObj[]; repulsions?: MRep[]; visions?: MVis[]; wisdom?: MWis[]; sounds?: Record<string, Sound> };
export type Lieu = {
  id: string; kind: "place" | "event"; ref?: string; name: string; type?: string | null; address?: string | null;
  venue?: string | null; city?: string | null; at?: string | null; url?: string | null;
  lat?: number | null; lng?: number | null; km?: number | null; is?: string[]; rating?: number | null;
};
export type LieuChoisi = {
  kind: "place" | "event" | "mine"; name: string; address?: string | null; city?: string | null; at?: string | null;
  url?: string | null; maps?: string | null; lat?: number | null; lng?: number | null; km?: number | null; when?: string | null;
};

const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const q = (v: unknown, n = 140) => `"${clean(v, n)}"`;
const liste = (l: unknown[] | undefined, n = 3) => (l ?? []).filter((x) => clean(x, 140)).slice(0, n).map((x) => q(x)).join(", ");
const ETAT: Record<string, string> = { will: "I will be there", am: "I am there now", was: "I was there" };
const JOURS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Une date ISO (UTC) à l'heure du membre : `tz` = `getTimezoneOffset()` de sa page (minutes, UTC − local). */
export function local(iso: string | null | undefined, tz = 0): string {
  const d = new Date(String(iso ?? ""));
  if (isNaN(d.getTime())) return "";
  const l = new Date(d.getTime() - tz * 60000), p = (n: number) => String(n).padStart(2, "0");
  return `${JOURS[l.getUTCDay()]} ${l.getUTCFullYear()}-${p(l.getUTCMonth() + 1)}-${p(l.getUTCDate())} ${p(l.getUTCHours())}:${p(l.getUTCMinutes())}`;
}

/** Le son de la première intention de la Habit qui en porte un (un son appartient à l'intention, partout). */
function sonDe(h: MHabit, sons: Record<string, Sound>): string {
  for (const i of h.is ?? []) {
    const s = sons[i];
    if (s && clean(s.kind, 60)) return `sound for ${i}: ${q(s.kind, 60)}${clean(s.artist, 40) ? " (" + clean(s.artist, 40) + ")" : ""}`;
  }
  return "";
}

/** MON TOTEHM comme un système de cinq vues, relié — et, pour Higher, les lieux réels près de moi. */
export function contexteMiroir(m: Mirror | null, now: string, lieux: Lieu[] = [], tz = 0): string {
  const M: Mirror = m ?? {}, sons: Record<string, Sound> = M.sounds ?? {};
  const L: string[] = [`Now (my local time): ${clean(now, 40) || new Date().toISOString().slice(0, 16)}`,
    "MY TOTEHM — one system in five views. Every quoted text is a box I wrote; → is how my boxes hold each other."];
  const bloc = (titre: string, lignes: string[]) => { if (lignes.length) L.push(titre, ...lignes); };

  bloc("HABITS (what I execute, my present):", (M.habits ?? []).filter((h) => clean(h.text, 140)).slice(0, 12).map((h) => {
    const b = [q(h.text)];
    if (h.is?.length) b.push("intentions: " + h.is.slice(0, 3).join(", "));
    if (clean(h.freq, 40)) b.push("rhythm: " + clean(h.freq, 40).replace(/_/g, " "));
    if (clean(h.where, 120)) b.push("where: " + q(h.where, 120));
    const s = sonDe(h, sons); if (s) b.push(s);
    if (h.objectives?.length) b.push("→ serves " + liste(h.objectives));
    if (h.repulsions?.length) b.push("→ threatened by " + liste(h.repulsions));
    if (h.media) b.push(`${h.media} media of it`);
    if (h.spot?.state) b.push(`last spot: ${ETAT[h.spot.state] ?? h.spot.state}${clean(h.spot.city, 40) ? ", " + clean(h.spot.city, 40) : ""}${h.spot.at ? ", " + String(h.spot.at).slice(0, 10) : ""}`);
    return "- " + b.join(" · ");
  }));
  bloc("OBJECTIVES (what I will achieve, my near future):", (M.objectives ?? []).filter((o) => clean(o.text, 140)).slice(0, 10).map((o) => {
    const b = [q(o.text)];
    if (o.by) b.push(`by ${String(o.by).slice(0, 10)}${o.days_left != null ? ` (${o.days_left} days left)` : ""}`);
    if (o.visions?.length) b.push("→ for my vision " + liste(o.visions, 2));
    if (o.habits?.length) b.push("→ executed by " + liste(o.habits));
    if (o.teachings?.length) b.push("→ my story teaches " + liste(o.teachings, 2));
    return "- " + b.join(" · ");
  }));
  bloc("REPULSIONS (what triggers me, what I refuse):", (M.repulsions ?? []).filter((r) => clean(r.text, 140)).slice(0, 8).map((r) => {
    const b = [q(r.text)];
    if (clean(r.obstacle, 140)) b.push("obstacle: " + q(r.obstacle));
    if (r.habits?.length) b.push("→ threatens " + liste(r.habits));
    if (r.teachings?.length) b.push("→ my story says " + liste(r.teachings, 2));
    return "- " + b.join(" · ");
  }));
  bloc("VISIONS (my dreamed future):", (M.visions ?? []).filter((v) => clean(v.text, 140)).slice(0, 6).map((v) =>
    "- " + [q(v.text), ...(v.objectives?.length ? ["→ reached through " + liste(v.objectives)] : [])].join(" · ")));
  bloc("MY STORY (what I lived, what I believe):", (M.wisdom ?? []).filter((w) => clean(w.text, 140)).slice(0, 8).map((w) =>
    "- " + [q(w.text), ...(w.objectives?.length ? ["→ teaches me for " + liste(w.objectives, 2)] : []),
            ...(w.repulsions?.length ? ["→ holds me against " + liste(w.repulsions, 2)] : [])].join(" · ")));
  const ss = Object.entries(sons).filter(([, s]) => clean(s?.kind, 60)).map(([i, s]) => `${i}: ${q(s.kind, 60)}`);
  if (ss.length) L.push("MY SOUNDS (one per intention): " + ss.join(" | "));
  if (lieux.length) {
    L.push("PLACES NEAR ME (real, verified; use one only if it truly fits the step, by its id):");
    for (const p of lieux.slice(0, 14)) {
      const b = [p.id, q(p.name, 80)];
      if (p.kind === "event") { if (clean(p.venue, 60)) b.push("at " + clean(p.venue, 60)); b.push(local(p.at, tz)); }
      else if (clean(p.type, 40)) b.push(clean(p.type, 40).replace(/_/g, " "));
      if (p.km != null) b.push(`${p.km} km`);
      if (p.is?.length) b.push(p.is.slice(0, 3).join(", "));
      L.push(b.filter(Boolean).join(" · "));
    }
  }
  return L.join("\n").slice(0, 7000);
}

// Les citations, vérifiées contre MON TOTEHM (mot pour mot, casse, guillemets et blancs ignorés).
export const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[“”«»"]/g, "").replace(/\s+/g, " ")
  .replace(/^[\s.,;:!?-]+|[\s.,;:!?-]+$/g, "").trim();
export function verifierMiroir(txt: string, m: Mirror | null): Record<string, boolean | null> {
  const M: Mirror = m ?? {}, t = (l: { text?: string }[] | undefined) => (l ?? []).map((x) => norm(x?.text)).filter(Boolean);
  const L: Record<string, string[]> = { objective: t(M.objectives), vision: t(M.visions), wisdom: t(M.wisdom),
                                        repulsion: t(M.repulsions), habit: t(M.habits) };
  const out: Record<string, boolean | null> = { dir: null, teach: null, step: null };
  for (const l of String(txt ?? "").split("\n")) {
    const x = /^\s*@(dir|teach|step)\b\s*([a-z]*)\s*(?:"([^"]+)"|“([^”]+)”)?/i.exec(l);
    if (!x) continue;
    const ref = (x[3] ?? x[4] ?? "").trim();
    out[x[1].toLowerCase()] = ref ? (L[(x[2] || "").toLowerCase()] ?? []).includes(norm(ref)) : null;
  }
  return out;
}

/** La ligne `@place <id|mine|none> <YYYY-MM-DDTHH:MM|none>` → le lieu, seulement s'il est VRAI : un des lieux donnés,
 *  ou le where de la Habit citée par la step (`mine`). Rien d'autre ne sort, quoi que le modèle écrive. */
export function lieuDe(txt: string, lieux: Lieu[], m: Mirror | null): LieuChoisi | null {
  const ls = String(txt ?? "").split("\n").map((l) => l.trim());
  const pl = ls.map((l) => /^@place\s+([A-Za-z]+\d*)(?:\s+(\S+))?/i.exec(l)).find(Boolean);
  if (!pl) return null;
  const id = pl[1], w = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(pl[2] ?? "") ? pl[2]! : null;
  if (/^mine$/i.test(id)) {
    const st = ls.map((l) => /^@step\s+habit\s*(?:"([^"]+)"|“([^”]+)”)/i.exec(l)).find(Boolean);
    const ref = st ? norm(st[1] ?? st[2]) : "";
    const h = ref ? (m?.habits ?? []).find((x) => norm(x.text) === ref) : undefined;
    return h && clean(h.where, 120) ? { kind: "mine", name: clean(h.where, 120), when: w } : null;
  }
  const p = lieux.find((x) => x.id.toUpperCase() === id.toUpperCase());
  if (!p) return null;
  const maps = p.kind === "place"
    ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([p.name, p.address].filter(Boolean).join(", "))
      + (p.ref ? "&query_place_id=" + encodeURIComponent(p.ref) : "")
    : (p.lat != null && p.lng != null ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : null);
  return { kind: p.kind, name: clean(p.name, 100), address: p.kind === "place" ? clean(p.address, 140) || null : clean(p.venue, 80) || null,
           city: clean(p.city, 60) || null, at: p.kind === "event" ? p.at ?? null : null,
           url: p.kind === "event" && /^https:\/\//.test(String(p.url ?? "")) ? String(p.url) : null, maps,
           lat: p.lat ?? null, lng: p.lng ?? null, km: p.km ?? null, when: w };
}
