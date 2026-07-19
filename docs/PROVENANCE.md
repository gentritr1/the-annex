# Asset provenance

| Asset | Source | Purpose | Status |
|---|---|---|---|
| `docs/assets/civic-archive-original.png` | Generated with OpenAI built-in image generation on 2026-07-19 from an original abstract art brief | Case 77 city panorama and atmosphere | Look-development master; kept out of the shipped bundle, retained as source of truth; human review required before commercial production |
| `public/images/civic-archive.webp` | Locally encoded from the generated PNG master at quality 82 | Responsive browser delivery of the same panorama (the only artwork shipped in `dist/`) | Derived optimization; PNG master retained in `docs/assets/` |
| `public/favicon.svg` | Authored in repository | Prototype favicon | Original code-native asset |

The concept-art prompt avoided franchise names, copyrighted characters, logos, readable text, and living-artist style references. Keep future prompts and source references in this ledger. Raw generated assets are drafts, not a substitute for a human-led style bible and production finish.

## Generation prompt

> Create an original wide cinematic environment concept for a first-person philosophical systems
> game. Night exterior/interior hybrid of a monumental municipal memory archive called a civic
> annex: severe black concrete megastructure, rain haze, deep blue-black city canyon, a few warm
> honey-amber service windows and restrained cyan data conduits. A vertical archive tower dominates
> the right half while layered maintenance bridges and lower-span infrastructure recede into fog.
> Human-scale but no visible faces or characters. Quiet, watchful, bureaucratic, uncanny, humane;
> credible architectural concept art rather than glossy sci-fi. Strong depth and negative space on
> the left for interface typography. No readable text, logos, symbols, franchise references, neon
> magenta, purple synthwave, weapons, vehicles, HUD, glassmorphism, or watermark. Wide 16:9 key art,
> dark value structure with distinct amber windows and subtle cyan lines, detailed rain atmosphere,
> composition suitable as a responsive web hero background.
