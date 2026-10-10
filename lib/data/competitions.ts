/** The short name of a national tournament, for chips and headers: "WC", "Euro", "AFCON"… (translated by `t`). */
const BASE: [RegExp, string][] = [
  [/World Cup$/, 'WC'],
  [/European Championship$/, 'Euro'],
  [/Africa Cup of Nations$/, 'AFCON'],
  [/Copa América$/, 'Copa América'],
  [/Asian Cup$/, 'Asian Cup'],
  [/Gold Cup$/, 'Gold Cup'],
  [/Olympic Games$/, 'Olympics'],
];

export function tournamentShort(name: string | null | undefined, t: (s: string) => string): string {
  if (!name) return t('Tournament');
  const hit = BASE.find(([re]) => re.test(name));
  if (!hit) return t('Tournament');
  const youth = name.match(/^(U20|U23) /)?.[1];
  return youth && hit[1] !== 'Olympics' ? `${t(hit[1])} ${youth}` : t(hit[1]);
}
