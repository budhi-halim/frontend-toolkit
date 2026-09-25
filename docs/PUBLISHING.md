# Build and publish from a fresh folder

This guide is for the first unpublished **1.0.0** release of `budhi-halim/frontend-toolkit`. Node is already installed. This archive is a complete project, not a patch: **no file moves, merging old folders, or import-path rewrites are required**. Use this sequence instead of the migration instructions supplied earlier.

Run one command at a time and wait for it to finish. Stop at an unexpected error; commands before the publication stage do not upload anything. Keep the project license and applicable third-party notices with the code. No separate contributor declaration is required by the release scripts.

## 1. Extract the complete project

Close the old VS Code workspace and stop an old preview server with Ctrl+C. Keep your previous folder as a backup, separate from this project.

In Windows File Explorer, right-click the new ZIP and choose Extract All. Choose an empty parent directory such as `C:\Development`. The ZIP contains one `frontend-toolkit` folder, so the intended result is:

```text
C:\Development\frontend-toolkit\package.json
C:\Development\frontend-toolkit\index.html
C:\Development\frontend-toolkit\src\
C:\Development\frontend-toolkit\dist\
```

If that destination already contains a project, choose a different empty parent directory instead. Do not accept a merge/replace operation. Extract outside VS Code, then open the completed folder. There is no occasion to accept a dialog that rewrites import paths.

Keep the active Git repository outside a continuously synchronized OneDrive folder. Completed backup ZIPs can still be stored in OneDrive. Git's own FAQ warns about live cloud synchronization of repositories; use a separate clone on each PC and Git's fetch/push operations to exchange work.

## 2. Open the correct folder and terminal

In VS Code choose File > Open Folder and select the folder that directly contains `package.json`. Do not open the ZIP itself or only its parent directory. If VS Code asks about Workspace Trust, enable trust for this project only after deciding to run its included scripts.

Choose Terminal > New Terminal. From the dropdown next to the terminal's plus button, choose Command Prompt (or Select Default Profile > Command Prompt, then create a new terminal). This avoids PowerShell's npm.ps1 execution-policy issue without changing a system security policy.

The prompt should end in your project directory. Run:

```sh
npm run doctor
```

It should identify Frontend Toolkit 1.0.0 and your Node installation. Missing esbuild, html-minifier-terser, and package-lock.json are expected before the next stage. A missing package.json error means you opened the wrong folder. No Node installation steps are needed in this guide.

## 3. Install the local build tools

Run:

```sh
npm install
```

Wait for the command prompt to return successfully. This downloads the development tools into `node_modules` and creates `package-lock.json`. It does not register an npm package or publish the library. No npm account, Toptal account, or API key is needed.

This fresh archive has no lockfile because the preparation environment could not access the npm registry. Its exact direct dependency versions are in package.json; do not invent or hand-edit a lockfile.

Commit the resulting package-lock.json later. Clean clones that already have that committed file use `npm ci`, not another first-install procedure. Do not run `npm init`, `npm update`, or `npm audit fix --force` as part of this setup. Review any security warning rather than forcing an unexamined dependency change.

## 4. Generate the minified production build

Run:

```sh
npm run build
```

Expected completion:

```text
Minified production build complete.
Library: dist/
Website: build/site/
```

This creates the full classic and ESM bundles, the selective module tree, source maps, the isolated material worker, and the minified demo/documentation website. It does not change the version or publish anything.

The ZIP's supplied `dist` is a usable **readable preview**, not a previously tested production-minified build. The preparation environment could not install the external minifiers. The command above performs the first actual minification on your machine. Do not substitute `build:preview` for this release step.

The build now includes every public UTF-8 .txt/.md notice under `licenses/`, including subdirectories, in `dist/licenses/` and the complete library's legal banner. LICENSE, COPYING, and NOTICE files without extensions are also accepted. Required public attribution belongs there or in NOTICE.txt; keep private correspondence outside the repository.

The source, source maps, and production JavaScript are public when published. Minification optimizes delivery; it does not conceal intellectual property.

## 5. Verify the build

Run:

```sh
npm run verify
```

Expected final output includes:

```text
Production structure, generated files, and Node tests passed.
```

The script verifies production mode, lockfile consistency, versions, local links/imports, syntax, reproducible distribution output, and Node regression tests. It is correct for this command to reject the ZIP's readable distribution before Stage 4.

Verification must finish without technical failures. Strict release checks also require a production build, a matching dependency lockfile, the configured repository, and retained license files.

## 6. Inspect the generated website

Run:

```sh
npm run preview
```

Open the exact URL printed by the terminal, normally:

```text
http://localhost:4173/frontend-toolkit/
```

This serves `build/site`, not the source webpage, under the intended project subpath. Check Demo, Lab, Docs, and Examples for consistent navigation, favicon, theme, and layout. Test Full/Reduced motion, a generated surface, draggable glass, and the selective-loading example's manual-load button. Check a narrow browser window; physical phone testing remains worthwhile.

