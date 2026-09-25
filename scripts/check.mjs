import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {walkFiles} from './file-tree.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[],warnings=[];
const exists=async file=>{try{return(await fs.stat(path.join(root,file))).isFile();}catch{return false;}};
const required=['LICENSE','NOTICE.txt','licenses/webgl-noise-MIT.txt','README.md','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','.gitignore','.nojekyll','.github/workflows/ci.yml','release-metadata.json','index.html','lab.html','site/logic.js','site/ui.js','site/style.css','src/index.js','src/selective.js','dist/frontend-toolkit.js','dist/frontend-toolkit.esm.js','dist/frontend-toolkit.loader.js','dist/manifest.json','site/design.css','site/theme.js','site/favicon.svg','docs/guide.html','docs/api.html','docs/reference.html','docs/OPTIONS.md','docs/options.json','docs/TESTING.md','docs/VALIDATION.md','docs/NOTICES.md','docs/notices.html','docs/assets/demo.webp','examples/index.html','scripts/docs.mjs','scripts/version.mjs','scripts/test-all.mjs','tests/site_test.py','tests/integration_pages_test.py','scripts/test-node.mjs'];
for(const file of required)if(!await exists(file))failures.push(`Missing required file: ${file}`);
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
if(pkg.license!=='MIT')failures.push('package.json license must agree with LICENSE.');
for(const file of ['src/index.js','src/selective.js']){
 const text=await fs.readFile(path.join(root,file),'utf8');
 if(text.match(/export const version\s*=\s*['"]([^'"]+)/)?.[1]!==pkg.version)failures.push(`${file}: version differs from package.json`);
}
if(await exists('docs/options.json'))if(JSON.parse(await fs.readFile(path.join(root,'docs/options.json'),'utf8')).version!==pkg.version)failures.push('Generated documentation is stale. Run npm run docs.');
for(const name of [pkg.main,pkg.module,pkg.jsdelivr,pkg.unpkg,...Object.values(pkg.exports).filter(v=>!v.includes('*'))])if(!await exists(name))failures.push(`Invalid package entry: ${name}`);
const excluded=new Set(['.git','node_modules','__pycache__','validation','build','release-output']);
let files=[];
try {
 files=(await walkFiles(root,{skip:(_,name)=>excluded.has(name)})).map(name=>path.relative(root,name).replaceAll('\\','/'));
} catch(error) {
 failures.push(error.message);
}
const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/manifest.json'),'utf8'));
if(manifest.version!==pkg.version)failures.push('Distribution version is stale. Run npm run build.');
if(manifest.mode!=='production')warnings.push('Distribution is a readable preview. Run npm install and npm run build before publication.');
let lock;try{lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));}catch{}
if(!lock)warnings.push('Build lockfile is missing. Run npm install, then commit package-lock.json.');
else {
 if(lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version)failures.push('Lockfile version differs from package.json. Run npm install.');
 for(const [name,version] of Object.entries(pkg.devDependencies||{}))if(lock.packages?.['']?.devDependencies?.[name]!==version)failures.push(`Lockfile dependency is stale: ${name}. Run npm install.`);
}

function localTarget(owner,href){
 if(!href||/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(href))return null;
 let part;try{part=decodeURIComponent(href.split(/[?#]/)[0]);}catch{return null;}
 if(!part||part.includes('${'))return null;
 return path.posix.normalize(path.posix.join(path.posix.dirname(owner),part));
}
for(const file of files){
 if(!/\.(?:html|md|css|js|mjs)$/.test(file)||file.startsWith('tests/')||file.startsWith('scripts/'))continue;
 const content=await fs.readFile(path.join(root,file),'utf8');
 let refs=[];
 if(file.endsWith('.html'))refs=[...content.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m=>m[1]);
 else if(file.endsWith('.md'))refs=[...content.replace(/```[\s\S]*?```/g,'').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(m=>m[1]);
 else if(file.endsWith('.css'))refs=[...content.matchAll(/url\(['"]?([^'"\s)]+)['"]?\)/g)].map(m=>m[1]);
 else if(file.startsWith('src/')||file.startsWith('examples/')||file.startsWith('dist/'))refs=[...content.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"\n]+)['"]/g)].map(m=>m[1]);
 for(const href of refs){const target=localTarget(file,href);if(target&&(target.startsWith('../')||!await exists(target)))failures.push(`${file}: broken local link/import ${href}`);}
}
for(const file of files.filter(name=>/\.(?:js|mjs)$/.test(name))){
 const checked=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
 if(checked.status!==0)failures.push(`JavaScript syntax error in ${file}: ${checked.stderr||checked.error?.message}`);
}
const build=spawnSync(process.execPath,['scripts/build.mjs','--check'],{cwd:root,encoding:'utf8'});
if(build.status!==0)failures.push('Bundle verification failed: '+(build.stderr||build.error?.message||build.stdout));
const metadata=JSON.parse(await fs.readFile(path.join(root,'release-metadata.json'),'utf8'));
if(!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(metadata.repository||''))warnings.push('Repository identity is not configured; hosted/CDN links remain templates.');
for(const warning of warnings)console.warn('REVIEW:',warning);
if(process.argv.includes('--release'))failures.push(...warnings);
for(const failure of failures)console.error('ERROR:',failure);
console.log(`${files.length} repository files inspected; ${failures.length} structural/release errors; ${warnings.length} review items.`);
if(failures.length)process.exitCode=1;
else console.log('Local repository checks passed. Browser/device testing and license compliance remain maintainer responsibilities.');
