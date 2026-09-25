import fs from 'node:fs/promises';
import {openSync, writeSync, closeSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {walkFiles} from './file-tree.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const protocol = 1;
const runtime = `${process.version}/${process.platform}/${process.arch}`;
const ignored = new Set(['.git', 'node_modules', 'build', 'dist', 'release-output', '__pycache__',
  'validation', 'test-results', 'playwright-report', '.DS_Store', 'Thumbs.db', 'desktop.ini']);
const slash = name => name.replaceAll('\\', '/');

async function readJSON(filename, optional = false) {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
}

/** The progress file is a cache, never a replacement for build or verification checks. */
export function createProgressStore(filename, {
  io = fs, log = () => {}, signal,
  wait = (milliseconds, signal) => sleep(milliseconds, undefined, {signal})
} = {}) {
  const delays = [80, 160, 320, 640, 1000];
  const busyCodes = new Set(['EPERM', 'EACCES', 'EBUSY']);
  let writable = true;
  const fresh = () => ({protocol});
  const checkAbort = () => signal?.throwIfAborted();
  const filesystemError = error => typeof error?.code === 'string' && /^E[A-Z0-9]+$/.test(error.code);

  async function retry(operation) {
    for (let attempt = 0; ; attempt++) {
      checkAbort();
      try { return await operation(); }
      catch (error) {
        checkAbort();
        if (!busyCodes.has(error.code) || attempt >= delays.length) throw error;
        await wait(delays[attempt], signal);
      }
    }
  }

  function unavailable(operation, error) {
    checkAbort();
    // Only this disposable file may fail open. Programming errors still stop the run.
    if (!filesystemError(error)) throw error;
    writable = false;
    log(`[WARN] Could not ${operation} the preparation progress cache (${error.code}). Continuing with in-memory progress; build, verification and release checks are unchanged. A later run may rebuild.\nCache: ${filename}`);
  }

  return {
    get persistent() { return writable; },

    async load() {
      let text;
      try { text = await retry(() => io.readFile(filename, 'utf8')); }
      catch (error) {
        checkAbort();
        if (error.code === 'ENOENT') return fresh();
        unavailable('read', error);
        return fresh();
      }
      try {
        const state = JSON.parse(text);
        return state && !Array.isArray(state) && state.protocol === protocol ? state : fresh();
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        log('[WARN] Ignoring invalid JSON in the preparation progress cache. This run will rebuild and verify.');
        return fresh();
      }
    },

    async save(state) {
      checkAbort();
      if (!writable) return false;
      // Serialize first, so an invalid in-memory state is not mistaken for a file lock.
      const text = JSON.stringify({...state, protocol}, null, 2) + '\n';
      const temporary = `${filename}.${randomUUID()}.tmp`;
      let owned = false, committed = false;
      try {
        const handle = await retry(() => io.open(temporary, 'wx'));
        owned = true;
        try { await handle.writeFile(text, 'utf8'); }
        finally { await handle.close(); }
        // Never delete/truncate the previous cache or alter its permissions to force a replacement.
        await retry(() => io.rename(temporary, filename));
        committed = true;
        return true;
      } catch (error) {
        unavailable('save', error);
        return false;
      } finally {
        if (owned && !committed) {
          try { await io.unlink(temporary); }
          catch (error) {
            if (error.code !== 'ENOENT') {
              log(`[WARN] Temporary progress-cache file could not be removed (${error.code || error.message}); it is not used by preparation: ${temporary}`);
            }
          }
        }
      }
    }
  };
}

function stableEntries(object = {}) {
  return JSON.stringify(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

/** Install-script approvals are retained, not replaced with a supplied package.json. */
export function lockMatches(pkg, lock) {
  const top = lock?.packages?.[''];
  return Boolean(top && lock.name === pkg.name && lock.version === pkg.version && top.version === pkg.version &&
    ['dependencies', 'devDependencies', 'optionalDependencies'].every(key => stableEntries(top[key]) === stableEntries(pkg[key])));
}

export function sameSnapshot(a, b) {
  return Boolean(a?.inputs && a?.dist && a?.site && b &&
    ['inputs', 'dist', 'site', 'runtime'].every(key => a[key] === b[key]));
}

export function laterStableVersion(current, next) {
  const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  if (!pattern.test(current) || !pattern.test(next)) return false;
  const a = current.split('.').map(BigInt), b = next.split('.').map(BigInt);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return b[index] > a[index];
  }
  return false;
}

async function digestTree(directory, skip = () => false, optional = false) {
  let files;
  try { files = await walkFiles(directory, {skip}); }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
  const hash = createHash('sha256');
  for (const filename of files) {
    const name = slash(path.relative(directory, filename));
    const data = await fs.readFile(filename);
    hash.update(`${Buffer.byteLength(name)}:${name}${data.length}:`).update(data);
  }
  return hash.digest('hex');
}

async function snapshot(root) {
  const skip = (_, name) => ignored.has(name) || name.startsWith('.env') || /\.(?:log|zip|pyc)$/.test(name);
  return {
    inputs: await digestTree(root, skip),
    dist: await digestTree(path.join(root, 'dist'), undefined, true),
    site: await digestTree(path.join(root, 'build/site'), undefined, true),
    runtime
  };
}

async function inventory(root, pkg) {
  const lock = await readJSON(path.join(root, 'package-lock.json'), true);
  const missing = [];
  for (const name of Object.keys({...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies})) {
    let installed;
    try { installed = await readJSON(path.join(root, 'node_modules', name, 'package.json'), true); }
    catch (error) { if (!(error instanceof SyntaxError)) throw error; }
    const expected = lock?.packages?.[`node_modules/${name}`]?.version;
    if (!installed || !expected || installed.version !== expected) missing.push(name);
  }
  return {lock, current: lockMatches(pkg, lock) && missing.length === 0, missing};
}

async function npmCLI() {
  const bin = path.dirname(process.execPath);
  const candidates = [process.env.npm_execpath,
    path.join(bin, 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(bin, '../lib/node_modules/npm/bin/npm-cli.js'),
    path.resolve(bin, '../share/nodejs/npm/bin/npm-cli.js')];
  for (const folder of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    candidates.push(path.join(folder, 'node_modules/npm/bin/npm-cli.js'));
    try { candidates.push(await fs.realpath(path.join(folder, 'npm'))); } catch {}
  }
  for (const candidate of candidates.filter(Boolean)) {
    if (!/npm-cli\.(?:js|cjs)$/.test(candidate)) continue;
    try { if ((await fs.stat(candidate)).isFile()) return candidate; } catch {}
  }
  throw new Error('Cannot locate npm-cli.js. Run npm install in this folder, then run prepare.cmd again. No global package is needed.');
}

async function probeTools(root) {
  const require = createRequire(path.join(root, 'package.json'));
  const esbuild = await import(pathToFileURL(require.resolve('esbuild')).href);
  const html = await import(pathToFileURL(require.resolve('html-minifier-terser')).href);
  await esbuild.transform('const checked = 1;', {loader: 'js', minify: true});
  await (html.minify || html.default?.minify)('<p>Check</p>', {collapseWhitespace: true});
}

async function ensureDependencies(ctx, pkg) {
  const installed = await inventory(ctx.root, pkg);
  if (installed.current) ctx.log('[OK] Dependencies and lockfile already match; no installation needed.');
  else {
    const command = lockMatches(pkg, installed.lock) ? 'ci' : 'install';
    ctx.log(`[RUN] npm ${command} (local project dependencies only)`);
    await ctx.run([await npmCLI(), command]);
    if (!(await inventory(ctx.root, pkg)).current) throw new Error('Dependencies or lockfile still do not match. Check the npm output above.');
  }
  try {
    await probeTools(ctx.root);
    ctx.log('[OK] JavaScript/CSS and HTML minifiers respond; esbuild native executable works.');
  } catch (cause) {
    throw new Error(`Build-tool check failed: ${cause.message}\nIf npm reports esbuild installation approval is missing, run:\n  npm install-scripts approve esbuild\n  npm rebuild esbuild\nThen rerun prepare.cmd. No permissions or approvals were changed automatically.`, {cause});
  }
}

async function productionManifest(root, version) {
  const manifest = await readJSON(path.join(root, 'dist/manifest.json'), true);
  return manifest?.mode === 'production' && manifest.version === version;
}

async function prepare(ctx, pkg) {
  await ensureDependencies(ctx, pkg);
  let now = await snapshot(ctx.root);
  if (await productionManifest(ctx.root, pkg.version) && sameSnapshot(ctx.state.built, now)) {
    ctx.log('[SKIP] Source, tools/runtime and generated files match the last successful build.');
  } else {
    ctx.log('[RUN] Production build (first run, changed input, or changed/missing output).');
    ctx.state.verified = null;
    await ctx.save();
    await ctx.run(['scripts/build.mjs']);
    if (!await productionManifest(ctx.root, pkg.version)) throw new Error('Build did not produce the expected production manifest.');
    now = await snapshot(ctx.root);
    if (!now.dist || !now.site) throw new Error('Build output is incomplete.');
    ctx.state.built = {...now, at: new Date().toISOString()};
    await ctx.save();
  }
  // A previous PASS is not trusted instead of current verification.
  ctx.state.verified = null;
  await ctx.save();
  ctx.log('[RUN] Verification and Node tests (always rerun).');
  await ctx.run(['scripts/verify.mjs']);
  const after = await snapshot(ctx.root);
  if (!sameSnapshot(now, after)) throw new Error('Project files changed during verification. Let editing/sync finish, then rerun prepare.cmd.');
  ctx.state.verified = {...after, at: new Date().toISOString()};
  ctx.state.lastError = null;
  await ctx.save();
  ctx.log(`\nLOCAL PREPARATION PASSED - Frontend Toolkit ${pkg.version}`);
  ctx.log('Next: prepare.cmd preview (Step 6: inspect the generated website).');
  ctx.log('No version bump, Git commit/tag, upload or publication was performed.');
}

async function showStatus(ctx, pkg) {
  const installed = await inventory(ctx.root, pkg);
  const now = await snapshot(ctx.root);
  ctx.log(`Dependencies: ${installed.current ? 'match package and lockfile' : 'installation/check required'}`);
  ctx.log(`Production build: ${await productionManifest(ctx.root, pkg.version) && sameSnapshot(ctx.state.built, now) ? 'matches recorded build' : 'not recorded or files changed; run prepare.cmd'}`);
  ctx.log(`Verification: ${sameSnapshot(ctx.state.verified, now) ? `last passed for these files at ${ctx.state.verified.at}` : 'not current; run prepare.cmd'}`);
  if (ctx.state.lastError) ctx.log(`Last stopped run: ${ctx.state.lastError.message}`);
  ctx.log('Status is a file/state inspection, not a new verification or browser test.');
}

async function release(ctx, pkg) {
  await ensureDependencies(ctx, pkg);
  ctx.state.verified = null;
  await ctx.save();
  ctx.log('[RUN] Release preparation: rebuild, verify, strict release checks, ZIPs and checksums.');
  await ctx.run(['scripts/release.mjs']);
  const now = await snapshot(ctx.root);
  if (!await productionManifest(ctx.root, pkg.version)) throw new Error('Release output is not a production build for this version.');
  ctx.state.built = ctx.state.verified = {...now, at: new Date().toISOString()};
  ctx.state.lastError = null;
  await ctx.save();
  ctx.log(`\nRelease archives are in release-output/ for ${pkg.version}.`);
  ctx.log('Continue with Step 9 (GitHub Desktop); review the site and wait for browser CI before publishing.');
  ctx.log('Nothing was committed, tagged, uploaded or published.');
}

async function changeVersion(ctx, pkg, next) {
  if (!laterStableVersion(pkg.version, next || '')) throw new Error('Specify a later stable version, for example: prepare.cmd version 1.0.1. Do not change 1.0.0 before the first release.');
  if (!process.stdin.isTTY) throw new Error('Version changes require an interactive terminal and explicit confirmation.');
  ctx.log(`Current version: ${pkg.version}\nRequested version: ${next}\nThis updates version files only. It will not create a Git tag or publish.`);
  const rl = createInterface({input: process.stdin, output: process.stdout});
  let answer;
  try { answer = await rl.question(`Type ${next} to confirm, or press Enter to cancel: `, {signal: ctx.signal}); }
  finally { rl.close(); }
  if (answer.trim() !== next) { ctx.log('Cancelled. Version unchanged.'); return; }
  await ctx.run(['scripts/version.mjs', next]);
  ctx.state.built = ctx.state.verified = null;
  await ctx.save();
  ctx.log('Update CHANGELOG.md, then run prepare.cmd.');
}

/** Use a local PID lock so two preparation jobs cannot rewrite outputs concurrently. */
async function acquireLock(filename) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await fs.open(filename, 'wx');
      try { await handle.writeFile(JSON.stringify({pid: process.pid, host: os.hostname()})); }
      finally { await handle.close(); }
      return async () => { await fs.rm(filename, {force: true}); };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let old;
      try { old = await readJSON(filename); } catch { throw new Error(`Cannot read the run lock: ${filename}. Close other preparation windows before removing a stale run.lock.`); }
      if (old.host !== os.hostname() || !Number.isInteger(old.pid)) throw new Error(`A lock from another/unknown machine exists: ${filename}. Check it manually; it was not removed.`);
      try { process.kill(old.pid, 0); }
      catch (failure) {
        if (failure.code === 'ESRCH') { await fs.rm(filename); continue; }
        throw new Error(`Cannot verify the owner of ${filename}; it was not removed.`);
      }
      throw new Error(`Another preparation run is active (PID ${old.pid}). Close it before starting another.`);
    }
  }
  throw new Error('Could not acquire the preparation lock.');
}

