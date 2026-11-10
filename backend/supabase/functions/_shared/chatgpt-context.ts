// Owner-only, read-only projections for the ChatGPT connector. No model prompt,
// Deno globals or network imports: the graph/selection helpers are pure and testable.
// The caller MUST resolve uid from its validated connector authentication.

export type ElementKind = "habit" | "objective" | "repulsion" | "vision" | "wisdom";
export type ElementRef = { kind: ElementKind; ref: string };
export type Purpose = "action" | "direction" | "replacement" | "explicit";
export type ContextOptions = {
  query: string;
  purpose: Purpose;
  limit?: number;
  focus?: ElementRef;
  intentions?: string[];
  kinds?: ElementKind[];
  search_terms?: string[];
  include_sound?: boolean;
  exclude?: ElementRef[];
  text_offset?: number;
  review?: boolean;
};
export type ContextItem = ElementRef & {
  key: string;
  text: string;
  url?: string;
  text_length?: number;
  text_truncated?: boolean;
  text_offset?: number;
  next_text_offset?: number;
  intentions: string[];
  intention_source: "explicit" | "inherited" | "legacy" | "none";
  freq?: string;
  where?: string;
  target_at?: string;
  obstacle?: string;
  rank?: number;
  rank_source?: "member_order" | "saved_order" | "importance" | "default";
  target_state?: "past_target" | "future_target";
};
export type Relation = "serves" | "instead" | "towards" | "learned_from" | "informs";
export type ContextEdge = {
  from: string;
  to: string;
  relation: Relation;
  provenance: string[];
};
export type ContextGraph = {
  items: ContextItem[];
  edges: ContextEdge[];
  truncated: boolean;
};
export type ContextResult = ContextGraph & {
  generated_at: string;
  purpose: Purpose;
  selection: "focus" | "lexical" | "intentions" | "ranked" | "fallback" | "empty";
  source: "owner_totehm";
  sounds?: Awaited<ReturnType<typeof getSounds>>;
  coverage?: { source_complete: boolean; more_matches: boolean; omitted_related: boolean };
  review?: {
    complete: boolean;
    counts: Record<ElementKind, number>;
    gaps: { element: ElementRef; missing: "habit" | "objective" | "vision"; url: string }[];
    more_gaps: boolean;
  };
};

type Row = Record<string, unknown>;
export type GraphSnapshot = {
  steps?: unknown[];
  objectives?: Row[];
  repulsions?: Row[];
  visions?: Row[];
  wisdom?: Row[];
  objective_habits?: Row[];
  repulsion_habits?: Row[];
  objective_visions?: Row[];
  repulsion_teachings?: Row[];
  teaching_objectives?: Row[];
  habit_spots?: Row[];
  element_orders?: Row[];
  truncated?: boolean;
};

// Supabase query builders are PromiseLike; keeping this structural type avoids
// importing an SDK (and lets tests use an in-memory query builder).
export interface ReadQuery extends PromiseLike<{ data: unknown; error: unknown }> {
  select(columns: string): ReadQuery;
  eq(column: string, value: unknown): ReadQuery;
  is(column: string, value: null): ReadQuery;
  or(filters: string): ReadQuery;
  in(column: string, values: string[]): ReadQuery;
  gt(column: string, value: string): ReadQuery;
  lte(column: string, value: string): ReadQuery;
  order(column: string, options?: { ascending?: boolean }): ReadQuery;
  limit(count: number): ReadQuery;
}
export type ReadClient = { from(table: string): { select(columns: string): ReadQuery } };

export class ContextReadError extends Error {
  code: "invalid_request" | "read_failed";
  constructor(code: "invalid_request" | "read_failed") {
    super(code);
    this.name = "ContextReadError";
    this.code = code;
  }
}

