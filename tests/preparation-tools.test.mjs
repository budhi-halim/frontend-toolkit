import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileKind, readEntries, walkFiles} from '../scripts/file-tree.mjs';
import {collectFiles} from '../scripts/archive.mjs';
import {lockMatches, sameSnapshot, laterStableVersion} from '../scripts/prepare.mjs';

async function temporary(run) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ft prepare space-'));
  try { return await run(folder); }
  finally { await fs.rm(folder, {recursive: true, force: true}); }
}

async function put(root, name, data) {
  const filename = path.join(root, name);
  await fs.mkdir(path.dirname(filename), {recursive: true});
  await fs.writeFile(filename, data);
}

test('Filesystem walker includes extensionless licenses and has deterministic ordering', async () => {
  await temporary(async root => {
    await put(root, 'nested/b.js', 'b');
    await put(root, 'z.js', 'z');
    await put(root, 'LICENSE', 'License\r\n');
    assert.deepEqual((await walkFiles(root)).map(name => path.relative(root, name).replaceAll('\\', '/')),
      ['LICENSE', 'nested/b.js', 'z.js']);
    assert.equal(await fileKind(path.join(root, 'LICENSE')), 'file');
    const archived = await collectFiles(root);
    assert.ok(archived[0].data.equals(Buffer.from('License\r\n')));
  });
});

test('Simulated cloud reparse Dirent hint is not used to classify a regular file', async () => {
  await temporary(async root => {
    await put(root, 'LICENSE', 'MIT');
    let nameReads = 0, statReads = 0;
    const io = {
      async readdir(directory, options) {
        if (options?.withFileTypes) return [{name: 'LICENSE', isFile: () => false, isDirectory: () => false, isSymbolicLink: () => true}];
        nameReads++;
        return fs.readdir(directory);
      },
      async lstat(filename) { statReads++; return fs.lstat(filename); }
    };
    assert.equal((await io.readdir(root, {withFileTypes: true}))[0].isSymbolicLink(), true);
    assert.equal((await readEntries(root, {io}))[0].kind, 'file');
    assert.equal(nameReads, 1);
    assert.equal(statReads, 2);
  });
});

test('File traversal still refuses actual symlinks, including a symlinked root', async context => {
  await temporary(async root => {
    await put(root, 'target/LICENSE', 'MIT');
    try { await fs.symlink(path.join(root, 'target/LICENSE'), path.join(root, 'link'), 'file'); }
    catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { context.skip('Symlink creation not permitted on this host'); return; } throw error; }
    await assert.rejects(walkFiles(root), /Symlink\/junction/);
    await assert.rejects(collectFiles(root), /Symlink\/junction/);
    await assert.rejects(readEntries(path.join(root, 'link')), /Symlink\/junction/);
  });
});

test('Unknown filesystem objects are rejected, not followed or silently omitted', async () => {
  const io = {lstat: async () => ({isFile: () => false, isDirectory: () => false, isSymbolicLink: () => false, mode: 0o010644})};
  await assert.rejects(fileKind('/example/FIFO', io), /Unsupported filesystem entry.*No file was skipped/);
});

test('Excluded directories are not inspected; lstat failures retain their error code', async () => {
  await temporary(async root => {
    await put(root, 'node_modules/do-not-inspect', 'x');
    await put(root, 'LICENSE', 'MIT');
    const io = {readdir: fs.readdir, async lstat(filename) {
      assert.ok(!filename.includes('node_modules'));
      return fs.lstat(filename);
    }};
    assert.equal((await walkFiles(root, {skip: (_, name) => name === 'node_modules', io})).length, 1);
    await assert.rejects(fileKind(path.join(root, 'absent')), error => error.code === 'ENOENT' && error.message.includes('absent'));
  });
});

