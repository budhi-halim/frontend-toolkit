# Motion, input, and accessibility

## Defaults

The library defaults to `motion="respect"`. It listens for changes to the system's `prefers-reduced-motion` preference rather than reading the setting only at startup.

Reduced motion is not the same as a paused animation. Pausing retains a frame for inspection; a reduced-motion presentation changes or removes the effect.

| Effect | Automatic reduced presentation |
| --- | --- |
| Water | Calm source with distortion and caustic light disabled |
| Sea and ocean | Flat/calm surface |
| Fire, trails, fluid, rain, lightning | Decoration hidden; real HTML retained |
| Transient ripple, sheen, sparkle | Decoration hidden |
| Other suitable compositions | Still presentation |
| Loading/status | Shimmer and displacement removed; actual supplied progress value retained |

`reduced-motion="subtle"` explicitly permits some continuing motion for supported effects and should not be treated as a universally comfortable setting. Lightning remains suppressed. `calm`, `still`, and `hide` are explicit alternatives.

## Public demo

The public demo starts with `motion="always"` on its preview instance, as an intentional testing policy. Its Full and Reduced controls force the two presentations independently of the operating system. The Reduced control uses `motion="never"` plus `reduced-motion="auto"`; it does not merely slow the animation.

This choice is local to the demo. Copied snippets omit its override. The full lab exposes the library's motion settings directly. The public demo also has a pause control, and only one live effect instance is mounted at a time.

## Application responsibilities

Decorative effects do not make an interface accessible on their own. Maintain adequate contrast, semantic controls, visible keyboard focus, readable text, and a way to stop distracting motion. Never depend on a glow, colour, animation, or pointer trail as the only indication of state.

Loading/progress renderers are visual layers. Supply native `<progress>`, status text, `aria-busy`, or other appropriate semantics from your application. Do not announce every animation frame.

Highlight focus decoration supplements normal keyboard focus; it is not a replacement for a dependable focus outline. The library does not cancel native button activation.

## Touch and pointer input

Input handlers are passive by default. The library does not globally disable page scrolling. Pointer-only effects have an explicit/manual alternative where supported. Reserve `touch-action: none` for a deliberate drawing region, not the entire page.

Add `data-ft-no-interaction` to a subtree to exclude it from effect input. Most brush renderers already ignore links, buttons, and form controls. Highlight feedback intentionally accepts interactions with such controls unless explicitly excluded.

## Performance is a separate policy

A reduced quality level is a performance choice, not an accessibility preference. Adaptive resolution does not override reduced motion. Offscreen/hidden-tab suspension still applies even with `motion="always"`.

Reference: [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

Falling snow, leaves, petals and seeds are suppressed by the automatic reduced-motion presentation; real HTML content remains visible. Explicit `still` or `subtle` behavior can be selected by the integrating application. The public demo keeps its separate Full / Reduced test switch.