const INTENTIONS = ["fight", "flow", "enrich", "love", "express", "focus", "celebrate"];
const KINDS: ElementKind[] = ["habit", "objective", "repulsion", "vision", "wisdom"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROWS = 400;
const MAX_ITEMS = 12;
const MAX_TEXT = 64000;
const TEXT_PAGE = 4000;
export const HABIT_REF_MAX = 16000;
// Offsets remain UTF-16 indexes, but an excerpt never cuts an emoji in half.
const textEnd = (value: string, end: number): number => end > 0 && end < value.length &&
  /[\uD800-\uDBFF]/.test(value[end - 1]) && /[\uDC00-\uDFFF]/.test(value[end]) ? end - 1 : end;
const own = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const string = (value: unknown): string => typeof value === "string" ? value : "";
const text = (value: unknown, max = 500): string => string(value).replace(/\s+/g, " ").trim().slice(0, max);
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(own) : [];
const cap = (limit: unknown, fallback = 6): number => typeof limit === "number" && Number.isFinite(limit)
  ? Math.max(1, Math.min(MAX_ITEMS, Math.floor(limit))) : fallback;
const intentions = (value: unknown): string[] => {
  const found = new Set(Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);
  return INTENTIONS.filter((v) => found.has(v));
};

/** Keys are references, not credentials. Habit references preserve server text;
 * every network read is also constrained to authenticated owner uid. */
export function elementKey(ref: ElementRef): string {
  return `${ref.kind}:${encodeURIComponent(ref.ref)}`;
}

export function validElementRef(value: unknown): value is ElementRef {
  const ref = own(value);
  if (!KINDS.includes(ref.kind as ElementKind) || typeof ref.ref !== "string") return false;
  if (ref.kind === "habit") return ref.ref.length > 0 && ref.ref.length <= HABIT_REF_MAX && ref.ref === ref.ref.trim();
  if (ref.kind === "repulsion") return /^[1-9][0-9]{0,18}$/.test(ref.ref);
  return UUID.test(ref.ref);
}

/** Fragments never reach HTTP logs. A link is a locator, never an access grant. */
export function elementURL(value: ElementRef, member?: string): string {
  if (!validElementRef(value)) throw new ContextReadError("invalid_request");
  return "https://www.totehm.com/totehm" + (member ? "?ro=" + encodeURIComponent(member) : "") +
    "#" + new URLSearchParams({ element: value.kind, ref: value.ref });
}

function validateOwner(uid: string): void {
  if (!UUID.test(uid)) throw new ContextReadError("invalid_request");
}

function validateOptions(options: ContextOptions): void {
  if (!options || typeof options.query !== "string" || options.query.length > 2000 ||
    !["action", "direction", "replacement", "explicit"].includes(options.purpose) ||
    (options.focus !== undefined && !validElementRef(options.focus)) ||
    (options.intentions !== undefined && (!Array.isArray(options.intentions) || options.intentions.length > 7 || options.intentions.some(i => !INTENTIONS.includes(i)))) ||
    (options.kinds !== undefined && (!Array.isArray(options.kinds) || options.kinds.length > 5 || options.kinds.some(k => !KINDS.includes(k)))) ||
    (options.search_terms !== undefined && (!Array.isArray(options.search_terms) || options.search_terms.length > 8 || options.search_terms.some(t => typeof t !== "string" || !t.trim() || t.length > 120))) ||
    (options.include_sound !== undefined && typeof options.include_sound !== "boolean") ||
    (options.exclude !== undefined && (!Array.isArray(options.exclude) || options.exclude.length > 12 || options.exclude.some(v => !validElementRef(v)))) ||
    (options.text_offset !== undefined && (!options.focus || !Number.isInteger(options.text_offset) || options.text_offset < 0 || options.text_offset > MAX_TEXT)) ||
    (options.review !== undefined && (typeof options.review !== "boolean" || (options.review && (options.purpose !== "explicit" || !!options.focus))))) {
    throw new ContextReadError("invalid_request");
  }
}

/** Build the five real element types and only edges whose endpoints exist.
 * All snapshots must already be owner-filtered. No UUID is invented for Habits. */
export function projectGraph(snapshot: GraphSnapshot): ContextGraph {
  const items: ContextItem[] = [];
  const byKey = new Map<string, ContextItem>();
  const edges = new Map<string, ContextEdge>();
  let truncated = !!snapshot.truncated;
  const take = <T>(all: T[] | undefined): T[] => {
    if ((all?.length ?? 0) > MAX_ROWS) truncated = true;
    return (all ?? []).slice(0, MAX_ROWS);
  };
  const add = (item: ContextItem) => {
    if (item.text && !byKey.has(item.key)) { items.push(item); byKey.set(item.key, item); }
  };
  const make = (kind: ElementKind, ref: string, label: unknown): ContextItem | null => {
    if (!validElementRef({ kind, ref })) return null;
    const full = string(label).trim();
    const item: ContextItem = { kind, ref, key: elementKey({ kind, ref }), text: full.slice(0, textEnd(full, MAX_TEXT)),
      text_length: full.length, text_truncated: full.length > MAX_TEXT,
      url: elementURL({ kind, ref }), intentions: [], intention_source: "none" };
    return item.text ? item : null;
  };
  const spots = new Map(take(snapshot.habit_spots).map((r) => [string(r.habit_text), text(r.place, 160)]));
  const steps = take(snapshot.steps).map(own);
  for (const step of steps) {
    // t0 and hN belong to the browser. In persisted steps, t is the server key.
    const ref = string(step.t);
    const item = make("habit", ref, ref);
    if (!item) continue;
    const declared = intentions(step.is);
    const legacy = intentions([step.i]);
    item.intentions = declared.length ? declared : legacy;
    item.intention_source = declared.length ? "explicit" : legacy.length ? "legacy" : "none";
    if (text(step.f, 60)) item.freq = text(step.f, 60);
    item.rank = items.filter(i => i.kind === "habit").length + 1;
    item.rank_source = "saved_order";
    if (spots.get(ref)) item.where = spots.get(ref);
    add(item);
  }
  for (const [kind, records] of [
    ["objective", snapshot.objectives], ["repulsion", snapshot.repulsions],
    ["vision", snapshot.visions], ["wisdom", snapshot.wisdom],
  ] as const) {
    // Archives must not consume the active graph's row budget.
    const active = records?.filter(row => kind === "objective" ? !["achieved", "abandoned", "converted"].includes(string(row.status))
      : kind === "repulsion" ? row.active === true : true);
    for (const row of take(active)) {
      if (kind === "objective" && ["achieved", "abandoned", "converted"].includes(string(row.status))) continue;
      if (kind === "repulsion" && row.active !== true) continue;
      // bigint may arrive as a number from PostgREST; unsafe numbers cannot
      // faithfully identify a row and are omitted rather than rounded.
      const ref = typeof row.id === "number" && Number.isSafeInteger(row.id) ? String(row.id) : string(row.id);
      const item = make(kind, ref, kind === "repulsion" ? row.repulsion : row.text);
      if (!item) continue;
      if (kind === "objective" && Number.isFinite(Date.parse(string(row.target_at)))) {
        item.target_at = string(row.target_at);
        item.target_state = Date.parse(item.target_at) < Date.now() ? "past_target" : "future_target";
      }
      if (typeof row.importance === "number" && Number.isFinite(row.importance)) {
        item.rank = row.importance;
        item.rank_source = "importance";
      }
      if (kind === "repulsion" && text(row.obstacle, 300)) item.obstacle = text(row.obstacle, 300);
      add(item);
    }
  }
  const edge = (from: ElementRef, to: ElementRef, relation: Relation, provenance: string) => {
    const a = elementKey(from), b = elementKey(to);
    if (!byKey.has(a) || !byKey.has(b)) return;
    const id = `${a}\0${relation}\0${b}`;
    const previous = edges.get(id);
    if (previous) { if (!previous.provenance.includes(provenance)) previous.provenance.push(provenance); }
    else edges.set(id, { from: a, to: b, relation, provenance: [provenance] });
  };
  for (const step of steps) edge({ kind: "habit", ref: string(step.t) }, { kind: "objective", ref: string(step.o) }, "serves", "totehms.steps.o");
  for (const row of take(snapshot.objective_habits)) edge({ kind: "habit", ref: string(row.habit_text) }, { kind: "objective", ref: string(row.objective_id) }, "serves", "objective_habits");
  const repRef = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) ? String(v) : string(v);
  for (const row of take(snapshot.repulsions)) edge({ kind: "repulsion", ref: repRef(row.id) }, { kind: "habit", ref: string(row.habit_text) }, "instead", "repulsions.habit_text");
  for (const row of take(snapshot.repulsion_habits)) edge({ kind: "repulsion", ref: repRef(row.repulsion_id) }, { kind: "habit", ref: string(row.habit_text) }, "instead", "repulsion_habits");
  for (const row of take(snapshot.objective_visions)) edge({ kind: "objective", ref: string(row.objective_id) }, { kind: "vision", ref: string(row.vision_id) }, "towards", "objective_visions");
  for (const row of take(snapshot.repulsion_teachings)) edge({ kind: "wisdom", ref: string(row.wisdom_id) }, { kind: "repulsion", ref: repRef(row.repulsion_id) }, "learned_from", "repulsion_teachings");
  for (const row of take(snapshot.teaching_objectives)) edge({ kind: "wisdom", ref: string(row.wisdom_id) }, { kind: "objective", ref: string(row.objective_id) }, "informs", "teaching_objectives");
  const list = [...edges.values()];
  const habitsFor = (item: ContextItem): ContextItem[] => {
    if (item.kind === "habit") return [item];
    const direct = item.kind === "objective" ? list.filter((e) => e.relation === "serves" && e.to === item.key).map((e) => e.from)
      : item.kind === "repulsion" ? list.filter((e) => e.relation === "instead" && e.from === item.key).map((e) => e.to) : [];
    if (item.kind === "vision") {
      for (const e of list.filter((e) => e.relation === "towards" && e.to === item.key)) {
        for (const h of list.filter((h) => h.relation === "serves" && h.to === e.from)) direct.push(h.from);
      }
    }
    // Match UI inheritance, which follows Repulsions, not teaching_objectives.
    if (item.kind === "wisdom") {
      for (const e of list.filter((e) => e.relation === "learned_from" && e.from === item.key)) {
        for (const h of list.filter((h) => h.relation === "instead" && h.from === e.to)) direct.push(h.to);
      }
    }
    return [...new Set(direct)].map((key) => byKey.get(key)!).filter(Boolean);
  };
  for (const item of items.filter((i) => i.kind !== "habit")) {
    item.intentions = intentions(habitsFor(item).flatMap((h) => h.intentions));
    item.intention_source = item.intentions.length ? "inherited" : "none";
  }
  // Order only known items. Hidden member refs must never be exposed, including
  // gaps in a member's private ranking. Each view has its own independent rank.
  for (const order of take(snapshot.element_orders)) {
    const refs = Array.isArray(order.refs) ? order.refs.filter(r => typeof r === "string") : [];
    let position = 0;
    if (order.kind === "habit") {
      for (const item of items.filter(i => i.kind === "habit")) item.rank_source = "member_order";
      continue;
    }
    for (const ref of [...new Set(refs)]) {
      const item = byKey.get(elementKey({ kind: order.kind as ElementKind, ref }));
      if (item) { item.rank = ++position; item.rank_source = "member_order"; }
    }
  }
  return { items, edges: list, truncated };
}

