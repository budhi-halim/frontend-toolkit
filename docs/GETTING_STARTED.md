# Integration guide

## Choose one entry point

| File | Behavior | Files required at runtime |
| --- | --- | --- |
| `dist/frontend-toolkit.js` | Classic script; registers custom elements; exposes `FrontendToolkit` | The one bundle; no external texture asset is required by the defaults |
| `dist/frontend-toolkit.esm.js` | Complete ESM bundle; registration is explicit | The one bundle for ordinary renderer/mount use |
| `dist/frontend-toolkit.loader.js` | Registers elements and imports effect implementations on demand | Loader plus the complete `dist/modules/` tree |
| `src/index.js` | Source-module API, suitable for an application bundler | Its source imports |
| `src/effects/<name>.js` | Low-level renderer factory | That module and its source imports |

Do not load the classic and selective entries together. The selective entry is the intended route for on-demand downloads. Use its matching generated module tree; do not mix files from different releases.

## Custom elements

Load the classic script with `defer`. Elements upgrade after it loads.

```html
<script src="./dist/frontend-toolkit.js" defer></script>
<ft-fire preset="hearth" class="panel">
  <h2>Example content</h2>
</ft-fire>
<style>
  .panel {
    display: block;
    min-height: 280px;
    border-radius: 20px;
    color: white;
  }
</style>
```

Each family has a tag, such as `ft-glass`, `ft-surface`, `ft-fire`, `ft-glow`, `ft-trail`, or `ft-status`. The generic form is `<ft-effect effect="fire">`.

Use kebab-case in HTML attributes and camelCase in JavaScript. Numeric attributes use decimal values. For a boolean, `interactive="false"` disables the option; an empty attribute enables it.

```html
<ft-fire flame-speed="2.5" respect-gravity="false"></ft-fire>
```

```js
const fire = document.querySelector('ft-fire');
await customElements.whenDefined('ft-fire');
fire.configure({ flameSpeed: 2.5, respectGravity: false });
```

No global stylesheet is required by the library. Text and controls stay in light DOM. `::part(effect)` and `::part(content)` expose the two internal wrappers; avoid overriding their stacking and sizing without checking the result.

## Layout

An effect needs nonzero dimensions. Give the host a height, min-height, or content that defines its height. Use responsive widths and `border-radius` in your own CSS. The library does not set page margins, a design system, or typography.

Glass needs something behind it to refract. Glowing borders leave their interior unpainted; backgrounds on your own host/content can still make the interior look opaque. Outside fire and bloom need unclipped space around the element. An ancestor with `overflow: hidden`, a mask, or paint containment can cut them off.

Pointer effects use passive input by default so that mobile scrolling remains possible. In a deliberate drawing region only, set `touch-action: none` on that region to reserve dragging for drawing. Keep normal page scrolling available outside it.

## Managed effects on existing HTML

```html
<button class="action" type="button"><span>Save changes</span></button>
```

```css
.action { position: relative; border-radius: 8px; }
.action > span { position: relative; z-index: 1; }
```

```js
import { mountEffect } from './dist/frontend-toolkit.esm.js';
const feedback = mountEffect(document.querySelector('.action'), {
  effect: 'highlight', preset: 'ripple', activation: 'click'
});
feedback.setOptions({ intensity: 0.7 });
// Call on component cleanup:
// feedback.destroy();
```

`mountEffect` inserts a noninteractive decorative layer. It cannot wrap text nodes or repair arbitrary stacking contexts on your behalf. Keep content above that layer, especially with opaque backgrounds. Do not mount inside a replaced element such as `<img>` or `<input>`; use a wrapper.

## ES modules and registration

```js
import { defineElements } from './dist/frontend-toolkit.esm.js';
defineElements({ prefix: 'fx', legacy: false });
// <fx-fire>, <fx-glow>, and the other families are now registered.
```

The ESM entry does not auto-register tags. `defineElements()` is safe to call again for names already registered by this library, but it will not replace a different implementation using those names.

## Selective loading

```html
<script type="module" src="./dist/frontend-toolkit.loader.js"></script>
<ft-aurora loading="visible" preset="borealis" class="panel"></ft-aurora>
```

The loader's relative imports need `dist/modules/` from the same release. Serve modules with a JavaScript MIME type over HTTP(S). The included server handles that.

| `loading` | Activation |
| --- | --- |
| `eager` | Start when the element connects |
| `visible` (default) | Import near the viewport; falls back to immediate loading without an observer |
| `load` | After the window load event |
| `idle` or `background` | After window load, scheduled into an idle opportunity with a timeout fallback |
| `manual` | Wait for the element's `load()` method |

