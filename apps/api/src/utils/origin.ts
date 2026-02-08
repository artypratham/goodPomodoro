export function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, '');
}

export function parseAllowedOrigins(value: string) {
  return value
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}
