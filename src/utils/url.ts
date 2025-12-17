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

  try {
    const baseUrl = new URL(base);
    const basePath = baseUrl.pathname.replace(/\/+$/, '');
    const pathPart = trimmedPath.replace(/^\/+/, '');
    const combinedPath = `${basePath}/${pathPart}`.replace(/\/{2,}/g, '/');
    const normalizedCombined =
      combinedPath.startsWith('/') || combinedPath === ''
        ? combinedPath
        : `/${combinedPath}`;
    return `${baseUrl.origin}${normalizedCombined}`;
  } catch {
    const normalizedBase = base.replace(/\/+$/, '');
    const pathPart = trimmedPath.replace(/^\/+/, '');
    return `${normalizedBase}/${pathPart}`;
  }
}
