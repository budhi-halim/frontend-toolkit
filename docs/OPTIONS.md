# Option reference

Generated from the schemas and presets for version 1.0.0. Edit the schema source, then run `npm run docs`; do not edit these generated tables.

Use camelCase keys with `configure()` and kebab-case attributes in HTML. The tables show schema defaults; named presets can override them. Per-kind notes identify options that only apply to some constructions. Renderer-specific interactions and cross-option limits still apply.

CSS custom-property form: `--ft-<attribute>`, for example `--ft-flame-speed`. Managed effects accept options directly; the custom-element CSS parsing is not a general stylesheet API for low-level renderers.

See [API](API.md) for lifecycle control, [Integration](GETTING_STARTED.md) for loading modes, and the [lab](../lab.html) for configuration experiments.

## Common options

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `releaseAfter` / `release-after` | number | `3` | 0 to 60; step 1 | Release offscreen renderer after · s |
| `adaptive` / `adaptive` | boolean | `true` | true or false | Auto optimize from measured FPS |
| `dragEnabled` / `drag-enabled` | boolean | `false` | true or false | Drag element (opt in) |
| `speed` / `speed` | number | `1` | 0 to 3; step 0.05 | Playback speed |
| `quality` / `quality` | number | `0.7` | 0.25 to 1; step 0.05 | Render scale |
| `dprCap` / `dpr-cap` | number | `1.5` | 0.5 to 3; step 0.25 | Pixel-ratio cap |
| `fps` / `fps` | number | `60` | 1 to 120; step 1 | Frame-rate cap |
| `seed` / `seed` | number | `7` | 0 to 65535; step 1 | Seed |
| `opacity` / `opacity` | number | `1` | 0 to 1; step 0.01 | Effect opacity |
| `paused` / `paused` | boolean | `false` | true or false | Paused |
| `motion` / `motion` | select | `respect` | respect, always, never | Motion policy |
| `reducedMotion` / `reduced-motion` | select | `auto` | auto, calm, still, hide, subtle | Reduced-motion presentation |
| `forceFallback` / `force-fallback` | boolean | `false` | true or false | Force portable fallback |
| `fallbackAnimation` / `fallback-animation` | select | `animated` | animated, static | Portable fallback motion |
| `fallbackFPS` / `fallback-f-p-s` | number | `24` | 1 to 60; step 1 | Portable fallback FPS cap |

## Glass

Element: `ft-glass`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `variant` / `variant` | select | `liquid` | liquid, frosted | Glass type |
| `distortion` / `distortion` | number | `200` | -400 to 400; step 1 | Refraction |
| `frosting` / `frosting` | number | `0.01` | 0.001 to 0.2; step 0.001 | Frost frequency |
| `blur` / `blur` | number | `0` | 0 to 30; step 0.25 | Blur · px |
| `brightness` / `brightness` | number | `1` | 0 to 2; step 0.02 | Brightness |
| `tint` / `tint` | color | `oklch(0.97 0.01 240)` | CSS colour | Tint |
| `tintOpacity` / `tint-opacity` | number | `0.04` | 0 to 1; step 0.01 | Tint opacity |
| `edgeColor` / `edge-color` | color | `oklch(1 0 0 / 0.65)` | CSS colour | Edge light |
| `shadow` / `shadow` | number | `0.14` | 0 to 0.7; step 0.01 | Shadow strength |
| `backend` / `backend` | select | `auto` | auto, svg, css | Refraction backend |

Presets: `liquid`, `frosted`, `clear-lens`, `soft-frost`.

## Surface

Element: `ft-surface`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `material` / `material` | select | `wood` | wood, marble, paper, wall, linen, slate, cork, sand, granite | Material |
| `woodSpecies` / `wood-species` | select | `oak` | oak, ash, walnut, maple, pine, cedar, cherry, mahogany, teak, rosewood, ebony, bamboo | Wood anatomy |
| `woodCut` / `wood-cut` | select | `plain-sawn` | plain-sawn, quarter-sawn, end-grain | Cut through the grain |
| `woodFinish` / `wood-finish` | select | `natural` | natural, smooth, weathered, charred | Surface finish |
| `ringScale` / `ring-scale` | number | `1` | 0.4 to 3; step 0.05 | Growth-ring frequency |
| `pores` / `pores` | number | `1` | 0 to 2; step 0.05 | Vessel / pore strength |
| `knots` / `knots` | number | `0.15` | 0 to 1; step 0.05 | Knot prominence |
| `marbleKind` / `marble-kind` | select | `carrara` | carrara, calacatta, statuario, nero | Vein formation |
| `paperKind` / `paper-kind` | select | `cotton` | cotton, watercolor, kraft, parchment, laid, washi | Paper construction |
| `contrast` / `contrast` | number | `0.52` | 0 to 1.5; step 0.02 | Texture contrast |
| `fibers` / `fibers` | number | `0.45` | 0 to 1; step 0.02 | Fibers / fine grain |
| `weathering` / `weathering` | number | `0.15` | 0 to 1; step 0.02 | Weathering |
| `color` / `color` | color | `oklch(0.65 0.12 50)` | CSS colour | Material color |
| `grainX` / `grain-x` | number | `0.002` | 0.0001 to 0.4; step 0.0001 | Longitudinal grain scale |
| `grainY` / `grain-y` | number | `0.02` | 0.0001 to 0.4; step 0.0001 | Cross-grain scale |
| `detail` / `detail` | number | `10` | 1 to 15; step 1 | Noise octaves |
| `depth` / `depth` | number | `50` | 0 to 160; step 1 | Pattern warping |
| `roughness` / `roughness` | number | `9` | 0 to 20; step 0.1 | Relief |
| `orientation` / `orientation` | select | `auto` | auto, horizontal, vertical | Grain orientation |
| `lightAngle` / `light-angle` | number | `-90` | -180 to 180; step 1 | Light azimuth · ° |
| `elevation` / `elevation` | number | `60` | 5 to 90; step 1 | Light elevation · ° |

