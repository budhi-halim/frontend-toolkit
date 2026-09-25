import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cases=fs.readdirSync(path.join(root,'tests')).filter(file=>file.endsWith('.test.mjs')).sort().map(file=>'tests/'+file);
const result=spawnSync(process.execPath,['--test',...cases],{cwd:root,stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exitCode=result.status??1;
