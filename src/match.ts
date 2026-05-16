const DIACRITICS = /[̀-ͯ]/g;

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

export function candidateKeys(name: string, aliases: string[] | undefined): string[] {
  const keys = [normalize(name)];
  if (aliases) for (const a of aliases) keys.push(normalize(a));
  return keys.filter(Boolean);
}
