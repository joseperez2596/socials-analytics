// Pure helpers shared by server pages and the /pillars editor (runs in the browser too).

// Filler words never suggested as keywords (English, Spanish, Portuguese).
// ponytail: fixed list; make it configurable if people post in other languages.
const STOPWORDS = new Set(
  (
    "a about after all also an and any are as at be because been but by can could did do does for from get got had has have " +
    "he her here him his how i if in into is it its just like me more most my new no not now of on one only or our out over " +
    "she so some than that the their them then there these they this to too up us very was we were what when where which " +
    "who why will with you your actually really every still even ever never much make made thing things want need know " +
    "al algo algunos ante así aunque cada como con conmigo contigo cual cuando de del desde donde dos el ella ellos en entre " +
    "era es esa ese eso esta estas este esto estos fue ha hay la las le les lo los más me mi mis mucho muy nada ni no nos " +
    "nuestro o otra otro para pero poco por porque que qué quien se ser si sí sin sobre solo son su sus también te tiene " +
    "todo todos tu tus un una uno unos y ya yo " +
    "ao aos as até com da das de do dos ela ele em entre era essa esse está eu foi há isso já mais mas me meu minha muito " +
    "na nas não no nos nós num numa os ou para pela pelo por quando que se sem seu sua são também te tem teu um uma você"
  ).split(" ")
);

export type PillarMap = Record<string, string[]>;
export type Pillar = { name: string; keywords: string[] };

/** First pillar with a keyword contained in the text wins; otherwise "Other". */
export function classifyByKeywords(text: string, keywords: PillarMap): string {
  const lower = (text ?? "").toLowerCase();
  for (const [pillar, terms] of Object.entries(keywords)) {
    if (terms.some((kw) => kw && lower.includes(kw.toLowerCase()))) return pillar;
  }
  return "Other";
}

export function toMap(list: Pillar[]): PillarMap {
  return Object.fromEntries(list.map((p) => [p.name, p.keywords]));
}

export function words(text: string): string[] {
  return (text ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Most common non-filler words across texts, counted once per text. */
export function suggestKeywords(texts: string[], limit = 15): [string, number][] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const w of new Set(words(t))) {
      if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}
