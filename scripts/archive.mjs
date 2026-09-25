import fs from 'node:fs/promises';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {walkFiles} from './file-tree.mjs';
const table=Uint32Array.from({length:256},(_,value)=>{for(let i=0;i<8;i++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
export function crc32(data){let crc=0xffffffff;for(const byte of data)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zip(entries){
  const local=[],central=[];let offset=0;
  if(entries.length>65535)throw new Error('Archive exceeds the supported ZIP entry count.');
  const seen=new Set();
  for(const item of [...entries].sort((a,b)=>a.name<b.name?-1:1)){
    const name=item.name.replaceAll('\\','/');
    if(!name||name.startsWith('/')||name.includes('\0')||name.split('/').some(p=>p==='..'||p==='.'||!p)||/^[A-Za-z]:/.test(name)||seen.has(name))throw new Error(`Invalid or duplicate ZIP path: ${name}`);
    seen.add(name);const filename=Buffer.from(name),data=Buffer.from(item.data),compressed=deflateRawSync(data,{level:9});
    if(filename.length>65535||data.length>0xffffffff||offset+compressed.length>0xffffffff)throw new Error('Archive requires unsupported ZIP64.');
    const crc=crc32(data);const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
    local.push(header,filename,compressed);
    const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);
    central.push(directory,filename);offset+=header.length+filename.length+compressed.length;
  }
  const end=Buffer.alloc(22),cd=Buffer.concat(central);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,cd,end]);
}
const excluded=new Set(['.git','node_modules','build','release-output','__pycache__','validation','.DS_Store']);
export async function collectFiles(root,relative=''){
  const result=[];
  const skip=(_,name)=>excluded.has(name)||name.startsWith('.env')||name.endsWith('.log')||name.endsWith('.zip')||name.endsWith('.pyc');
  for(const filename of await walkFiles(path.join(root,relative),{skip})){
    const name=path.relative(root,filename).replaceAll('\\','/');
    result.push({name,data:await fs.readFile(filename)});
  }
  return result;
}
