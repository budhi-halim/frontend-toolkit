import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {SCHEMAS,COMMON_SCHEMA} from '../src/core/schema.js';
const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');
const pkg=JSON.parse(await read('package.json'));

test('Release license, notices and generated bundle headers agree',async()=>{
 assert.equal(pkg.license,'MIT');
 assert.match(await read('LICENSE'),/Permission is hereby granted, free of charge/);
 for(const name of ['dist/frontend-toolkit.js','dist/frontend-toolkit.esm.js']){
  const content=await read(name),header=content.slice(0,content.indexOf('*/')+2);assert.match(header,/Ashima Arts/);assert.match(header,/Stefan Gustavson/);assert.match(header,/MIT License/);
 }
 assert.match(await read('NOTICE.txt'),/not relicensed/);
});
test('Stable source exports and package entries match the repository version',async()=>{
 const context={console};vm.createContext(context);vm.runInContext(await read('dist/frontend-toolkit.js'),context);
 assert.equal(context.FrontendToolkit.version,pkg.version);assert.equal(pkg.main,'./dist/frontend-toolkit.esm.js');
 const source=await import('../src/index.js');assert.equal(source.version,pkg.version);
});
test('Generated option data covers every runtime schema',async()=>{
 const doc=JSON.parse(await read('docs/options.json'));assert.equal(doc.version,pkg.version);
 assert.deepEqual(doc.effects,SCHEMAS);assert.deepEqual(doc.common,COMMON_SCHEMA);
});
test('Public demo has distinct motion controls and a separate advanced lab',async()=>{
 const page=await read('index.html');assert.match(page,/id="motion-full" aria-pressed="true"/);assert.match(page,/id="motion-reduced"/);assert.match(page,/href="lab.html"/);
 assert.ok(!page.includes('id="event-log"'));assert.match(await read('lab.html'),/id="event-log"/);
});
test('The demo catalog has 76 unique examples with usable simplified controls',async()=>{
 const context={console};vm.createContext(context);vm.runInContext(await read('dist/frontend-toolkit.js'),context);vm.runInContext(await read('site/logic.js'),context);
 const {catalog,controls,defaults,presets}=context.ToolkitSiteModel;
 assert.equal(catalog.length,76);assert.equal(new Set(catalog.map(item=>item.id)).size,76);
 for(const item of catalog){
  assert.ok(presets(item).includes(item.preset),`${item.id}: own preset missing`);
  for(const preset of presets(item)){
   const options=defaults(item,preset),keys=controls(item,options);
   assert.ok(keys.length<=3);
   for(const key of keys){const spec=SCHEMAS[item.effect][key]||COMMON_SCHEMA[key];assert.ok(spec,`${item.id}/${preset}: missing ${key}`);assert.ok(!spec.kinds||spec.kinds.includes(options.kind),`${item.id}/${preset}: inapplicable ${key}`);}
  }
 }
});
test('Copied public snippets do not force full motion or paused state',async()=>{
 const context={console};vm.createContext(context);vm.runInContext(await read('dist/frontend-toolkit.js'),context);vm.runInContext(await read('site/logic.js'),context);
 const m=context.ToolkitSiteModel,item=m.byId.get('fire');const options={...m.defaults(item),motion:'always',paused:true,flameSpeed:2};
 const code=m.snippets(item,item.preset,options);assert.match(code.html,/flame-speed="2"/);assert.doesNotMatch(code.html,/motion="always"|paused=/);
});
