# Contributing

Keep effects independently configurable and usable outside the demo. Avoid global CSS, implicit remote downloads, hidden animation loops, and interference with native controls.

Install the build tools using npm ci with the committed lockfile (npm install for the first setup). Before submitting a change, run `npm run build`, `npm test`, `npm run docs`, and `npm run check`. Run the browser tests for input/layout/lifecycle changes and the optional shader tests for shader changes. Keep committed dist files synchronized with source. Shared webpage design belongs in site/design.css and scripts/layout.mjs; do not fork the lab or documentation branding.

New options belong in the appropriate schema with a label, default, bounds or allowed values, and tests. Prefer bounded resource use and an explicit inactive state. Provide an effect-specific reduced-motion presentation instead of simply freezing every simulation.

The public demo exposes a small set of meaningful controls. The lab and generated reference expose the full schema. Do not add promotional copy, misleading performance claims, or an animated grid that creates dozens of simultaneous GPU contexts.

For a bug report, include the effect, preset, changed options, browser/operating system, active renderer, and a minimal reproduction. Share a lab diagnostic report only after reviewing it; it includes device/browser information.

Changes to the protected glass map require explicit maintainer review. Preserve license notices and identify the source and license of borrowed material. Do not add code from a public example without checking its actual license.
