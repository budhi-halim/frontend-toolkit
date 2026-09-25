import fs from 'node:fs/promises';
import path from 'node:path';

/** Inspect the path itself; directory-entry hints can misidentify cloud placeholders. */
export async function fileKind(filename, io = fs) {
  let info;
  try {
    info = await io.lstat(filename);
  } catch (cause) {
    const error = new Error(`Cannot inspect ${filename}: ${cause.code || cause.message}`, {cause});
    error.code = cause.code;
    throw error;
  }
  // lstat, unlike stat, does not follow an actual symbolic link or junction.
  if (info.isSymbolicLink()) throw new Error(`Symlink/junction is not supported: ${filename}`);
  if (info.isFile()) return 'file';
  if (info.isDirectory()) return 'directory';
  throw new Error(`Unsupported filesystem entry: ${filename} (lstat mode ${info.mode?.toString(8) ?? 'unknown'}). No file was skipped.`);
}

/** Read names, then inspect each retained entry with lstat instead of Dirent flags. */
export async function readEntries(directory, {skip = () => false, io = fs} = {}) {
  if (await fileKind(directory, io) !== 'directory') throw new Error(`Not a directory: ${directory}`);
  const names = (await io.readdir(directory)).sort();
  const entries = [];
  for (const name of names) {
    if (skip(name)) continue;
    const filename = path.join(directory, name);
    entries.push({name, filename, kind: await fileKind(filename, io)});
  }
  return entries;
}

/** Return a stable list; never follow links or silently omit unsupported files. */
export async function walkFiles(directory, {skip = () => false, io = fs} = {}) {
  const files = [];
  async function visit(current, relative) {
    const entries = await readEntries(current, {
      io,
      skip: name => skip(path.posix.join(relative, name), name)
    });
    for (const entry of entries) {
      const name = path.posix.join(relative, entry.name);
      if (entry.kind === 'directory') await visit(entry.filename, name);
      else files.push(entry.filename);
    }
  }
  await visit(directory, '');
  return files;
}