test('Dependency matching preserves user install-script approval and detects actual mismatches', () => {
  const pkg = {name: 'frontend-toolkit', version: '1.0.0', devDependencies: {esbuild: '0.25.12'}, allowScripts: {'esbuild@0.25.12': true}};
  const lock = {name: pkg.name, version: pkg.version, packages: {'': {version: pkg.version, devDependencies: {...pkg.devDependencies}}}};
  const before = JSON.stringify(pkg);
  assert.equal(lockMatches(pkg, lock), true);
  assert.equal(lockMatches({...pkg, version: '1.0.1'}, lock), false);
  assert.equal(lockMatches(pkg, {...lock, packages: {'': {version: '1.0.0', devDependencies: {esbuild: '0.24.0'}}}}), false);
  assert.equal(lockMatches(pkg, null), false);
  assert.equal(JSON.stringify(pkg), before);
});

test('Cache needs source, both output trees and runtime, not a completed flag', () => {
  const a = {inputs: 'a', dist: 'b', site: 'c', runtime: 'node-22'};
  assert.equal(sameSnapshot(a, {...a, at: 'new time'}), true);
  for (const key of Object.keys(a)) assert.equal(sameSnapshot(a, {...a, [key]: 'changed'}), false);
  assert.equal(sameSnapshot({...a, site: null}, {...a, site: null}), false);
  assert.equal(sameSnapshot(null, a), false);
});

test('Version command accepts only explicitly later stable versions', () => {
  for (const next of ['1.0.1', '1.1.0', '2.0.0', '10.0.0']) assert.equal(laterStableVersion('1.0.0', next), true);
  for (const next of ['1.0.0', '0.9.9', '01.0.1', '1.0.1-beta', 'x', '1.0.1 && echo bad']) assert.equal(laterStableVersion('1.0.0', next), false);
});

// These fixtures exercise orchestration and failure recovery, not real minifiers.
async function fixture(root) {
  for (const file of ['prepare.mjs', 'file-tree.mjs']) await put(root, 'scripts/' + file, await fs.readFile(new URL('../scripts/' + file, import.meta.url)));
  const pkg = {name: 'frontend-toolkit', version: '1.0.0', type: 'module', devDependencies: {esbuild: '0.25.12', 'html-minifier-terser': '7.2.0'}, allowScripts: {'esbuild@0.25.12': true}};
  const lock = {name: pkg.name, version: pkg.version, packages: {'': {version: pkg.version, devDependencies: pkg.devDependencies}}};
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    lock.packages['node_modules/' + name] = {version};
    await put(root, `node_modules/${name}/package.json`, JSON.stringify({name, version, type: 'module', main: './index.js'}));
    await put(root, `node_modules/${name}/index.js`, name === 'esbuild' ? 'export async function transform(code){return {code};}' : 'export async function minify(code){return code;}');
  }
  await put(root, 'package.json', JSON.stringify(pkg));
  await put(root, 'package-lock.json', JSON.stringify(lock));
  await put(root, 'release-metadata.json', JSON.stringify({provenance: {glassMap: {status: 'pending'}, inheritedShaders: {status: 'pending'}}}));
  await put(root, 'src/example.js', 'const test = 1;');
  const count = `import fs from 'node:fs/promises';\nawait fs.mkdir('build',{recursive:true});\nlet counts;try{counts=JSON.parse(await fs.readFile('build/counts.json','utf8'));}catch{counts={build:0,verify:0};}\n`;
  await put(root, 'scripts/build.mjs', count + `counts.build++;await fs.writeFile('build/counts.json',JSON.stringify(counts));await fs.mkdir('dist',{recursive:true});await fs.mkdir('build/site',{recursive:true});await fs.writeFile('dist/manifest.json',JSON.stringify({version:'1.0.0',mode:'production'}));await fs.writeFile('dist/LICENSE','test notice');await fs.writeFile('build/site/index.html','<p>fixture</p>');`);
  await put(root, 'scripts/verify.mjs', count + `counts.verify++;await fs.writeFile('build/counts.json',JSON.stringify(counts));try{await fs.access('build/fail.verify');console.error('intentional fixture failure');process.exitCode=7;}catch{console.log('fixture verification passed');}`);
}

