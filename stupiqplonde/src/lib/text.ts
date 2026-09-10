export function initials(title: string): string {
  return title
    .split(/[·\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const URL_RE = /(https?:\/\/[^\s]+)/gi;

export function splitLinks(text: string): { text: string; href: string | null }[] {
  if (!text) return [];
  const parts: { text: string; href: string | null }[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), href: null });
    parts.push({ text: match[0], href: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), href: null });
  return parts.length ? parts : [{ text, href: null }];
}
