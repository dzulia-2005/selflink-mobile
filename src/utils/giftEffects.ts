import { env } from '@config/env';
import { normalizeAssetUrl } from '@utils/urls';

type RawEffectsConfig = {
  version?: number;
  effects?: Array<Record<string, unknown>>;
  persist?: {
    mode?: string;
    window_seconds?: number;
  };
  [key: string]: unknown;
};

type GiftEffectBase = {
  type: string;
  priority?: number;
  createdAt?: number;
  expiresAt?: number;
};

export type BorderGlowEffect = GiftEffectBase & {
  type: 'border_glow';
  color?: string;
  thickness?: number;
  pulse?: boolean;
};

export type HighlightEffect = GiftEffectBase & {
  type: 'highlight';
  color?: string;
  tone?: string;
};

export type BadgeEffect = GiftEffectBase & {
  type: 'badge';
  text?: string;
  tone?: string;
};

export type OverlayEffect = GiftEffectBase & {
  type: 'overlay';
  animationUrl?: string;
  opacity?: number;
  zIndex?: number;
  clipToBounds?: boolean;
  scale?: number;
  loop?: boolean;
  fit?: 'cover' | 'contain';
  durationMs?: number;
};

export type GiftCardEffects = {
  borderGlow?: BorderGlowEffect;
  highlight?: HighlightEffect;
  badge?: BadgeEffect;
  overlay?: OverlayEffect;
};

