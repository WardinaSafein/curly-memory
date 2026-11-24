# CyberWR: working rules

## Art (creative director's rule)
- Claude never draws or paints game art. The only exception is labelled placeholders made by `tools/lib/placeholders.ts`.
- Any art the game needs: Claude writes a ChatGPT prompt with an exact file name and Drive subfolder, and the user generates it.
- No cutting art into parts. When something needs pieces or variants, ask for them to be generated as separate whole images.
- Allowed on delivered art: resize, crop to the exact canvas, trim transparent borders, padding for the GPU. Nothing that changes the drawing.
- Movement comes from code (bob, squash, sway, tweens) on whole stills. Keep frames to a minimum: the player's walk uses standing + one step picture per leg, per outfit.
- The player rig parts already in `assets-src/characters/player/` are validated and stay as they are.

## Working style
- One thing at a time. Keep messages short with a single next step.
- Think about obstacles first, and pick the simplest fix that works.
- Deadline: a full working game on 22 Dec (intro, character creator, Chapter 1 "defend the town").

## Drive
- Art arrives in the user's shared Drive folder, in subfolders `01_bedroom`, `02_laptop`, `03_portal`, `04_cybertown`, `05_defense` and `06_characters`.
- Validate art (`npm run assets`) before integrating it, and never commit art that fails validation.

## Alert the user (don't wait to be asked)
- Size and proportion that don't make sense (a character smaller than a chair, a door too small to walk through).
- Perspective mismatches between a character and the room or road.
- Anything in art that breaks logic or the story.