Presets: `wood/oak`, `wood/mahogany`, `wood/walnut`, `wood/pine`, `wood/cherry`, `wood/bamboo`, `wood/driftwood`, `wood/burnt`, `wood/maple`, `wood/teak`, `wood/cedar`, `wood/ash`, `wood/rosewood`, `wood/ebony`, `wood/smooth-oak`, `wood/smooth-mahogany`, `wood/smooth-walnut`, `wood/smooth-pine`, `wood/smooth-cherry`, `wood/smooth-bamboo`, `wood/smooth-driftwood`, `wood/smooth-burnt`, `wood/smooth-maple`, `wood/smooth-teak`, `wood/smooth-cedar`, `wood/smooth-ash`, `wood/smooth-rosewood`, `wood/smooth-ebony`, `marble/carrara`, `marble/nero`, `marble/calacatta`, `marble/statuario`, `paper/watercolor`, `paper/buffalo`, `wall/default`, `wood/bleached-ash`, `paper/cotton`, `paper/kraft`, `paper/parchment`, `wall/limewash`, `linen/natural`, `linen/indigo`, `slate/charcoal`, `cork/natural`, `sand/dunes`, `granite/salt-pepper`, `wood/quarter-sawn-oak`, `wood/end-grain-oak`, `wood/end-grain-pine`, `paper/laid`, `paper/washi`.

## Water

Element: `ft-water`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `flowSpeed` / `flow-speed` | number | `0.4` | 0 to 2; step 0.02 | Current speed |
| `morphSpeed` / `morph-speed` | number | `1` | 0 to 3; step 0.05 | Wave evolution |
| `scale` / `scale` | number | `4` | 0.5 to 15; step 0.1 | Wave scale |
| `windX` / `wind-x` | number | `0.3` | -4 to 4; step 0.05 | Current X |
| `windY` / `wind-y` | number | `0.15` | -4 to 4; step 0.05 | Current Y |
| `distortion` / `distortion` | number | `0.018` | 0 to 0.12; step 0.001 | Refraction |
| `caustic` / `caustic` | number | `0.5` | 0 to 2; step 0.02 | Caustic light |
| `ridge` / `ridge` | number | `3` | 0.5 to 12; step 0.1 | Caustic sharpness |
| `tint` / `tint` | color | `oklch(0.6 0.105 215)` | CSS colour | Water tint |
| `tintOpacity` / `tint-opacity` | number | `0.45` | 0 to 1; step 0.01 | Tint strength |
| `highlight` / `highlight` | color | `oklch(0.97 0.025 205)` | CSS colour | Highlight |
| `contentMode` / `content-mode` | select | `floating` | floating, submerged | Content treatment |
| `contentDistortion` / `content-distortion` | number | `4` | 0 to 30; step 0.25 | Submerged text warp · px |
| `texture` / `texture` | select | `pool` | pool, sand, none | Built-in texture |

Presets: `pool`, `shallows`, `midnight`, `current`.

## Fire

Element: `ft-fire`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `model` / `model` | select | `classic` | ribbon, classic, candle, embers | Flame model |
| `mode` / `mode` | select | `in` | in, out | Placement |
| `direction` / `direction` | select | `up` | up, right, down, left, outward | Emission direction |
| `sourceEdge` / `source-edge` | select | `auto` | auto, all, top, right, bottom, left | Burning source edges |
| `outPolicy` / `out-policy` | select | `strict` | strict, border | Outside fire visibility |
| `respectGravity` / `respect-gravity` | boolean | `true` | true or false | Respect buoyancy / gravity |
| `reach` / `reach` | number | `105` | 20 to 300; step 5 | Outside reach · px |
| `gravity` / `gravity` | number | `0.55` | 0 to 2; step 0.05 | Buoyant upward bend |
| `filament` / `filament` | number | `0.65` | 0 to 1.5; step 0.02 | Flame folds / fine detail |
| `blueBase` / `blue-base` | number | `0.24` | 0 to 1; step 0.02 | Blue at source |
| `scale` / `scale` | number | `4.5` | 1 to 12; step 0.1 | Flame scale |
| `height` / `height` | number | `0.78` | 0.1 to 1.4; step 0.02 | Flame height |
| `intensity` / `intensity` | number | `1.15` | 0 to 2.5; step 0.05 | Heat |
| `turbulence` / `turbulence` | number | `0.72` | 0 to 1.5; step 0.02 | Turbulence |
| `wind` / `wind` | number | `0.05` | -1.5 to 1.5; step 0.05 | Wind |
| `spread` / `spread` | number | `0.86` | 0.02 to 1.4; step 0.02 | Source width · fraction of edge |
| `sourceOffset` / `source-offset` | number | `0.5` | 0 to 1; step 0.01 | Source center · fraction of edge |
| `flameSpeed` / `flame-speed` | number | `1` | 0 to 8; step 0.05 | Flame flow speed · multiplier |
| `flickerSpeed` / `flicker-speed` | number | `1` | 0 to 5; step 0.05 | Flicker speed · multiplier |
| `embers` / `embers` | number | `0.55` | 0 to 1; step 0.05 | Embers |
| `color` / `color` | color | `oklch(0.56 0.23 28)` | CSS colour | Outer flame |
| `midColor` / `mid-color` | color | `oklch(0.8 0.18 64)` | CSS colour | Flame body |
| `coreColor` / `core-color` | color | `oklch(0.99 0.075 104)` | CSS colour | Hot core |