type ParsedGiftEffects = {
  version: number;
  effects: Array<Record<string, unknown>>;
  persist: {
    mode: 'none' | 'window';
    windowSeconds: number;
  };
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const parseGiftEffects = (raw: unknown): ParsedGiftEffects => {
  if (!raw || typeof raw !== 'object') {
    return { version: 2, effects: [], persist: { mode: 'none', windowSeconds: 0 } };
  }
  const record = raw as RawEffectsConfig;
  const persist = record.persist ?? {};
  const mode = persist.mode === 'window' ? 'window' : 'none';
  const windowSeconds = toNumber(persist.window_seconds);
  return {
    version: typeof record.version === 'number' ? record.version : 2,
    effects: Array.isArray(record.effects) ? record.effects : [],
    persist: {
      mode,
      windowSeconds: windowSeconds > 0 ? windowSeconds : 0,
    },
  };
};

export const isEffectActive = (expiresAt?: number, now = Date.now()) => {
  if (!expiresAt) {
    return false;
  }
  return now <= expiresAt;
};

export const pickHighestPriorityEffect = <T extends GiftEffectBase>(effects: T[]) => {
  if (!effects.length) {
    return undefined;
  }
  return effects.reduce<T | undefined>((best, candidate) => {
    if (!best) {
      return candidate;
    }
    const bestPriority = typeof best.priority === 'number' ? best.priority : 0;
    const candidatePriority =
      typeof candidate.priority === 'number' ? candidate.priority : 0;
    if (candidatePriority > bestPriority) {
      return candidate;
    }
    if (candidatePriority < bestPriority) {
      return best;
    }
    const bestCreated = typeof best.createdAt === 'number' ? best.createdAt : 0;
    const candidateCreated =
      typeof candidate.createdAt === 'number' ? candidate.createdAt : 0;
    return candidateCreated > bestCreated ? candidate : best;
  }, undefined);
};

type ResolveParams = {
  now?: number;
  recentGifts?: unknown;
  targetType?: 'post' | 'comment';
};

const resolveRelativeUrl = (value: unknown) => {
  const normalized = normalizeAssetUrl(value);
  return normalized || undefined;
};

export const resolveActiveCardEffects = ({
  now,
  recentGifts,
  targetType,
}: ResolveParams): GiftCardEffects => {
  const entries = Array.isArray(recentGifts) ? recentGifts : [];
  const nowMs = typeof now === 'number' ? now : Date.now();
  const borderGlow: BorderGlowEffect[] = [];
  const highlights: HighlightEffect[] = [];
  const badges: BadgeEffect[] = [];
  const overlays: OverlayEffect[] = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const record = entry as Record<string, unknown>;
    const createdAtRaw = record.created_at ?? record.createdAt;
    const createdAt = typeof createdAtRaw === 'string' ? Date.parse(createdAtRaw) : NaN;
    if (!Number.isFinite(createdAt)) {
      return;
    }

    const giftType = record.gift_type as Record<string, unknown> | undefined;
    if (!giftType || typeof giftType !== 'object') {
      return;
    }
    const parsed = parseGiftEffects((giftType as any).effects);
    if (parsed.persist.mode !== 'window' || parsed.persist.windowSeconds <= 0) {
      return;
    }
    const expiresAt = createdAt + parsed.persist.windowSeconds * 1000;
    if (!isEffectActive(expiresAt, nowMs)) {
      return;
    }

    parsed.effects.forEach((effect) => {
      if (!effect || typeof effect !== 'object') {
        return;
      }
      const effectType =
        typeof (effect as any).type === 'string' ? (effect as any).type : '';
      const priority = toNumber((effect as any).priority);
      const scope =
        typeof (effect as any).scope === 'string' ? (effect as any).scope : undefined;
      if (scope && targetType && scope !== targetType) {
        return;
      }
      if (
        !effectType ||
        !['border_glow', 'highlight', 'badge', 'overlay'].includes(effectType)
      ) {
        if (env.giftEffectsDebug) {
          console.log('giftEffects: ignoring unsupported effect', { type: effectType });
        }
        return;
      }
      switch (effectType) {
        case 'border_glow':
          borderGlow.push({
            type: 'border_glow',
            color:
              typeof (effect as any).color === 'string'
                ? (effect as any).color
                : undefined,
            thickness:
              toNumber((effect as any).thickness) ||
              (toNumber((effect as any).intensity) > 0
                ? 1 + toNumber((effect as any).intensity) * 2
                : undefined),
            pulse: Boolean((effect as any).pulse),
            priority,
            createdAt,
            expiresAt,
          });
          break;
        case 'highlight':
          highlights.push({
            type: 'highlight',
            color:
              typeof (effect as any).color === 'string'
                ? (effect as any).color
                : undefined,
            tone:
              typeof (effect as any).tone === 'string' ? (effect as any).tone : undefined,
            priority,
            createdAt,
            expiresAt,
          });
          break;
        case 'badge': {
          const fallbackText =
            typeof (giftType as any).name === 'string'
              ? (giftType as any).name
              : undefined;
          badges.push({
            type: 'badge',
            text:
              (typeof (effect as any).text === 'string' && (effect as any).text) ||
              (typeof (effect as any).label === 'string' && (effect as any).label) ||
              fallbackText,
            tone:
              typeof (effect as any).tone === 'string' ? (effect as any).tone : undefined,
            priority,
            createdAt,
            expiresAt,
          });
          break;
        }
        case 'overlay': {
          overlays.push({
            type: 'overlay',
            animationUrl: resolveRelativeUrl((effect as any).animation),
            opacity: toNumber((effect as any).opacity) || undefined,
            zIndex: toNumber((effect as any).z_index) || undefined,
            clipToBounds: Boolean((effect as any).clip_to_bounds),
            scale: toNumber((effect as any).scale) || undefined,
            loop:
              (effect as any).loop !== undefined
                ? Boolean((effect as any).loop)
                : undefined,
            fit:
              (effect as any).fit === 'contain' || (effect as any).fit === 'cover'
                ? (effect as any).fit
                : undefined,
            durationMs: toNumber((effect as any).duration_ms) || undefined,
            priority,
            createdAt,
            expiresAt,
          });
          break;
        }
        default:
          break;
      }
    });
  });

  return {
    borderGlow: pickHighestPriorityEffect(borderGlow),
    highlight: pickHighestPriorityEffect(highlights),
    badge: pickHighestPriorityEffect(badges),
    overlay: pickHighestPriorityEffect(overlays),
  };
};

type EventResolveParams = {
  giftType?: unknown;
  createdAt?: string | number | null;
  targetType?: 'post' | 'comment';
  serverTime?: string | number | null;
  expiresAt?: string | number | null;
};

