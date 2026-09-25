# Maintenance

See [Build and publish](PUBLISHING.md) for the sequential first-release guide.

## Edit sources, not build output

Edit `src` for the library, `site` for the public demo, `demo` for the lab, and Markdown in `docs` for documentation. Shared visual tokens and responsive page styles live in `site/design.css`; theme handling lives in `site/theme.js`. `scripts/layout.mjs` generates the same header and footer for every page during `npm run docs` or the build.

`dist` is generated and committed for versioned GitHub CDN delivery. `build/site` is generated but ignored by Git; it is the only Pages deployment folder. Release archives go in ignored `release-output`.

## Build and check

First run `npm install` to install the pinned direct build tools and create the lockfile. Commit `package-lock.json`. Clean clones use `npm ci`.

```sh
npm run build
npm run verify
npm run preview
```

The preview command serves the generated website at the project subpath `/frontend-toolkit/`. Source pages can be viewed through `npm start` or Live Server, but source-library changes still require a rebuild because pages use `dist`.

The special `npm run build:preview` command produces readable local output without external tools. It is not the publication path. `npm run verify` and `npm run check:release` reject readable preview output.

## Material worker

The worker is compiled as a self-contained program from `src/workers/material.js`. Production builds embed that program into a Blob factory. No function is serialized through `.toString()` or relies on its original binding names after minification. The editable source entry uses a module worker. Existing queue, cancellation, idle termination and portable material fallback remain.

## Release number and metadata

`package.json` is the version source. The first unpublished release remains 1.0.0. Later, `npm run version:set -- 1.0.1` updates the package, any existing lockfile, and exported version declarations. Rebuild afterward and update CHANGELOG.md.

The confirmed repository is `budhi-halim/frontend-toolkit`. No command creates Git tags, commits, uploads, or npm publications. `private: true` prevents accidental npm publishing, not GitHub access.

The Pages workflow runs only for published stable releases and checks out the release's tag. It does not deploy pushes to main. The CI workflow checks production output and generated-file drift without modifying your branch.

## Release checks

`npm run release:prepare` rebuilds, runs production structure/Node checks and strict release validation, and writes release archives plus SHA-256 checksums. `prepare.cmd release` runs the same process with preparation logging. The production build, lockfile, repository identity, package version, and retained notices must pass their checks. No separate contributor declaration is required. See [Licenses and notices](NOTICES.md) for attribution information.

Run browser tests for layout, input, worker, module, or lifecycle changes. Keep public option names stable unless deliberately making a major API release. Do not property-mangle public configuration keys or rewrite protected shader/asset strings to save a few bytes.
