export function sanitizeUsername(base: string): string {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}
