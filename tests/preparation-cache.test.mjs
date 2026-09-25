import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createProgressStore} from '../scripts/prepare.mjs';

const failure = code => Object.assign(new Error(`Simulated filesystem failure: ${code}`), {code});
const oldState = {protocol: 1, built: {inputs: 'previous'}, verified: null};

async function temporary(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ft cache space-'));
  try { await run(root); }
  finally { await fs.rm(root, {recursive: true, force: true}); }
}
async function put(root, name, contents) {
  const filename = path.join(root, name);
  await fs.mkdir(path.dirname(filename), {recursive: true});
  await fs.writeFile(filename, contents);
  return filename;
}
async function existing(root) { return put(root, 'state.json', JSON.stringify(oldState)); }
async function read(filename) { return JSON.parse(await fs.readFile(filename, 'utf8')); }
const noWait = async () => {};

// Filesystem faults below are injected; they do not reproduce a real Windows sharing handle.
test('Progress cache round-trips and replaces a closed temporary file without leftovers', async () => {
  await temporary(async root => {
    const filename = await existing(root), messages = [];
    const store = createProgressStore(filename, {log: text => messages.push(text)});
    assert.deepEqual(await store.load(), oldState);
    const state = {protocol: 999, built: {inputs: 'new'}, verified: {at: 'now'}};
    assert.equal(await store.save(state), true);
    assert.equal(store.persistent, true);
    assert.deepEqual(await read(filename), {...state, protocol: 1});
    assert.equal(state.protocol, 999, 'Saving must not mutate the caller state');
    assert.deepEqual(await fs.readdir(root), ['state.json']);
    assert.deepEqual(messages, []);
  });
});

for (const code of ['EPERM', 'EACCES', 'EBUSY']) {
  test(`Progress cache retries transient ${code} rename failures and preserves the old file until commit`, async () => {
    await temporary(async root => {
      const filename = await existing(root), pauses = [], messages = [];
      let attempts = 0;
      const io = {...fs, async rename(from, to) {
        assert.equal(to, filename);
        assert.deepEqual(await read(filename), oldState);
        assert.equal((await read(from)).built.inputs, 'new');
        if (++attempts <= 3) throw failure(code);
        return fs.rename(from, to);
      }};
      const store = createProgressStore(filename, {io, log: message => messages.push(message), wait: async ms => { pauses.push(ms); }});
      assert.equal(await store.save({built: {inputs: 'new'}}), true);
      assert.equal(attempts, 4);
      assert.deepEqual(pauses, [80, 160, 320]);
      assert.equal((await read(filename)).built.inputs, 'new');
      assert.deepEqual(await fs.readdir(root), ['state.json']);
      assert.deepEqual(messages, []);
    });
  });
}

test('Persistent rename refusal switches to memory after bounded retries, never deletes the old cache', async () => {
  await temporary(async root => {
    const filename = await existing(root), messages = [], pauses = [], unlinked = [];
    let attempts = 0, opens = 0;
    const io = {...fs,
      async open(...args) { opens++; return fs.open(...args); },
      async rename() { attempts++; throw failure('EPERM'); },
      async unlink(file) { unlinked.push(file); assert.notEqual(file, filename); return fs.unlink(file); }
    };
    const store = createProgressStore(filename, {io, log: line => messages.push(line), wait: async ms => { pauses.push(ms); }});
    assert.equal(await store.save({built: {inputs: 'new'}}), false);
    assert.equal(store.persistent, false);
    assert.equal(attempts, 6);
    assert.equal(pauses.reduce((sum, value) => sum + value, 0), 2200);
    assert.deepEqual(await read(filename), oldState);
    assert.equal(await store.save({verified: {at: 'later'}}), false);
    assert.equal(opens, 1, 'Do not retry disk persistence at every later checkpoint');
    assert.equal(attempts, 6);
    assert.equal(unlinked.length, 1);
    assert.deepEqual(await fs.readdir(root), ['state.json']);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /WARN.*save.*EPERM/);
    assert.match(messages[0], /verification and release checks are unchanged/);
  });
});

test('A temporarily busy cache read recovers rather than discarding a valid snapshot', async () => {
  await temporary(async root => {
    const filename = await existing(root);
    let attempts = 0;
    const io = {...fs, async readFile(...args) { if (++attempts < 3) throw failure('EBUSY'); return fs.readFile(...args); }};
    const store = createProgressStore(filename, {io, wait: noWait});
    assert.deepEqual(await store.load(), oldState);
    assert.equal(attempts, 3);
    assert.equal(store.persistent, true);
  });
});

test('An unreadable cache starts with no recorded build or pass; actual preparation may still run', async () => {
  await temporary(async root => {
    const filename = await existing(root), messages = [];
    let reads = 0, opens = 0;
    const io = {...fs,
      async readFile() { reads++; throw failure('EACCES'); },
      async open(...args) { opens++; return fs.open(...args); }
    };
    const store = createProgressStore(filename, {io, wait: noWait, log: message => messages.push(message)});
    assert.deepEqual(await store.load(), {protocol: 1});
    assert.equal(reads, 6);
    assert.equal(store.persistent, false);
    assert.equal(await store.save({built: {inputs: 'new'}}), false);
    assert.equal(opens, 0);
    assert.deepEqual(await read(filename), oldState);
    assert.match(messages[0], /WARN.*read.*EACCES/);
  });
});

