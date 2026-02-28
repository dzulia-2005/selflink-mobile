import { PlanetPosition } from '@schemas/astro';

export const retrogradeTag = (placement?: PlanetPosition | undefined) => {
  if (typeof placement?.speed !== 'number') {
    return null;
  }
  return placement.speed < 0 ? 'R' : null;
};