Presets: `hearth`, `ribbon-flame`, `candle`, `embers`, `burning-border`, `flamethrower`, `torch`, `inferno`, `spectral`, `gentle-flame`, `fast-jet`, `edge-candles`.

## Smoke

Element: `ft-smoke`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `steps` / `steps` | number | `32` | 12 to 64; step 1 | Volume samples |
| `depth` / `depth` | number | `1.25` | 0.3 to 2.4; step 0.05 | Volume depth |
| `shadow` / `shadow` | number | `1.2` | 0 to 3; step 0.05 | Self-shadowing |
| `lightAngle` / `light-angle` | number | `-35` | -180 to 180; step 1 | Light azimuth · ° |
| `interactionMode` / `interaction-mode` | select | `both` | auto, pointer, both | Motion source |
| `interactive` / `interactive` | boolean | `true` | true or false | Pointer stirs smoke |
| `scale` / `scale` | number | `3.2` | 1 to 10; step 0.1 | Turbulence scale |
| `density` / `density` | number | `1.6` | 0 to 4; step 0.05 | Density |
| `turbulence` / `turbulence` | number | `0.85` | 0 to 2; step 0.05 | Curl strength |
| `wind` / `wind` | number | `0.15` | -1.5 to 1.5; step 0.05 | Wind |
| `spread` / `spread` | number | `0.52` | 0.1 to 1.5; step 0.02 | Plume width |
| `rise` / `rise` | number | `0.3` | 0 to 1.5; step 0.02 | Rise speed |
| `light` / `light` | number | `0.8` | 0 to 2; step 0.05 | Lighting |
| `color` / `color` | color | `oklch(0.76 0.018 260)` | CSS colour | Smoke color |

Presets: `plume`, `incense`, `billowing`, `mist`.

## Clouds

Element: `ft-clouds`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `scale` / `scale` | number | `2.8` | 0.5 to 7; step 0.1 | Cloud scale |
| `coverage` / `coverage` | number | `0.54` | 0 to 1; step 0.01 | Coverage |
| `density` / `density` | number | `1.2` | 0 to 3; step 0.05 | Density |
| `wind` / `wind` | number | `0.15` | -1 to 1; step 0.01 | Wind |
| `light` / `light` | number | `1.2` | 0 to 3; step 0.05 | Silver lining |
| `softness` / `softness` | number | `0.15` | 0.03 to 0.4; step 0.01 | Edge softness |
| `color` / `color` | color | `oklch(0.98 0.012 220)` | CSS colour | Cloud light |
| `shadowColor` / `shadow-color` | color | `oklch(0.61 0.043 260)` | CSS colour | Cloud shadow |
| `skyColor` / `sky-color` | color | `oklch(0.67 0.135 240)` | CSS colour | Sky |
| `transparent` / `transparent` | boolean | `false` | true or false | Transparent sky |

Presets: `cumulus`, `overcast`, `sunset`, `wisps`.

## Aurora

Element: `ft-aurora`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `layers` / `layers` | number | `40` | 8 to 100; step 1 | Ray layers |
| `auroraSpeed` / `aurora-speed` | number | `0.32` | 0 to 4; step 0.02 | Curtain speed |
| `breathSpeed` / `breath-speed` | number | `0.45` | 0 to 3; step 0.05 | Breathing speed |
| `breath` / `breath` | number | `0.08` | 0 to 0.35; step 0.01 | Breathing amount |
| `tilt` / `tilt` | number | `2` | 0.2 to 5; step 0.1 | Camera tilt |
| `sway` / `sway` | number | `0.14` | 0 to 1; step 0.02 | Camera sway |
| `fov` / `fov` | number | `1` | 0.3 to 2.5; step 0.05 | Field of view |
| `color` / `color` | color | `oklch(0.83 0.19 160)` | CSS colour | Lower curtain |
| `topColor` / `top-color` | color | `oklch(0.56 0.2 302)` | CSS colour | Upper curtain |
| `proportion` / `proportion` | number | `0.3` | 0 to 1; step 0.02 | Color transition |
| `stars` / `stars` | number | `0.8` | 0 to 1; step 0.02 | Star visibility |

Presets: `borealis`, `violet`, `solar`, `quiet`.

## Glow

Element: `ft-glow`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `shape` / `shape` | select | `rounded` | rounded, ellipse | Contour |
| `speedMode` / `speed-mode` | select | `duration` | duration, pixels | Speed units |
| `velocity` / `velocity` | number | `150` | 0 to 800; step 5 | Linear speed · px/s |
| `bloomPlacement` / `bloom-placement` | select | `outside` | outside, inside, both | Bloom placement |
| `palette` / `palette` | select | `custom` | custom, neon-cyberpunk, forest-mystic, sunset-inferno, aurora-stream, abyssal-tempest, vaporwave-meltdown, steampunk-copper, candy-splash, frostbyte-core, celestial-gold, toxic-slime, nebula-rift, royal-midnight, sakura-whisper, magma-core, matrix-hacker, solar-flare, blue-trail | Palette |
| `width` / `width` | number | `2` | 0 to 14; step 0.25 | Border width · px |
| `glow` / `glow` | number | `14` | 0 to 50; step 1 | Bloom radius · px |
| `intensity` / `intensity` | number | `0.55` | 0 to 1; step 0.01 | Bloom strength |
| `duration` / `duration` | number | `5` | 0.5 to 30; step 0.5 | Orbit duration · s |
| `angle` / `angle` | number | `0` | 0 to 360; step 1 | Starting angle · ° |
| `reverse` / `reverse` | boolean | `false` | true or false | Reverse orbit |
| `trail` / `trail` | number | `0.6` | 0.08 to 1; step 0.02 | Trail length |
| `color` / `color` | color | `oklch(0.8 0.14 190)` | CSS colour | Color A |
| `color2` / `color2` | color | `oklch(0.65 0.22 300)` | CSS colour | Color B |
| `color3` / `color3` | color | `oklch(0.78 0.14 55)` | CSS colour | Color C |

