import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {bundle} from './bundle.mjs';
import {syncVersion} from './version.mjs';
import {collectNotices, legalComment} from './notices.mjs';
import {walkFiles as walk, fileKind} from './file-tree.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const normalize = value => value.replaceAll('\\', '/');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function distribution({development=false}={}) {
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const license=await fs.readFile(path.join(root,'LICENSE'),'utf8');
  const notices=await fs.readFile(path.join(root,'NOTICE.txt'),'utf8');
  const retained=await collectNotices(path.join(root,'licenses'));
  const upstream=retained.map(entry=>`Retained third-party notice (${entry.name}):\n${entry.text}`).join('\n');
  const banner=legalComment(`Frontend Toolkit ${pkg.version}\n${license}\n${upstream}\n${notices}`);
  const shortBanner=`/*! Frontend Toolkit ${pkg.version}. Copyright (c) 2026 Frontend Toolkit contributors.\nMIT for project code. Retained upstream material is not relicensed.\nKeep the distribution LICENSE, NOTICE.txt and licenses/ files with these modules. */`;
  let esbuild;
  if (!development) {
    try { esbuild=await import('esbuild'); }
    catch { throw new Error('Build tools are not installed. Run npm install once, then npm run build. No global packages are required.'); }
  }
  const target=['chrome105','firefox128','safari17.5'];
  const common={absWorkingDir:root,platform:'browser',target,charset:'utf8',minify:true,legalComments:'inline',write:false,logLevel:'warning'};
  let workerCode;
  if (development) workerCode=banner+'\n'+await bundle(root,'src/workers/material.js')+';';
  else {
    const result=await esbuild.build({...common,entryPoints:['src/workers/material.js'],bundle:true,format:'iife',banner:{js:banner}});
    workerCode=result.outputFiles[0].text;
  }
  const workerFactory=`const program=${JSON.stringify(workerCode)};\nexport function createMaterialWorker(){const url=URL.createObjectURL(new Blob([program],{type:'text/javascript'}));try{return{worker:new Worker(url),dispose(){URL.revokeObjectURL(url);}};}catch(error){URL.revokeObjectURL(url);throw error;}}`;
  const override={'src/core/material-worker-program.js':workerFactory};
  const result=new Map();
  const writeBuild=resultSet=>{for(const file of resultSet.outputFiles)result.set(normalize(path.relative(path.join(root,'dist'),file.path)),file.contents);};
  if (development) {
    result.set('frontend-toolkit.js',banner+'\nglobalThis.FrontendToolkit='+await bundle(root,'src/auto.js',override)+';\n');
    const source=await import(path.join(root,'src/index.js'));
    const names=Object.keys(source).sort();
    result.set('frontend-toolkit.esm.js',banner+'\nconst api='+await bundle(root,'src/index.js',override)+';\n'+names.map(n=>`export const ${n}=api.${n};`).join('\n')+'\n');
  } else {
    const plugins=[{name:'isolated-material-worker',setup(build){build.onLoad({filter:/material-worker-program\.js$/},()=>({contents:workerFactory,loader:'js',resolveDir:path.join(root,'src/core')}));}}];
    writeBuild(await esbuild.build({...common,entryPoints:['src/auto.js'],outfile:'dist/frontend-toolkit.js',bundle:true,format:'iife',globalName:'FrontendToolkit',sourcemap:'linked',sourcesContent:true,banner:{js:banner},plugins}));
    writeBuild(await esbuild.build({...common,entryPoints:['src/index.js'],outfile:'dist/frontend-toolkit.esm.js',bundle:true,format:'esm',sourcemap:'linked',sourcesContent:true,banner:{js:banner},plugins}));
  }
  for (const file of await walk(path.join(root,'src'))) {
    if(!file.endsWith('.js'))continue;
    const relative=normalize(path.relative(path.join(root,'src'),file));
    if(relative.startsWith('workers/'))continue;
    const source=override['src/'+relative]??await fs.readFile(file,'utf8');
    if(development)result.set('modules/'+relative,shortBanner+'\n'+source);
    else {
      const mapSource=normalize(path.relative(path.dirname(path.join(root,'dist/modules',relative)),file));
      const output=await esbuild.transform(source,{loader:'js',format:'esm',target,charset:'utf8',minify:true,legalComments:'inline',sourcemap:'external',sourcesContent:true,sourcefile:mapSource,banner:shortBanner});
      result.set('modules/'+relative,output.code+`//# sourceMappingURL=${path.basename(relative)}.map\n`);
      result.set('modules/'+relative+'.map',output.map);
    }
  }
  result.set('frontend-toolkit.loader.js',shortBanner+'\nexport * from "./modules/selective.js";\n');
  result.set('LICENSE',license);result.set('NOTICE.txt',notices);for(const entry of retained)result.set('licenses/'+entry.name,entry.data);
  const hashes={};for(const [name,data] of [...result].sort(([a],[b])=>a<b?-1:1))hashes[name]=hash(data);
  result.set('manifest.json',JSON.stringify({version:pkg.version,mode:development?'development':'production',minifier:development?null:`esbuild ${esbuild.version}`,files:hashes},null,2)+'\n');
  return result;
}
async function compare(files) {
  const actual=(await walk(path.join(root,'dist'))).map(f=>normalize(path.relative(path.join(root,'dist'),f))).sort();
  const expected=[...files.keys()].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('dist/ has missing or extra files. Run npm run build and commit the complete output.');
  for(const [name,data] of files){const file=await fs.readFile(path.join(root,'dist',name));if(!file.equals(Buffer.from(data)))throw new Error(`dist/${name} is stale. Run npm run build.`);}
}
async function writeDistribution(files) {
  // Generate all bytes first; failed compilation leaves the previous distribution intact.
  await fs.rm(path.join(root,'dist'),{recursive:true,force:true});
  for(const [name,data] of files){const file=path.join(root,'dist',name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);}
}
export async function website({development=false}={}) {
  let esbuild,minifyHTML;
  if(!development){esbuild=await import('esbuild');({minify:minifyHTML}=await import('html-minifier-terser'));}
  const output=path.join(root,'build/site');
  await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output,{recursive:true});
  const roots=['index.html','lab.html','README.md','LICENSE','NOTICE.txt','CHANGELOG.md','.nojekyll','site','demo','docs','examples','assets','dist'];
  const source=[];
  for(const entry of roots){const p=path.join(root,entry),kind=await fileKind(p);source.push(...kind==='directory'?await walk(p):[p]);}
  for(const file of source){
    const rel=normalize(path.relative(root,file));let data=await fs.readFile(file);
    // dist/ is already a built distribution. Never minify its strings/shaders again.
    if(!development&&!rel.startsWith('dist/')){
      if(file.endsWith('.html'))data=Buffer.from(await minifyHTML(data.toString(),{collapseWhitespace:true,conservativeCollapse:true,removeComments:true,ignoreCustomComments:[/^!/,/@license|@preserve/],removeEmptyAttributes:false,removeOptionalTags:false,minifyCSS:false,minifyJS:false,caseSensitive:true,keepClosingSlash:true}));
      else if(/\.(?:js|css)$/.test(file)){
        const loader=file.endsWith('.css')?'css':'js';
        const transformed=await esbuild.transform(data.toString(),{loader,target:loader==='css'?['chrome105','firefox128','safari17.5']:'es2022',charset:'utf8',minify:true,legalComments:'inline',banner:`/*! Frontend Toolkit website. Copyright (c) 2026 Frontend Toolkit contributors. MIT; see LICENSE and NOTICE.txt. */`});
        data=Buffer.from(transformed.code);
      }
    }
    const to=path.join(output,rel);await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,data);
  }
  return output;
}
export async function runBuild({development=false,check=false}={}) {
  if(check){const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/manifest.json'),'utf8'));await compare(await distribution({development:manifest.mode==='development'}));console.log(`Distribution matches source (${manifest.mode}).`);return;}
  await syncVersion();
  const docs=spawnSync(process.execPath,['scripts/docs.mjs'],{cwd:root,stdio:'inherit'});if(docs.status!==0)throw new Error('Documentation generation failed.');
  const files=await distribution({development});
  await writeDistribution(files);
  const output=await website({development});
  console.log(`${development?'Readable local preview':'Minified production'} build complete.\nLibrary: dist/\nWebsite: ${normalize(path.relative(root,output))}/`);
  if(development)console.log('This preview build is NOT a release build. Run npm install, then npm run build before release verification.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{await runBuild({development:process.argv.includes('--development'),check:process.argv.includes('--check')});}
  catch(error){console.error('BUILD ERROR:',error.message);process.exitCode=1;}
}
