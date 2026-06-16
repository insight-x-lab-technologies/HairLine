# HAIRLINE — Theme Asset Production Guide

> A reference for producing the **digital assets** (images + audio) that a
> HAIRLINE presentation theme can use. Written for an asset‑generation workflow
> (AI or human): every asset slot below lists its **key**, **file path**,
> **format**, **dimensions/footprint**, **content**, and **hard rules**.
>
> Read this together with `docs/ASSET_CONTRACT.md` (per‑entity integration
> contract) and `docs/TECH_DECISIONS.md` TD‑30/31/32/33 (the engineering rationale).
> This guide is about *making the art/audio*; the wiring is a few lines in
> `src/config/themes.ts`.

---

## 1. What a "theme" is

HAIRLINE renders the whole game behind two swappable layers:

- a **render theme** (the visuals) — `vector` (the default neon‑geometry look,
  drawn entirely by code, **no assets**) or `sprite` (the "Polished" look, which
  draws **raster/vector art where an asset exists and falls back to the vector
  look where it does not**);
- an **audio theme** (the sound) — `synth` (procedural, no assets) or `sample`
  (plays **audio files**, falling back to synth per‑cue where a file is missing).

A theme is just a registry entry that picks a renderer id, an audio id, and a
**manifest of assets** to load. **Every asset is optional.** A missing image
falls back to the vector drawing of that piece; a missing sound falls back to the
synth for that cue. So you can ship a theme with *any subset* of the assets below
and it will still run correctly — partial art is a first‑class state, not a bug.

