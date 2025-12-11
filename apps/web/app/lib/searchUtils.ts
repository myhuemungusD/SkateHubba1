export function generateKeywords(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().trim();
  const parts = clean.split(/\s+/);
  const keywords = new Set<string>();

  const addPrefixes = (token: string) => {
    for (let i = 1; i <= token.length; i++) {
      keywords.add(token.slice(0, i));
    }
  };

  parts.forEach(addPrefixes);
  addPrefixes(clean.replace(/\s+/g, ""));

  return Array.from(keywords);
}