```js
import { preload } from './dist/frontend-toolkit.loader.js';
await preload(['fire', 'glow'], { when: 'idle' });

const element = document.querySelector('ft-fire[loading="manual"]');
await element.load();
```

`preload` accepts `now`, `eager`, `load`, or `idle`. Repeated requests for the same effect share the import. An abort signal can stop queued work; it does not cancel an ES-module download already started by the browser. Imported module code is cached by the browser and is not unloaded when an effect is destroyed.

Deferred initialization and module downloads are distinct from offscreen rendering suspension. The complete classic bundle has already downloaded all its effect code even when a particular element is not visible.

## Low-level rendering

```js
import { createGlowRenderer } from './dist/modules/effects/glow.js';
import { getDefaults } from './dist/modules/core/schema.js';

const layer = document.querySelector('.effect-layer');
let options = { ...getDefaults('glow', 'prism'), speedMode: 'pixels', velocity: 120 };
const renderer = createGlowRenderer(layer, options);
renderer.resize(layer.clientWidth, layer.clientHeight);
renderer.render(0); // Effect time, in seconds.

options = { ...options, glow: 18 };
renderer.setOptions(options);
renderer.render(0.5);
// renderer.destroy();
```

The low-level factory does not give you the managed clock, observers, or system motion policy. Your application owns animation, resize, reduced-motion behavior, input, source lifetimes, and destruction. Use `mountEffect` or a custom element when you want those responsibilities handled for you.

## Water sources

```js
const water = document.querySelector('ft-water');
await customElements.whenDefined('ft-water');
water.source = document.querySelector('canvas');
water.refreshSource(); // Call after changing the source canvas.
```

Sources may be image URLs, images, canvases, or video elements supported by the renderer. Cross-origin image/video sources need suitable CORS permissions. Start video playback through the application's normal user-gesture flow.

Explicit HTML capture is available through `await water.capture(target)`. It works on an isolated clone and does not continuously screenshot the page. Complex layout, fonts, cross-origin resources, and browser security rules can prevent faithful reconstruction. Read [API.md](API.md#water-and-dom-capture) before using the optional capture adapter.

## Motion and performance

Normal instances use `motion="respect"`. Full-motion opt-in is `motion="always"`; a forced reduced presentation is `motion="never"`. `reduced-motion="auto"` chooses the effect-specific presentation.

Keep `adaptive` enabled for automatic quality adjustment. Use `quality`, `dpr-cap`, and `fps` to set limits. Offscreen release reduces retained rendering resources; for a fluid simulation that must preserve its evolving state, `release-after="0"` disables that release. Visibility suspension still applies.

## Minimal examples

The [examples](../examples/index.html) directory includes classic, selective, and managed-API pages. Open them through `npm start` to test the module variants. They use local files from this repository, not a CDN.

## Falling particles

Use `ft-fall` for snow, autumn leaves, petals, or drifting seeds. It is a transparent Canvas overlay by default; it neither captures pointer input nor prevents touch scrolling. Particles recycle outside the visible element rather than accumulating on a simulated ground plane.

```html
<ft-fall class="seasonal-panel" preset="autumn-leaves"
  fall-speed="48" wind="18" density="8" max-particles="250">
  <div class="content">Your existing HTML content</div>
</ft-fall>
```

Give the element a height or content-driven minimum height, as with the other effects. Use the public demo for a quick preview and the lab for all controls.

Snow supports round flakes, six-armed snowflakes, hexagonal crystals, or a mix. Leaves include maple, oak and birch. Petals include cherry, rose and oval forms; seeds include parachutes and down. The shape selector follows the selected material. An incompatible shape resets to `mixed` when the material changes.

`fallSpeed` and `wind` are CSS pixels per second for a reference near particle; `depth` introduces apparent speed/size differences. `density` is the target number per 100,000 CSS square pixels, further limited by `maxParticles` and adaptive quality. `gust`, `gustPeriod`, `sway`, `swaySpeed`, `tumble`, size, palette and softness provide independent variation.

Each instance uses cached sprites and the shared scheduler. Zero density or zero particle budget stops its continuous drawing. To make it completely still while keeping particles visible, set `paused: true`, or set fall speed, wind, gust, sway speed and tumble to zero. Automatic reduced motion hides the decoration, not its HTML content.

Progress/loading ring presets use a 360-degree track. Determinate progress still fills only the supplied value; indeterminate loading animates a partial highlight over that full track. The `sweep` option remains available for deliberately partial gauges.