> **Determinism note (don't worry, but know it):** assets are *presentation only*.
> They never affect gameplay, scoring, replays, or the Daily Challenge. You cannot
> break the game with art; the worst case is a fallback to the vector/synth look.

---

## 2. Global facts you must design against

| Fact | Value |
| --- | --- |
| Virtual canvas | **720 × 1280 px** (portrait, 9:16) |
| Coordinate origin | top‑left; **+X right, +Y down** |
| "Up" / forward (player flies toward the top) | **−Y** |
| Player ship position | centered horizontally, at y ≈ **998** (0.78 × 1280) |
| Logic rate | 60 Hz fixed (irrelevant to art, but animations are time‑based) |
| Scaling mode | the canvas is letterboxed/fit; design for 720×1280 and it scales to any device |

The game is **mobile‑first and one‑thumb**. Legibility beats beauty: the playfield
must stay readable, so backgrounds are low‑contrast and bright/dangerous elements
(bullets, ring) are always drawn on top by the engine (see §4 rules).

---

## 3. The golden rules (apply to every asset)

1. **Fallback is law.** Ship only what you have. No asset ⇒ that piece uses the
   vector/synth look. Adding art = adding a key to the manifest; removing art =
   deleting the key. The game is never left inconsistent.

2. **Tinting — author the right color space.** Some sprites are recolored at
   runtime via `setTint` (multiplies the texture by a single color). For those,
   **author in white / light grayscale on transparency** so the tint reads true.
   Others are shown as‑is, so author them in **full color**. See the per‑asset
   "Color" field — this is the most common mistake.

3. **Do NOT draw these — the engine always draws them in vector, on top of your
   art.** If you bake them into a texture they'll double up:
   - player bullets & enemy bullets (always neon vector);
   - the **graze ring** around the ship and the small **hitbox dot**;
   - the ship's **engine flame** (a vector triangle behind the hull);
   - the **Focus bar** (HUD), score/lives text, buttons;
   - boss **health bar, shield ring, destructible parts, teleport telegraph,
     invulnerable‑core ring**;
   - impact / kill / graze **particles**, camera shake/flash.

   So your art only ever covers: **the ship hull, the enemy body, the boss hull,
   and the background** — plus all audio.

4. **Anchored at center.** All entity sprites are positioned by their **center**
   (origin 0.5) at the simulation's (x, y). Never compose a piece off‑center or
   anchored to a corner — it will misalign with the hitbox.

5. **Transparent background** for every entity sprite and every background layer
   (the base space color is painted underneath by the engine; layers stack).

---

## 4. Image assets

All images live in **`public/sprites/`** and are referenced from the theme
manifest with `type: 'image'`. Phaser loads them with `load.image`, so **SVG**
(rasterized at its `width`/`height`) and **PNG** (with alpha) both work.
PNG with alpha is the natural choice for illustrated/raster themes; SVG for clean
vector/geometric themes.

> **Source resolution tip.** Entity sprites are scaled down to a small on‑screen
> footprint, so author at a **higher native resolution** (e.g. 2–4×) for crispness
> and let the engine downscale. Background layers are used at exactly 720×1280.

### 4.1 Summary table

| Slot | Key | Suggested file | Native size (author at) | On‑screen footprint | Color | Required together? |
| --- | --- | --- | --- | --- | --- | --- |
| Ship hull | `spr-ship` | `sprites/ship.png` | 256×256 (square) | 64×64 px | **White/grayscale** (tinted) | independent |
| Ship variant | `spr-ship-<cosmeticId>` | `sprites/ship-<id>.png` | 256×256 | 64×64 px | **White/grayscale** (tinted) | independent |
| Enemy body | `spr-enemy` | `sprites/enemy.png` | 128×128 (square) | scales to ø = radius×2 (~36–48 px) | **White/grayscale** (tinted) | independent |
| Boss hull | `spr-boss` | `sprites/boss.png` | 256×256 (square) | scales to ø = radius×2 (~88–108 px) | **Full color** (not tinted) | independent |
| BG far | `spr-bg-far` | `sprites/bg-far.png` | **720×1280** | full screen, parallax | Full color, **low contrast** | **all 3 BG layers** |
| BG nebula | `spr-bg-nebula` | `sprites/bg-nebula.png` | **720×1280** | full screen, parallax | Full color, **low contrast** | **all 3 BG layers** |
| BG near | `spr-bg-near` | `sprites/bg-near.png` | **720×1280** | full screen, parallax | Full color, **low contrast** | **all 3 BG layers** |

### 4.2 Ship hull — `spr-ship`

- **Footprint:** scaled to **64×64 virtual px**, centered on the player position.
- **Orientation:** **nose points up (−Y).** The ship flies toward the top.
- **Color:** **white / light grayscale on transparency.** It is tinted at runtime
  with the player's cosmetic ship color (`setTint`), so any non‑white hue you bake
  in will fight the tint. Use white shapes with grayscale shading for depth.
- **Content:** the *body/silhouette only* — a single coherent fighter shape (nose,
  shoulders, wings, engine pods). Do **not** draw the engine flame (engine puts a
  pulsing vector flame behind it), the center hitbox dot, or the graze ring.
- **Footprint discipline (gameplay):** all ships are the same visual size — a
  bigger‑looking ship is **not** a bigger hitbox. Keep the readable mass within
  the 64‑px box; don't add huge wings that imply a larger ship.
- **Reference for the silhouette:** the vector ship in `src/ui/shapes.ts`
  (`shipSilhouette`) — a fighter inscribed in its radius, symmetric. Matching its
  proportions keeps the in‑game ship == the Hangar preview.

### 4.3 Ship cosmetic variants — `spr-ship-<cosmeticId>`

Optional **curated** alternates so a cosmetic ship can have its own silhouette in
the sprite theme (P10‑13). Same specs as `spr-ship` (64‑px footprint, nose up,
white/grayscale, tinted). The rule is a fallback chain:

1. `spr-ship-<cosmeticId>` if present → use it (curated silhouette);
2. else `spr-ship` (tinted by the cosmetic color);
3. else the vector silhouette.

So **color always applies via tint**; only the *silhouette* needs a curated
variant. You only produce art for the cosmetics you choose to differentiate — not
the whole matrix.

- **Current cosmetic ship ids:** `ship-default`, `ship-prism`, `ship-comet`.
  → keys would be `spr-ship-ship-default`, `spr-ship-ship-prism`,
  `spr-ship-ship-comet`. (Yes, the `ship-` prefix appears twice — the key is
  literally `spr-ship-` + the cosmetic id.)
- Keep them **near‑white** so the cosmetic color still tints cleanly.

### 4.4 Enemy body — `spr-enemy`

- **Footprint:** one generic sprite reused for all enemies, scaled to the enemy's
  **logical diameter** (radius × 2; current enemies have radius ≈ 18–24 px ⇒ ~36–48
  px on screen). Author a **square** texture; the engine fits it to the diameter.
- **Orientation:** enemies **rotate continuously**, so design a shape that reads at
  any angle (radial / symmetric motifs work best). No fixed "front".
- **Color:** **white / light grayscale on transparency** — tinted at runtime with
  each enemy's danger color from the sim.
- **Content:** a compact, centered body/core that fits inside the inscribed circle
  of the square. Keep it bold and readable at small size; don't rely on fine detail.

### 4.5 Boss body — `spr-boss`

- **Footprint:** single sprite scaled to the boss's **logical diameter** (radius ×
  2; bosses have radius ≈ 44–54 px ⇒ ~88–108 px on screen). Square texture.
