# Design System: Galerilink — The Kinetic Monolith
**Project ID:** 8907004848768715382

## 1. Visual Theme & Atmosphere
A restrained, high-contrast dark-mode interface with an automotive-grade professional edge. The atmosphere is "Kinetic Monolith" — authoritative, intentionally minimalist, and deeply rooted in the Zinc spectrum. It feels less like a standard mobile app and more like a private digital showroom — clinical precision married to premium surface textures.

- **Density:** 5 — Daily App Balanced
- **Variance:** 7 — Offset Asymmetric
- **Motion:** 6 — Fluid CSS with spring physics

## 2. Color Palette & Roles
- **Deep Zinc-Black** (#09090B) — Primary background canvas. The infinite dark.
- **Zinc Surface** (#18181B) — Card and container fill.
- **Elevated Zinc** (#27272A) — Highlighted/active card surfaces.
- **Surface Border** (#3F3F46) — Ghost borders, card outlines (1px, subtle).
- **Near-White** (#FAFAFA) — Primary text, headlines, maximum contrast.
- **Silver Zinc** (#A1A1AA) — Secondary text, descriptions, metadata.
- **Zinc Muted** (#71717A) — Tertiary/muted text, helper labels.
- **Pure White** (#FFFFFF) — Primary CTA accent, tint, brand mark.
- **Emerald Signal** (#34D399) — Success states, checkmarks, "Go" actions. Max 1 accent.
- **Danger Red** (#EF4444) — Error states, destructive actions.

**BANNED:** Purple/neon, outer glows, oversaturated accents, pure black (#000000) for large surfaces.

## 3. Typography Rules
- **Display/Headlines:** Space Grotesk — Track-tight, italic for velocity cues, weight-driven hierarchy. Used for plan names, hero titles, price values.
- **Body/Labels:** Public Sans — Neutral, relaxed leading, max 65ch. Used for feature lists, subtitles, descriptions.
- **Mono:** JetBrains Mono (reserved for future code/data displays).
- **Banned:** Inter for premium contexts. Generic serif fonts in all contexts.

## 4. Component Stylings
* **Buttons:** 12px radius. Primary = White fill with dark text. Secondary = Ghost/outlined with white text. Tactile -1px translate on active. No neon outer glows.
* **Cards:** 16px generously rounded corners. Zinc surface fill. Ghost borders via surfaceBorder. Highlighted cards use elevated surface + thicker border + ambient whisper shadow.
* **Badges:** Compact pill-shaped containers. White fill with dark text for "EN POPÜLER" style badges.
* **Checkmarks:** 22px circles. Default = translucent emerald outline. Highlighted = solid emerald fill.
* **Feature Lists:** Vertical list with 12px gap. Check circle + label pattern. No divider lines.

## 5. Layout Principles
- Vertical scroll for card lists on mobile (no horizontal scroll for critical content).
- 20px horizontal padding for content containment.
- Cards stacked with 16px vertical gap.
- Hero section uses asymmetric typography — bold italic headlines with neutral subtitles.
- No overlapping elements. Clean spatial separation always.

## 6. Motion & Interaction
- Spring physics for all interactive card presses (stiffness: 50, bounciness: 4).
- Scale-down to 0.97 on press for tactile feedback.
- Slide-from-bottom modal transition for page navigation.
- No linear easing. All motion uses native spring drivers.

## 7. Anti-Patterns (Banned)
- No emojis in professional content.
- No Inter font.
- No purple/neon accents.
- No 1px solid borders for sectioning (use tonal layering).
- No generic 3-column equal card grids.
- No AI copywriting clichés.
- No oversaturated gradients.
- No custom mouse cursors.
- No fake statistics or fabricated data.
