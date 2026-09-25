import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('Local server: page, script, missing paths, HEAD and method guards',async()=>{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/serve.mjs',import.meta.url))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Server startup timed out')),5000);
      child.stdout.on('data',data=>{const match=String(data).match(/http:\/\/localhost:\d+/);if(match){clearTimeout(timer);resolve(match[0].replace('localhost','127.0.0.1'));}});
      child.on('error',reject);child.stderr.on('data',data=>reject(new Error(String(data))));
    });
    const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Frontend Toolkit/);
    assert.match(await (await fetch(base+'/lab.html')).text(),/ADVANCED CONTROLS/);
    assert.equal((await fetch(base+'/.git/config')).status,404);
    const js=await fetch(base+'/dist/frontend-toolkit.js');assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/javascript/);
    const missing=await fetch(base+'/not-present.html');assert.equal(missing.status,404);
    const dir=await fetch(base+'/src/');assert.equal(dir.status,404);
    const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    const post=await fetch(base+'/',{method:'POST'});assert.equal(post.status,405);
    assert.equal((await fetch(base+'/')).status,200,'Server survives failed requests');
  }finally{child.kill();}
});

test('Built-site server: project subpath, root redirect and source isolation',async()=>{
  const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os');
  const project=await fs.mkdtemp(path.join(os.tmpdir(),'ft-built-server-'));
  await fs.mkdir(path.join(project,'scripts'),{recursive:true});
  await fs.mkdir(path.join(project,'build/site/dist'),{recursive:true});
  await fs.mkdir(path.join(project,'src'),{recursive:true});
  await fs.copyFile(new URL('../scripts/serve.mjs',import.meta.url),path.join(project,'scripts/serve.mjs'));
  await fs.writeFile(path.join(project,'build/site/index.html'),'<h1>Built site</h1>');
  await fs.writeFile(path.join(project,'build/site/dist/library.js'),'console.log("fixture");');
  await fs.writeFile(path.join(project,'src/private-source.js'),'source outside generated website');
  const child=spawn(process.execPath,[path.join(project,'scripts/serve.mjs'),'--built'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Built server startup timed out')),5000);
      child.stdout.on('data',data=>{const match=String(data).match(/http:\/\/localhost:\d+/);if(match){clearTimeout(timer);resolve(match[0].replace('localhost','127.0.0.1'));}});
      child.on('error',error=>{clearTimeout(timer);reject(error);});
    });
    const redirect=await fetch(base+'/',{redirect:'manual'});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/frontend-toolkit/');
    const bare=await fetch(base+'/frontend-toolkit',{redirect:'manual'});assert.equal(bare.status,302);
    assert.match(await(await fetch(base+'/frontend-toolkit/')).text(),/Built site/);
    const js=await fetch(base+'/frontend-toolkit/dist/library.js');assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/javascript/);
    for(const url of ['/src/private-source.js','/frontend-toolkit/src/private-source.js','/frontend-toolkit/scripts/serve.mjs','/dist/library.js'])assert.equal((await fetch(base+url)).status,404,url);
  }finally{
    const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;
    await fs.rm(project,{recursive:true,force:true});
  }
});
