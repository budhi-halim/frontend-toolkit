import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCHEMAS,COMMON_SCHEMA,PRESETS,getDefaults,normalizeOptions,canonicalPreset} from '../src/core/schema.js';
import {lightningGeometry} from '../src/core/lightning-geometry.js';
import {resolveMotion,presentationOptions} from '../src/core/motion.js';
import {allowsPointer} from '../src/core/interaction.js';
const newFamilies=['highlight','backdrop','pattern','status'];
const geometry=(patch={})=>lightningGeometry({start:{x:300,y:8},end:{x:340,y:294},width:600,height:300,seed:7,...patch});

test('Independent fire flow and flicker controls accept zero and source offsets reach either edge',()=>{
  const o=normalizeOptions('fire',{flameSpeed:0,flickerSpeed:0,sourceOffset:0,spread:.02});
  assert.equal(o.flameSpeed,0);assert.equal(o.flickerSpeed,0);assert.equal(o.sourceOffset,0);assert.equal(o.spread,.02);
  const p=normalizeOptions('fire',{flameSpeed:999,flickerSpeed:999,sourceOffset:-1});assert.equal(p.flameSpeed,8);assert.equal(p.flickerSpeed,5);assert.equal(p.sourceOffset,0);
});
test('Flamethrower has faster flow without accelerating the global playback clock',()=>{
  const jet=getDefaults('fire','flamethrower'),fire=getDefaults('fire','hearth');assert.ok(jet.flameSpeed>fire.flameSpeed);assert.equal(jet.speed,fire.speed);assert.ok(getDefaults('fire','fast-jet').flameSpeed>jet.flameSpeed);
});
test('Every glow palette is a first-class preset with compatible hidden legacy aliases',()=>{
  for(const name of SCHEMAS.glow.palette.values.filter(n=>n!=='custom')){assert.ok(Object.keys(PRESETS.glow).includes(name));assert.equal(canonicalPreset('glow','original/'+name),name);assert.deepEqual(getDefaults('glow',name),getDefaults('glow','original/'+name));}
  assert.ok(!Object.keys(PRESETS.glow).some(n=>n.startsWith('original/')));
});
test('Water and hearth legacy keys resolve without duplicate entries',()=>{
  assert.deepEqual(getDefaults('water','current'),getDefaults('water','original-water'));assert.deepEqual(getDefaults('fire','hearth'),getDefaults('fire','classic-hearth'));
  assert.equal(canonicalPreset('water','original-water'),'current');assert.ok(!Object.keys(PRESETS.fire).includes('classic-hearth'));assert.ok(!Object.keys(PRESETS.water).includes('original-water'));
});
test('New practical families expose 37 distinct named preset configurations',()=>{
  assert.equal(newFamilies.reduce((n,f)=>n+Object.keys(PRESETS[f]).length,0),37);
  for(const family of newFamilies)for(const name of Object.keys(PRESETS[family]))for(const [key,spec] of Object.entries({...COMMON_SCHEMA,...SCHEMAS[family]})){
    const o=normalizeOptions(family,getDefaults(family,name));if(spec.kind==='number')assert.ok(Number.isFinite(o[key])&&o[key]>=spec.min&&o[key]<=spec.max,`${family}/${name}/${key}`);
  }
});
test('Integer counts and geometry work caps apply to public configuration',()=>{
  assert.equal(normalizeOptions('highlight',{maxPulses:5.6}).maxPulses,6);assert.equal(normalizeOptions('status',{lines:4.5}).lines,5);
  assert.equal(normalizeOptions('backdrop',{kind:'contours',count:80}).count,10);assert.equal(normalizeOptions('backdrop',{kind:'waves',count:80}).count,12);
});
test('Patterns are still by default and permit signed CSS-pixel drift',()=>{
  for(const name of Object.keys(PRESETS.pattern)){const o=getDefaults('pattern',name);assert.equal(o.driftX,0);assert.equal(o.driftY,0);}
  const o=normalizeOptions('pattern',{driftX:-80,driftY:80,spacing:6});assert.equal(o.driftX,-80);assert.equal(o.driftY,80);
});
test('Progress retains real zero and completion values instead of fabricating a loading value',()=>{
  for(const kind of ['ring','bar','segments'])for(const value of [0,.002,.5,1]){const o=normalizeOptions('status',{kind,value,indeterminate:false});assert.equal(o.value,value);assert.equal(presentationOptions('status',o,'still').value,value);}
});
test('Reduced motion suppresses transient highlight pulses but retains readable status geometry',()=>{
  for(const preset of ['ripple','sheen','sparkle'])assert.equal(resolveMotion('highlight',getDefaults('highlight',preset),true),'hide');
  for(const family of ['pattern','backdrop','status'])assert.equal(resolveMotion(family,getDefaults(family),true),'still');
  const calm=presentationOptions('status',getDefaults('status'),'still');assert.equal(calm.shimmer,false);assert.equal(calm.amplitude,0);
});
test('Highlight activation choices do not accidentally attach a manual or automatic-only pointer brush',()=>{
  const o=getDefaults('highlight');assert.equal(allowsPointer('highlight',{...o,activation:'manual'}),false);assert.equal(allowsPointer('highlight',{...o,activation:'auto',motionSource:'auto'}),false);
  assert.equal(allowsPointer('highlight',{...o,activation:'click'}),true);assert.equal(allowsPointer('highlight',{...o,activation:'focus'}),true);
});
test('Lightning is reproducible but seeds change both large bends and branching geometry',()=>{
  assert.deepEqual(geometry(),geometry());assert.notDeepEqual(geometry(),geometry({seed:8}));const first=geometry()[0].path,last=first.at(-1);assert.deepEqual(first[0],{x:300,y:8});assert.deepEqual(last,{x:340,y:294});
});
test('Primary lightning forks start at distinct points, not a plus-shaped pair at one junction',()=>{
  for(let seed=1;seed<=80;seed++){const p=geometry({seed,branches:12}),roots=p.filter(x=>x.depth===1).map(x=>x.path[0]);assert.equal(roots.length,12);assert.equal(new Set(roots).size,12);for(const a of roots)assert.ok(p[0].path.includes(a));}
});
test('Lightning fork targets normally travel forward rather than perpendicular star spokes',()=>{
  for(let seed=1;seed<=40;seed++){for(const bolt of geometry({seed,branches:8,branchSpread:32}).filter(x=>x.depth===1)){const a=bolt.path[0],b=bolt.path.at(-1),dx=b.x-a.x,dy=b.y-a.y;assert.ok((40*dx+286*dy)/(Math.hypot(40,286)*Math.hypot(dx,dy))>.25);}}
});
test('Lightning remains within a bounded vertex and channel budget for all exposed geometry extremes',()=>{
  for(let seed=0;seed<80;seed++)for(const branches of [0,5,12]){const all=geometry({seed,branches,branchSpread:65,branchLength:.8,tortuosity:1,roughness:1.4});assert.ok(all.length<=22);assert.ok(all.reduce((n,p)=>n+p.path.length,0)<=1400);for(const bolt of all)for(const p of bolt.path)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('Lightning spread, branching length, tortuosity and taper have independent effects',()=>{
  const base=geometry();for(const patch of [{branchSpread:12},{branchLength:.7},{tortuosity:0},{taper:.2}])assert.notDeepEqual(geometry(patch),base);
});
test('Lightning supports arbitrary oriented endpoints and degenerate input has no NaNs',()=>{
  for(const [start,end] of [[{x:20,y:70},{x:580,y:220}],[{x:10,y:10},{x:10,y:10}]]){const g=geometry({start,end});assert.deepEqual(g[0].path[0],start);assert.deepEqual(g[0].path.at(-1),end);}
  assert.throws(()=>geometry({start:{x:NaN,y:0}}),TypeError);
});
test('Useful-family modules are independent selective imports, not an extra all-in-one runtime',async()=>{
  const source=await readFile(new URL('../src/selective.js',import.meta.url),'utf8');for(const family of newFamilies)assert.ok(source.includes(`./effects/${family}.js`));
});
test('Public entry points export the new factories and compatible preset normalization',async()=>{
  const source=await import('../src/index.js'),bundle=await import('../dist/frontend-toolkit.esm.js');for(const family of newFamilies){const name=`create${family[0].toUpperCase()+family.slice(1)}Renderer`;assert.equal(typeof source[name],'function');assert.equal(typeof bundle[name],'function');}assert.equal(typeof bundle.canonicalPreset,'function');
});
test('Core map, water, aurora, sea and material sources are unchanged from Preview 5',async()=>{
  const expected=JSON.parse(await readFile(new URL('./fixtures/preview6-preserved.json',import.meta.url),'utf8'));
  for(const [name,digest]of Object.entries(expected)){const bytes=await readFile(new URL('../'+name,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,name);}
});
