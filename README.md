# CyberWR

A 2D illustrated, story-driven cybersecurity adventure for adults: click-to-explore locations,
dialogue, interactions and cinematic moments. Browser-based, desktop-first.

**Prototype scope:** bedroom → laptop portal cinematic → CyberTown arrival, a cutout-rig test
character, and placeholder art throughout. The five district games are intentionally not started.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL. The title screen has a review menu; deep links also work:

| URL | Opens |
|---|---|
| `/?scene=riglab` | **Rig Lab**: idle / blink / walk / surprise, template overlay, bones, lighting |
| `/?scene=bedroom` | Bedroom (start of the story) |
| `/?scene=portal` | Laptop portal cinematic (Esc / Skip to skip) |
| `/?scene=cybertown&entry=portal` | CyberTown arrival |

Add `&reset` to wipe the save or `&nosave` to play without saving.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Build assets (real art + placeholders) and start the dev server |
| `npm test` | Unit tests (rig math, animations, manifest, scenes, dialogue) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build to `dist/` |
| `npm run assets:validate` | Validate art in `assets-src/` against the manifest |
| `npm run rig:template` | Regenerate the rig template package from `player.rig.json` |
| `npm run rig:fit-walk -- --write` | Refit the walk (pelvis bob, stride speed) after changing leg joints |
| `npm run smoke` | Headless run of every scene with screenshots (needs Playwright + Chromium) |

## Docs

- [Architecture](docs/ARCHITECTURE.md): stack, systems, how to add content
- [Asset specification](docs/ASSET_SPEC.md): what the art team delivers, exact sizes and rules
- [Asset manifest format](docs/ASSET_MANIFEST.md): how assets are declared, validated and loaded
- [Rig template package (v1.1)](docs/rig-template/README.md): the brief for the character rig test
- [Rig test v1 review](docs/reviews/rigtest-v1/README.md): why the first package was rejected
