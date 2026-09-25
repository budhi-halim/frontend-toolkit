import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
  const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/manifest.json'),'utf8'));
  if(manifest.mode!=='production')throw new Error('The supplied readable preview is not a production build. Run npm install, then npm run build, then npm run verify.');
  const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  if(lock.packages?.['']?.version!==pkg.version)throw new Error('Lockfile version differs from package.json. Run npm install to synchronize it.');
  for(const script of ['scripts/check.mjs','scripts/test-node.mjs']){
    const run=spawnSync(process.execPath,[script],{cwd:root,stdio:'inherit'});
    if(run.error||run.status!==0)throw new Error(`${script} failed.`);
  }
  console.log('Production structure, generated files, and Node tests passed. Run browser tests or inspect npm run preview before publishing. Strict release readiness: npm run check:release.');
} catch(error){console.error('VERIFY ERROR:',error.message);process.exitCode=1;}
