# SoulMatch Upgrade Sheet (Mobile)

This doc describes the SoulMatch upgrade modal used to surface premium intent
without changing backend contracts or payment gating logic.

## Component

- File: `src/components/soulmatch/SoulMatchUpgradeSheet.tsx`
- Style: bottom sheet modal consistent with existing MetalPanel/MetalButton
- Height: ~70% of screen
- Dismiss: backdrop tap, swipe down, close button

## When it appears

The sheet appears only on explicit upgrade intent:

- Tapping a locked Explain level (Premium / Premium+)
- Tapping locked sections (More / Strategy / Timing details)
- Tapping the “See more matches” row after free limit

It never auto‑opens on screen load.

## Gating logic

Utility: `src/utils/soulmatchUpgradeGate.ts`

- Free limit: first 5 recommendations
- Premium unlocks: explanation full + timing details
- Premium+ unlocks: strategy section

Current entitlement default is **Free** if no entitlement state exists.

## CTA behavior

- Primary: “Unlock Premium”
- Secondary: “Unlock Premium+”
- Tertiary: “Continue with Free”

CTAs navigate to the existing Payments screen:

```
navigation.navigate('Payments')
```

(Plan highlighting is optional and not implemented by default.)

## QA checklist

1) Open SoulMatch Recommendations.
2) Tap Explain → Premium. Sheet opens.
3) Tap “Continue with Free”. Sheet closes.
4) Scroll down and tap “See more matches”. Sheet opens.
5) Tap “Unlock Premium”. Navigates to Payments.
6) Open a match detail and tap locked sections → sheet opens.

## Notes

- The sheet is purely UI; no entitlement checks or payment logic are added.
- Backward compatible with older recommendation payloads.