test('Missing, corrupt and incompatible cache files never supply a stale verification result', async () => {
  await temporary(async root => {
    const filename = path.join(root, 'state.json'), messages = [];
    const store = createProgressStore(filename, {log: message => messages.push(message)});
    assert.deepEqual(await store.load(), {protocol: 1});
    for (const text of ['{"protocol":1,"verified":', 'null', '[]', '{"protocol":2,"verified":{"at":"old"}}']) {
      await fs.writeFile(filename, text);
      assert.deepEqual(await store.load(), {protocol: 1});
    }
    assert.equal(store.persistent, true);
    assert.equal(await store.save({verified: null}), true);
    assert.deepEqual(await read(filename), {verified: null, protocol: 1});
    assert.equal(messages.length, 1);
    assert.match(messages[0], /invalid JSON/);
  });
});

test('Non-transient cache IO errors warn once without a pointless retry loop', async () => {
  await temporary(async root => {
    const filename = await existing(root), messages = [];
    let attempts = 0, waits = 0;
    const io = {...fs, async open() { attempts++; throw failure('ENOSPC'); }};
    const store = createProgressStore(filename, {io, log: line => messages.push(line), wait: async () => { waits++; }});
    assert.equal(await store.save({built: {inputs: 'new'}}), false);
    assert.equal(await store.save({}), false);
    assert.equal(attempts, 1);
    assert.equal(waits, 0);
    assert.equal(messages.length, 1);
    assert.deepEqual(await read(filename), oldState);
  });
});

test('A failed temporary write is closed and removed without damaging the existing cache', async () => {
  await temporary(async root => {
    const filename = await existing(root);
    let closed = false, renamed = false;
    const io = {...fs,
      async open(...args) {
        const handle = await fs.open(...args);
        return {async writeFile() { await handle.writeFile('partial'); throw failure('EIO'); }, async close() { await handle.close(); closed = true; }};
      },
      async rename() { renamed = true; },
      async unlink(name) { assert.equal(closed, true); return fs.unlink(name); }
    };
    const store = createProgressStore(filename, {io});
    assert.equal(await store.save({built: {inputs: 'new'}}), false);
    assert.equal(closed, true);
    assert.equal(renamed, false);
    assert.deepEqual(await read(filename), oldState);
    assert.deepEqual(await fs.readdir(root), ['state.json']);
  });
});

test('A locked temporary file is reported and ignored; cleanup never targets the destination', async () => {
  await temporary(async root => {
    const filename = await existing(root), messages = [];
    const io = {...fs, async rename() { throw failure('EPERM'); }, async unlink(name) { assert.notEqual(name, filename); throw failure('EBUSY'); }};
    const store = createProgressStore(filename, {io, wait: noWait, log: message => messages.push(message)});
    assert.equal(await store.save({built: {inputs: 'new'}}), false);
    assert.deepEqual(await read(filename), oldState);
    assert.equal((await fs.readdir(root)).filter(name => name.endsWith('.tmp')).length, 1);
    assert.match(messages[1], /Temporary.*could not be removed.*not used/);
  });
});

test('Exclusive-create failure never deletes a temporary path owned by somebody else', async () => {
  await temporary(async root => {
    let unlinks = 0;
    const io = {...fs, async open() { throw failure('EEXIST'); }, async unlink() { unlinks++; }};
    const store = createProgressStore(path.join(root, 'state.json'), {io});
    assert.equal(await store.save({}), false);
    assert.equal(unlinks, 0);
  });
});

test('Programming/serialization errors are not downgraded to optional-cache warnings', async () => {
  await temporary(async root => {
    const filename = await existing(root), messages = [];
    const store = createProgressStore(filename, {log: message => messages.push(message)});
    await assert.rejects(store.save({value: 1n}), TypeError);
    assert.equal(store.persistent, true);
    const brokenIO = {...fs, async open() { throw new TypeError('bad cache implementation'); }};
    await assert.rejects(createProgressStore(filename, {io: brokenIO}).save({}), /bad cache implementation/);
    assert.deepEqual(messages, []);
    assert.deepEqual(await read(filename), oldState);
  });
});

test('Cancellation interrupts cache retries without being reported as a successful save', async () => {
  await temporary(async root => {
    const filename = await existing(root), abort = new AbortController();
    let attempts = 0;
    const io = {...fs, async rename() { attempts++; throw failure('EPERM'); }};
    const store = createProgressStore(filename, {io, signal: abort.signal, wait: async () => { abort.abort(); }});
    await assert.rejects(store.save({built: {inputs: 'new'}}), {name: 'AbortError'});
    assert.equal(attempts, 1);
    assert.deepEqual(await read(filename), oldState);
    assert.deepEqual(await fs.readdir(root), ['state.json']);
    await assert.rejects(store.load(), {name: 'AbortError'});
  });
});

