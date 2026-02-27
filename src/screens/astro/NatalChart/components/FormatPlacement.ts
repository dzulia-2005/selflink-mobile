
export const formatPlacement = (placement?: {
  lon?: number;
  cusp_lon?: number;
  sign?: string;
}) => {
  if (!placement?.sign) {
    return '—';
  }
  const lon = typeof placement.lon === 'number' ? placement.lon : placement.cusp_lon;
  if (typeof lon !== 'number') {
    return placement.sign;
  }
  const withinSign = Math.round(((((lon % 30) + 30) % 30) + Number.EPSILON) * 10) / 10;
  return `${placement.sign} ${withinSign}°`;
};