Presets: `prism`, `transparent-chase`, `blue-trail`, `ember`, `mono`, `neon-cyberpunk`, `forest-mystic`, `sunset-inferno`, `aurora-stream`, `abyssal-tempest`, `vaporwave-meltdown`, `steampunk-copper`, `candy-splash`, `frostbyte-core`, `celestial-gold`, `toxic-slime`, `nebula-rift`, `royal-midnight`, `sakura-whisper`, `magma-core`, `matrix-hacker`, `solar-flare`.

## Fluid

Element: `ft-fluid`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `ink` | ink, smoke, fire, neon | Fluid appearance |
| `resolution` / `resolution` | number | `144` | 48 to 384; step 8 | Simulation resolution |
| `pressureIterations` / `pressure-iterations` | number | `20` | 6 to 48; step 1 | Pressure iterations |
| `vorticity` / `vorticity` | number | `22` | 0 to 65; step 1 | Vortex strength |
| `dissipation` / `dissipation` | number | `0.6` | 0.05 to 4; step 0.05 | Dye fading / second |
| `viscosity` / `viscosity` | number | `0.3` | 0 to 4; step 0.05 | Velocity damping |
| `radius` / `radius` | number | `0.048` | 0.008 to 0.18; step 0.002 | Brush radius |
| `force` / `force` | number | `55` | 2 to 160; step 1 | Pointer impulse |
| `buoyancy` / `buoyancy` | number | `0.45` | 0 to 4; step 0.05 | Upward lift |
| `shading` / `shading` | number | `0.65` | 0 to 2; step 0.05 | Density lighting |
| `color` / `color` | color | `oklch(.73 .17 195)` | CSS colour | Dye color |
| `rainbow` / `rainbow` | boolean | `true` | true or false | Color cycle |
| `autoEmit` / `auto-emit` | boolean | `true` | true or false | Automatic source |
| `interactive` / `interactive` | boolean | `true` | true or false | Pointer interaction |

Presets: `ink`, `smoke`, `fire`, `neon`, `quiet-ink`.

## Trail

Element: `ft-trail`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `stars` | stars, flowers, petals, smoke, embers, bubbles, fireflies, snow, ribbons, comet, confetti, mixed | Particle shape |
| `trigger` / `trigger` | select | `move` | move, hover, press, click, auto, both, manual | Emission trigger |
| `throttle` / `throttle` | select | `distance` | distance, time | Trail spacing method |
| `distanceInterval` / `distance-interval` | number | `12` | 1 to 160; step 1 | Spacing · CSS px |
| `timeInterval` / `time-interval` | number | `32` | 4 to 1000; step 1 | Interval · ms |
| `burstCount` / `burst-count` | number | `24` | 1 to 160; step 1 | Click / manual burst size |
| `colorMode` / `color-mode` | select | `palette` | palette, gradient, rainbow, single | Particle colors |
| `variantMode` / `variant-mode` | select | `random` | random, cycle, fixed | Shape selection |
| `variant` / `variant` | number | `0` | 0 to 3; step 1 | Fixed shape variant |
| `mix` / `mix` | select | `botanical` | botanical, celestial, celebration, all | Mixed shape collection |
| `color3` / `color3` | color | `oklch(.78 .14 210)` | CSS colour | Palette color C |
| `color4` / `color4` | color | `oklch(.83 .13 130)` | CSS colour | Palette color D |
| `sizeVariation` / `size-variation` | number | `0.6` | 0 to 1; step 0.05 | Size variation |
| `count` / `count` | number | `450` | 40 to 1200; step 10 | Particle budget |
| `emission` / `emission` | number | `31.25` | 1 to 250; step 1 | Legacy emission / second alias |
| `size` / `size` | number | `14` | 2 to 60; step 1 | Particle size · px |
| `life` / `life` | number | `2.4` | 0.3 to 8; step 0.1 | Lifetime · s |
| `gravity` / `gravity` | number | `22` | -180 to 240; step 2 | Gravity · px/s² |
| `wind` / `wind` | number | `0` | -200 to 200; step 2 | Wind · px/s |
| `turbulence` / `turbulence` | number | `1` | 0 to 3; step 0.05 | Swirl |
| `spread` / `spread` | number | `28` | 0 to 140; step 2 | Emission spread |
| `color` / `color` | color | `oklch(.88 .12 80)` | CSS colour | Primary color |
| `color2` / `color2` | color | `oklch(.7 .19 335)` | CSS colour | Secondary color |
| `rainbow` / `rainbow` | boolean | `false` | true or false | Color cycle |
| `autoEmit` / `auto-emit` | boolean | `false` | true or false | Legacy automatic orbit alias |
| `interactive` / `interactive` | boolean | `true` | true or false | Pointer interaction |

Presets: `stars`, `garden`, `flowers`, `petals`, `smoke`, `embers`, `bubbles`, `fireflies`, `snow`, `ribbons`, `comet`, `confetti`.

## Field

