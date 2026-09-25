// === FALLING PARTICLES: AUTONOMOUS DECORATION WITH NO POINTER CAPTURE ===
const number=(label,value,min,max,step=1)=>({kind:'number',label,default:value,min,max,step});
const choice=(label,value,values)=>({kind:'select',label,default:value,values});
const color=(label,value)=>({kind:'color',label,default:value});
export const FALL_SHAPES=Object.freeze({
  snow:['mixed','round','flake','crystal'],
  leaves:['mixed','maple','oak','birch'],
  petals:['mixed','cherry','oval','rose'],
  seeds:['mixed','parachute','tuft']
});
export const FALL_SCHEMA={
  kind:choice('Falling material','snow',Object.keys(FALL_SHAPES)),
  shape:{...choice('Particle shape','mixed',[...new Set(Object.values(FALL_SHAPES).flat())]),valuesByKind:FALL_SHAPES},
  fallSpeed:number('Fall speed · CSS px/s',55,0,500,1),
  wind:number('Crosswind · CSS px/s',12,-300,300,1),
  gust:number('Gust velocity · CSS px/s',14,0,200,1),
  gustPeriod:number('Gust cycle · seconds',8,1,30,.5),
  sway:number('Side-to-side drift · CSS px',16,0,120,1),
  swaySpeed:number('Drift cycles per second',.22,0,2,.02),
  tumble:number('Rotation / flutter speed',.6,0,4,.05),
  depth:number('Depth variation',.7,0,1,.02),
  size:number('Near particle size · CSS px',11,2,100,1),
  sizeVariation:number('Size variation',.6,0,1,.02),
  density:number('Particles per 100,000 CSS px²',30,0,120,1),
  maxParticles:number('Particle budget',400,0,1500,1),
  color:color('Particle color A','#eef9ff'),
  color2:color('Particle color B','#c9e6ed'),
  color3:color('Particle color C','#ffffff'),
  colorMode:choice('Color selection','palette',['palette','single']),
  transparent:{kind:'boolean',label:'Transparent background',default:true},
  background:color('Background','#10232c'),
  softness:number('Particle edge softness',.18,0,1,.02)
};
export const FALL_PRESETS={
  snow:{},
  'soft-snow':{shape:'round',size:7,density:42,fallSpeed:48,tumble:0,softness:.6},
  snowflakes:{shape:'flake',size:17,density:18,fallSpeed:40,tumble:.45,softness:.05},
  'snow-crystals':{shape:'crystal',size:10,density:32,fallSpeed:70,tumble:.9,softness:.1},
  'snow-flurry':{shape:'mixed',density:70,size:9,wind:85,gust:40,fallSpeed:120,sway:20},
  'autumn-leaves':{kind:'leaves',shape:'mixed',size:32,sizeVariation:.45,density:8,fallSpeed:48,wind:18,gust:20,sway:32,swaySpeed:.28,tumble:1.05,softness:0,color:'#d48432',color2:'#ae432e',color3:'#dcb753'},
  'maple-leaves':{kind:'leaves',shape:'maple',size:34,density:7,fallSpeed:48,wind:12,gust:22,sway:30,tumble:1,softness:0,color:'#dc7540',color2:'#b64230',color3:'#dfb35e'},
  'oak-leaves':{kind:'leaves',shape:'oak',size:34,density:8,fallSpeed:54,wind:18,gust:20,sway:28,tumble:1,softness:0,color:'#a7783a',color2:'#c0994e',color3:'#85532d'},
  'birch-leaves':{kind:'leaves',shape:'birch',size:25,density:13,fallSpeed:45,wind:14,gust:18,sway:26,tumble:1,softness:0,color:'#d9bb48',color2:'#bd8e2e',color3:'#e4c87c'},
  'cherry-petals':{kind:'petals',shape:'cherry',size:16,density:20,fallSpeed:34,wind:20,gust:18,sway:26,tumble:.7,softness:.05,color:'#efb2bf',color2:'#f7d5d9',color3:'#fff0e7'},
  'rose-petals':{kind:'petals',shape:'rose',size:22,density:12,fallSpeed:42,wind:10,gust:16,sway:24,tumble:.8,softness:.05,color:'#b84558',color2:'#e28292',color3:'#edb9b7'},
  'petal-mix':{kind:'petals',shape:'mixed',size:18,density:18,fallSpeed:38,wind:18,gust:18,sway:28,tumble:.8,softness:.05,color:'#e7afbe',color2:'#f4d6b6',color3:'#f4eeee'},
  'dandelion-seeds':{kind:'seeds',shape:'parachute',size:26,density:8,fallSpeed:12,wind:26,gust:14,sway:24,swaySpeed:.15,tumble:.25,softness:0,color:'#f7f1da',color2:'#d3e2da',color3:'#ffffff'},
  'seed-down':{kind:'seeds',shape:'tuft',size:23,density:13,fallSpeed:16,wind:26,gust:15,sway:22,swaySpeed:.15,tumble:.4,softness:.05,color:'#eee9d7',color2:'#caddd6',color3:'#ffffff'}
};