function command(root, ...args) {
  return spawnSync(process.execPath, ['scripts/prepare.mjs', ...args], {cwd: root, encoding: 'utf8', timeout: 30000});
}
async function counts(root) { return JSON.parse(await fs.readFile(path.join(root, 'build/counts.json'), 'utf8')); }
function passed(result) { assert.equal(result.status, 0, result.stdout + '\n' + result.stderr); }

test('Orchestration fixture: rerun skips only unchanged builds, not verification; version and approvals stay intact', async () => {
  await temporary(async root => {
    await fixture(root);
    const pkg = await fs.readFile(path.join(root, 'package.json'), 'utf8');
    passed(command(root));
    assert.deepEqual(await counts(root), {build: 1, verify: 1});
    const again = command(root);
    passed(again);
    assert.match(again.stdout, /\[SKIP\]/);
    assert.deepEqual(await counts(root), {build: 1, verify: 2});
    await put(root, 'src/example.js', 'const test = 2;');
    passed(command(root));
    assert.deepEqual(await counts(root), {build: 2, verify: 3});
    await put(root, 'dist/LICENSE', 'changed output');
    passed(command(root));
    assert.deepEqual(await counts(root), {build: 3, verify: 4});
    await put(root, 'build/site/index.html', 'changed website');
    passed(command(root));
    assert.deepEqual(await counts(root), {build: 4, verify: 5});
    assert.equal(await fs.readFile(path.join(root, 'package.json'), 'utf8'), pkg);
    const status = command(root, 'status');
    passed(status);
    assert.match(status.stdout, /last passed for these files/);
    assert.deepEqual(await counts(root), {build: 4, verify: 5});
  });
});

test('Orchestration fixture: failed verification stops, logs, releases lock and safely retries', async () => {
  await temporary(async root => {
    await fixture(root);
    await put(root, 'build/fail.verify', '1');
    const failed = command(root);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stdout, /STOPPED/);
    assert.deepEqual(await counts(root), {build: 1, verify: 1});
    const state = JSON.parse(await fs.readFile(path.join(root, 'build/preparation/state.json')));
    assert.equal(state.verified, null);
    assert.match(await fs.readFile(path.join(root, 'build/preparation/latest.log'), 'utf8'), /intentional fixture failure/);
    await assert.rejects(fs.access(path.join(root, 'build/preparation/run.lock')), {code: 'ENOENT'});
    await fs.rm(path.join(root, 'build/fail.verify'));
    passed(command(root));
    assert.deepEqual(await counts(root), {build: 1, verify: 2});
  });
});

test('Orchestration fixture: real release failures stop and noninteractive version changes are refused', async () => {
  await temporary(async root => {
    await fixture(root);
    const metadata = await fs.readFile(path.join(root, 'release-metadata.json'), 'utf8');
    await put(root, 'scripts/release.mjs', "console.error('intentional release validation failure');process.exitCode=9;");
    const release = command(root, 'release');
    assert.notEqual(release.status, 0);
    assert.match(release.stdout + release.stderr, /intentional release validation failure/);
    assert.match(release.stdout, /STOPPED: scripts\/release\.mjs failed/);
    assert.doesNotMatch(release.stdout, /Release archives are in/);
    await assert.rejects(fs.access(path.join(root, 'build/counts.json')), {code: 'ENOENT'});
    const version = command(root, 'version', '1.0.1');
    assert.notEqual(version.status, 0);
    assert.match(version.stdout, /interactive terminal/);
    assert.equal(JSON.parse(await fs.readFile(path.join(root, 'package.json'))).version, '1.0.0');
    assert.equal(await fs.readFile(path.join(root, 'release-metadata.json'), 'utf8'), metadata);
  });
});

test('Orchestration fixture: an active lock prevents a second run without altering its log', async () => {
  await temporary(async root => {
    await fixture(root);
    await put(root, 'build/preparation/run.lock', JSON.stringify({pid: process.pid, host: os.hostname()}));
    await put(root, 'build/preparation/latest.log', 'current run');
    const blocked = command(root);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /Another preparation run/);
    assert.equal(await fs.readFile(path.join(root, 'build/preparation/latest.log'), 'utf8'), 'current run');
  });
});
