/** The short name of a national tournament, for chips and headers: "WNC", "Euro", "ANC"… (translated by `t`). */
const BASE: [RegExp, string][] = [
  [/World Nations Cup$/, 'WNC'],
  [/European Championship$/, 'Euro'],
  [/African Nations Cup$/, 'ANC'],
  [/South American Cup$/, 'SA Cup'],
  [/Asian Nations Cup$/, 'Asian Cup'],
  [/North American Cup$/, 'NA Cup'],
  [/Summer Games$/, 'Games'],
  [/Nations Trophy$/, 'ENT'],
];

export function tournamentShort(name: string | null | undefined, t: (s: string) => string): string {
  if (!name) return t('Tournament');
  const hit = BASE.find(([re]) => re.test(name));
  if (!hit) return t('Tournament');
  const youth = name.match(/^(U20|U23) /)?.[1];
  return youth && hit[1] !== 'Games' ? `${t(hit[1])} ${youth}` : t(hit[1]);
}
