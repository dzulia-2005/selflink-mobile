export function buildUrl(base: string, path: string): string {
  try {
    return new URL(path, base).toString();
  } catch {
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