async function fileDiagnostic(ctx) {
  const filename = path.join(ctx.root, 'dist/LICENSE');
  const classify = info => info.isSymbolicLink() ? 'symlink' : info.isFile() ? 'file' : info.isDirectory() ? 'directory' : 'other';
  try {
    const entry = (await fs.readdir(path.dirname(filename), {withFileTypes: true})).find(item => item.name === 'LICENSE');
    const info = await fs.lstat(filename);
    ctx.log(`[INFO] dist/LICENSE: directory hint=${entry ? classify(entry) : 'not listed'}; lstat=${classify(info)}.`);
  } catch (error) { ctx.log(`[INFO] dist/LICENSE diagnostic: ${error.code || error.message}`); }
}

function help() {
  console.log(`Frontend Toolkit local preparation\n\n  prepare.cmd                 Install if needed, build if stale, always verify\n  prepare.cmd status          Show detected local progress\n  prepare.cmd preview         Prepare/check, then serve the built demo\n  prepare.cmd release         Build, verify, then prepare release ZIPs and checksums\n  prepare.cmd version 1.0.1   Explicit, confirmed version change for a later release\n\nOn other systems: node scripts/prepare.mjs [command]\nNo command commits, tags, uploads, publishes, or changes the version without an explicit version command.\nLogs/state: build/preparation/ (already excluded from Git and release archives).`);
}

