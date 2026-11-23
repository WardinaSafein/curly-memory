# assets-src: art delivery drop zone

Raw art from visual production goes here, in the folders and file names listed in
[docs/ASSET_SPEC.md](../docs/ASSET_SPEC.md). Packages (`cyberwr_<batch>_v<N>.zip`) are unpacked here
so their folders line up:

```
assets-src/
  characters/player/      player rig parts + reference render
  characters/gus/         (design pending)
  scenes/title/
  scenes/bedroom/
  scenes/laptop/
  scenes/cybertown/
  fx/
```

Then run:

```bash
npm run assets:validate   # report only
npm run assets            # build public/assets (also runs before `npm run dev`)
```

Anything missing or invalid is replaced by a labelled placeholder, so the game always runs.
Never edit `public/assets/`; it is generated.
