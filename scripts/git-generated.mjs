import {spawnSync} from 'node:child_process';
const paths=['dist','docs','index.html','lab.html','examples','src/index.js','src/selective.js','README.md','package.json','package-lock.json'];
const result=spawnSync('git',['status','--porcelain=v1','--untracked-files=all','--',...paths],{encoding:'utf8'});
if(result.error||result.status!==0){console.error('Unable to inspect Git state:',result.error?.message||result.stderr);process.exitCode=1;}
else if(result.stdout.trim()){console.error('Generated output differs from the committed release. Run npm run build and commit the full output, including additions/deletions:\n'+result.stdout);process.exitCode=1;}
else console.log('Committed distribution and generated documentation are current.');