Element: `ft-field`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `rainSpeed` / `rain-speed` | number | `620` | 0 to 1800; step 10 | Fall speed · CSS px/s |
| `rainWind` / `rain-wind` | number | `35` | -450 to 450; step 5 | Crosswind · CSS px/s |
| `rainGust` / `rain-gust` | number | `0.12` | 0 to 1; step 0.02 | Gust variation |
| `rainDepth` / `rain-depth` | number | `0.7` | 0 to 1; step 0.05 | Depth / speed variation |
| `rainLength` / `rain-length` | number | `26` | 2 to 100; step 1 | Blur length at base speed · px |
| `rainDensity` / `rain-density` | number | `0.55` | 0 to 1; step 0.05 | Rain density |
| `rainWidth` / `rain-width` | number | `1.2` | 0.4 to 3; step 0.1 | Streak width · px |
| `kind` / `kind` | select | `ocean` | ocean, lava, nebula, rain, iridescence, magnetic | Field |
| `oceanAmplitude` / `ocean-amplitude` | number | `1` | 0 to 2; step 0.05 | Wave relief |
| `interactionMode` / `interaction-mode` | select | `both` | auto, pointer, both | Motion source |
| `scale` / `scale` | number | `3` | 0.4 to 12; step 0.1 | Pattern scale |
| `intensity` / `intensity` | number | `1` | 0 to 2.5; step 0.05 | Intensity |
| `detail` / `detail` | number | `5` | 2 to 8; step 1 | Detail |
| `distortion` / `distortion` | number | `0.6` | 0 to 2; step 0.02 | Domain distortion |
| `wind` / `wind` | number | `0.3` | -2 to 2; step 0.05 | Drift |
| `color` / `color` | color | `oklch(.51 .13 227)` | CSS colour | Primary |
| `color2` / `color2` | color | `oklch(.9 .07 170)` | CSS colour | Secondary |
| `transparent` / `transparent` | boolean | `false` | true or false | Transparent background |
| `interactive` / `interactive` | boolean | `true` | true or false | Pointer influence |

Presets: `ocean`, `lava`, `nebula`, `rain`, `iridescence`, `magnetic`.

## Sea

Element: `ft-sea`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `waveHeight` / `wave-height` | number | `0.12` | 0 to 0.8; step 0.005 | Wave amplitude |
| `waveSpeed` / `wave-speed` | number | `1` | 0 to 3; step 0.05 | Wave travel speed |
| `waveDirection` / `wave-direction` | number | `18` | -180 to 180; step 1 | Wave heading · ° |
| `ripples` / `ripples` | number | `0.25` | 0 to 1; step 0.05 | Fine ripples |
| `choppiness` / `choppiness` | number | `0.55` | 0 to 2.2; step 0.05 | Crest sharpness |
| `waveScale` / `wave-scale` | number | `1.2` | 0.3 to 3; step 0.05 | Wave frequency |
| `wind` / `wind` | number | `0.5` | 0 to 2; step 0.05 | Wind ripple strength |
| `horizon` / `horizon` | number | `0.6` | 0.35 to 0.85; step 0.01 | Horizon height |
| `sunElevation` / `sun-elevation` | number | `0.22` | -0.15 to 1; step 0.01 | Sun elevation |
| `sunAzimuth` / `sun-azimuth` | number | `-0.35` | -1.5 to 1.5; step 0.05 | Sun horizontal position |
| `sunSize` / `sun-size` | number | `0.035` | 0.005 to 0.08; step 0.001 | Sun / moon disc size |
| `sunColor` / `sun-color` | color | `#ffdda4` | CSS colour | Sun / moon color |
| `skyColor` / `sky-color` | color | `#406fa1` | CSS colour | Upper sky |
| `horizonColor` / `horizon-color` | color | `#ffc5a1` | CSS colour | Horizon light |
| `waterColor` / `water-color` | color | `#083e55` | CSS colour | Water depth |
| `fog` / `fog` | number | `0.035` | 0.005 to 0.15; step 0.005 | Horizon mist |
| `reflection` / `reflection` | number | `0.7` | 0 to 1; step 0.05 | Reflectivity |
| `detail` / `detail` | number | `5` | 2 to 7; step 1 | Wave octaves |
| `interactive` / `interactive` | boolean | `false` | true or false | Legacy interaction (ignored) |

Presets: `golden`, `calm`, `glassy`, `daylight`, `sunset`, `moonlight`, `storm`.

## Art

Element: `ft-art`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `metaballs` | metaballs, silk, interference, tunnel | Optical field |
| `interactionMode` / `interaction-mode` | select | `both` | auto, pointer, both | Motion source |
| `interactionTrigger` / `interaction-trigger` | select | `move` | move, press | Brush activation |
| `interactionAction` / `interaction-action` | select | `stir` | stir, attract | Metal brush |
| `interactionRadius` / `interaction-radius` | number | `170` | 35 to 400; step 5 | Brush radius · CSS px |
| `interactionStrength` / `interaction-strength` | number | `1` | 0 to 3; step 0.05 | Brush strength |
| `viscosity` / `viscosity` | number | `4.5` | 1 to 12; step 0.25 | Motion damping |
| `scale` / `scale` | number | `1` | 0.4 to 3; step 0.05 | Structure scale |
| `amount` / `amount` | number | `6` | 3 to 10; step 1 | Structures / folds |
| `relief` / `relief` | number | `0.65` | 0.1 to 1.5; step 0.05 | Relief / distortion |
| `lightAngle` / `light-angle` | number | `-40` | -180 to 180; step 1 | Light azimuth · ° |
| `color` / `color` | color | `#264e68` | CSS colour | Material body |
| `color2` / `color2` | color | `#e5bc7c` | CSS colour | Reflected light |
| `background` / `background` | color | `#080d16` | CSS colour | Background |
| `transparent` / `transparent` | boolean | `false` | true or false | Transparent background |
| `interactive` / `interactive` | boolean | `true` | true or false | Pointer interaction |

