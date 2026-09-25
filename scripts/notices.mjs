import fs from 'node:fs/promises';
import path from 'node:path';
import {readEntries} from './file-tree.mjs';

/** Read public license and attribution files in deterministic order. */
export async function collectNotices(directory, relative = '') {
  const records = [];
  const entries = await readEntries(path.join(directory, relative));
  for (const entry of entries) {
    const name = path.posix.join(relative, entry.name);
    if (entry.kind === 'directory') records.push(...await collectNotices(directory, name));
    else if (entry.kind === 'file') {
      if (!/\.(txt|md)$/i.test(name) && !/^(LICENSE|COPYING|NOTICE)$/i.test(entry.name)) {
        throw new Error(`Use a plain-text .txt/.md file for a public license notice: ${name}`);
      }
      const data = await fs.readFile(path.join(directory, name));
      const text = new TextDecoder('utf-8', {fatal: true}).decode(data);
      if (!text.trim()) throw new Error(`License notice is empty: ${name}`);
      records.push({name, data, text});
    } else throw new Error(`Unsupported license entry: ${name}`);
  }
  return records;
}

/** Keep notice content from closing a JavaScript comment early. */
export function legalComment(text) {
  return `/*! ${String(text).replace(/\*\//g, '* /')}\n*/`;
}
