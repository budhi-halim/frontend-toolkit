import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {ART_FRAGMENT} from '../src/shaders/art.js';
import {SCHEMAS, getDefaults, normalizeOptions} from '../src/core/schema.js';

const fallback=await fs.readFile(new URL('../src/core/creative-fallback.js',import.meta.url),'utf8');
const gpuMatch=ART_FRAGMENT.match(/mix\(uColor,uColor2,(\.5\+\.5\*sin\(travel\+angle(?:\*[\d.]+)?\))\)/);
const cpuMatch=fallback.match(/hue=(\.5\+\.5\*Math\.sin\(travel\+angle(?:\*[\d.]+)?\))/);
assert.ok(gpuMatch&&cpuMatch,'Both tunnel renderers must expose their palette expression.');
// Evaluate the actual source expressions, so restoring the half-angle bug fails these tests.
const gpuHue=new Function('travel','angle',`return ${gpuMatch[1].replace(/\bsin\(/g,'Math.sin(')};`);
const cpuHue=new Function('travel','angle',`return ${cpuMatch[1]};`);
const turns=Math.PI*2;
const close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);

test('Tunnel palette is periodic across the negative-X polar seam in both renderers',()=>{
  for(const fn of [gpuHue,cpuHue])for(const travel of [-2,-1,0,.3,1,2,3.5,8]){
    close(fn(travel,-Math.PI),fn(travel,Math.PI));
  }
});

test('Tunnel hue repeats after complete turns, not after two turns',()=>{
  for(const fn of [gpuHue,cpuHue])for(const travel of [-1.8,0,.7,3,8])for(let i=-20;i<=20;i++){
    const angle=i*.37;close(fn(travel,angle),fn(travel,angle+turns));
    const hue=fn(travel,angle);assert.ok(Number.isFinite(hue)&&hue>=0&&hue<=1);
  }
});

test('Tunnel palette has no derivative break across the wrap',()=>{
  const epsilon=1e-5;
  for(const fn of [gpuHue,cpuHue])for(const travel of [0,.6,2,3.5]){
    const before=(fn(travel,Math.PI)-fn(travel,Math.PI-epsilon))/epsilon;
    const after=(fn(travel,-Math.PI+epsilon)-fn(travel,-Math.PI))/epsilon;
    close(before,after,epsilon);
  }
});

test('Neighboring tunnel coordinates converge to the same color at the reported seam',()=>{
  for(const fn of [gpuHue,cpuHue])for(const radius of [.025,.05,.12,.25,.5,.9,1.5]){
    const epsilon=radius*1e-7,travel=-Math.log(Math.hypot(radius,epsilon));
    close(fn(travel,Math.atan2(epsilon,-radius)),fn(travel,Math.atan2(-epsilon,-radius)),2e-7);
  }
});

test('GPU and portable tunnel palette formulas agree throughout the field',()=>{
  for(let y=-8;y<=8;y++)for(let x=-16;x<=16;x++){
    const r=Math.max(.018,Math.hypot(x/10,y/10)),travel=-Math.log(r),angle=Math.atan2(y,x);
    close(gpuHue(travel,angle),cpuHue(travel,angle));
  }
});

test('Tunnel remains a configurable two-color field, not a seam-concealing flat tint',()=>{
  for(const fn of [gpuHue,cpuHue]){
    const values=Array.from({length:128},(_,i)=>fn(.7,i/128*turns));
    assert.ok(Math.min(...values)<.001&&Math.max(...values)>.999);
    assert.notEqual(fn(0,.4),fn(1,.4));
  }
  const options=getDefaults('art','tunnel');
  assert.equal(options.color,'#3f7eae');assert.equal(options.color2,'#f098c9');
  assert.equal(options.kind,'tunnel');
});

test('Tunnel lattice closes for all supported structure counts and relief extremes',()=>{
  const schema=SCHEMAS.art;
  for(let amount=schema.amount.min;amount<=schema.amount.max;amount++){
    assert.equal(normalizeOptions('art',{amount:amount+.1}).amount,amount);
    for(const relief of [schema.relief.min,.65,schema.relief.max])for(const time of [0,3.5,20]){
      const line=angle=>Math.pow(.5+.5*Math.cos((angle+1.4*relief*.7-time*.12)*amount),22);
      close(line(-Math.PI),line(Math.PI),1e-12);
    }
  }
});

test('Tunnel shader avoids the undefined polar angle at the center',()=>{
  assert.match(ART_FRAGMENT,/angle=r>\.000001\?atan\(q\.y,q\.x\):0\./);
  assert.ok(ART_FRAGMENT.includes('smoothstep(.02,.12,r)'));
});
