// La météo du moment, là où je suis · 29/10/2026 (Wah : « la vue du bas doit bien prendre en compte l'heure, la météo et
// la position de l'utilisateur : détecter s'il est chez lui, et lui proposer une activité chez lui ou une action dehors
// aux alentours »). MET Norway (Locationforecast 2.0 compact) : gratuit, usage commercial permis, données CC BY 4.0,
// le client s'identifie par son User-Agent. La position arrive DÉJÀ arrondie à ~1 km (la page) ; un cache de 30 min par
// case, dans l'instance ; 1,2 s au plus, sinon rien : la réponse part sans météo, jamais en retard à cause d'elle.

export type Meteo = { t: number | null; ciel: string; pluie: number | null };
const CACHE = new Map<string, { at: number; m: Meteo }>();
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

export async function meteo(lat: number, lng: number): Promise<Meteo | null> {
  const k = lat.toFixed(2) + "," + lng.toFixed(2), c = CACHE.get(k);
  if (c && Date.now() - c.at < 30 * 60e3) return c.m;
  try {
    const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(2)}&lon=${lng.toFixed(2)}`,
      { headers: { "User-Agent": "totehm.com higher-self https://www.totehm.com" }, signal: AbortSignal.timeout(1200) });
    if (!r.ok) { console.error("[meteo]", r.status); return null; }
    const s = (await r.json())?.properties?.timeseries?.[0]?.data;
    const m: Meteo = { t: num(s?.instant?.details?.air_temperature),
                       ciel: String(s?.next_1_hours?.summary?.symbol_code ?? s?.next_6_hours?.summary?.symbol_code ?? "").slice(0, 40),
                       pluie: num(s?.next_1_hours?.details?.precipitation_amount) };
    CACHE.set(k, { at: Date.now(), m });
    if (CACHE.size > 500) CACHE.delete(CACHE.keys().next().value as string);
    return m;
  } catch (e) { console.error("[meteo]", (e as Error)?.message ?? e); return null; }
}

/** Le code MET (« lightrain », « partlycloudy_night ») en mots, et s'il fait nuit. */
export function ciel(code: string): { mots: string; nuit: boolean } {
  const c = String(code || ""), nuit = /_night$/.test(c);
  const mots = c.replace(/_(day|night|polartwilight)$/, "").replace("clearsky", "clear sky").replace("partlycloudy", "partly cloudy")
    .replace("andthunder", " and thunder").replace(/showers/, " showers").replace(/^light(?=\w)/, "light ").replace(/^heavy(?=\w)/, "heavy ")
    .replace(/^lights /, "light ").replace(/\s+/g, " ").trim();
  return { mots, nuit };
}

/** MON MOMENT : l'heure (et la part du jour), la météo, et si je suis chez moi — tel que le modèle doit le lire. */
export function moment(now: string, m: Meteo | null, ou: "home" | "out" | null): string {
  const h = Number((/(\d{1,2}):\d{2}\s*$/.exec(String(now || "")) ?? [])[1]);
  const part = !Number.isFinite(h) ? "" : h < 5 ? "late night" : h < 12 ? "morning" : h < 14 ? "midday" : h < 18 ? "afternoon"
    : h < 22 ? "evening" : "night";
  const b: string[] = [];
  if (part) b.push(part);
  if (m) {
    const c = ciel(m.ciel), w = [c.mots, m.t != null ? `${m.t}°C` : "", m.pluie ? `${m.pluie} mm of rain this hour` : "", c.nuit ? "dark outside" : ""];
    if (w.some(Boolean)) b.push("weather: " + w.filter(Boolean).join(", "));
  }
  b.push(ou === "home" ? "I am AT HOME" : ou === "out" ? "I am OUT, away from home" : "home or out: unknown");
  return "MY MOMENT: " + b.join(" · ");
}
