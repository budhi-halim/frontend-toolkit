import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = name => fs.readFile(new URL(name, root), 'utf8');
async function put(directory, name, content) {
  const filename = path.join(directory, name);
  await fs.mkdir(path.dirname(filename), {recursive: true});
  await fs.writeFile(filename, content);
}

// These process fixtures exercise the actual release/orchestration scripts. Their
// build and verification subprocesses are stubs, NOT production-minifier tests.
async function fixture(t, {legacyRecords = false, failedStage = '', version = '1.0.0'} = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ft release cleanup '));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  for (const name of ['release.mjs', 'archive.mjs', 'file-tree.mjs', 'prepare.mjs']) {
    await put(dir, `scripts/${name}`, await read(`scripts/${name}`));
  }
  const pkg = {name: 'frontend-toolkit', version, type: 'module', license: 'MIT',
    devDependencies: {esbuild: '0.25.12', 'html-minifier-terser': '7.2.0'},
    allowScripts: {'esbuild@0.25.12': true}};
  const lock = {name: pkg.name, version, packages: {'': {version, devDependencies: pkg.devDependencies}}};
  for (const [name, toolVersion] of Object.entries(pkg.devDependencies)) {
    lock.packages[`node_modules/${name}`] = {version: toolVersion};
    await put(dir, `node_modules/${name}/package.json`, JSON.stringify({name, version: toolVersion, type: 'module', main: './index.js'}));
    await put(dir, `node_modules/${name}/index.js`, name === 'esbuild' ?
      'export async function transform(code){return {code};}' : 'export async function minify(code){return code;}');
  }
  const metadata = {repository: 'budhi-halim/frontend-toolkit', defaultBranch: 'main', tagPrefix: 'v', copyrightHolder: 'Frontend Toolkit contributors'};
  if (legacyRecords) metadata.provenance = {glassMap: {status: 'pending'}, inheritedShaders: {status: 'pending'}};
  await put(dir, 'package.json', JSON.stringify(pkg));
  await put(dir, 'package-lock.json', JSON.stringify(lock));
  await put(dir, 'release-metadata.json', JSON.stringify(metadata));
  for (const name of ['LICENSE', 'NOTICE.txt', 'licenses/webgl-noise-MIT.txt']) await put(dir, name, await read(name));
  await put(dir, 'src/example.js', 'export const example = 1;');
  const prefix = stage => `import fs from 'node:fs/promises';
    await fs.mkdir('build',{recursive:true});
    let order;try{order=JSON.parse(await fs.readFile('build/order.json','utf8'));}catch{order=[];}
    order.push(${JSON.stringify(stage)});await fs.writeFile('build/order.json',JSON.stringify(order));
    if(${JSON.stringify(stage === failedStage)}){console.error('Intentional ${stage} failure');process.exit(7);}
  `;
  await put(dir, 'scripts/build.mjs', prefix('build') + `
    await fs.mkdir('dist/licenses',{recursive:true});await fs.mkdir('build/site',{recursive:true});
    await fs.writeFile('dist/manifest.json',JSON.stringify({mode:'production',version:${JSON.stringify(version)}}));
    for(const file of ['LICENSE','NOTICE.txt','licenses/webgl-noise-MIT.txt'])await fs.copyFile(file,'dist/'+file);
    await fs.writeFile('dist/frontend-toolkit.js','/* fixture */');await fs.writeFile('build/site/index.html','<p>fixture</p>');
  `);
  await put(dir, 'scripts/verify.mjs', prefix('verify'));
  await put(dir, 'scripts/check.mjs', prefix('check') + `if(!process.argv.includes('--release'))process.exit(8);`);
  return dir;
}
function run(directory, script = 'release.mjs', ...args) {
  return spawnSync(process.execPath, [`scripts/${script}`, ...args], {cwd: directory, encoding: 'utf8', timeout: 30000});
}
function entries(bytes) {
  const items = new Map();
  for (let offset = 0; bytes.readUInt32LE(offset) === 0x04034b50;) {
    const compressed = bytes.readUInt32LE(offset + 18);
    const nameSize = bytes.readUInt16LE(offset + 26), extraSize = bytes.readUInt16LE(offset + 28);
    const start = offset + 30 + nameSize + extraSize;
    const name = bytes.toString('utf8', offset + 30, offset + 30 + nameSize);
    items.set(name, inflateRawSync(bytes.subarray(start, start + compressed)));
    offset = start + compressed;
  }
  return items;
}

test('Release settings do not require per-component declarations; MIT and notices remain required', async () => {
  const metadata = JSON.parse(await read('release-metadata.json'));
  assert.equal(Object.hasOwn(metadata, 'provenance'), false);
  assert.equal(metadata.repository, 'budhi-halim/frontend-toolkit');
  for (const name of ['scripts/check.mjs', 'scripts/prepare.mjs', 'scripts/release.mjs']) {
    assert.doesNotMatch(await read(name), /pendingPermissions|metadata\.provenance|glassMap|inheritedShaders/);
  }
  const check = await read('scripts/check.mjs');
  for (const name of ['LICENSE', 'NOTICE.txt', 'licenses/webgl-noise-MIT.txt', 'release-metadata.json']) assert.ok(check.includes(`'${name}'`));
  assert.match(check, /pkg\.license!=='MIT'/);
  assert.match(check, /manifest\.mode!=='production'/);
  assert.match(check, /!lock/);
  assert.match(check, /failures\.push\(\.\.\.warnings\)/);
  assert.match(await read('scripts/build.mjs'), /collectNotices/);
});

