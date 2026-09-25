# API reference

This reference describes version 1.0.0. The complete option schemas and preset names are generated in [OPTIONS.md](OPTIONS.md).

## Custom-element methods

| Member | Purpose |
| --- | --- |
| `configure(patch)` / `setOptions(patch)` | Merge and normalize options; return the element |
| `options` | Read normalized options; assignment replaces the programmatic option object |
| `setPreset(name)` | Clear programmatic overrides and apply a preset; existing explicit HTML attributes still apply |
| `refresh()` | Re-read attributes and supported CSS variables |
| `load()` | Promise that activates an element with manual loading |
| `pause()` / `play()` | Change explicit pause state; do not override the motion policy |
| `step(seconds = 1/60)` | Pause and advance effect time for investigation |
| `resetClock()` | Reset time and clear renderer state where supported |
| `clear()` | Clear transient simulation/particle state where supported |
| `burst(options)` | Emit an explicit burst or strike in renderers that support it |
| `getStats()` | Local renderer, clock, quality, and motion diagnostics |
| `retry()` | Dispose and retry renderer initialization after a failure |
| `source` / `refreshSource()` | Water input and explicit canvas-refresh notification |
| `capture(target, options)` | Capture a DOM source for water; returns a Promise |
| `resetPosition()` | Recenter an opt-in draggable element |
| `controller` | Managed controller, once the element has initialized |

Removing an element disconnects its observers/input and disposes its renderer. Reattaching creates the renderer again. Do not retain a destroyed controller expecting it to restart.

`burst` coordinates are normalized; X grows left-to-right and Y grows bottom-to-top. Input and bursts are intentionally suppressed while paused, hidden, reduced to a nonmoving presentation, or configured with zero opacity/speed. See each preset's trigger options.

## Option precedence

Family defaults and the selected preset are the base. The component reads supported CSS option variables, then HTML attributes, then programmatic overrides. Programmatic `configure` values therefore take precedence over a conflicting attribute until you replace/reset those overrides. Prefer one configuration mechanism per instance.

Use the [generated schemas](OPTIONS.md) for exact HTML attribute and JavaScript names. `getDefaults(effect, preset)` returns the preset values; `normalizeOptions(effect, patch, base)` normalizes types and bounds. Numeric limits, work caps, and effect-specific restrictions protect the renderer from unbounded input.

## Events

Events are `CustomEvent`s with a `detail` object and bubble from the host.

| Event | Meaning |
| --- | --- |
| `ft-ready` | Renderer initialized; includes its reported state |
| `ft-change` | Normalized options changed |
| `ft-motion` | Effective motion presentation changed |
| `ft-status` | Loading, fallback, resource, or animation-state information |
| `ft-error` | Initialization, draw, source, or capture error |
| `ft-stats` | Periodic renderer/clock statistics while drawing |
| `ft-disposed` | Controller resources released |
| `ft-drag` | Opt-in drag position changed |

```js
const panel = document.querySelector('ft-fire');
panel.addEventListener('ft-error', event => {
  console.error(event.detail.message);
});
```

Attach listeners before inserting an element when you need to catch its first initialization event.

## Managed controller

`mountEffect(host, { effect, preset, ...options })` attaches an effect to an existing non-replaced HTML element and returns a controller.

The controller exposes `setOptions`, `pause`, `play`, `step`, `render`, `resetClock`, `resize`, `setPointer`, `burst`, `clear`, `setSource`, `refreshSource`, `getStats`, `retry`, and `destroy`, plus `options` and `renderer` getters. Use `setOptions`, not element-only `configure`, on that controller.

`createController(host, mount, effect, factory, options)` is the lower-level managed interface. The host provides dimensions and visibility; mount is the decorative layer. A standalone call does not install the same host input adapter as `mountEffect`. Prefer `mountEffect` unless you are integrating your own renderer or input pipeline.

## Renderer factories

Factories use the form `create<Name>Renderer(mount, options, onState?)`. Public names include `createGlassRenderer`, `createSurfaceRenderer`, `createWaterRenderer`, `createFireRenderer`, `createSmokeRenderer`, `createCloudsRenderer`, `createAuroraRenderer`, `createGlowRenderer`, `createFluidRenderer`, `createTrailRenderer`, `createFieldRenderer`, `createSeaRenderer`, `createArtRenderer`, `createSketchRenderer`, `createHighlightRenderer`, `createBackdropRenderer`, `createPatternRenderer`, `createStatusRenderer`, and `createFallRenderer`.

Renderers implement `resize(width, height)`, `render(seconds)`, `setOptions(options)`, `getState()`, and `destroy()`. Capabilities such as `setPointer`, `burst`, `clear`, `setSource`, and `setQuality` are effect-dependent. Guard optional methods when working with multiple families.

Use `getDefaults` and pass complete options when directly calling factories. A renderer's `animated` flag indicates whether it currently needs a continuing clock; it can change when particles expire or an interaction settles. Rendering once does not create an internal perpetual animation loop.

A low-level caller is responsible for reduced motion, observers, context/source lifetimes, and actual wall-clock scheduling. `render(seconds)` receives effect time, not a raw animation-frame timestamp in milliseconds.

## Registration and loading

`defineElements({ prefix = 'ft', legacy = true })` registers the families and generic `ft-effect` form. Legacy registrations include `glass-box`, `wood-box`, `vfx-box`, and `aurora-bg`.

`loadEffect(name)` resolves to a renderer factory. `preload(names, { when = 'idle', signal })` resolves after the requested factories have loaded. The selective entry installs the module loaders; the classic/full ESM entry already registers the bundled factories.

`loadingStats()` reports available, loaded, and pending families. `schedulerStats()` reports shared scheduled jobs and adaptive-controller state. They are diagnostics, not GPU profiling tools.

## Water and DOM capture

Water source assignment accepts supported image/canvas/video inputs and URLs. Use a canvas as a controlled source when possible. `createWaterTexture(kind, seed)` produces one of the built-in texture canvases.

`captureDOM(target, options)` creates a rasterized source from an isolated clone. `bindWaterSnapshot(water, target, options)` provides explicit/coalesced refresh management; inspect `src/adapters/snapshot.js` for the adapter's advanced hooks. Supply a capture engine explicitly when the native reconstruction is insufficient; html2canvas is not included or automatically fetched.

Do not capture untrusted HTML and treat the result as a sanitizer. Browser canvas tainting/CORS restrictions still apply. A capture can reject; handle that rejection and preserve the last good source.

## Diagnostics

```js
import { setDiagnostics, diagnose } from './dist/frontend-toolkit.esm.js';
setDiagnostics({ console: true, level: 'warn' });
console.log(diagnose(document.querySelector('ft-fire')));
```

`environmentReport`, `probeWebGL`, `getDiagnostics`, and `diagnose` collect local capability and state information. Nothing is transmitted automatically. A successful small WebGL probe does not establish that all shaders work or that performance is acceptable on that device.

## Dragging

`makeDraggable(element, options)` provides opt-in, parent-bounded movement with keyboard controls and a `destroy()` lifecycle. Custom elements expose the same behavior through `drag-enabled="true"`. Interactive descendants do not initiate a drag.

Dragging belongs to the embedding application. It is enabled for glass in the public demo to show refraction, but it is not enabled by default for library consumers.
