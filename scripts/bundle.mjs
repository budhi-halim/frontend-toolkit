import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

// Readable preview build only. Production uses esbuild.
export async function bundle(root,entry,overrides={}){
  const modules=new Map();
  async function collect(id){
    if(modules.has(id))return;
    modules.set(id,'');
    let code=overrides[id]??await fs.readFile(path.join(root,id),'utf8');
    const dependencies=[];const exported=[];
    const resolve=relative=>{if(!relative.startsWith('.'))throw new Error(`External import not supported: ${relative}`);const target=path.posix.normalize(path.posix.join(path.posix.dirname(id),relative));dependencies.push(target);return JSON.stringify(target);};
    code=code.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_,names,target)=>`const {${names.replace(/\bas\b/g,':')}}=__require(${resolve(target)});`);
    code=code.replace(/^export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_,names,target)=>`Object.assign(exports,(({${names}})=>({${names}}))(__require(${resolve(target)})));`);
    code=code.replace(/^export\s+\*\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_,target)=>`Object.assign(exports,__require(${resolve(target)}));`);
    code=code.replace(/^export\s+(const|let|class|function)\s+([A-Za-z_$][\w$]*)/gm,(_,kind,name)=>{exported.push(name);return `${kind} ${name}`;});
    if(/^import\s|^export\s/m.test(code))throw new Error(`Unsupported module syntax in ${id}`);
    if(exported.length)code+=`\nObject.assign(exports,{${exported.join(',')}});\n`;
    new vm.Script(`(module,exports,__require)=>{\n${code}\n}`,{filename:id});
    modules.set(id,code);
    for(const dependency of dependencies)await collect(dependency);
  }
  await collect(entry);
  const factories=[...modules].map(([id,code])=>`${JSON.stringify(id)}:(module,exports,__require)=>{\n${code}\n}`).join(',\n');
  return `(()=>{'use strict';\nconst modules={${factories}};\nconst cache={};\nfunction __require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](module,module.exports,__require);return module.exports;}\nreturn __require(${JSON.stringify(entry)});\n})()`;
}
