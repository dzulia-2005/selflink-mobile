export function buildUrl(base: string, path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return base;
  }

  const protocolRelative = trimmedPath.startsWith('//');
  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(trimmedPath);
  if (isAbsolute || protocolRelative) {
    try {
      return new URL(trimmedPath, base).toString();
    } catch {
      return trimmedPath;
    }
  }

  let baseUrl: URL | null = null;
  try {
    baseUrl = new URL(base);
  } catch {
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = trimmedPath.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  const basePath = baseUrl.pathname.replace(/\/+$/, '');
  if (trimmedPath.startsWith('/')) {
    if (basePath && trimmedPath.startsWith(basePath)) {
      return `${baseUrl.origin}${trimmedPath}`;
    }
    const combinedPath = `${basePath}/${trimmedPath.replace(/^\/+/, '')}`.replace(
      /\/{2,}/g,
      '/',
    );
    return `${baseUrl.origin}${combinedPath}`;
  }

  const combinedPath = `${basePath}/${trimmedPath}`.replace(/\/{2,}/g, '/');
  return `${baseUrl.origin}${combinedPath}`;
  try {
    return new URL(normalizedPath, normalizedBase).toString();
  } catch {
    return `${normalizedBase}${normalizedPath}`;
  }
}