const parseTime = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const resolveEffectsFromGiftEvent = ({
  giftType,
  createdAt,
  targetType,
  serverTime,
  expiresAt,
}: EventResolveParams): GiftCardEffects => {
  if (!giftType || typeof giftType !== 'object') {
    return {};
  }
  const parsed = parseGiftEffects((giftType as any).effects);
  const nowMs = parseTime(serverTime) ?? Date.now();
  const createdMs = parseTime(createdAt) ?? nowMs;
  const explicitExpiresAt = parseTime(expiresAt);
  let computedExpiresAt: number | null = null;

  if (parsed.persist.mode === 'window' && parsed.persist.windowSeconds > 0) {
    computedExpiresAt = createdMs + parsed.persist.windowSeconds * 1000;
  }
  const expiresAtMs = explicitExpiresAt ?? computedExpiresAt ?? null;

  if (expiresAtMs && nowMs > expiresAtMs) {
    return {};
  }

  const borderGlow: BorderGlowEffect[] = [];
  const highlights: HighlightEffect[] = [];
  const badges: BadgeEffect[] = [];
  const overlays: OverlayEffect[] = [];

  parsed.effects.forEach((effect) => {
    if (!effect || typeof effect !== 'object') {
      return;
    }
    const effectType =
      typeof (effect as any).type === 'string' ? (effect as any).type : '';
    const priority = toNumber((effect as any).priority);
    const scope =
      typeof (effect as any).scope === 'string' ? (effect as any).scope : undefined;
    if (scope && targetType && scope !== targetType) {
      return;
    }
    switch (effectType) {
      case 'border_glow':
        borderGlow.push({
          type: 'border_glow',
          color:
            typeof (effect as any).color === 'string' ? (effect as any).color : undefined,
          thickness:
            toNumber((effect as any).thickness) ||
            (toNumber((effect as any).intensity) > 0
              ? 1 + toNumber((effect as any).intensity) * 2
              : undefined),
          pulse: Boolean((effect as any).pulse),
          priority,
          createdAt: createdMs,
          expiresAt: expiresAtMs ?? undefined,
        });
        break;
      case 'highlight':
        highlights.push({
          type: 'highlight',
          color:
            typeof (effect as any).color === 'string' ? (effect as any).color : undefined,
          tone:
            typeof (effect as any).tone === 'string' ? (effect as any).tone : undefined,
          priority,
          createdAt: createdMs,
          expiresAt: expiresAtMs ?? undefined,
        });
        break;
      case 'badge': {
        const fallbackText =
          typeof (giftType as any).name === 'string' ? (giftType as any).name : undefined;
        badges.push({
          type: 'badge',
          text:
            (typeof (effect as any).text === 'string' && (effect as any).text) ||
            (typeof (effect as any).label === 'string' && (effect as any).label) ||
            fallbackText,
          tone:
            typeof (effect as any).tone === 'string' ? (effect as any).tone : undefined,
          priority,
          createdAt: createdMs,
          expiresAt: expiresAtMs ?? undefined,
        });
        break;
      }
      case 'overlay': {
        overlays.push({
          type: 'overlay',
          animationUrl: resolveRelativeUrl((effect as any).animation),
          opacity: toNumber((effect as any).opacity) || undefined,
          zIndex: toNumber((effect as any).z_index) || undefined,
          clipToBounds: Boolean((effect as any).clip_to_bounds),
          scale: toNumber((effect as any).scale) || undefined,
          loop:
            (effect as any).loop !== undefined
              ? Boolean((effect as any).loop)
              : undefined,
          fit:
            (effect as any).fit === 'contain' || (effect as any).fit === 'cover'
              ? (effect as any).fit
              : undefined,
          durationMs: toNumber((effect as any).duration_ms) || undefined,
          priority,
          createdAt: createdMs,
          expiresAt: expiresAtMs ?? undefined,
        });
        break;
      }
      default:
        break;
    }
  });

  return {
    borderGlow: pickHighestPriorityEffect(borderGlow),
    highlight: pickHighestPriorityEffect(highlights),
    badge: pickHighestPriorityEffect(badges),
    overlay: pickHighestPriorityEffect(overlays),
  };
};

export const filterActiveEffects = (
  effects?: GiftCardEffects | null,
  now = Date.now(),
): GiftCardEffects | null => {
  if (!effects) {
    return null;
  }
  const active = {
    borderGlow:
      effects.borderGlow && isEffectActive(effects.borderGlow.expiresAt, now)
        ? effects.borderGlow
        : undefined,
    highlight:
      effects.highlight && isEffectActive(effects.highlight.expiresAt, now)
        ? effects.highlight
        : undefined,
    badge:
      effects.badge && isEffectActive(effects.badge.expiresAt, now)
        ? effects.badge
        : undefined,
    overlay:
      effects.overlay && isEffectActive(effects.overlay.expiresAt, now)
        ? effects.overlay
        : undefined,
  };
  return active.borderGlow || active.highlight || active.badge || active.overlay
    ? active
    : null;
};