Stop the server with Ctrl+C. If Command Prompt asks `Terminate batch job (Y/N)?`, type Y and press Enter.

VS Code Live Server remains usable for development. Root index.html loads the last built library; changing src requires another build. For release inspection, prefer the supplied preview command so that the `/frontend-toolkit/` prefix is tested explicitly.

Optional local automated browser test, when Python is installed:

```sh
python -m pip install -r requirements-test.txt
python -m playwright install chromium
npm run test:production
```

The included GitHub workflow installs Python and runs those browser checks remotely, so a local Python installation is not required for the basic editing/build workflow. A successful manual preview alone is not a substitute for the CI result before release.

## 7. Keep the licenses and notices

The team contributions use the project's MIT license. No separate provenance form, signature, or approval status is required by this repository's tooling.

Keep these files:

- LICENSE: the project's MIT license.
- NOTICE.txt: the distribution's attribution summary.
- licenses/webgl-noise-MIT.txt: the retained water-noise copyright and MIT permission notice.

The build carries these files and any additional public text notices in licenses/ into the distribution. Do not remove actual third-party notices during minification or packaging. [Licenses and notices](NOTICES.md) explains what is included.

Run from the project root:

```bat
prepare.cmd
```

Then run:

```sh
npm run check:release
```

After both pass, continue to Step 8. Technical failures still stop preparation.

## 8. Create the release archives

Check that package.json still declares `1.0.0`. No version-set command is needed for this first release. Run:

```sh
prepare.cmd release
```

This builds, verifies, performs strict release checks, and writes:

```text
release-output/
  frontend-toolkit-1.0.0-dist.zip
  frontend-toolkit-1.0.0-repository.zip
  SHA256SUMS.txt
```

Nothing is committed, tagged, uploaded, or published by this command. The distribution ZIP is for users loading the library; the repository ZIP includes the editable source, tests, and site.

Do not change code or notices between these archives and publication. If anything changes, rebuild, verify, and prepare the archives again before committing. Check modified file timestamps so an archive left over from an earlier successful attempt is not mistaken for the output of a failed command.

## 9. Add the local project to GitHub Desktop

