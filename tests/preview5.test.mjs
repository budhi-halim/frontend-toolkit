import test from 'node:test';
import assert from 'node:assert/strict';
import {createPathSampler} from '../src/core/path-sampler.js';
import {createRainSystem} from '../src/core/rain-system.js';
import {seaSurface} from '../src/core/sea-model.js';
import {createMetaballMotion} from '../src/core/metaball-motion.js';
import {lightningGeometry} from '../src/core/lightning-geometry.js';
import {allowsPointer} from '../src/core/interaction.js';
import {getDefaults,normalizeOptions} from '../src/core/schema.js';
import {resolveMotion,presentationOptions} from '../src/core/motion.js';
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
const options=(family,patch={})=>normalizeOptions(family,patch,getDefaults(family));
const sample=(points,config={})=>{const out=[],s=createPathSampler(config);for(const p of points)s.push(p,x=>out.push(x));return out;};
const coords=points=>points.map(p=>[p.x,p.y]);
test('Distance throttle emits equal CSS spacing, independently of pointer event rate',()=>{
 const a=sample([{x:0,y:0,time:0},{x:240,y:0,time:1000}]);
 const b=sample(Array.from({length:241},(_,i)=>({x:i,y:0,time:i*1000/240})));
 assert.deepEqual(coords(a),coords(b));assert.equal(a.length,20);assert.deepEqual(coords(a),Array.from({length:20},(_,i)=>[(i+1)*12,0]));
});
test('Distance remainder follows bends instead of cutting corner-to-corner',()=>{
 const out=sample([{x:0,y:0,time:0},{x:8,y:0,time:10},{x:8,y:16,time:20},{x:12,y:16,time:30}],{distance:10});
 assert.deepEqual(coords(out),[[8,2],[8,12]]);
});
test('A parked pointer cannot emit distance-throttled particles',()=>{
 assert.equal(sample([{x:0,y:0,time:0},{x:0,y:0,time:1e9}]).length,0);
});
test('Time throttle interpolates samples at the configured interval',()=>{
 const a=sample([{x:0,y:0,time:0},{x:100,y:50,time:100}],{mode:'time',interval:20});
 assert.deepEqual(coords(a),[[20,10],[40,20],[60,30],[80,40],[100,50]]);
 const b=sample(Array.from({length:11},(_,i)=>({x:i*10,y:i*5,time:i*10})),{mode:'time',interval:20});assert.deepEqual(coords(a),coords(b));
});
test('Time mode supports stationary hover, but limits extreme catch-up bursts',()=>{
 const out=sample([{x:20,y:20,time:0},{x:20,y:20,time:100000}],{mode:'time',interval:10,limit:20});assert.equal(out.length,20);assert.ok(out[0].time>99000);
});
test('Exit/reset, malformed coordinates and clock rewind never bridge strokes',()=>{
 const s=createPathSampler(),out=[],emit=x=>out.push(x);s.push({x:0,y:0,time:0},emit);s.reset();s.push({x:1000,y:0,time:10},emit);assert.equal(out.length,0);
 s.push({x:NaN,y:0,time:11},emit);s.push({x:0,y:0,time:12},emit);assert.equal(out.length,0);
 s.push({x:0,y:0,time:0},emit);s.push({x:12,y:0,time:1},emit);assert.equal(out.length,1);
});
test('Sampler work stays bounded and partial configuration retains interval',()=>{
 const s=createPathSampler({distance:5,interval:40,limit:24});s.push({x:0,y:0,time:0},()=>{});let n=0;s.push({x:1000000,y:0,time:100},()=>n++);assert.equal(n,24);assert.ok(s.getState().dropped>1000);
 s.configure({mode:'time'});assert.equal(s.getState().interval,40);assert.equal(s.getState().distance,5);
});
test('Default trail throttle is distance; interval aliases and bounds are normalized',()=>{
 const o=options('trail');assert.equal(o.throttle,'distance');assert.equal(o.trigger,'move');assert.ok(o.distanceInterval>0);
 near(normalizeOptions('trail',{emission:100},o).timeInterval,10);
 near(normalizeOptions('trail',{timeInterval:50},o).emission,20);
 assert.equal(options('trail',{distanceInterval:0}).distanceInterval,1);assert.equal(options('trail',{timeInterval:0}).timeInterval,4);
});
test('Rain integrates velocity in CSS pixels per second without random per-frame directions',()=>{
 const o=options('field',{kind:'rain',rainSpeed:600,rainWind:45,rainGust:0,rainDepth:.5}),r=createRainSystem(o);r.resize(600,400);r.step(0);
 const p=r.drops.find(p=>p.y>0&&p.y<250&&p.x>50&&p.x<500),x=p.x,y=p.y;r.step(.05);near(p.x-x,p.vx*.05);near(p.y-y,p.vy*.05);assert.ok(p.vy>0);
 const oldX=p.x,oldY=p.y;r.setOptions({...o,rainSpeed:1200});near(p.x,oldX);near(p.y,oldY);r.step(.10);near(p.y-oldY,1200*p.speed*.05);
});
test('Rain frame integration is stable at different frame rates in constant wind',()=>{
 const o=options('field',{kind:'rain',rainSpeed:100,rainWind:12,rainGust:0}),a=createRainSystem(o),b=createRainSystem(o);for(const r of[a,b]){r.resize(900,900);r.step(0);}
 for(let i=1;i<=60;i++)a.step(i/60);for(let i=1;i<=30;i++)b.step(i/30);
 const i=a.drops.findIndex((p,i)=>p.y>200&&p.y<600&&b.drops[i].y>200);near(a.drops[i].x,b.drops[i].x);near(a.drops[i].y,b.drops[i].y);
});
test('Rain keeps CSS speed and gust trajectories even at one frame per second',()=>{
 const o=options('field',{kind:'rain',rainSpeed:1200,rainWind:150,rainGust:.6}),a=createRainSystem(o),b=createRainSystem(o);for(const r of[a,b]){r.resize(600,300);r.step(0);}
 a.step(1);for(let i=1;i<=120;i++)b.step(i/120);
 for(let i=0;i<a.drops.length;i++){near(a.drops[i].x,b.drops[i].x,1e-6);near(a.drops[i].y,b.drops[i].y,1e-6);}
 assert.equal(a.getState().recycled,b.getState().recycled);
});
test('Rain pool is bounded, seeded and can be completely empty',()=>{
 const o=options('field',{kind:'rain',rainDensity:3}),a=createRainSystem(o),b=createRainSystem(o);a.resize(10000,9000);b.resize(10000,9000);assert.equal(a.drops.length,1100);assert.deepEqual(a.drops,b.drops);
 a.setQuality(.2);assert.ok(a.drops.length<=1100);a.setOptions({...o,rainDensity:0});assert.equal(a.drops.length,0);
});
test('Sea height and both slopes become exactly flat at zero amplitude',()=>{
 const o=options('sea',{waveHeight:0});for(let t=0;t<4;t+=.1)assert.deepEqual(seaSurface(3,8,t,o),{height:0,dx:0,dz:0});
});
test('Sea at a fixed world location changes between crest and trough',()=>{
 const o=options('sea');const heights=Array.from({length:600},(_,i)=>seaSurface(1,3,i/30,o).height);
 assert.ok(Math.min(...heights)<-.04);assert.ok(Math.max(...heights)>.04);assert.ok(Math.max(...heights)-Math.min(...heights)>.14);
});
test('Sea analytical slopes match numerical derivatives of the signed height field',()=>{
 const o=options('sea'),eps=1e-5;for(let i=0;i<20;i++){const x=i*.17,z=i*.27,t=i*.3,a=seaSurface(x,z,t,o,20);
 near(a.dx,(seaSurface(x+eps,z,t,o,20).height-seaSurface(x-eps,z,t,o,20).height)/(2*eps),1e-6);
 near(a.dz,(seaSurface(x,z+eps,t,o,20).height-seaSurface(x,z-eps,t,o,20).height)/(2*eps),1e-6);}
});
test('Sea direction rotates the wave field, not the camera; zero phase speed is static',()=>{
 const o=options('sea',{waveDirection:0}),a=seaSurface(2,5,3,o),b=seaSurface(-5,2,3,{...o,waveDirection:90});near(a.height,b.height);
 assert.deepEqual(seaSurface(2,5,1,{...o,waveSpeed:0}),seaSurface(2,5,5,{...o,waveSpeed:0}));
});
test('Pointer-only metal is at rest until a local brush acts on multiple nearby bodies',()=>{
 const o=options('art',{kind:'metaballs',interactionMode:'pointer'}),m=createMetaballMotion(o);m.resize(600,300);
 const before=Array.from(m.uniforms()['uBodies[0]']);for(let i=0;i<30;i++)m.step(i/60);assert.deepEqual(Array.from(m.uniforms()['uBodies[0]']),before);assert.equal(m.animated,false);
 m.setPointer({x:.2,y:.5,active:true});m.setPointer({x:.8,y:.5,active:true});assert.ok(m.getState().affectedBodies>=2);assert.ok(m.animated);
 for(let i=30;i<45;i++)m.step(i/60);assert.notDeepEqual(Array.from(m.uniforms()['uBodies[0]']),before);
 for(let i=45;i<3600;i++)m.step(i/60);assert.ok(m.getState().kineticEnergy<.00001);assert.equal(m.animated,false);
});
test('Metal Auto ignores pointer; Press requires a held contact; exit does not kick it',()=>{
 const o=options('art',{kind:'metaballs',interactionMode:'auto'}),m=createMetaballMotion(o);m.resize(600,300);
 m.setPointer({x:.2,y:.5,active:true});m.setPointer({x:.8,y:.5,active:true});assert.equal(m.getState().affectedBodies,0);
 m.setOptions({...o,interactionMode:'pointer',interactionTrigger:'press'});m.setPointer({x:.2,y:.5,active:true,down:false});m.setPointer({x:.8,y:.5,active:true,down:false});assert.equal(m.animated,false);
 m.setPointer({x:.2,y:.5,active:true,down:true});m.setPointer({x:.8,y:.5,active:true,down:true});assert.ok(m.getState().affectedBodies>=2);
 m.reset();m.suspend();m.setPointer({x:.9,y:.9,dx:1,dy:1,active:true,down:true});assert.equal(m.animated,false);
});
test('Metal simulation stays finite and bounded under repeated strong strokes',()=>{
 const o=options('art',{kind:'metaballs',interactionStrength:3,viscosity:1,interactionMode:'both'}),m=createMetaballMotion(o);m.resize(600,300);
 for(let i=0;i<1200;i++){m.setPointer({active:true,x:i%2?.2:.8,y:.5});m.step(i/60);for(const v of m.uniforms()['uBodies[0]'])assert.ok(Number.isFinite(v)&&Math.abs(v)<=1.600001);}
});
test('Lightning is reproducible, multiscale, branched and geometrically bounded',()=>{
 const o={seed:11,start:{x:300,y:10},end:{x:410,y:290},width:600,height:300,branches:7};const a=lightningGeometry(o),b=lightningGeometry(o);assert.deepEqual(a,b);assert.ok(a.length>=8&&a.length<=22);assert.ok(a[0].path.length>=65);assert.deepEqual(a[0].path[0],o.start);assert.deepEqual(a[0].path.at(-1),o.end);
 for(const path of a)for(const p of path.path)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<1500&&Math.abs(p.y)<1000);
 assert.notDeepEqual(a,lightningGeometry({...o,seed:12}));assert.ok(a.reduce((sum,p)=>sum+p.path.length,0)<2500);
});
test('Lightning branches originate on the parent leader rather than unrelated straight spokes',()=>{
 const a=lightningGeometry({start:{x:300,y:0},end:{x:320,y:280},branches:8});for(const b of a.filter(b=>b.depth===1))assert.ok(a[0].path.some(p=>p===b.path[0]));
 assert.throws(()=>lightningGeometry({start:{x:NaN,y:0},end:{x:3,y:4}}),TypeError);
});
test('Only meaningful interactions accept pointer input, with explicit source choices',()=>{
 for(const effect of['water','sea','glow','fire','aurora','clouds'])assert.equal(allowsPointer(effect,options(effect)),false);
 for(const kind of['silk','tunnel'])assert.equal(allowsPointer('art',options('art',{kind})),false);
 for(const kind of['orbit','jellyfish'])assert.equal(allowsPointer('sketch',options('sketch',{kind})),false);
 assert.equal(allowsPointer('art',options('art',{kind:'metaballs',interactionMode:'both'})),true);
 assert.equal(allowsPointer('art',options('art',{kind:'metaballs',interactionMode:'auto'})),false);
 for(const trigger of['click','both'])assert.equal(allowsPointer('sketch',options('sketch',{kind:'lightning',strikeTrigger:trigger})),true);
});
test('Reduced motion adapts the sea and suppresses transients without mutating saved options',()=>{
 const sea=options('sea'),calm=presentationOptions('sea',sea,resolveMotion('sea',sea,true));assert.equal(calm.waveHeight,0);assert.equal(calm.ripples,0);assert.ok(sea.waveHeight>0);
 const rain=options('field',{kind:'rain'});assert.equal(resolveMotion('field',rain,true),'hide');
 for(const reducedMotion of['auto','calm','subtle'])assert.equal(resolveMotion('sketch',options('sketch',{kind:'lightning',reducedMotion}),true),'hide');
 assert.equal(resolveMotion('sea',options('sea',{motion:'always'}),true),'full');assert.equal(resolveMotion('sea',options('sea',{motion:'never'}),false),'calm');
});