export async function main(args = process.argv.slice(2)) {
  const action = args[0] || 'prepare';
  if (['help', '--help', '-h'].includes(action)) { help(); return; }
  if (!['prepare', 'status', 'preview', 'release', 'version'].includes(action) || args.length > (action === 'version' ? 2 : 1)) {
    throw new Error('Unknown command/argument. Run prepare.cmd help.');
  }
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node 22 or newer is required.');
  const pkg = await readJSON(path.join(project, 'package.json'));
  if (pkg.name !== 'frontend-toolkit') throw new Error('Place these files in the Frontend Toolkit project root, next to package.json.');
  const folder = path.join(project, 'build/preparation');
  await fs.mkdir(folder, {recursive: true});
  const unlock = await acquireLock(path.join(folder, 'run.lock'));
  let fd, ctx;
  let cancelled = false, child;
  const abort = new AbortController();
  const interrupt = () => { cancelled = true; abort.abort(); if (child) child.kill('SIGTERM'); };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  try {
    fd = openSync(path.join(folder, 'latest.log'), 'w');
    const log = text => { const line = String(text) + '\n'; process.stdout.write(line); writeSync(fd, line); };
    const stateFile = path.join(folder, 'state.json');
    const store = createProgressStore(stateFile, {log, signal: abort.signal});
    ctx = {root: project, log, signal: abort.signal, state: await store.load()};
    ctx.save = () => store.save(ctx.state);
    ctx.run = (command, {server = false} = {}) => new Promise((resolve, reject) => {
      if (cancelled) { reject(new Error('Cancelled.')); return; }
      log(`\n> node ${command.map(arg => arg.includes(' ') ? JSON.stringify(arg) : arg).join(' ')}`);
      // Launch npm's JS entry through Node, not a Windows .cmd through shell interpolation.
      child = spawn(process.execPath, command, {cwd: project, stdio: ['inherit', 'pipe', 'pipe'], shell: false, windowsHide: true});
      child.stdout.on('data', data => { process.stdout.write(data); writeSync(fd, data); });
      child.stderr.on('data', data => { process.stderr.write(data); writeSync(fd, data); });
      child.on('error', error => { child = null; reject(error); });
      child.on('close', (code, signal) => {
        child = null;
        if (server && (cancelled || signal === 'SIGINT')) { resolve(); return; }
        if (code === 0 && !cancelled) resolve();
        else reject(new Error(cancelled ? 'Cancelled. Rerun prepare.cmd when ready.' : `${command[0]} failed (${signal || `exit ${code}`}). See the output above.`));
      });
    });
    log(`Frontend Toolkit ${pkg.version} - ${action}\nProject: ${project}\nNode: ${process.version}\nStarted: ${new Date().toISOString()}`);
    await fileDiagnostic(ctx);
    if (action === 'status') await showStatus(ctx, pkg);
    else if (action === 'version') await changeVersion(ctx, pkg, args[1]);
    else if (action === 'release') await release(ctx, pkg);
    else {
      await prepare(ctx, pkg);
      if (action === 'preview') {
        log('\nOpen the URL printed below. Ctrl+C stops the preview server.');
        await ctx.run(['scripts/serve.mjs', '--built'], {server: true});
      }
    }
    log(`\nLog: ${path.join(folder, 'latest.log')}`);
  } catch (error) {
    if (ctx) {
      ctx.state.lastError = {action, at: new Date().toISOString(), message: error.message};
      await ctx.save().catch(() => {});
      ctx.log(`\nSTOPPED: ${error.message}\nNo later step was started.\nLog to share: ${path.join(folder, 'latest.log')}`);
    }
    throw error;
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    if (fd !== undefined) closeSync(fd);
    await unlock();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('PREPARATION ERROR:', error.message); process.exitCode = 1; });
}