Presets: `metaballs`, `chrome`, `silk`, `interference`, `tunnel`.

## Sketch

Element: `ft-sketch`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `orbit` | orbit, constellation, lightning, blobs, jellyfish | Kinetic drawing |
| `interactionMode` / `interaction-mode` | select | `auto` | auto, pointer, both | Motion source |
| `strikeTrigger` / `strike-trigger` | select | `auto` | auto, click, both, manual | Strike trigger |
| `jaggedness` / `jaggedness` | number | `0.65` | 0.15 to 1.4; step 0.05 | Lightning irregularity |
| `count` / `count` | number | `72` | 12 to 220; step 1 | Elements |
| `scale` / `scale` | number | `1` | 0.3 to 1.6; step 0.05 | Composition scale |
| `depth` / `depth` | number | `1` | 0.2 to 2; step 0.05 | Perspective depth |
| `width` / `width` | number | `1.2` | 0.3 to 5; step 0.1 | Line width · px |
| `linkDistance` / `link-distance` | number | `100` | 35 to 230; step 5 | Connection reach · px |
| `branchSpread` / `branch-spread` | number | `32` | 8 to 65; step 1 | Branch divergence · ° |
| `branchLength` / `branch-length` | number | `0.34` | 0.06 to 0.8; step 0.02 | Branch length |
| `tortuosity` / `tortuosity` | number | `0.42` | 0 to 1; step 0.02 | Large-scale meander |
| `taper` / `taper` | number | `0.58` | 0.15 to 0.9; step 0.01 | Branch attenuation |
| `strikeDuration` / `strike-duration` | number | `0.7` | 0.1 to 2; step 0.05 | Discharge persistence · s |
| `strikeOriginX` / `strike-origin-x` | number | `0.5` | 0 to 1; step 0.01 | Origin X |
| `strikeOriginY` / `strike-origin-y` | number | `0.02` | 0 to 1; step 0.01 | Origin Y · from top |
| `strikeTargetX` / `strike-target-x` | number | `0.52` | 0 to 1; step 0.01 | Target X |
| `strikeTargetY` / `strike-target-y` | number | `0.98` | 0 to 1; step 0.01 | Target Y · from top |
| `strikeWander` / `strike-wander` | number | `0.25` | 0 to 0.8; step 0.01 | Endpoint variation |
| `branches` / `branches` | number | `5` | 0 to 12; step 1 | Lightning branches |
| `strikeInterval` / `strike-interval` | number | `4` | 1.5 to 15; step 0.5 | Strike interval · s |
| `bloom` / `bloom` | number | `12` | 0 to 25; step 1 | Soft glow · px |
| `color` / `color` | color | `#65d9d7` | CSS colour | Primary |
| `color2` / `color2` | color | `#eab5ec` | CSS colour | Secondary |
| `interactive` / `interactive` | boolean | `true` | true or false | Pointer interaction |

Presets: `orbit`, `constellation`, `lightning`, `blobs`, `jellyfish`, `forked-lightning`, `cloud-crawler`, `fine-discharge`.

## Highlight

Element: `ft-highlight`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `spotlight` | spotlight, sheen, ripple, sparkle, foil, edge | Surface light |
| `activation` / `activation` | select | `hover` | auto, hover, press, click, focus, manual | Activation |
| `motionSource` / `motion-source` | select | `pointer` | pointer, auto, both | Light position; spotlight, foil, edge only |
| `radius` / `radius` | number | `160` | 8 to 600; step 2 | Light / ripple radius · px; spotlight, ripple, edge only |
| `softness` / `softness` | number | `0.75` | 0 to 1; step 0.01 | Light softness; spotlight, sheen, edge only |
| `intensity` / `intensity` | number | `0.65` | 0 to 2; step 0.02 | Light intensity |
| `color` / `color` | color | `#91e8df` | CSS colour | Primary light |
| `color2` / `color2` | color | `#e6b3ee` | CSS colour | Secondary light; foil, sparkle, ripple, sheen only |
| `color3` / `color3` | color | `#edbf75` | CSS colour | Third reflection; foil only |
| `duration` / `duration` | number | `1.4` | 0.1 to 12; step 0.05 | Cycle / pulse duration · s; sheen, ripple, sparkle only |
| `interval` / `interval` | number | `3` | 0.15 to 20; step 0.05 | Automatic repeat interval · s; sheen, ripple only |
| `angle` / `angle` | number | `-25` | -180 to 180; step 1 | Light angle · °; sheen, foil only |
| `bandWidth` / `band-width` | number | `100` | 4 to 600; step 2 | Sweep band · px; sheen only |
| `rippleStyle` / `ripple-style` | select | `ring` | ring, filled, double | Ripple drawing; ripple only |
| `lineWidth` / `line-width` | number | `1.8` | 0.25 to 12; step 0.25 | Stroke · px; ripple, edge only |
| `count` / `count` | number | `30` | 0 to 120; step 1 | Sparkle count; sparkle only |
| `sparkleSize` / `sparkle-size` | number | `5` | 1 to 24; step 0.5 | Sparkle size · px; sparkle only |
| `texture` / `texture` | number | `0.4` | 0 to 1; step 0.02 | Foil microstructure; foil only |
| `follow` / `follow` | number | `0.12` | 0 to 1; step 0.02 | Light smoothing · s; spotlight, foil, edge only |
| `centerX` / `center-x` | number | `0.5` | 0 to 1; step 0.01 | Rest / manual center X; spotlight, foil, edge, ripple only |
| `centerY` / `center-y` | number | `0.5` | 0 to 1; step 0.01 | Rest / manual center Y · from top; spotlight, foil, edge, ripple only |
| `clip` / `clip` | boolean | `true` | true or false | Clip to the rounded element |
| `maxPulses` / `max-pulses` | number | `12` | 1 to 40; step 1 | Maximum simultaneous pulses; ripple, sheen only |
| `idleIntensity` / `idle-intensity` | number | `0` | 0 to 1; step 0.01 | Resting light intensity; spotlight, foil, edge only |