const normalize = (v: string) => v.normalize("NFKD").toLowerCase()
  .replace(/(\p{Script=Latin})\p{M}+/gu, "$1").normalize("NFC").replace(/\s+/g, " ").trim();
// ICU word boundaries work across scripts, including those without spaces.
// Semantic interpretation/translation belongs to the calling model, not a
// finite language/synonym dictionary or an extra paid model in this server.
const segmenter = new Intl.Segmenter("und", { granularity: "word" });
function matchesTerm(value: string, term: string): boolean {
  const label = normalize(value), needle = normalize(term);
  if (!needle) return false;
  const boundaries = new Set<number>([0, label.length]);
  for (const part of segmenter.segment(label)) { boundaries.add(part.index); boundaries.add(part.index + part.segment.length); }
  let at = label.indexOf(needle);
  while (at >= 0) {
    if (boundaries.has(at) && boundaries.has(at + needle.length)) return true;
    at = label.indexOf(needle, at + 1);
  }
  return false;
}

/** Select a small connected subset, never all personal records by default. */
export function projectContext(graph: ContextGraph, options: ContextOptions): ContextResult {
  validateOptions(options);
  const limit = cap(options.limit);
  // Legacy calls match the whole query, never a filler token such as “est”.
  const terms = options.search_terms ?? (options.query.trim() ? [options.query] : []);
  const selectedIntentions = options.intentions ?? [];
  const excluded = new Set((options.exclude ?? []).map(elementKey));
  const byKey = new Map(graph.items.map((item) => [item.key, item]));
  const priority = (item: ContextItem): number => options.purpose === "replacement" ? (item.kind === "repulsion" ? 4 : item.kind === "habit" ? 2 : 0)
    : options.purpose === "direction" ? (item.kind === "objective" ? 4 : item.kind === "vision" ? 3 : item.kind === "wisdom" ? 1 : 0)
    : (item.kind === "habit" ? 4 : item.kind === "objective" ? 2 : 0);
  const ranked = graph.items.map((item) => {
    const matches = terms.filter(term => [item.text, item.where ?? "", item.obstacle ?? ""].some(value => matchesTerm(value, term))).length;
    const eligible = !excluded.has(item.key) && (!options.kinds?.length || options.kinds.includes(item.kind)) &&
      (!selectedIntentions.length || selectedIntentions.some(i => item.intentions.includes(i)));
    const order = item.rank_source === "member_order" ? 0 : item.rank_source === "importance" ? 1 : item.rank_source === "saved_order" ? 2 : 3;
    return { item, score: matches * 10, priority: priority(item), eligible, order };
  }).sort((a, b) => b.score - a.score || b.priority - a.priority ||
    (a.item.kind === b.item.kind ? a.order - b.order || (a.item.rank ?? Infinity) - (b.item.rank ?? Infinity) : 0) ||
    a.item.key.localeCompare(b.item.key));
  const rankIndex = new Map(ranked.map((r, n) => [r.item.key, n]));
  const adjacent = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!byKey.has(edge.from) || !byKey.has(edge.to)) continue;
    adjacent.set(edge.from, [...(adjacent.get(edge.from) ?? []), edge.to]);
    adjacent.set(edge.to, [...(adjacent.get(edge.to) ?? []), edge.from]);
  }
  for (const keys of adjacent.values()) keys.sort((a, b) => rankIndex.get(a)! - rankIndex.get(b)!);
  const eligible = ranked.filter(r => r.eligible);
  const matched = eligible.filter(r => r.score > 0);
  let selection: ContextResult["selection"] = "empty";
  let seeds: ContextItem[] = [];
  let review: ContextResult["review"];
  if (options.review) {
    const counts = Object.fromEntries(KINDS.map(k => [k, graph.items.filter(i => i.kind === k).length])) as Record<ElementKind, number>;
    // Never claim a link is absent when capped source rows may contain it.
    const gaps: NonNullable<ContextResult["review"]>["gaps"] = [];
    if (!graph.truncated) for (const kind of ["objective", "repulsion", "vision", "habit"] as ElementKind[]) {
      for (const { item } of eligible.filter(r => r.item.kind === kind)) {
        const linked = kind === "objective" ? graph.edges.some(e => e.relation === "serves" && e.to === item.key)
          : kind === "repulsion" ? graph.edges.some(e => e.relation === "instead" && e.from === item.key)
          : kind === "vision" ? graph.edges.some(e => e.relation === "towards" && e.to === item.key)
          : graph.edges.some(e => e.relation === "serves" && e.from === item.key);
        if (!linked) gaps.push({ element: { kind: item.kind, ref: item.ref },
          missing: kind === "vision" || kind === "habit" ? "objective" : "habit", url: item.url ?? elementURL(item) });
      }
    }
    review = { complete: !graph.truncated, counts, gaps: gaps.slice(0, limit), more_gaps: gaps.length > limit };
    seeds = review.gaps.map(g => byKey.get(elementKey(g.element))!);
    if (!seeds.length) seeds = options.kinds?.length
      ? options.kinds.flatMap(k => eligible.find(r => r.item.kind === k)?.item ?? []).slice(0, limit)
      : KINDS.flatMap(k => eligible.find(r => r.item.kind === k)?.item ?? []).slice(0, limit);
    if (seeds.length) selection = "ranked";
  } else if (options.focus) {
    const seed = byKey.get(elementKey(options.focus));
    if (seed) { seeds = [seed]; selection = "focus"; }
  } else if (matched.length) {
    seeds = matched.slice(0, Math.min(2, limit)).map(r => r.item); selection = "lexical";
  } else if (!options.search_terms?.length) {
    seeds = options.kinds?.length
      ? options.kinds.flatMap(k => eligible.find(r => r.item.kind === k)?.item ?? []).slice(0, limit)
      : eligible.slice(0, Math.min(2, limit)).map(r => r.item);
    if (seeds.length) selection = selectedIntentions.length ? "intentions" : "ranked";
  }
  // Store shortest recorded paths, up to the full five-view chain. A path's
  // intermediates must fit too: never return a vision detached from its why.
  function pathsFrom(seed: ContextItem) {
    const paths = new Map<string, string[]>([[seed.key, [seed.key]]]);
    let frontier = [seed.key];
    for (let depth = 0; depth < 4 && frontier.length; depth++) {
      const next: string[] = [];
      for (const key of frontier) for (const neighbour of adjacent.get(key) ?? []) {
        if (paths.has(neighbour)) continue;
        paths.set(neighbour, [...paths.get(key)!, neighbour]); next.push(neighbour);
      }
      frontier = next;
    }
    return paths;
  }
  const chosen = new Map<string, ContextItem>();
  const candidates = new Set<string>();
  const addPath = (keys: string[]) => {
    if (chosen.size + keys.filter(k => !chosen.has(k)).length > limit) return false;
    for (const key of keys) chosen.set(key, byKey.get(key)!);
    return true;
  };
  // An explicit overview/review gives each requested starting view a place.
  if (options.review || options.kinds?.length) for (const seed of seeds) addPath([seed.key]);
  for (const seed of seeds) {
    const paths = pathsFrom(seed);
    for (const key of paths.keys()) candidates.add(key);
    if (!addPath([seed.key])) continue;
    const kindOrder: ElementKind[] = options.purpose === "replacement"
      ? ["habit", "wisdom", "objective", "vision", "repulsion"]
      : options.purpose === "direction" ? ["vision", "habit", "repulsion", "wisdom", "objective"]
      : ["objective", "vision", "repulsion", "wisdom", "habit"];
    for (const kind of kindOrder) {
      if ([...chosen.values()].some(i => i.kind === kind)) continue;
      const path = [...paths.values()].filter(p => byKey.get(p.at(-1)!)?.kind === kind)
        .sort((a, b) => a.length - b.length || rankIndex.get(a.at(-1)!)! - rankIndex.get(b.at(-1)!)!)
        .find(p => chosen.size + p.filter(k => !chosen.has(k)).length <= limit);
      if (path) addPath(path);
    }
  }
  for (const key of candidates) if (chosen.size < limit) addPath([key]);
  const items = [...chosen.values()].map(item => {
    const exact = options.focus && item.key === elementKey(options.focus);
    const offset = exact ? options.text_offset ?? 0 : 0;
    if (exact && offset > 0 && /[\uD800-\uDBFF]/.test(item.text[offset - 1] ?? "") && /[\uDC00-\uDFFF]/.test(item.text[offset] ?? "")) throw new ContextReadError("invalid_request");
    const end = textEnd(item.text, offset + (exact ? TEXT_PAGE : 500));
    const length = item.text_length ?? item.text.length;
    return { ...item, text: item.text.slice(offset, end), text_length: length,
      text_truncated: offset > 0 || end < length || !!item.text_truncated,
      ...(exact ? { text_offset: offset,
        ...(end < item.text.length ? { next_text_offset: end } : {}) } : {}) };
  });
  return {
    source: "owner_totehm", purpose: options.purpose, generated_at: new Date().toISOString(), selection,
    items, edges: graph.edges.filter(e => chosen.has(e.from) && chosen.has(e.to)),
    truncated: graph.truncated || candidates.size > chosen.size || items.some(i => i.text_truncated) ||
      (!options.focus && ranked.some(r => !chosen.has(r.item.key))),
    coverage: { source_complete: !graph.truncated,
      more_matches: (terms.length ? matched : eligible).some(r => !chosen.has(r.item.key)),
      omitted_related: candidates.size > chosen.size },
    ...(review ? { review } : {}),
  };
}

