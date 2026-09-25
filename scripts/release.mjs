import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {zip,collectFiles} from './archive.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{
  for(const args of [['scripts/build.mjs'],['scripts/verify.mjs'],['scripts/check.mjs','--release']]){
    const run=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
    if(run.error||run.status!==0)throw new Error(`${args.join(' ')} failed; no release archive was written.`);
  }
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  if(!/^\d+\.\d+\.\d+$/.test(pkg.version))throw new Error('This stable-release workflow expects a version such as 1.0.0.');
  const out=path.join(root,'release-output');await fs.mkdir(out,{recursive:true});
  const all=await collectFiles(root);
  const outputs=[
    {name:`frontend-toolkit-${pkg.version}-repository.zip`,data:zip(all.map(e=>({...e,name:`frontend-toolkit-${pkg.version}/${e.name}`})))},
    {name:`frontend-toolkit-${pkg.version}-dist.zip`,data:zip((await collectFiles(path.join(root,'dist'))).map(e=>({...e,name:`frontend-toolkit-${pkg.version}/${e.name}`})))}
  ];
  for(const entry of outputs)await fs.writeFile(path.join(out,entry.name),entry.data);
  await fs.writeFile(path.join(out,'SHA256SUMS.txt'),outputs.map(e=>`${createHash('sha256').update(e.data).digest('hex')}  ${e.name}`).join('\n')+'\n');
  console.log(`Release archives prepared in release-output/ for ${pkg.version}.\nNothing was committed, tagged, uploaded, or published. Inspect the built site and the CI result before publishing.`);
}catch(error){console.error('RELEASE STOPPED:',error.message);process.exitCode=1;}