// CLI fixtures intentionally stub build tools. They test control flow, NOT real minification.
async function fixture(root) {
  for (const name of ['prepare.mjs', 'file-tree.mjs']) {
    await put(root, 'scripts/' + name, await fs.readFile(new URL('../scripts/' + name, import.meta.url)));
  }
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
  await put(root, 'src/example.js', 'export const example = 1;');
  const prefix = `import fs from 'node:fs/promises'; await fs.mkdir('build',{recursive:true}); let counts;try{counts=JSON.parse(await fs.readFile('build/counts.json','utf8'));}catch{counts={build:0,verify:0};}\n`;
  await put(root, 'scripts/build.mjs', prefix + `counts.build++;await fs.writeFile('build/counts.json',JSON.stringify(counts));await fs.mkdir('dist',{recursive:true});await fs.mkdir('build/site',{recursive:true});await fs.writeFile('dist/manifest.json',JSON.stringify({version:'1.0.0',mode:'production'}));await fs.writeFile('dist/LICENSE','test notice');await fs.writeFile('build/site/index.html','<p>fixture</p>');`);
  await put(root, 'scripts/verify.mjs', prefix + `counts.verify++;await fs.writeFile('build/counts.json',JSON.stringify(counts));try{await fs.access('build/fail.verify');console.error('intentional verification failure');process.exitCode=7;}catch{console.log('fixture verification passed');}`);
  const preload = await put(root, 'build/fault.mjs', `import fs from 'node:fs/promises';const rename=fs.rename;fs.rename=async(from,to)=>{if(to.replaceAll('\\\\','/').endsWith('/build/preparation/state.json')){let state=JSON.parse(await fs.readFile(from,'utf8'));if(state.built)throw Object.assign(new Error('simulated locked state replacement'),{code:'EPERM'});}return rename(from,to);};`);
  return preload;
}
function run(root, preload, ...args) {
  return spawnSync(process.execPath, [...(preload ? ['--import', pathToFileURL(preload).href] : []), 'scripts/prepare.mjs', ...args], {cwd: root, encoding: 'utf8', timeout: 25000});
}

test('CLI: a locked post-build cache still runs verification; rerunning after unlock is safe', async () => {
  await temporary(async root => {
    const preload = await fixture(root), original = await fs.readFile(path.join(root, 'package.json'), 'utf8');
    const result = run(root, preload);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /WARN.*cache.*EPERM/);
    assert.match(result.stdout, /Verification and Node tests \(always rerun\)/);
    assert.match(result.stdout, /LOCAL PREPARATION PASSED - Frontend Toolkit 1\.0\.0/);
    assert.deepEqual(await read(path.join(root, 'build/counts.json')), {build: 1, verify: 1});
    assert.equal((await read(path.join(root, 'build/preparation/state.json'))).verified, null);
    await assert.rejects(fs.access(path.join(root, 'build/preparation/run.lock')), {code: 'ENOENT'});
    const retry = run(root, null);
    assert.equal(retry.status, 0, retry.stdout + retry.stderr);
    assert.deepEqual(await read(path.join(root, 'build/counts.json')), {build: 2, verify: 2});
    assert.equal(await fs.readFile(path.join(root, 'package.json'), 'utf8'), original);
    const third = run(root, null);
    assert.equal(third.status, 0, third.stdout + third.stderr);
    assert.match(third.stdout, /\[SKIP\]/);
    assert.deepEqual(await read(path.join(root, 'build/counts.json')), {build: 2, verify: 3});
  });
});

test('CLI: cache refusal cannot hide a real verification failure or print a preparation pass', async () => {
  await temporary(async root => {
    const preload = await fixture(root);
    await put(root, 'build/fail.verify', '1');
    const result = run(root, preload);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /WARN.*cache.*EPERM/);
    assert.match(result.stderr, /intentional verification failure/);
    assert.match(result.stdout, /STOPPED: scripts\/verify\.mjs failed/);
    assert.doesNotMatch(result.stdout, /LOCAL PREPARATION PASSED/);
    assert.deepEqual(await read(path.join(root, 'build/counts.json')), {build: 1, verify: 1});
    await assert.rejects(fs.access(path.join(root, 'build/preparation/run.lock')), {code: 'ENOENT'});
  });
});

test('CLI: cache changes cannot bypass a failing release validation or mutate metadata', async () => {
  await temporary(async root => {
    const preload = await fixture(root), before = await fs.readFile(path.join(root, 'release-metadata.json'), 'utf8');
    await put(root, 'scripts/release.mjs', "console.error('intentional release validation failure');process.exitCode=12;");
    const result = run(root, preload, 'release');
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /intentional release validation failure/);
    assert.match(result.stdout, /STOPPED: scripts\/release\.mjs failed/);
    assert.doesNotMatch(result.stdout, /Release archives are in/);
    assert.equal(await fs.readFile(path.join(root, 'release-metadata.json'), 'utf8'), before);
    await assert.rejects(fs.access(path.join(root, 'build/counts.json')), {code: 'ENOENT'});
  });
});
