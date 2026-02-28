import { Aspect } from "@schemas/astro";

export const SummarizeAspect = (aspect: Aspect) => {
  const primary =
    typeof aspect.planet1 === 'string'
      ? aspect.planet1
      : typeof aspect.p1 === 'string'
        ? aspect.p1
        : typeof aspect.body1 === 'string'
          ? aspect.body1
          : undefined;
  const secondary =
    typeof aspect.planet2 === 'string'
      ? aspect.planet2
      : typeof aspect.p2 === 'string'
        ? aspect.p2
        : typeof aspect.body2 === 'string'
          ? aspect.body2
          : undefined;
  const aspectName =
    typeof aspect.aspect === 'string'
      ? aspect.aspect
      : typeof aspect.type === 'string'
        ? aspect.type
        : typeof aspect.name === 'string'
          ? aspect.name
          : undefined;
  const orbValue =
    typeof aspect.orb === 'number'
      ? aspect.orb
      : typeof aspect.orb_deg === 'number'
        ? aspect.orb_deg
        : undefined;
  const labelParts = [primary, aspectName, secondary].filter(Boolean) as string[];
  const label =
    labelParts.length > 0 ? labelParts.join(' ') : JSON.stringify(aspect).slice(0, 80);
  return { label, orbValue };
};
