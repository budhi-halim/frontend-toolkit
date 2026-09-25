import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getDefaults,normalizeOptions,SCHEMAS,PRESETS} from '../src/core/schema.js';
import {resolveMotion,presentationOptions} from '../src/core/motion.js';
import {roundedPerimeter,ellipticalPerimeter} from '../src/core/geometry.js';

const config=(family,patch={})=>normalizeOptions(family,patch);
test('Auto reduced motion adapts each material without silently forcing animation',()=>{
 const expected={glass:'still',surface:'still',water:'calm',fire:'hide',smoke:'still',clouds:'still',aurora:'still',glow:'still',fluid:'hide',trail:'hide',field:'calm',sea:'calm',art:'still',sketch:'still'};
 for(const [family,presentation] of Object.entries(expected)){
  assert.equal(resolveMotion(family,config(family),true),presentation);
  assert.equal(resolveMotion(family,config(family),false),'full');
  assert.equal(resolveMotion(family,config(family,{motion:'always'}),true),'full');
 }
 assert.equal(resolveMotion('field',config('field',{kind:'rain'}),true),'hide');
 assert.equal(resolveMotion('sketch',config('sketch',{kind:'lightning'}),true),'hide');
});
test('Never cannot be overridden by a subtle reduced-motion style',()=>{
 assert.equal(resolveMotion('fire',config('fire',{motion:'never',reducedMotion:'subtle'}),false),'hide');
 assert.equal(resolveMotion('fire',config('fire',{reducedMotion:'subtle'}),true),'subtle');
 assert.equal(resolveMotion('fire',config('fire',{reducedMotion:'still'}),true),'still');
});
test('Calm water removes decorative optics but does not mutate developer configuration',()=>{
 const original=config('water'),calm=presentationOptions('water',original,'calm');
 for(const k of ['distortion','caustic','contentDistortion','flowSpeed','morphSpeed'])assert.equal(calm[k],0);
 assert.ok(original.distortion>0);assert.notEqual(calm,original);
 assert.equal(presentationOptions('water',original,'full'),original);
 const subtle=presentationOptions('water',original,'subtle');assert.equal(subtle.contentDistortion,0);assert.ok(subtle.distortion<original.distortion);
});
test('Fire source, clipping and gravity are independent options',()=>{
 for(const direction of SCHEMAS.fire.direction.values)for(const outPolicy of ['strict','border']){
  const o=config('fire',{mode:'out',direction,sourceEdge:'all',outPolicy,respectGravity:'false'});
  assert.equal(o.direction,direction);assert.equal(o.sourceEdge,'all');assert.equal(o.outPolicy,outPolicy);assert.equal(o.respectGravity,false);
 }
});
test('Glowing border exposes all three bloom placements',()=>{
 assert.deepEqual(SCHEMAS.glow.bloomPlacement.values,['outside','inside','both']);
 for(const placement of SCHEMAS.glow.bloomPlacement.values)assert.equal(config('glow',{bloomPlacement:placement}).bloomPlacement,placement);
});
test('Duration preserves lap time; pixels preserve physical contour speed under resize',()=>{
 const a=roundedPerimeter(400,200,20),b=roundedPerimeter(800,400,40),duration=6,velocity=140;
 assert.ok(Math.abs(b.length/a.length-2)<1e-9);
 assert.ok(Math.abs((b.length/duration)/(a.length/duration)-2)<1e-9);
 assert.ok(Math.abs((b.length/velocity)/(a.length/velocity)-2)<1e-9);
 for(const contour of [a,b,ellipticalPerimeter(800,200)]){
  for(const fraction of [.01,.22,.37,.68,.94]){
   const p=contour.pointAt(contour.length*fraction),q=contour.pointAt(contour.length*fraction+.01);
   assert.ok(Math.abs(Math.hypot(p.x-q.x,p.y-q.y)-.01)<.00025);
  }
 }
});
test('Trail defaults are pointer-only; explicit triggers supersede the legacy alias',()=>{
 assert.equal(config('trail').trigger,'move');assert.equal(config('trail').autoEmit,false);
 const old=config('trail',{autoEmit:true});assert.equal(normalizeOptions('trail',{trigger:'click'},old).autoEmit,false);
 assert.equal(normalizeOptions('trail',{trigger:'manual',autoEmit:true},old).autoEmit,true);
});
test('Trail palettes and shape variants are bounded and backward compatible',()=>{
 assert.equal(config('trail').colorMode,'palette');assert.equal(config('trail').variantMode,'random');
 const old=config('trail',{rainbow:true});assert.equal(normalizeOptions('trail',{colorMode:'single'},old).rainbow,false);
 assert.equal(config('trail',{variant:1000}).variant,3);assert.equal(config('trail',{burstCount:10000}).burstCount,160);
 assert.equal(config('trail',{variant:-50}).variant,0);
 assert.equal(getDefaults('trail','garden').kind,'mixed');
});
test('Hearth is the classic hearth compatibility alias, not a second visual algorithm',()=>{
 assert.deepEqual(getDefaults('fire','hearth'),getDefaults('fire','classic-hearth'));
 assert.notEqual(getDefaults('fire','hearth').model,getDefaults('fire','ribbon-flame').model);
});
test('New sea, shader-art and kinetic vector presets are reachable',()=>{
 for(const family of ['sea','art','sketch'])for(const preset of Object.keys(PRESETS[family])){
  const o=getDefaults(family,preset);assert.equal(normalizeOptions(family,o).motion,'respect');
 }
 assert.equal(SCHEMAS.sketch.strikeInterval.min,1.5);
});
test('Reference glass optics, water and aurora shaders have not been edited',async()=>{
 const expected=JSON.parse(await readFile(new URL('./fixtures/protected-sha256.json',import.meta.url),'utf8'));
 for(const [path,sha]of Object.entries(expected)){
  const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,path);
 }
});
