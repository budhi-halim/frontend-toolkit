import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {crc32,zip} from '../scripts/archive.mjs';
import {bundle} from '../scripts/bundle.mjs';
import {materialPixels} from '../src/core/material-texture.js';
import {getDefaults} from '../src/core/schema.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFile(path.join(root,name),'utf8');
test('Every public page uses the shared chrome, theme, design and favicon',async()=>{
 const pages=['index.html','lab.html',...(await fs.readdir(path.join(root,'docs'))).filter(n=>n.endsWith('.html')).map(n=>'docs/'+n),...(await fs.readdir(path.join(root,'examples'))).filter(n=>n.endsWith('.html')).map(n=>'examples/'+n)];
 for(const page of pages){const html=await read(page);for(const part of ['class="tk-header wrap"','class="tk-footer wrap"','site/design.css','site/theme.js','site/favicon.svg'])assert.ok(html.includes(part),`${page}: missing ${part}`);assert.equal((html.match(/id="theme-button"/g)||[]).length,1);}
});
test('One UI theme owner and explicit full/reduced lab controls',async()=>{
 assert.doesNotMatch(await read('site/ui.js'),/theme-button.*addEventListener/);
 assert.doesNotMatch(await read('demo/ui.js'),/theme-button.*addEventListener/);
 const lab=await read('lab.html');assert.match(lab,/id="lab-motion-full"/);assert.match(lab,/id="lab-motion-reduced"/);
 assert.match(await read('site/theme.js'),/sessionStorage/);
});
test('All generated distribution entries match the hash manifest',async()=>{
 const manifest=JSON.parse(await read('dist/manifest.json'));assert.ok(['development','production'].includes(manifest.mode));
 for(const [name,expected] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,'dist',name))).digest('hex'),expected,name);
});
test('Standalone material worker graph executes with no serialized function bindings',async()=>{
 const self={postMessage(result){this.result=result;}};
 const worker=await bundle(root,'src/workers/material.js');
 vm.runInNewContext(worker,{self});
 const job={width:96,height:64,cssWidth:400,cssHeight:240,rgb:[.6,.45,.3],options:getDefaults('surface','wood/pine')};
 self.onmessage({data:job});const digest=data=>createHash('sha256').update(new Uint8Array(data)).digest('hex');
 assert.equal(digest(self.result.data),digest(materialPixels(job).data));
 assert.doesNotMatch(await read('src/core/material-worker.js'),/\.toString\(/);
});
test('ZIP output is deterministic, valid deflate, UTF-8 and has correct CRC',()=>{
 const entries=[{name:'demo/readme.txt',data:'Example text'},{name:'licenses/notice.txt',data:'MIT'}];
 const a=zip(entries),b=zip(entries.reverse());assert.ok(a.equals(b));
 const size=a.readUInt32LE(18),len=a.readUInt16LE(26),data=inflateRawSync(a.subarray(30+len,30+len+size));
 assert.equal(data.toString(),'Example text');assert.equal(a.readUInt32LE(14),crc32(data));assert.equal(a.readUInt16LE(6),0x800);assert.equal(a.readUInt32LE(a.length-22),0x06054b50);
});
test('ZIP writer rejects unsafe and duplicate paths',()=>{
 for(const name of ['../outside','/absolute','C:/absolute','file/../name','file//name'])assert.throws(()=>zip([{name,data:''}]));
 assert.throws(()=>zip([{name:'a',data:''},{name:'a',data:'duplicate'}]));
});
test('Release automation cannot mistake the readable preview for production',async()=>{
 assert.match(await read('scripts/verify.mjs'),/manifest.mode!=='production'/);
 assert.match(await read('scripts/check.mjs'),/manifest.mode!=='production'/);
 assert.match(await read('scripts/release.mjs'),/\['scripts\/verify\.mjs'\]/);
 assert.match(await read('scripts/release.mjs'),/\['scripts\/check\.mjs','--release'\]/);
 assert.match(await read('.github/workflows/pages.yml'),/ref: \$\{\{ github.event.release.tag_name \}\}/);
 assert.match(await read('.github/workflows/pages.yml'),/npm run check:release/);
});
test('Generated-file check covers additions and deletions, not just modified files',async()=>{
 assert.match(await read('scripts/git-generated.mjs'),/--untracked-files=all/);
 assert.match(await read('scripts/build.mjs'),/actual.*expected/);
});
