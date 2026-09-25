import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Loopback by default. Explicit HOST is useful on a trusted LAN or private network.
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const built=process.argv.includes('--built');
const base=built?'/frontend-toolkit/':'/';
let root;try{root=await fs.realpath(path.join(project,built?'build/site':'.'));}catch{console.error('Built website is missing. Run npm run build first.');process.exit(1);}
const port=Number(process.env.PORT??4173), host=process.env.HOST||'127.0.0.1';
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be an integer between 0 and 65535.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  const finish=(status,text,extra={})=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...extra});res.end(req.method==='HEAD'?undefined:text);};
  try{
    if(!['GET','HEAD'].includes(req.method)){finish(405,'Method not allowed',{'Allow':'GET, HEAD'});return;}
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(built){if(pathname==='/'||pathname==='/frontend-toolkit'){finish(302,'Redirecting',{Location:base});return;}if(!pathname.startsWith(base)){finish(404,'Not found');return;}pathname='/'+pathname.slice(base.length);}
    if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(part=>part.startsWith('.'))){finish(404,'Not found');return;}
    let filename=path.resolve(root,`.${pathname}`);
    if(filename!==root&&!filename.startsWith(root+path.sep)){finish(403,'Forbidden');return;}
    if((await fs.stat(filename)).isDirectory())filename=path.join(filename,'index.html');
    filename=await fs.realpath(filename);
    if(!filename.startsWith(root+path.sep)){finish(403,'Forbidden');return;}
    if(!(await fs.stat(filename)).isFile()){finish(404,'Not found');return;}
    const data=await fs.readFile(filename);
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||(path.basename(filename)==='LICENSE'?'text/plain; charset=utf-8':'application/octet-stream'),'Cache-Control':'no-store','Content-Length':data.length,'X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch(error){finish(error instanceof URIError?400:404,error instanceof URIError?'Invalid path':'Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is in use. Set PORT to another port.`:error.message);process.exitCode=1;});
server.listen(port,host,()=>{
  const address=['127.0.0.1','localhost','::1'].includes(host)?'localhost':host.includes(':')?`[${host}]`:host;
  console.log(`Frontend Toolkit: http://${address}:${server.address().port}${base}\nServing: ${built?'generated website (same project subpath as Pages)':'editable project'}   Full inspector: ${base}lab.html\nPress Ctrl+C to stop.`);
  if(!['127.0.0.1','localhost','::1'].includes(host))console.log('Non-loopback binding: this server has no authentication. Use only on a trusted network.');
});