test('Documentation, generated navigation and notices no longer link to the obsolete declaration page', async () => {
  const names = ['README.md', 'START-HERE.md', 'NOTICE.txt', 'scripts/docs.mjs', 'scripts/layout.mjs'];
  for (const name of await fs.readdir(new URL('docs/', root))) if (/\.(?:html|md)$/.test(name)) names.push('docs/' + name);
  for (const name of ['index.html', 'lab.html', ...(await fs.readdir(new URL('examples/', root))).filter(n => n.endsWith('.html')).map(n => 'examples/' + n)]) names.push(name);
  for (const name of names) assert.doesNotMatch(await read(name), /docs\/PROVENANCE\.md|(?:href="|\]\()provenance\.html|docs\/provenance\.html|\]\(PROVENANCE\.md\)/, name);
  for (const name of ['docs/PROVENANCE.md', 'docs/provenance.html', 'scripts/record-provenance.mjs', 'tests/provenance-record.test.mjs']) {
    await assert.rejects(fs.access(new URL(name, root)), {code: 'ENOENT'});
  }
  const publishing = await read('docs/PUBLISHING.md');
  assert.match(publishing, /## 7\. Keep the licenses and notices/);
  assert.match(publishing, /## 8\. Create the release archives/);
  assert.match(publishing, /prepare\.cmd release/);
});

for (const legacyRecords of [false, true]) test(`Release reaches all technical checks without approval prompts (legacy metadata: ${legacyRecords})`, async t => {
  const dir = await fixture(t, {legacyRecords});
  const before = await fs.readFile(path.join(dir, 'release-metadata.json'));
  const pkg = await fs.readFile(path.join(dir, 'package.json'));
  const result = run(dir);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, 'build/order.json'))), ['build', 'verify', 'check']);
  assert.deepEqual(await fs.readFile(path.join(dir, 'release-metadata.json')), before);
  assert.deepEqual(await fs.readFile(path.join(dir, 'package.json')), pkg);
  const outputs = await fs.readdir(path.join(dir, 'release-output'));
  assert.deepEqual(outputs.sort(), ['SHA256SUMS.txt', 'frontend-toolkit-1.0.0-dist.zip', 'frontend-toolkit-1.0.0-repository.zip'].sort());
  const bytes = await fs.readFile(path.join(dir, 'release-output/frontend-toolkit-1.0.0-dist.zip'));
  const files = entries(bytes);
  for (const name of ['LICENSE', 'NOTICE.txt', 'licenses/webgl-noise-MIT.txt']) {
    assert.deepEqual(files.get(`frontend-toolkit-1.0.0/${name}`), await fs.readFile(path.join(dir, name)));
  }
  const sum = await fs.readFile(path.join(dir, 'release-output/SHA256SUMS.txt'), 'utf8');
  assert.ok(sum.includes(createHash('sha256').update(bytes).digest('hex')));
  assert.match(result.stdout, /Nothing was committed, tagged, uploaded, or published/);
});

for (const [failedStage, order] of [['build', ['build']], ['verify', ['build', 'verify']], ['check', ['build', 'verify', 'check']]]) {
  test(`Release cannot bypass a failing ${failedStage} stage after removal of declaration gate`, async t => {
    const dir = await fixture(t, {failedStage});
    await put(dir, 'release-output/frontend-toolkit-1.0.0-dist.zip', 'previous archive');
    const result = run(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`Intentional ${failedStage} failure`));
    assert.match(result.stderr, /RELEASE STOPPED/);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, 'build/order.json'))), order);
    assert.equal(await fs.readFile(path.join(dir, 'release-output/frontend-toolkit-1.0.0-dist.zip'), 'utf8'), 'previous archive');
    await assert.rejects(fs.access(path.join(dir, 'release-output/SHA256SUMS.txt')), {code: 'ENOENT'});
  });
}

test('The release script still rejects prerelease versions for the stable packaging workflow', async t => {
  const dir = await fixture(t, {version: '1.0.0-beta'});
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stable-release workflow expects/);
  await assert.rejects(fs.access(path.join(dir, 'release-output')), {code: 'ENOENT'});
});

test('prepare release reaches the real release pipeline without mutating package, lockfile or metadata', async t => {
  const dir = await fixture(t);
  const originals = new Map();
  for (const name of ['package.json', 'package-lock.json', 'release-metadata.json']) originals.set(name, await fs.readFile(path.join(dir, name)));
  const result = run(dir, 'prepare.mjs', 'release');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Release archives are in release-output\/ for 1\.0\.0/);
  assert.match(result.stdout, /Continue with Step 9/);
  assert.doesNotMatch(result.stdout, /pending:|blocked by permission|Permission records:/);
  for (const [name, data] of originals) assert.deepEqual(await fs.readFile(path.join(dir, name)), data);
  const state = JSON.parse(await fs.readFile(path.join(dir, 'build/preparation/state.json')));
  assert.ok(state.verified.inputs && state.verified.dist && state.verified.site);
  await assert.rejects(fs.access(path.join(dir, 'build/preparation/run.lock')), {code: 'ENOENT'});
});