async function ownerRows(client: ReadClient, uid: string, table: string, columns: string): Promise<{ data: Row[]; truncated: boolean }> {
  let query = client.from(table).select(columns).eq("user_id", uid);
  if (table === "objectives") query = query.or("status.is.null,status.not.in.(achieved,abandoned,converted)");
  if (table === "repulsions") query = query.eq("active", true);
  const result = await query.limit(MAX_ROWS + 1);
  if (result.error) throw new ContextReadError("read_failed");
  const all = rows(result.data);
  return { data: all.slice(0, MAX_ROWS), truncated: all.length > MAX_ROWS };
}

async function loadGraph(client: ReadClient, uid: string): Promise<ContextGraph> {
  validateOwner(uid);
  const tables = [
    ["totehms", "steps"], ["objectives", "id,text,status,target_at"],
    // Cast bigint IDs in PostgREST output, before JSON parsing can round them.
    ["repulsions", "id::text,repulsion,obstacle,habit_text,active"], ["visions", "id,text,importance"],
    ["wisdom", "id,text,importance"], ["objective_habits", "objective_id,habit_text"],
    ["repulsion_habits", "repulsion_id::text,habit_text"], ["objective_visions", "objective_id,vision_id"],
    ["repulsion_teachings", "repulsion_id::text,wisdom_id"], ["teaching_objectives", "wisdom_id,objective_id"],
    ["habit_spots", "habit_text,place"], ["element_orders", "kind,refs"],
  ];
  const results = await Promise.all(tables.map(([table, columns]) => ownerRows(client, uid, table, columns)));
  const snapshot: GraphSnapshot = { truncated: results.some((r) => r.truncated) };
  tables.forEach(([table], index) => {
    if (table === "totehms") snapshot.steps = Array.isArray(results[index].data[0]?.steps) ? results[index].data[0].steps as unknown[] : [];
    else (snapshot as Record<string, unknown>)[table] = results[index].data;
  });
  return projectGraph(snapshot);
}

