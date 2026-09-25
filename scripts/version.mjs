import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// Keep the release number in one place: package.json. No Git tag or upload is created.
export async function syncVersion() {
  const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version))throw new Error('Use a semantic version in package.json.');
  for(const name of ['src/index.js','src/selective.js']) {
    const file=path.join(root,name),original=await fs.readFile(file,'utf8');
    const updated=original.replace(/(export const version\s*=\s*)['"][^'"]+['"]/,`$1'${version}'`);
    if(updated===original&&!original.includes(`version='${version}'`)&&!original.includes(`version = '${version}'`))throw new Error(`Version marker missing in ${name}`);
    if(updated!==original)await fs.writeFile(file,updated);
  }
  for(const name of ['index.html','lab.html']) {
    const file=path.join(root,name),original=await fs.readFile(file,'utf8');
    const updated=original.replace(/(<[^>]*data-version[^>]*>)[^<]*/g,`$1${version}`).replace(/Frontend Toolkit \d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?/g,`Frontend Toolkit ${version}`);
    if(updated!==original)await fs.writeFile(file,updated);
  }
  const apiFile=path.join(root,'docs/API.md');
  const api=await fs.readFile(apiFile,'utf8');
  await fs.writeFile(apiFile,api.replace(/This reference describes version [^.]+\.[^.]+\.[^. ]+\./,`This reference describes version ${version}.`));
  const readmeFile=path.join(root,'README.md'),readme=await fs.readFile(readmeFile,'utf8');
  const metadata=JSON.parse(await fs.readFile(path.join(root,'release-metadata.json'),'utf8'));
  await fs.writeFile(readmeFile,readme.replace(/(https:\/\/cdn\.jsdelivr\.net\/gh\/[^@\s]+@)[^/\s]+(?=\/dist\/frontend-toolkit)/g,`$1${metadata.tagPrefix||'v'}${version}`));
  try {
    const lockFile=path.join(root,'package-lock.json'),lock=JSON.parse(await fs.readFile(lockFile,'utf8'));
    lock.version=version;if(lock.packages?.[''])lock.packages[''].version=version;
    await fs.writeFile(lockFile,JSON.stringify(lock,null,2)+'\n');
  } catch(error) {if(error.code!=='ENOENT')throw error;}
  return version;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const next=process.argv[2];
    if(next){if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(next))throw new Error('Use a semantic version such as 1.0.1.');const file=path.join(root,'package.json'),pkg=JSON.parse(await fs.readFile(file,'utf8'));pkg.version=next;await fs.writeFile(file,JSON.stringify(pkg,null,2)+'\n');}
    console.log('Version synchronized:',await syncVersion());
  }
  catch(error){console.error(error.message);process.exitCode=1;}
}
