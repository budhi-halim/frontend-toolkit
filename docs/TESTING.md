# Testing

## Local prerequisites

The build uses development-only esbuild and html-minifier-terser. Use Node.js 24 LTS (22 or newer is supported). Run `npm install` for first setup; commit the resulting package-lock.json. Clean clones use `npm ci`.

```sh
npm run build
npm run verify
```

Browser tests use Python 3.11 or newer and development-only packages listed in `requirements-test.txt`:

```sh
python -m pip install -r requirements-test.txt
python -m playwright install chromium
npm run test:all
```

On a Linux machine missing Chromium system libraries, Playwright's `install --with-deps chromium` command installs the browser and required system dependencies. That may require administrative permission. A preinstalled Chromium can instead be selected with the `CHROMIUM_PATH` environment variable.

The browser tests use isolated documents and locally supplied scripts. This permits testing in environments that restrict top-level navigation to a local server. Node tests separately exercise the actual local HTTP server and its file responses.

The production-specific suite serves the actual generated website under `/frontend-toolkit/`:

```sh
npm run test:production
```

It requires a production manifest. Its `--preview` flag is solely for honest local validation of the supplied readable preparation build; that flag is never used by the release workflow. Worker execution is checked independently of the portable fallback.

## Test layers

| Layer | What it verifies | What it does not verify |
| --- | --- | --- |
| Node | Schemas, normalization, geometry, motion rules, protected assets, source contracts, build output, local HTTP serving | Actual browser painting |
| Native Chromium | Real Canvas pixels, DOM layout, input, motion preferences, cleanup, selective module loading, public demo and lab | GPU hardware behavior when WebGL is unavailable |
| Instrumented WebGL contract | Resource and API usage through an instrumented context | Shader compilation, image quality, real GPU performance |
| Mesa/EGL | Real shader compilation, rendering, and floating-point fluid simulation in a software graphics driver | The browser's own graphics stack or hardware frame rates |
| Manual devices | Device-specific output, scrolling, touch, accessibility, and sustained performance | Universal compatibility |

## Individual suites

```sh
npm run test:browser
npm run test:compatibility
npm run test:preview5
npm run test:preview6
npm run test:site
npm run test:examples
npm run test:gpu-contract
```

The `preview4`, `preview5`, and `preview6` file names identify regression suites for earlier feature additions. They are retained tests, not separate product versions.

`npm run test:all` runs Node and the native browser suites sequentially and stops at the first failure. Instrumented WebGL checks are kept separate to avoid mistaking them for real GPU tests.

## Optional software-GPU suite

On Linux with Mesa EGL/GLES libraries available:

```sh
npm run test:shaders
```

These Python scripts use `ctypes` to load the local EGL/GLES libraries. They compile the shader fixtures, render actual frames, and test the fluid solver. They do not require a WebGL-capable browser.

## Outputs and repeatability

Generated reports and screenshots are written under `tests/validation/`, which is ignored by Git. The scripts print their pass/fail summaries and return a nonzero exit status on failure. Seeds and explicit frame times are used where deterministic comparisons are needed; absolute hardware frame rates are not asserted.

The repository check validates relative links, versions, basic module syntax, required files, and reproducible bundles. Strict release mode also rejects a readable preview, a missing lockfile, or an unconfigured repository. It does not require a per-component approval declaration.

## Validation record

The repository's final local test results are recorded in [Validation](VALIDATION.md). They describe the tested build and environment, not a guarantee of identical behavior on every browser. Native hardware WebGL, Safari, Firefox, and physical mobile devices still require device testing.