- **Orientation:** rotates **slowly**; design to read while turning.
- **Color:** **FULL COLOR — this one is *not* tinted.** Paint the final hull look.
- **Content:** the boss hull/chassis only. All **mechanics are overlaid in vector**
  by the engine — health bar, shield ring, destructible pods, teleport telegraph,
  the invulnerable‑core ring — so leave room for them and don't paint fake versions.
  Keep the center area from being too busy (the pulsing core/eye sits there).

### 4.6 Background layers — `spr-bg-far`, `spr-bg-nebula`, `spr-bg-near`

A three‑layer vertical **parallax** starfield. **All three must be present** or the
theme falls back to the procedural vector background (all‑or‑nothing).

- **Size:** each is a full‑screen **720×1280** texture.
- **Tiling:** each scrolls **downward** and is wrapped by its own height (1280 px),
  so each texture **must tile seamlessly top‑to‑bottom** — the top edge must match
  the bottom edge. (The placeholders use an 80×80 repeating motif, and 80 divides
  both 720 and 1280, guaranteeing a seamless vertical wrap. Following an 80‑px grid
  is a safe trick, but any genuinely vertically‑seamless 720×1280 image works.)
- **Transparency:** far, nebula and near are **stacked over the base space color**
  the engine paints underneath, so give them **transparent backgrounds** (the
  nebula/stars float over the void). Don't bake an opaque background into them or
  you'll hide the layers below.
- **Parallax speeds (fixed, from `data/polishedBackground.json`):**
  - `spr-bg-far` — **6 px/s** (slowest, "deepest"): faint, fine star dust.
  - `spr-bg-nebula` — **16 px/s** (mid): a few soft, low‑contrast glow clouds; keep
    them **away from the top/bottom edges** so the seam stays invisible.
  - `spr-bg-near` — **38 px/s** (fastest, "closest"): larger, brighter, **sparse**
    stars with a light glow.
- **Contrast:** deliberately **low**. Bullets, the graze ring and the ship are
  always drawn above and must never be lost against the background. Avoid bright
  whites, busy texture, or high‑frequency noise in the play area.

---

## 5. Audio assets

All audio lives in **`public/audio/`**, referenced from the manifest with
`type: 'audio'`. Phaser decodes them to `AudioBuffer`s the sound layer plays. Use
**WAV** (PCM). Mono is acceptable for SFX; **44.1 kHz / 16‑bit** is a good target
(the placeholders are 22.05 kHz mono — fine for validation, raise quality for real
content). Stereo is fine for music.

Each sound is independent and **falls back to the synth** if absent.

### 5.1 Sound effects (one‑shots) — `aud-sfx-<cue>`

Short, dry, punchy one‑shots. Played via a disposable buffer source with a
per‑shot pitch (`playbackRate`) and gain, so **leave headroom** (don't brick‑wall
to 0 dBFS; the mixer applies master volume and ducking on top). Avoid long reverb
tails that would overlap awkwardly when the cue fires rapidly (kills, grazes).