Presets: `spotlight`, `sheen`, `ripple`, `sparkle`, `foil`, `edge-light`, `soft-pulse`, `keyboard-focus`, `gold-foil`.

## Backdrop

Element: `ft-backdrop`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `mesh` | mesh, bokeh, beams, shadows, waves, contours | Background composition |
| `color` / `color` | color | `#246c71` | CSS colour | Color A |
| `color2` / `color2` | color | `#554f89` | CSS colour | Color B; mesh, bokeh, beams, waves, contours only |
| `color3` / `color3` | color | `#a76b58` | CSS colour | Color C; mesh, bokeh, beams, waves only |
| `background` / `background` | color | `#07191f` | CSS colour | Base color |
| `transparent` / `transparent` | boolean | `false` | true or false | Transparent base |
| `intensity` / `intensity` | number | `0.7` | 0 to 1.5; step 0.02 | Layer intensity |
| `count` / `count` | number | `6` | 1 to 80; step 1 | Layers / elements |
| `scale` / `scale` | number | `1` | 0.15 to 4; step 0.05 | Composition scale |
| `driftSpeed` / `drift-speed` | number | `0.2` | 0 to 3; step 0.02 | Drift / propagation speed |
| `amplitude` / `amplitude` | number | `0.25` | 0 to 1; step 0.02 | Motion / wave amplitude |
| `angle` / `angle` | number | `-25` | -180 to 180; step 1 | Direction · °; mesh, bokeh, beams, shadows only |
| `grain` / `grain` | number | `0.035` | 0 to 0.3; step 0.005 | Static fine grain |
| `vignette` / `vignette` | number | `0.2` | 0 to 1; step 0.02 | Edge shading |
| `softness` / `softness` | number | `0.8` | 0 to 1; step 0.02 | Softness; mesh, bokeh, beams, shadows only |
| `bokehShape` / `bokeh-shape` | select | `circle` | circle, hexagon, octagon | Bokeh aperture; bokeh only |
| `lightX` / `light-x` | number | `0.68` | -0.5 to 1.5; step 0.01 | Light origin X; beams, shadows only |
| `lightY` / `light-y` | number | `-0.15` | -0.8 to 1; step 0.01 | Light origin Y; beams, shadows only |
| `shadowKind` / `shadow-kind` | select | `window` | window, leaves, blinds | Shadow caster; shadows only |
| `edge` / `edge` | select | `bottom` | bottom, top, left, right | Wave attachment; waves only |
| `baseline` / `baseline` | number | `0.62` | 0 to 1; step 0.01 | Wave base position; waves only |
| `lineWidth` / `line-width` | number | `1` | 0.25 to 5; step 0.25 | Contour stroke · px; contours only |
| `spacing` / `spacing` | number | `14` | 4 to 60; step 1 | Contour interval · px; contours only |

Presets: `mesh`, `warm-mesh`, `bokeh`, `sunbeams`, `window-shadows`, `leaf-shadows`, `blinds`, `wave-divider`, `contours`.

## Pattern

Element: `ft-pattern`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `dots` | dots, grid, crosses, hexagons, diagonal, halftone, arches, tiles | Pattern construction |
| `color` / `color` | color | `#688e94` | CSS colour | Pattern ink |
| `color2` / `color2` | color | `#ce9271` | CSS colour | Second ink; tiles, arches, halftone only |
| `background` / `background` | color | `#0b1a22` | CSS colour | Base |
| `transparent` / `transparent` | boolean | `true` | true or false | Transparent base |
| `spacing` / `spacing` | number | `26` | 6 to 140; step 1 | Cell spacing · CSS px |
| `size` / `size` | number | `1.4` | 0.2 to 30; step 0.2 | Mark size · px; dots, crosses, halftone only |
| `lineWidth` / `line-width` | number | `1` | 0.25 to 8; step 0.25 | Line weight · px; grid, crosses, hexagons, diagonal, arches, tiles only |
| `angle` / `angle` | number | `0` | -180 to 180; step 1 | Rotation · ° |
| `jitter` / `jitter` | number | `0` | 0 to 0.45; step 0.01 | Construction irregularity; dots, crosses only |
| `fade` / `fade` | select | `none` | none, radial, left, right, top, bottom | Coverage falloff |
| `fadeStrength` / `fade-strength` | number | `0.8` | 0 to 1; step 0.02 | Falloff strength |
| `driftX` / `drift-x` | number | `0` | -80 to 80; step 1 | Horizontal drift · CSS px/s |
| `driftY` / `drift-y` | number | `0` | -80 to 80; step 1 | Vertical drift · CSS px/s |
| `halftoneContrast` / `halftone-contrast` | number | `0.8` | 0 to 1; step 0.02 | Halftone scale contrast; halftone only |
| `alternate` / `alternate` | boolean | `true` | true or false | Alternate tile orientation; arches, tiles only |

Presets: `dots`, `grid`, `crosses`, `hexagons`, `diagonal`, `halftone`, `arches`, `tiles`, `dot-fade`, `blueprint`.

## Status