export async function retrieveContext(client: ReadClient, uid: string, options: ContextOptions): Promise<ContextResult> {
  validateOptions(options);
  const result = projectContext(await loadGraph(client, uid), options);
  if (options.include_sound) {
    const selected = [...new Set(result.items.flatMap(i => i.intentions))];
    result.sounds = await getSounds(client, uid, options.intentions?.length
      ? selected.filter(i => options.intentions!.includes(i)) : selected);
  }
  return result;
}

export function retrieveElement(client: ReadClient, uid: string, focus: ElementRef, limit = 6, text_offset = 0): Promise<ContextResult> {
  return retrieveContext(client, uid, { query: "", purpose: "explicit", focus, limit, text_offset });
}

export type SpotOptions = { habit_ref?: string; period?: "now" | "past" | "future"; limit?: number; now?: string };
export async function getSpots(client: ReadClient, uid: string, options: SpotOptions = {}) {
  validateOwner(uid);
  if (options.habit_ref !== undefined && !validElementRef({ kind: "habit", ref: options.habit_ref })) throw new ContextReadError("invalid_request");
  if (options.period && !["now", "past", "future"].includes(options.period)) throw new ContextReadError("invalid_request");
  const instant = options.now ? Date.parse(options.now) : Date.now();
  if (!Number.isFinite(instant)) throw new ContextReadError("invalid_request");
  // No GPS, private storage paths, inferred present location, or other members.
  let query = client.from("spot_plans").select("spot_id,habit,starts_at,duration_min,place,city,mode,audience,status")
    .eq("user_id", uid).eq("status", "published");
  if (options.habit_ref) query = query.eq("habit", options.habit_ref);
  // Filter and sort before the cap: a busy future calendar must not hide an
  // ongoing spot, or return the furthest 400 plans instead of the next ones.
  const asOf = new Date(instant).toISOString();
  if (options.period === "future") query = query.gt("starts_at", asOf);
  else if (options.period) query = query.lte("starts_at", asOf);
  const result = await query.order("starts_at", { ascending: options.period === "future" }).limit(MAX_ROWS + 1);
  if (result.error) throw new ContextReadError("read_failed");
  const all = rows(result.data);
  const valid = all.slice(0, MAX_ROWS).flatMap((row) => {
    const start = Date.parse(string(row.starts_at)), minutes = Number(row.duration_min);
    if (!UUID.test(string(row.spot_id)) || !Number.isFinite(start) || !Number.isFinite(minutes) || minutes < 1) return [];
    const period = start > instant ? "future" : start + minutes * 60000 > instant ? "now" : "past";
    if (options.period && options.period !== period) return [];
    return [{ ref: string(row.spot_id), url: "https://www.totehm.com/totehm?open=spot&id=" + encodeURIComponent(string(row.spot_id)), habit_ref: string(row.habit), starts_at: string(row.starts_at), duration_min: minutes,
      period, place: text(row.place, 160), city: text(row.city, 120), mode: text(row.mode, 20), audience: text(row.audience, 20),
      presence_verified: false, source: "owner_spot_plan" as const }];
  }).sort((a, b) => {
    const aTime = Date.parse(a.starts_at), bTime = Date.parse(b.starts_at);
    return options.period === "future" ? aTime - bTime : Math.abs(aTime - instant) - Math.abs(bTime - instant);
  });
  const limit = cap(options.limit, 5);
  return { items: valid.slice(0, limit), truncated: all.length > MAX_ROWS || valid.length > limit, as_of: new Date(instant).toISOString() };
}