| Cue key | Fires on | Suggested length | Character |
| --- | --- | --- | --- |
| `aud-sfx-hit` | player takes damage | 0.15–0.30 s | low, blunt, "ouch" |
| `aud-sfx-kill` | enemy destroyed | 0.12–0.20 s | bright, snappy pop |
| `aud-sfx-graze` | bullet grazed (near‑miss → power) | 0.05–0.10 s | tiny, high, shimmering tick |
| `aud-sfx-pulse` | reflect pulse fired | 0.25–0.40 s | a release/whoosh |
| `aud-sfx-focusready` | Focus reaches pulse cost | 0.10–0.25 s | soft ready chime |
| `aud-sfx-bossentry` | boss appears | 0.30–0.80 s | ominous stinger |
| `aud-sfx-bossshield` | boss shield toggles | 0.20–0.40 s | metallic shimmer |
| `aud-sfx-bossteleport` | boss teleports | 0.15–0.30 s | warp blip |
| `aud-sfx-gameover` | run ends (death) | 0.5–1.5 s | descending failure tone |
| `aud-sfx-victory` | run won | 0.5–1.5 s | rising success motif |
| `aud-sfx-achievement` | achievement unlocked | 0.3–0.8 s | bright reward jingle |

> The first four (`hit`, `kill`, `graze`, `pulse`) are the core gameplay cues and
> the most valuable to produce first. The rest are nice‑to‑have; any you skip play
> as synth.

### 5.2 Music tracks (seamless loops) — `aud-music-<preset>-<track>`

Music is driven by an intensity cross‑fade between **two stems per preset**:

- `aud-music-<preset>-calm` — the ambient/pad bed (low intensity);
- `aud-music-<preset>-intense` — the same piece with rhythm/tension added (high
  intensity, used on bosses and at low life).

The engine cross‑fades between the two as the game heats up, so the two stems
**must be the same length, tempo and key** and **loop seamlessly** (matched start/
end, no click). Think "two mixes of one loop", not two different songs.

- **Both stems of a preset must exist** for samples to be used; if either is
  missing, that preset's music plays as synth.
- **Format:** WAV, stereo OK, 44.1 kHz. Loop length is up to you — a musically
  complete, loopable phrase (e.g. **8–32 s**) reads better than the 2‑s placeholder.
- **Presets** are the player's "track" cosmetic. Current preset ids:
  - `default` → keys `aud-music-default-calm`, `aud-music-default-intense`
  - `pulse` → keys `aud-music-pulse-calm`, `aud-music-pulse-intense`

  A preset is shared across themes but voiced per‑theme (synth vs sample). If you
  only produce `default`, the `pulse` cosmetic falls back to synth — that's fine.

---

## 6. File format & technical checklist

- **Images:** SVG or PNG. Transparent background for ship/enemy and all background
  layers. Set an SVG's `width`/`height` to the intended native raster size.
- **Tintable pieces (white/grayscale):** `spr-ship`, `spr-ship-<id>`, `spr-enemy`.
- **Full‑color pieces:** `spr-boss`, all three `spr-bg-*`.
- **Audio:** WAV PCM. SFX = short, dry, with headroom. Music = seamless loops,
  calm/intense stems matched in length/tempo/key.
- **Backgrounds:** exactly 720×1280, vertically seamless, low contrast,
  transparent, three layers shipped together.
- **Keep weight sane:** theme assets are loaded only when that theme is active and
  are **excluded from the PWA precache** (`vite.config.ts` → `globIgnores`), so
  they don't bloat the default Arcade theme. Still, prefer compressed PNG/WAV and
  reasonable loop lengths.

---

## 7. How a finished theme is wired (for reference)

Once the files are in `public/sprites/` and `public/audio/`, a theme is registered
in `src/config/themes.ts` as one entry. Example shape (the "Polished" theme today):

