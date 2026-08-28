# Billable Review — visual thesis

## Direction: the midnight paper crossing

Billable Review is a surreal editorial utility, not another finance dashboard. Unbilled time is pictured as small cream paper slips travelling across an ink-blue landscape toward a warm vermilion ledger aperture. The scene gives the otherwise invisible handoff—from timer to invoice—a physical shape. In the working interface, editorial typography, fine rules, margin notes, and stamped outcomes carry that same story without competing with the rows being reviewed.

The treatment is intentionally single-mode. A warm paper canvas with a dark midnight work surface makes the reconciliation board feel like a focused evening close rather than a generic SaaS admin screen. The background is always explicitly painted.

## Tokens

- `--paper #F3EBDD`: primary background, like an accountant's working sheet.
- `--paper-bright #FFF9EF`: raised surface and form fields.
- `--ink #172335`: primary text and midnight review surface.
- `--ink-soft #344054`: secondary text on paper.
- `--rule #A99F91`: borders and table rules.
- `--coral #C74632`: primary action and invoice stamp; white text passes AA.
- `--coral-deep #963324`: pressed state.
- `--gold #A66A05`: warnings on pale gold, paired with an icon/label.
- `--moss #32604A`: completed/approved states, always with words or symbols.
- `--danger #A62E34`: destructive/error messages.
- `--night #101B2B`: dark work surface.

Contrast is checked at the token-pair level: ink/paper, ink-soft/paper, white/coral, paper/night and white/moss meet 4.5:1 for normal text. Status is never communicated by colour alone.

## Type and rhythm

The pairing is two system stacks to avoid network and font payloads: Georgia for editorial headings and `ui-monospace, SFMono-Regular, Consolas, monospace` for numbers, labels, and review metadata. Body copy uses `Inter` where locally available and otherwise the native UI sans stack. Type steps are 14, 16, 18, 24, 36, and clamp(42–68) px. Body is never below 16 px. Tabular figures are enabled for hours and money.

Spacing follows an 8 px base with a 4 px half-step: 4, 8, 12, 16, 24, 32, 48, 64. The desktop board uses a narrow summary rail plus a wide work area; at 760 px it becomes a single stream. At 390 px secondary table columns collapse into labelled row metadata, controls stack, and the primary action remains near the top without a fixed bar.

## Interaction grammar and depth

- Import originates from a dashed paper drop zone, then becomes a bound review ledger.
- Filter changes cross-fade rows over 180 ms; no decorative looping.
- Selection is an inset coral edge plus a checked control, not a floating card.
- Resolution opens in a modal sheet from the relevant review group; focus is trapped and returned.
- Toasts enter from the lower edge and include plain-language results and undo where destructive.
- Touch targets are at least 44 px, focus uses a 3 px coral outline plus paper offset.

With `prefers-reduced-motion: reduce`, all movement and smooth scrolling become instant; opacity transitions are removed. The illustration is static in every mode.

## Asset plan and provenance

### Hero illustration

- Subject: tiny cream time slips moving along a ribbon bridge from a midnight-blue clock-shaped mesa toward a vermilion ledger doorway; several slips wait in pools of warm light.
- World/materials: cut-paper editorial diorama, subtle fibre and screenprint grain, restrained surreal scale.
- Light/lens: long dawn shadows, slightly elevated orthographic editorial view, generous negative space.
- Palette words: midnight ink, oatmeal paper, oxidized vermilion, muted moss, antique gold.
- Negative list: people, hands, readable text, numbers, logos, brands, watermarks, glossy 3D, generic office, gradients, photorealism, malformed symbols.
- Exact prompt is stored beside the source image in `assets/src/hero-ledger.json`.
- Generator: Azure OpenAI image generation via the Param Factory `gen-image.sh`, deployment `factory-image`; generated 2026-08-28. Original output is product-owned generated artwork. The shipped WebP is a loss-minimized derivative.

### Authored assets

The hourglass/ledger PWA icon and interface symbols are hand-authored SVG/CSS primitives in this repository, licensed under the repository MIT license. No stock assets, third-party icon set, or runtime CDN is used.