Install [GitHub Desktop](https://desktop.github.com/) and sign in as `budhi-halim`. These steps assume you are creating a new remote repository. Check the intended repository in your signed-in browser before proceeding; a not-found response from an integration can also mean it lacks access to an existing private repository.

Choose File > Add local repository > Choose. Select the folder containing package.json. If Desktop says it is not a Git repository, use its **create a repository here** link. Confirm the resulting path is the existing project directory, not an extra nested `frontend-toolkit/frontend-toolkit` folder.

Do not initialize another README, license, or gitignore template: the project already has them. Choose main as the initial branch; if it is called master, rename it to main through Branch > Rename before publishing.

Review the Changes tab. Source, documentation, LICENSE/notices, package.json, package-lock.json, workflows, and the entire generated dist directory should be tracked. node_modules, build/site, release-output, private evidence, passwords, and tokens should not be tracked. The included .gitignore excludes the generated working folders; private evidence should be outside the project entirely.

Use **Prepare Frontend Toolkit 1.0.0** as the commit summary and click Commit to main. Desktop may have made an initial commit during repository creation. A commit records a local checkpoint; a push uploads it.

### Existing remote repository

Do not delete a remote repository or force-push to follow a new-repository tutorial. Instead use File > Clone repository > URL, enter the intended URL, and clone into a separate empty directory. Keep that clone's .git directory. Copy the complete prepared project contents into that clone, review any existing work, commit normally, and use Push origin. If existing files conflict in an unexpected way, stop rather than replacing them blindly.

## 10. Publish the repository and wait for CI

Once the rights review and local checks are complete, click Publish repository in Desktop. Use name `frontend-toolkit`, personal account `budhi-halim`, no organization, and uncheck Keep this code private for the intended public repository. Then publish.

Open:

```text
https://github.com/budhi-halim/frontend-toolkit
```

The root should display package.json, src, dist, README.md, and index.html directly. Do not upload just the ZIP through the website or put the whole project beneath an extra wrapper folder.

Open Actions > Repository checks for the latest commit. Wait for all jobs to turn green. The supplied workflow uses the lockfile, builds and verifies the production files, detects missing generated changes, and runs the browser suites. If Actions is disabled for the repository, enable it before continuing; the release deployment also needs it.

On a failure, open the failed job and its first failed step. Fix locally, rebuild/test, commit, Push origin, and wait for the replacement run. Do not tag the first release while CI is failing. Pushing to main does not deploy the website in this setup.

## 11. Configure Pages and immutable releases

Open repository Settings > Pages. Under Build and deployment set Source to **GitHub Actions**. Do not select Deploy from a branch and do not upload build/site manually. The supplied workflow generates and uploads that folder as a Pages artifact.

Open Settings > Environments > github-pages. Create an environment with that name if it is absent. Under Deployment branches and tags choose **Selected branches and tags**, then **Add deployment branch or tag rule**. Select **Tag**, enter `v*`, and click Add rule. A rule for only main would not allow the release tag. Leave required reviewers unset unless you deliberately want manual approval.

Open Settings > General > Releases and enable **release immutability**. It protects future published release assets and tags. Add every attachment while the release is a draft; they cannot be replaced or added after publishing an immutable release.

No personal access token needs to be pasted into project files for these supplied workflows. The Pages workflow requests the necessary scoped job permissions.

## 12. Publish v1.0.0

Make sure the latest committed project passes CI and the local archives match it. Open Releases > Draft a new release.

| Field | Value |
| --- | --- |
| Tag | v1.0.0 |
| Target | The tested main branch |
| Title | Frontend Toolkit 1.0.0 |
| Pre-release | Unchecked |

Create the tag through Choose a tag if it does not already exist. Do not reuse or move an already published tag.

Suggested notes:

```text
Initial stable release.

Configurable materials, borders, atmospheric effects, pointer interactions,
backgrounds, patterns, and loading/progress visuals.

Includes custom elements, managed JavaScript integration, individual
renderers, selective loading, and effect-specific reduced-motion behavior.

See the README for integration and compatibility details.
```

Attach both ZIPs and SHA256SUMS.txt from release-output. Save the draft and review the tag, target, notes, and attachments. Publish when correct.

Do not run npm publish. The package remains private to prevent accidental npm-registry publication; this flag does not prevent a public GitHub repository or jsDelivr GitHub delivery.

In Actions, watch **Deploy release website**. It checks out this exact tag, verifies the package version and rights records, rebuilds/tests, and deploys only build/site. Wait for success. If an environment/Pages setting blocks it, correct the setting and rerun failed jobs without changing the tag. A code/build defect in a published immutable release requires a new version, not overwriting v1.0.0.

## 13. Verify the deployed URLs

Open after a successful deployment:

```text
https://budhi-halim.github.io/frontend-toolkit/
https://budhi-halim.github.io/frontend-toolkit/lab.html
https://budhi-halim.github.io/frontend-toolkit/docs/guide.html
```

Complete entry:

```html
<script src="https://cdn.jsdelivr.net/gh/budhi-halim/frontend-toolkit@v1.0.0/dist/frontend-toolkit.js" defer></script>
```

Selective alternative:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/budhi-halim/frontend-toolkit@v1.0.0/dist/frontend-toolkit.loader.js"></script>
```

Use one entry, not both. These URLs are planned integration addresses, not evidence that the repository has already been published. jsDelivr reads the committed file at the tag; it does not extract it from a release ZIP. Pages and CDN delivery are separate, so test both. Exact-version jsDelivr content is cached permanently; never replace a published version's content.

## 14. Later changes

Keep the same working repository. Fetch/Pull before editing when switching PCs; each PC should have its own clone. Edit source, not dist.

After 1.0.0 has been published, a compatible bug fix could be 1.0.1, compatible new features 1.1.0, and a breaking public API change 2.0.0. Do not run these version changes during the present unpublished preparation.

For a future bug fix:

```sh
npm run version:set -- 1.0.1
```

Update CHANGELOG.md, install changed dependencies only when needed, and run build, verify, preview, and release:prepare. Commit source, metadata, generated documentation, lockfile, and dist together. Push, wait for checks, then create the matching tag/release and attach the newly prepared files.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| VS Code asks to rewrite import paths | No file moves belong to this fresh setup. Cancel the move and extract into an empty location outside VS Code. |
| Missing package.json | Open the folder that directly contains package.json. |
| npm.ps1 is blocked | Use Command Prompt or npm.cmd, not a weaker system execution policy. |
| Missing build packages | Run npm install once in this fresh folder. |
| Missing lockfile in a fresh setup | The first successful npm install creates it. Commit it. |
| Verify says readable preview | Run npm run build, not build:preview. |
| Strict release check fails | Read the named issue: production output, lockfile, repository settings, links, or license files. Fix it and rerun; do not bypass checks. |
| Source changes do not appear | Rebuild dist, then hard-refresh with Ctrl+Shift+R. |
| Port already used | Stop the previous server or set a different PORT in the terminal. |
| CI says generated output differs | Build again and commit added/deleted as well as modified generated files. |
| Pages rejects the tag | Configure a Tag rule for v* on github-pages. |
| CDN 404 | Check visibility, exact tag, and dist file committed at that tag. |

## Official references

- [Git FAQ: synchronized folders](https://git-scm.com/docs/gitfaq)
- [VS Code terminal profiles](https://code.visualstudio.com/docs/terminal/profiles)
- [npm clean installation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Local repository in GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)
- [Publishing through GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Deployment environments and tag rules](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Preventing changes to releases](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)
- [Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [jsDelivr GitHub delivery](https://github.com/jsdelivr/jsdelivr#github)
- [Semantic versioning](https://semver.org/)