```ts
{
  id: 'my-theme',
  label: 'My Theme',
  rendererId: 'sprite',     // use the sprite renderer (falls back to vector per piece)
  audioThemeId: 'sample',   // use the sample audio (falls back to synth per cue)
  assets: [
    { key: 'spr-ship',                 url: 'sprites/ship.png',  type: 'image' },
    { key: 'spr-ship-ship-prism',      url: 'sprites/ship-prism.png', type: 'image' },
    { key: 'spr-enemy',                url: 'sprites/enemy.png', type: 'image' },
    { key: 'spr-boss',                 url: 'sprites/boss.png',  type: 'image' },
    { key: 'spr-bg-far',               url: 'sprites/bg-far.png', type: 'image' },
    { key: 'spr-bg-nebula',            url: 'sprites/bg-nebula.png', type: 'image' },
    { key: 'spr-bg-near',              url: 'sprites/bg-near.png', type: 'image' },
    { key: 'aud-sfx-kill',             url: 'audio/sfx-kill.wav', type: 'audio' },
    { key: 'aud-sfx-hit',              url: 'audio/sfx-hit.wav', type: 'audio' },
    { key: 'aud-sfx-graze',            url: 'audio/sfx-graze.wav', type: 'audio' },
    { key: 'aud-sfx-pulse',            url: 'audio/sfx-pulse.wav', type: 'audio' },
    { key: 'aud-music-default-calm',   url: 'audio/music-default-calm.wav', type: 'audio' },
    { key: 'aud-music-default-intense',url: 'audio/music-default-intense.wav', type: 'audio' },
  ],
}
```

**The key strings are the contract** — they must match exactly:
`spr-ship`, `spr-ship-<cosmeticId>`, `spr-enemy`, `spr-boss`, `spr-bg-far`,
`spr-bg-nebula`, `spr-bg-near`, `aud-sfx-<cue>`, `aud-music-<preset>-<track>`.
The `url` is relative to `public/`. Including a key enables that piece; omitting it
keeps the vector/synth fallback.

---

## 8. Directory layout

```
public/
  sprites/
    ship.png                 (spr-ship)            64px footprint, white, nose up
    ship-<cosmeticId>.png    (spr-ship-<id>)       curated ship variants
    enemy.png                (spr-enemy)            white, radial, ~36–48px
    boss.png                 (spr-boss)             full color, ~88–108px
    bg-far.png               (spr-bg-far)           720×1280, transparent, seamless
    bg-nebula.png            (spr-bg-nebula)        720×1280, transparent, seamless
    bg-near.png              (spr-bg-near)          720×1280, transparent, seamless
  audio/
    sfx-hit.wav  sfx-kill.wav  sfx-graze.wav  sfx-pulse.wav   (+ optional cues)
    music-default-calm.wav   music-default-intense.wav
    music-<preset>-calm.wav  music-<preset>-intense.wav       (per preset)
```

---

## 9. Minimum viable theme vs. full theme

- **Minimum (proves the look):** `spr-ship` + the four core SFX. Everything else
  falls back. This is roughly where the "Polished" theme stands today.
- **Full visual theme:** `spr-ship` (+ variants), `spr-enemy`, `spr-boss`, and all
  three `spr-bg-*` layers.
- **Full audio theme:** the four core SFX (ideally all eleven cues) + both stems of
  every music preset you support (`default`, `pulse`).

Produce in that order and the theme is always shippable at every step.

---

## 10. Quick prompt hints for an asset generator

- **Ship / variants:** "white/light‑gray vector spaceship fighter, top‑down, nose
  pointing up, symmetric, on transparent background, no engine flame, no glow,
  fits in a square, bold readable silhouette." (Recolored at runtime — keep it
  white.)
- **Enemy:** "white/light‑gray top‑down enemy drone core, radially symmetric, reads
  at any rotation, compact, transparent background, no detail smaller than a few
  pixels at 40px." (Recolored at runtime.)
- **Boss:** "full‑color top‑down menacing boss hull, symmetric, central area kept
  simple, transparent background, no health bars/shields/UI." (Shown as‑is.)
- **Background layers:** "720×1280 vertically‑seamless tile, low‑contrast deep‑space
  [star dust / soft nebula clouds / sparse bright stars], transparent background,
  no bright clutter in the center, subtle." (Three matched layers.)
- **SFX:** "short dry game one‑shot, [punchy pop / blunt hit / tiny shimmer / soft
  whoosh], no reverb tail, peak with headroom." 
- **Music:** "seamless loopable [ambient pad / driving rhythmic] stem, same tempo &
  key as its pair, neon/retro synthwave, [low / high] energy."
