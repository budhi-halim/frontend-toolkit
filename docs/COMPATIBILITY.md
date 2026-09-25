# Compatibility and limitations

Frontend Toolkit targets modern browsers with custom elements, shadow DOM, pointer events, and ES modules. The public demo additionally uses modern colour functions such as `light-dark()`. Verify the exact browsers in your own support policy; the project does not claim identical cross-browser rendering.

## Rendering paths

| Area | Primary path | Alternative / limitation |
| --- | --- | --- |
| Glass | SVG-filtered CSS backdrop | CSS blur/tint fallback; browser SVG-backdrop behavior varies |
| Materials | Canvas texture, normally generated in a worker | Smaller main-thread generation if workers cannot run |
| Water, fire, smoke, clouds, aurora, sea, art/fields | WebGL shaders | Lighter Canvas approximations for supported effects |
| Fluid | WebGL 2 with suitable renderable floating-point textures | Smaller CPU/Canvas solver |
| Glow, trails, rain, falling particles, drawings, highlights, patterns, backgrounds, status | Canvas 2D | Not dependent on WebGL availability |

There is no Three.js, Pixi, WebGPU backend, external font request, analytics service, or automatic html2canvas download.

## Browser and GPU checks

A visible Canvas fallback does not establish that the GPU shader works on the same machine. A successful context-creation test is also weaker than an actual effect render. The lab reports the active renderer and can produce a local diagnostic report.

Managed instances pause while hidden/offscreen and may release offscreen GPU/simulation resources. Releasing fluid resources discards its evolving simulation state; set `release-after="0"` to keep it allocated. Other caps and visibility suspension remain active.

## Glass and clipping

Transparent glow means the renderer does not paint the interior. CSS backgrounds on the host, content, or ancestors can still make it look filled. Outer bloom and outside flames can be clipped by an ancestor's overflow, mask, or paint containment.

SVG backdrop refraction is browser-dependent. The CSS fallback preserves a glass-like blur/tint presentation but cannot reproduce the protected displacement map exactly.

## Sources, snapshots, and content security policy

Cross-origin textures need appropriate CORS permission. Canvas security restrictions are not bypassed. DOM capture reconstructs a clone; it is not a universal browser screenshot facility. Fonts, complex CSS, media, cross-origin resources, and nested custom elements may need application-specific handling.

Material workers are generated from a Blob. A restrictive Content Security Policy may require `worker-src blob:` for that path. Without it, the smaller main-thread path is used. Data-URI image maps, inline component styles, and capture staging also need a CSP compatible with the selected effect. No blanket strict-CSP compliance is asserted; test your actual policy.

The classic bundle can run from a local file. ES modules and selective imports should be served with HTTP(S) and correct JavaScript MIME types. The supplied server uses `text/javascript` and does not cache local development responses.

## Mobile

The public demo is responsive, uses a collapsed effect picker on narrow screens, and does not mount an animated thumbnail grid. CSS pixels, rendering resolution, and device pixels are different: buffer quality and pixel-ratio caps may intentionally lower rendering detail.

Testing a narrow desktop browser is not equivalent to testing a physical phone. Real iOS/Android GPU, touch, thermal, and memory behavior still needs device verification.

## Current verification scope

Read [TESTING.md](TESTING.md) for the tested environment and reproducible commands. No universal frame-rate target or bug-free guarantee is claimed.

References: [MDN WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), [Custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements), [Canvas cross-origin security](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image).
