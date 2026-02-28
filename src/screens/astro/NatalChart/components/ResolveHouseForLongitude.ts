export const resolveHouseForLongitude = (
  houses: Record<string, { cusp_lon: number; sign?: string }>,
  lon?: number,
) => {
  if (typeof lon !== 'number') {
    return null;
  }
  const entries = Object.entries(houses);
  if (entries.length === 0) {
    return null;
  }
  const sorted = entries
    .map(([key, house]) => ({ key, lon: ((house.cusp_lon % 360) + 360) % 360 }))
    .sort((a, b) => a.lon - b.lon);
  const target = ((lon % 360) + 360) % 360;
  let chosen = sorted[sorted.length - 1];
  for (const house of sorted) {
    if (target >= house.lon) {
      chosen = house;
    }
  }
  return chosen.key;
};
