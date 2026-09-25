import test from 'node:test';
import {canonicalPreset} from '../src/core/schema.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {COMMON_SCHEMA,SCHEMAS,PRESETS,getDefaults,normalizeOptions} from '../src/core/schema.js';
import {materialPixels} from '../src/core/material-texture.js';
import {createWoodField} from '../src/core/wood-texture.js';
import {FrameBudgetGovernor} from '../src/core/adaptive.js';
import {environmentReport,getDiagnostics,recordDiagnostic,setDiagnostics} from '../src/core/diagnostics.js';

const hash=data=>createHash('sha256').update(new Uint8Array(data)).digest('hex');
const render=patch=>materialPixels({width:180,height:100,cssWidth:450,cssHeight:250,rgb:[.63,.48,.31],options:{...getDefaults('surface'),roughness:4,contrast:.8,...patch}});

test('Portable motion defaults to animated at a bounded frame cap; reduced motion remains respected',()=>{
  assert.equal(COMMON_SCHEMA.motion.default,'respect');assert.equal(COMMON_SCHEMA.fallbackAnimation.default,'animated');assert.equal(COMMON_SCHEMA.fallbackFPS.default,24);
  assert.equal(normalizeOptions('water',{fallbackFPS:12.7}).fallbackFPS,13);
  assert.equal(normalizeOptions('water',{fallbackAnimation:'static'}).fallbackAnimation,'static');
});
test('Every anatomical wood preset resolves a known species, cut and finish',()=>{
  for(const p of Object.values(PRESETS.surface).filter(p=>p.material==='wood'))for(const key of ['woodSpecies','woodCut','woodFinish'])assert.ok(SCHEMAS.surface[key].values.includes(p[key]),`${key}: ${p[key]}`);
});
test('All twelve wood anatomy models differ with identical palette, seed and lighting',()=>{
  const hashes=SCHEMAS.surface.woodSpecies.values.map(woodSpecies=>hash(render({woodSpecies}).data));assert.equal(new Set(hashes).size,12);
});
test('Wood geometry is deterministic and all three cuts change the texture',()=>{
  const hashes=SCHEMAS.surface.woodCut.values.map(woodCut=>hash(render({woodCut}).data));assert.equal(new Set(hashes).size,3);assert.equal(hashes[0],hash(render({woodCut:'plain-sawn'}).data));
});
test('Softwoods and bamboo do not acquire hardwood vessels from the pore slider',()=>{
  for(const woodSpecies of ['pine','cedar','bamboo'])assert.equal(hash(render({woodSpecies,pores:0}).data),hash(render({woodSpecies,pores:2}).data),woodSpecies);
});
test('Hardwood vessel strength changes oak and walnut texture structure',()=>{
  for(const woodSpecies of ['oak','walnut'])assert.notEqual(hash(render({woodSpecies,pores:0}).data),hash(render({woodSpecies,pores:2}).data),woodSpecies);
});
test('Finish affects relief and weathering without changing anatomical identity',()=>{
  assert.equal(getDefaults('surface','wood/smooth-oak').woodSpecies,'oak');
  assert.equal(getDefaults('surface','wood/driftwood').woodFinish,'weathered');
  const hashes=SCHEMAS.surface.woodFinish.values.map(woodFinish=>hash(render({woodFinish,weathering:.8}).data));assert.equal(new Set(hashes).size,4);
});
test('Six paper constructions differ without relying on color changes',()=>{
  const hashes=SCHEMAS.surface.paperKind.values.map(paperKind=>hash(render({material:'paper',paperKind}).data));assert.equal(new Set(hashes).size,6);
});
test('Four marble vein models differ with a fixed material color',()=>{
  const hashes=SCHEMAS.surface.marbleKind.values.map(marbleKind=>hash(render({material:'marble',marbleKind}).data));assert.equal(new Set(hashes).size,4);
});
test('Worker serialization runs exactly the same wood kernel as direct imports',()=>{
  const job={width:96,height:64,cssWidth:400,cssHeight:240,rgb:[.6,.45,.3],options:getDefaults('surface','wood/pine')};
  const context=vm.createContext({job});vm.runInContext(`const createWoodField=${createWoodField.toString()}; const kernel=${materialPixels.toString()}; result=kernel(job);`,context);
  assert.equal(hash(context.result.data),hash(materialPixels(job).data));
});
test('Old saved presets acquire their own anatomical defaults, not the generic oak default',async()=>{
  const context=vm.createContext({FrontendToolkit:{getDefaults,normalizeOptions,PRESETS,canonicalPreset}});vm.runInContext(await readFile(new URL('../demo/logic.js',import.meta.url),'utf8'),context);
  const c=context.ToolkitLab.validate({version:2,id:'wood',preset:'wood/walnut',config:{color:'#765432'},scene:{}});
  assert.equal(c.config.woodSpecies,'walnut');assert.equal(c.config.color,'#765432');assert.equal(c.config.woodCut,'plain-sawn');
});
test('The shared scheduler cannot create duplicate RAF loops when a callback reschedules',async()=>{
  let next=0;const pending=new Map(),listeners=new Map();
  const context=vm.createContext({FrameBudgetGovernor,console,requestAnimationFrame:callback=>{const id=++next;pending.set(id,callback);return id;},cancelAnimationFrame:id=>pending.delete(id),document:{hidden:false,addEventListener:(type,callback)=>listeners.set(type,callback),removeEventListener:type=>listeners.delete(type)}});
  const source=(await readFile(new URL('../src/core/scheduler.js',import.meta.url),'utf8')).replace(/^import .*;\n/m,'').replaceAll('export function ','function ');
  vm.runInContext(source+'\nglobalThis.api={schedule,schedulerStats};',context);let stop,changed=false;
  const callback=()=>{if(!changed){changed=true;stop();stop=context.api.schedule(callback);}};stop=context.api.schedule(callback);
  for(let i=0;i<15;i++){assert.equal(pending.size,1);const [id,pump]=pending.entries().next().value;pending.delete(id);pump(i*16.67+1);}
  stop();assert.equal(pending.size,0);assert.equal(listeners.size,0);
});
test('Diagnostics are local, bounded and usable without a browser',()=>{
  setDiagnostics({console:false});for(let i=0;i<180;i++)recordDiagnostic('info','test','Test event',{sample:i});
  const diagnostics=getDiagnostics();assert.equal(diagnostics.events.length,160);assert.equal(diagnostics.events.at(-1).sample,179);assert.equal(environmentReport().webgpuUsed,false);
});
