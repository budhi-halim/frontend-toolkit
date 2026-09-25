import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectNotices, legalComment} from '../scripts/notices.mjs';

async function withDirectory(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ft-notices-'));
  try { await run(directory); }
  finally { await fs.rm(directory, {recursive: true, force: true}); }
}

test('Additional public license files are collected with their exact bytes', async () => {
  await withDirectory(async directory => {
    await fs.mkdir(path.join(directory, 'asset'));
    const text = Buffer.from('An example notice.\r\nAuthor: Example\r\n');
    await fs.writeFile(path.join(directory, 'asset', 'map.txt'), text);
    await fs.writeFile(path.join(directory, 'LICENSE'), 'An example license.\n');
    const result = await collectNotices(directory);
    assert.deepEqual(result.map(entry => entry.name), ['LICENSE', 'asset/map.txt']);
    assert.ok(result[1].data.equals(text));
  });
});

test('License collection rejects empty text and unsupported binary attachments', async () => {
  await withDirectory(async directory => {
    await fs.writeFile(path.join(directory, 'empty.txt'), '  \n');
    await assert.rejects(collectNotices(directory), /empty/);
    await fs.rm(path.join(directory, 'empty.txt'));
    await fs.writeFile(path.join(directory, 'private-email.pdf'), 'not a public notice');
    await assert.rejects(collectNotices(directory), /plain-text/);
  });
});

test('Legal banners cannot inject executable code through a comment terminator', () => {
  const banner = legalComment('Example notice */ globalThis.unwanted = true; /*');
  assert.equal((banner.match(/\*\//g) || []).length, 1);
  assert.ok(banner.endsWith('*/'));
});

test('Distribution script includes the entire public notice collection', async () => {
  const source = await fs.readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  assert.match(source, /collectNotices\(path\.join\(root,'licenses'\)\)/);
  assert.match(source, /for\(const entry of retained\)result\.set\('licenses\/\'\+entry\.name,entry\.data\)/);
});
