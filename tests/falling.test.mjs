import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {getDefaults,normalizeOptions,SCHEMAS,PRESETS} from '../src/core/schema.js';
import {FALL_SHAPES} from '../src/core/fall-schema.js';
import {createFallSystem} from '../src/core/fall-system.js';
import {skeletonShapes,ringGeometry} from '../src/core/status-geometry.js';
import {resolveMotion} from '../src/core/motion.js';
import {EFFECT_NAMES} from '../src/core/catalog.js';

const options=(preset='snow',patch={})=>normalizeOptions('fall',patch,getDefaults('fall',preset));
const simulation=(o=options())=>{const system=createFallSystem(o);system.resize(800,400);system.step(0);return system;};
const clone=system=>structuredClone(system.particles);

test('Falling presets have valid material-specific shapes',()=>{
 assert.ok(EFFECT_NAMES.includes('fall'));
 for(const name in PRESETS.fall){const o=options(name);assert.ok(FALL_SHAPES[o.kind].includes(o.shape),name);}
 for(const kind of SCHEMAS.fall.kind.values)assert.ok(Object.values(PRESETS.fall).some(p=>(p.kind||'snow')===kind));
});
test('Changing material clears an incompatible particle shape',()=>{
 const o=normalizeOptions('fall',{kind:'leaves'},options('snowflakes'));assert.equal(o.shape,'mixed');
 assert.equal(normalizeOptions('fall',{shape:'maple'},o).shape,'maple');
});
test('Falling option budgets clamp finite values and preserve zero',()=>{
 const o=options('snow',{maxParticles:19.8,fallSpeed:0,density:0,size:NaN,gust:Infinity});
 assert.equal(o.maxParticles,20);assert.equal(o.fallSpeed,0);assert.equal(o.density,0);assert.equal(o.size,11);assert.ok(Number.isFinite(o.gust));
});
test('Seeded particles and trajectories are reproducible',()=>{
 const a=simulation(),b=simulation();a.step(4);b.step(4);assert.deepEqual(clone(a),clone(b));
 const c=simulation(options('snow',{seed:53}));assert.notDeepEqual(clone(a),clone(c));
});
test('Falling motion integrates equivalently at different frame rates',()=>{
 for(const preset of ['snow','autumn-leaves','cherry-petals','dandelion-seeds']){
  const a=simulation(options(preset)),b=simulation(options(preset));
  for(let i=1;i<=300;i++)a.step(i/60);for(let i=1;i<=50;i++)b.step(i/10);
  for(let i=0;i<a.particles.length;i++)for(const key of ['x','y','rotation'])assert.ok(Math.abs(a.particles[i][key]-b.particles[i][key])<1e-8,`${preset}/${key}`);
 }
});
test('Wind-only and still trajectories honor explicit zero fall speed',()=>{
 const a=simulation(options('snow',{fallSpeed:0,gust:0,sway:0,tumble:0,wind:20,depth:0}));const before=clone(a);a.step(1);
 a.particles.forEach((p,i)=>{assert.equal(p.y,before[i].y);assert.ok(Math.abs(p.x-before[i].x-20)<1e-10);assert.equal(p.rotation,before[i].rotation);});
});
test('Particle drift continues between samples without paused-time catch-up',()=>{
 const a=simulation();a.step(1);const before=clone(a);a.step(1);assert.deepEqual(clone(a),before);a.step(1.1);assert.notDeepEqual(clone(a),before);
});
test('Hard particle budgets and adaptive quality bound large viewports',()=>{
 const a=simulation(options('snow',{density:120,maxParticles:230}));a.resize(20000,10000);assert.equal(a.particles.length,230);
 a.resize(800,400);a.setQuality(.25);assert.equal(a.particles.length,96);
 a.setOptions(options('snow',{maxParticles:0}));assert.equal(a.particles.length,0);
});
test('Particle positions remain finite and outside recycling is bounded',()=>{
 const a=simulation(options('snow-flurry',{wind:-300,fallSpeed:500,sway:120,gust:200}));a.step(100000);
 assert.ok(a.getState().recycled>0);for(const p of a.particles){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>-200&&p.x<1000);assert.ok(p.y>-200&&p.y<600);}
});
test('Resizing preserves normalized placement and render-time changes do not reseed',()=>{
 const a=simulation(),p=a.particles[0],x=p.x,y=p.y;a.resize(1600,800);assert.equal(p.x,x*2);assert.equal(p.y,y*2);
 a.setOptions(options('snow',{wind:100,color:'#ff0000'}));assert.equal(a.particles[0],p);
});
test('Material changes and rewind reset deterministically, destroy clears arrays',()=>{
 const a=simulation();a.step(1);a.step(0);assert.deepEqual(clone(a),clone(simulation()));
 a.setOptions(options('autumn-leaves'));assert.ok(a.particles.every(p=>FALL_SHAPES.leaves.includes(p.shape)));
 a.destroy();assert.equal(a.particles.length,0);
});
test('Falling particles default to hiding decoration under reduced motion',()=>{
 for(const preset in PRESETS.fall){const o=options(preset);assert.equal(resolveMotion('fall',o,true),'hide');assert.equal(resolveMotion('fall',{...o,motion:'always'},true),'full');assert.equal(resolveMotion('fall',{...o,reducedMotion:'still'},true),'still');}
});
test('Profile bars share a column and uniform visible gaps',()=>{
 const o=getDefaults('status','avatar-placeholder'),shapes=skeletonShapes(700,320,o),[avatar,...bars]=shapes;
 assert.equal(bars.length,3);for(const b of bars)assert.ok(b.x>=avatar.x+avatar.w+o.avatarGap-1e-9);
 for(let i=1;i<bars.length;i++){assert.equal(bars[i].x,bars[0].x);assert.ok(Math.abs(bars[i].y-bars[i-1].y-bars[i-1].h-o.gap)<1e-9);}
 const top=Math.min(...shapes.map(s=>s.y)),bottom=Math.max(...shapes.map(s=>s.y+s.h));assert.equal((top+bottom)/2,160);
});
test('Profile sizing works with one to eight lines and narrow text columns',()=>{
 for(const width of [80,320,800])for(let lines=1;lines<=8;lines++){
  const shapes=skeletonShapes(width,350,{...getDefaults('status','avatar-placeholder'),lines});assert.equal(shapes.length,lines+1);
  for(const s of shapes)assert.ok(Object.values(s).every(Number.isFinite)&&s.w>0&&s.h>0);
 }
});
test('Progress and loading rings default to complete circular tracks',()=>{
 assert.equal(SCHEMAS.status.sweep.default,360);for(const preset of ['progress-ring','loading-ring'])assert.equal(getDefaults('status',preset).sweep,360);
 assert.equal(getDefaults('status','progress-ring').value,.72);assert.ok(getDefaults('status','loading-ring').indeterminate);
});
test('Ring sizing accounts for line thickness without cropping its circumference',()=>{
 for(const size of [10,100,400])for(const anchorX of [.05,.5,.95]){
  const o={...getDefaults('status','progress-ring'),size,anchorX},g=ringGeometry(180,90,o);
  assert.ok(g.radius>=0);assert.ok(g.radius+g.thickness/2<=Math.min(180*anchorX,180*(1-anchorX),45)+1e-9);
 }
});
test('Package and exported entry versions agree',async()=>{
 const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));assert.match(pkg.version,/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
 for(const p of ['../src/index.js','../src/selective.js'])assert.ok((await fs.readFile(new URL(p,import.meta.url),'utf8')).includes(`version='${pkg.version}'`));
});
