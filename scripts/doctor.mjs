import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const major=Number(process.versions.node.split('.')[0]);
console.log(`Frontend Toolkit ${pkg.version}\nProject: ${root}\nNode: ${process.version}`);
console.log(major>=22?'Node requirement: OK (Node 24 LTS recommended).':'Node requirement: UPDATE REQUIRED. Install Node 24 LTS, restart VS Code, and try again.');
for(const name of Object.keys(pkg.devDependencies)){
  try { await import(name);console.log(`${name}: installed`); }
  catch { console.log(`${name}: not installed. Run npm install from this directory.`); }
}
try {await fs.access(path.join(root,'package-lock.json'));console.log('Lockfile: present; commit it with package.json.');}
catch {console.log('Lockfile: not created yet. The first npm install creates it. Subsequent clean installs use npm ci.');}
try {const m=JSON.parse(await fs.readFile(path.join(root,'dist/manifest.json'),'utf8'));console.log(`Distribution: ${m.mode} (${m.version}).`);}
catch {console.log('Distribution: missing. Run npm run build after installing tools.');}
console.log('This command only checks the local environment. It does not install, publish, or change system settings.');
if(major<22)process.exitCode=1;
