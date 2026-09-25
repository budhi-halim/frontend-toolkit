# Validation record

## Release-workflow cleanup (same 1.0.0)

This revision removes the custom per-component declaration gate and replaces its documentation page with Licenses and notices. It does not modify library sources, effect algorithms, the MIT license, retained third-party license text, minification settings, or the version.

The cleanup passed **190 Node tests** and **61 built-site browser checks** using the readable build. Release-process fixtures exercised successful archive creation, preserved notice bytes and checksums, and failure at each build, verification, and strict-check stage. Those process fixtures use stub build tools; they are not production-minification tests.

The actual readable repository check passed with no structural errors. Strict release mode still rejected the missing local lockfile and readable distribution. Browser checks used isolated routed navigation, including the new notices page. External minifiers could not be downloaded in this environment, so production minification must be rerun locally with prepare.cmd. Native hardware-GPU rendering and hosted workflows were not retested for this tooling/documentation-only revision.

The older validation records below describe their respective snapshots, not additional suites rerun for this cleanup.

## Historical fresh-folder recheck (same 1.0.0)

This complete fresh-start package removes the old migration instructions, adds START-HERE.md, expands the publishing and source-permission guides, and fixes notice collection so additional public text notices under licenses/ reach the distribution and complete bundle headers. No library-source or effect files changed relative to the release-preparation input.

The fresh-folder recheck passed **127 Node tests**, including four additional notice-collection tests, and **55 built-site browser checks** in readable-preview, isolated-navigation mode. The preview build and structural/generated-file checks passed; that run reported preview mode, an absent dependency lockfile, and the then-required permission records. Verification and release preparation were checked against those historical states. The custom declaration gate was subsequently removed; current checks still reject incomplete production builds and lockfiles.

The environment still could not resolve the npm registry to install the external minifiers. **Production minification, native hardware-GPU rendering, and hosted GitHub workflows were not validated in this recheck.** The first npm install and npm run build must run on the maintainer's PC; the lockfile and production distribution must then be committed. The historical suite counts below are retained for context, not represented as suites rerun for this fresh-folder packaging.

## Build under review

Frontend Toolkit **1.0.0**, release-preparation revision dated 2026-09-24. This is the same unpublished version, not a new effect release. The update unifies the website design, separates distribution from source, adds production build/release scripts, and replaces material-worker function serialization with a separately bundled program.

The approved effect algorithms are retained. Relative to the previous complete repository, library source changes are confined to material-worker packaging and its new standalone entry; the glass map, shader files, material kernel, and wood generator are unchanged.

## Important build boundary

**The supplied `dist` is a readable preview (`mode: development`), not a tested minified release.** Network access to download esbuild and html-minifier-terser was unavailable in the preparation environment. Their exact direct versions are declared in `package.json`; the dependency lockfile must be created by the first real `npm install` and then committed.

The production build, minifier settings, source-map output, and GitHub workflows have been implemented and reviewed, but have **not executed successfully with the external minifiers in this environment**. No claim of production-minification or deployed-workflow validation is made.

`npm run build` fails clearly when those tools are absent. It does not silently produce readable output. `npm run verify` rejects the supplied preview mode. Those technical failure paths were checked. The old per-component declaration gate described in earlier revisions is no longer part of the tooling.

## Historical results from release preparation (before fresh-folder recheck)

| Suite | Result |
| --- | --- |
| Node regression and repository tests | 123 passed, including HTTP project-subpath serving and source-directory isolation |
| General Chromium browser suite | 123 passed |
| Compatibility / portable rendering suite | 49 passed |
| Preview 4 feature regressions | 67 passed; includes explicitly instrumented WebGL API checks |
| Preview 5 feature regressions | 71 passed |
| Preview 6 feature regressions | 143 passed |
| Public demo | 115 passed |
| Delivered examples and documentation | 25 passed |
| New built-site browser checks | 55 passed using the readable generated files and isolated routed navigation |
| Distribution/source consistency | Byte-for-byte rebuild check passed for readable preview output |
| Common website design | Headers, footers, favicon, theme toggle and no horizontal page overflow checked at 320, 390, 768 and 1440 CSS pixels |
| Actual material worker | A real Blob worker executed generated code; its texture bytes matched the direct material kernel |
| Production minification | Not executed here; tools could not be downloaded |
| Hosted GitHub Actions / Pages deployment | Not executed; no remote changes made |

These are suite counts, not a count of unique behaviors; regression suites overlap. Some tests deliberately instrument WebGL calls and are not GPU rendering tests.

## Browser and network limitations

This environment blocks top-level browser navigation to a localhost server. The new browser suite therefore ran with `--preview --isolated`: exact generated files were served to the browser through isolated HTTPS request routes and a matching base URL. It executed actual DOM, Canvas, module loading and Blob-worker code, but this mode does **not** verify real HTTP top-level navigation or cross-page session storage persistence.

HTTP server behavior was checked separately through real Node HTTP requests, including the `/frontend-toolkit/` prefix, redirects, JavaScript MIME type, and the absence of source/build-script routes in the generated site. The default `npm run test:production` uses real localhost navigation and requires production output; GitHub Actions runs that default, not the isolated preparation mode.

The public-demo suite additionally exercises narrow viewports, light/dark presentation, reduced-system-motion emulation, controls, code export, search/filtering, interaction and cleanup. Viewport emulation is not testing on a physical phone.

## Environment and retained historical results

Preparation used a Linux container, Node.js 22.16.0, Python 3.13 and Playwright with the installed Chromium. A usable hardware browser WebGL context was unavailable. Canvas and fallback behavior are real browser tests, not a hardware-GPU benchmark.

Earlier repository validation recorded Mesa/EGL shader execution and a floating-point fluid run. Those shader tests were **not rerun for this packaging-only revision** and are not included among the new passing results above. The relevant shader source is unchanged. Hardware WebGL, device frame rates, physical mobile input, and Safari/Firefox rendering still need device testing.

## Licenses and validation scope

The custom per-component declaration gate has been removed without changing the effect code or assigning any new authorship. LICENSE and existing third-party notices remain intact. See [Licenses and notices](NOTICES.md). Software tests validate the build and its artifacts, not ownership or permissions.