Element: `ft-status`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `skeleton` | skeleton, ring, bar, segments, dots, equalizer | Status visualization |
| `color` / `color` | color | `#83ddc7` | CSS colour | Active color |
| `color2` / `color2` | color | `#bbbef9` | CSS colour | Accent color |
| `trackColor` / `track-color` | color | `#24414b` | CSS colour | Track / placeholder |
| `value` / `value` | number | `0.65` | 0 to 1; step 0.01 | Progress value; ring, bar, segments only |
| `indeterminate` / `indeterminate` | boolean | `false` | true or false | Indeterminate animation; ring, bar, segments only |
| `anchorX` / `anchor-x` | number | `0.77` | 0 to 1; step 0.01 | Center X |
| `anchorY` / `anchor-y` | number | `0.5` | 0 to 1; step 0.01 | Center Y · from top |
| `size` / `size` | number | `100` | 8 to 400; step 2 | Graphic size · CSS px; ring, dots, equalizer only |
| `width` / `width` | number | `0.32` | 0.05 to 1; step 0.01 | Block width · fraction of element; skeleton, bar, segments only |
| `thickness` / `thickness` | number | `8` | 1 to 50; step 1 | Track / bar thickness · px; ring, bar, segments only |
| `radius` / `radius` | number | `8` | 0 to 50; step 1 | Corner radius · px; skeleton, bar, segments, equalizer only |
| `cycle` / `cycle` | number | `2` | 0.4 to 10; step 0.1 | Animation duration · s |
| `count` / `count` | number | `7` | 2 to 40; step 1 | Segments / dots / columns; segments, dots, equalizer only |
| `gap` / `gap` | number | `12` | 0 to 48; step 1 | Gap · CSS px; segments, skeleton, equalizer only |
| `lineHeight` / `line-height` | number | `10` | 2 to 32; step 1 | Text bar height · CSS px; skeleton only |
| `avatarSize` / `avatar-size` | number | `38` | 12 to 120; step 1 | Avatar diameter · CSS px; skeleton only |
| `avatarGap` / `avatar-gap` | number | `10` | 0 to 48; step 1 | Avatar / text gap · CSS px; skeleton only |
| `sweep` / `sweep` | number | `360` | 30 to 360; step 5 | Track circumference · degrees; ring only |
| `angle` / `angle` | number | `-90` | -180 to 180; step 1 | Ring start angle · degrees; ring only |
| `shimmer` / `shimmer` | boolean | `true` | true or false | Placeholder sheen; skeleton only |
| `skeletonLayout` / `skeleton-layout` | select | `article` | article, avatar, card, lines | Placeholder layout; skeleton only |
| `lines` / `lines` | number | `4` | 1 to 8; step 1 | Text placeholder lines; skeleton only |
| `amplitude` / `amplitude` | number | `0.6` | 0 to 1; step 0.02 | Motion amplitude; dots, equalizer only |
| `lineCap` / `line-cap` | select | `round` | round, butt | Stroke cap; ring only |
| `reverse` / `reverse` | boolean | `false` | true or false | Reverse direction |

Presets: `skeleton`, `avatar-placeholder`, `card-placeholder`, `progress-ring`, `progress-bar`, `segmented-progress`, `loading-ring`, `loading-dots`, `equalizer`.

## Fall

Element: `ft-fall`. All common options also apply.

| JavaScript / HTML | Type | Schema default | Range / values | Meaning |
| --- | --- | --- | --- | --- |
| `kind` / `kind` | select | `snow` | snow, leaves, petals, seeds | Falling material |
| `shape` / `shape` | select | `mixed` | mixed, round, flake, crystal, maple, oak, birch, cherry, oval, rose, parachute, tuft | Particle shape |
| `fallSpeed` / `fall-speed` | number | `55` | 0 to 500; step 1 | Fall speed · CSS px/s |
| `wind` / `wind` | number | `12` | -300 to 300; step 1 | Crosswind · CSS px/s |
| `gust` / `gust` | number | `14` | 0 to 200; step 1 | Gust velocity · CSS px/s |
| `gustPeriod` / `gust-period` | number | `8` | 1 to 30; step 0.5 | Gust cycle · seconds |
| `sway` / `sway` | number | `16` | 0 to 120; step 1 | Side-to-side drift · CSS px |
| `swaySpeed` / `sway-speed` | number | `0.22` | 0 to 2; step 0.02 | Drift cycles per second |
| `tumble` / `tumble` | number | `0.6` | 0 to 4; step 0.05 | Rotation / flutter speed |
| `depth` / `depth` | number | `0.7` | 0 to 1; step 0.02 | Depth variation |
| `size` / `size` | number | `11` | 2 to 100; step 1 | Near particle size · CSS px |
| `sizeVariation` / `size-variation` | number | `0.6` | 0 to 1; step 0.02 | Size variation |
| `density` / `density` | number | `30` | 0 to 120; step 1 | Particles per 100,000 CSS px² |
| `maxParticles` / `max-particles` | number | `400` | 0 to 1500; step 1 | Particle budget |
| `color` / `color` | color | `#eef9ff` | CSS colour | Particle color A |
| `color2` / `color2` | color | `#c9e6ed` | CSS colour | Particle color B |
| `color3` / `color3` | color | `#ffffff` | CSS colour | Particle color C |
| `colorMode` / `color-mode` | select | `palette` | palette, single | Color selection |
| `transparent` / `transparent` | boolean | `true` | true or false | Transparent background |
| `background` / `background` | color | `#10232c` | CSS colour | Background |
| `softness` / `softness` | number | `0.18` | 0 to 1; step 0.02 | Particle edge softness |

Presets: `snow`, `soft-snow`, `snowflakes`, `snow-crystals`, `snow-flurry`, `autumn-leaves`, `maple-leaves`, `oak-leaves`, `birch-leaves`, `cherry-petals`, `rose-petals`, `petal-mix`, `dandelion-seeds`, `seed-down`.