export async function getSounds(client: ReadClient, uid: string, requested: string[]) {
  validateOwner(uid);
  const selected = intentions(requested);
  if (!selected.length) return { items: [] };
  const result = await client.from("intention_music").select("intention,title,url,platform")
    .eq("user_id", uid).eq("active", true).in("intention", selected).limit(7);
  if (result.error) throw new ContextReadError("read_failed");
  return { items: rows(result.data).map((row) => ({ intention: string(row.intention), kind: text(row.title, 80),
    url: playlistUrl(row.url), platform: text(row.platform, 30) || null,
    source: "owner_intention_music", content_accessed: false,
  })) };
}

function playlistUrl(value: unknown): string | null {
  const raw = string(value);
  if (!raw || raw.length > 8192 || /[\u0000-\u0020\u007f]/.test(raw)) return null;
  try {
    const url = new URL(raw);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? raw : null;
  } catch { return null; }
}

/** Metadata alone does not imply access to image pixels. No storage paths or
 * signed download URLs leave this helper. A separate media consent flow would
 * be required to send file contents to ChatGPT. */
export async function getMediaMetadata(client: ReadClient, uid: string, focus: ElementRef, options: { limit?: number } = {}) {
  validateOwner(uid);
  if (!validElementRef(focus)) throw new ContextReadError("invalid_request");
  const exists = await retrieveElement(client, uid, focus, 1);
  if (!exists.items.length) return { items: [], truncated: false };
  const letters: Record<ElementKind, string> = { habit: "h", objective: "o", repulsion: "r", vision: "v", wisdom: "w" };
  const limit = cap(options.limit, 4);
  const result = await client.from("element_media").select("id,kind,ref,mime,name,bytes,created_at")
    .eq("user_id", uid).eq("kind", letters[focus.kind]).eq("ref", focus.ref).is("removed_at", null)
    .order("created_at", { ascending: false }).limit(limit + 1);
  if (result.error) throw new ContextReadError("read_failed");
  const all = rows(result.data);
  let vision_image_available = false;
  if (focus.kind === "vision") {
    const image = await client.from("visions").select("id,image").eq("user_id", uid).eq("id", focus.ref).limit(1);
    if (image.error) throw new ContextReadError("read_failed");
    vision_image_available = rows(image.data).some(row => typeof row.image === "string" && !!row.image);
  }
  return { items: all.slice(0, limit).filter((row) => UUID.test(string(row.id))).map((row) => ({
    ref: string(row.id), element: focus, name: text(row.name, 120), mime: text(row.mime, 100),
    bytes: typeof row.bytes === "number" && Number.isSafeInteger(row.bytes) ? row.bytes : null,
    created_at: string(row.created_at), content_shared: false,
  })), truncated: all.length > limit, vision_image_available, content_shared: false };
}
