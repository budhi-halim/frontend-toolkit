import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const python=process.env.PYTHON||'python';
const cases=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>'tests/'+name);
const commands=[[process.execPath,['--test',...cases]],...['browser_test.py','compatibility_test.py','preview4_test.py','preview5_test.py','preview6_test.py','site_test.py','integration_pages_test.py','falling_test.py'].map(file=>[python,['tests/'+file]])];
for(const [command,args] of commands) {
  console.log('\n>',command,...args);
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:process.env});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status||1);
}
console.log('\nNode and native-browser regression suites passed. GPU contract and EGL suites are separate.');
