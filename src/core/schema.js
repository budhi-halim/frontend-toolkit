import {FALL_SCHEMA,FALL_PRESETS,FALL_SHAPES} from './fall-schema.js';
import {UTILITY_SCHEMAS,UTILITY_PRESETS} from './utility-schema.js';
import {ORIGINAL_PALETTES} from '../assets/original-palettes.js';
import {ORIGINAL_CONFIG} from '../assets/original-presets.js';
import {clamp, finite} from './utils.js';

// === OPTION SCHEMAS ===
const number = (label, value, min, max, step = 0.01, extra = {}) => ({kind: 'number', label, default: value, min, max, step, ...extra});
const color = (label, value) => ({kind: 'color', label, default: value});
const choice = (label, value, values) => ({kind: 'select', label, default: value, values});
const toggle = (label, value) => ({kind: 'boolean', label, default: value});
export const COMMON_SCHEMA = {
  releaseAfter: number('Release offscreen renderer after · s', 3, 0, 60, 1),
  adaptive: toggle('Auto optimize from measured FPS', true),
  dragEnabled: toggle('Drag element (opt in)', false),
  speed: number('Playback speed', 1, 0, 3, 0.05),
  quality: number('Render scale', 0.7, 0.25, 1, 0.05),
  dprCap: number('Pixel-ratio cap', 1.5, 0.5, 3, 0.25),
  fps: number('Frame-rate cap', 60, 1, 120, 1),
  seed: number('Seed', 7, 0, 65535, 1),
  opacity: number('Effect opacity', 1, 0, 1, 0.01),
  paused: toggle('Paused', false),
  motion: choice('Motion policy', 'respect', ['respect', 'always', 'never']),
  reducedMotion: choice('Reduced-motion presentation', 'auto', ['auto', 'calm', 'still', 'hide', 'subtle']),
  forceFallback: toggle('Force portable fallback', false),
  fallbackAnimation: choice('Portable fallback motion', 'animated', ['animated', 'static']),
  fallbackFPS: number('Portable fallback FPS cap', 24, 1, 60, 1)
};
export const SCHEMAS = {
  glass: {
    variant: choice('Glass type', 'liquid', ['liquid', 'frosted']),
    distortion: number('Refraction', 200, -400, 400, 1),
    frosting: number('Frost frequency', 0.01, 0.001, 0.2, 0.001),
    blur: number('Blur · px', 0, 0, 30, 0.25),
    brightness: number('Brightness', 1, 0, 2, 0.02),
    tint: color('Tint', 'oklch(0.97 0.01 240)'),
    tintOpacity: number('Tint opacity', 0.04, 0, 1, 0.01),
    edgeColor: color('Edge light', 'oklch(1 0 0 / 0.65)'),
    shadow: number('Shadow strength', 0.14, 0, 0.7, 0.01),
    backend: choice('Refraction backend', 'auto', ['auto', 'svg', 'css'])
  },
  surface: {
    material: choice('Material', 'wood', ['wood', 'marble', 'paper', 'wall', 'linen', 'slate', 'cork', 'sand', 'granite']),
    woodSpecies: choice('Wood anatomy', 'oak', ['oak','ash','walnut','maple','pine','cedar','cherry','mahogany','teak','rosewood','ebony','bamboo']),
    woodCut: choice('Cut through the grain', 'plain-sawn', ['plain-sawn','quarter-sawn','end-grain']),
    woodFinish: choice('Surface finish', 'natural', ['natural','smooth','weathered','charred']),
    ringScale: number('Growth-ring frequency', 1, .4, 3, .05),
    pores: number('Vessel / pore strength', 1, 0, 2, .05),
    knots: number('Knot prominence', .15, 0, 1, .05),
    marbleKind: choice('Vein formation', 'carrara', ['carrara','calacatta','statuario','nero']),
    paperKind: choice('Paper construction', 'cotton', ['cotton','watercolor','kraft','parchment','laid','washi']),
    contrast: number('Texture contrast' , .52, 0, 1.5, .02),
    fibers: number('Fibers / fine grain', .45, 0, 1, .02),
    weathering: number('Weathering', .15, 0, 1, .02),
    color: color('Material color', 'oklch(0.65 0.12 50)'),
    grainX: number('Longitudinal grain scale', 0.002, 0.0001, 0.4, 0.0001),
    grainY: number('Cross-grain scale', 0.02, 0.0001, 0.4, 0.0001),
    detail: number('Noise octaves', 10, 1, 15, 1),
    depth: number('Pattern warping', 50, 0, 160, 1),
    roughness: number('Relief', 9, 0, 20, 0.1),
    orientation: choice('Grain orientation', 'auto', ['auto', 'horizontal', 'vertical']),
    lightAngle: number('Light azimuth · °', -90, -180, 180, 1),
    elevation: number('Light elevation · °', 60, 5, 90, 1)
  },
  water: {
    flowSpeed: number('Current speed', 0.4, 0, 2, 0.02),
    morphSpeed: number('Wave evolution', 1, 0, 3, 0.05),
    scale: number('Wave scale', 4, 0.5, 15, 0.1),
    windX: number('Current X', 0.3, -4, 4, 0.05),
    windY: number('Current Y', 0.15, -4, 4, 0.05),
    distortion: number('Refraction', 0.018, 0, 0.12, 0.001),
    caustic: number('Caustic light', 0.5, 0, 2, 0.02),
    ridge: number('Caustic sharpness', 3, 0.5, 12, 0.1),
    tint: color('Water tint', 'oklch(0.6 0.105 215)'),
    tintOpacity: number('Tint strength', 0.45, 0, 1, 0.01),
    highlight: color('Highlight', 'oklch(0.97 0.025 205)'),
    contentMode: choice('Content treatment', 'floating', ['floating', 'submerged']),
    contentDistortion: number('Submerged text warp · px', 4, 0, 30, 0.25),
    texture: choice('Built-in texture', 'pool', ['pool', 'sand', 'none'])
  },
  fire: {
    model: choice('Flame model', 'classic', ['ribbon', 'classic', 'candle', 'embers']),
    mode: choice('Placement', 'in', ['in', 'out']),
    direction: choice('Emission direction', 'up', ['up', 'right', 'down', 'left', 'outward']),
    sourceEdge: choice('Burning source edges', 'auto', ['auto', 'all', 'top', 'right', 'bottom', 'left']),
    outPolicy: choice('Outside fire visibility', 'strict', ['strict', 'border']),
    respectGravity: toggle('Respect buoyancy / gravity', true),
    reach: number('Outside reach · px', 105, 20, 300, 5),
    gravity: number('Buoyant upward bend', .55, 0, 2, .05),
    filament: number('Flame folds / fine detail', .65, 0, 1.5, .02),
    blueBase: number('Blue at source', .24, 0, 1, .02),
    scale: number('Flame scale', 4.5, 1, 12, 0.1),
    height: number('Flame height', 0.78, 0.1, 1.4, 0.02),
    intensity: number('Heat', 1.15, 0, 2.5, 0.05),
    turbulence: number('Turbulence', 0.72, 0, 1.5, 0.02),
    wind: number('Wind', 0.05, -1.5, 1.5, 0.05),
    spread: number('Source width · fraction of edge', 0.86, 0.02, 1.4, 0.02),
    sourceOffset: number('Source center · fraction of edge', .5, 0, 1, .01),
    flameSpeed: number('Flame flow speed · multiplier', 1, 0, 8, .05),
    flickerSpeed: number('Flicker speed · multiplier', 1, 0, 5, .05),
    embers: number('Embers', 0.55, 0, 1, 0.05),
    color: color('Outer flame', 'oklch(0.56 0.23 28)'),
    midColor: color('Flame body', 'oklch(0.8 0.18 64)'),
    coreColor: color('Hot core', 'oklch(0.99 0.075 104)')
  },
  smoke: {
    steps: number('Volume samples', 32, 12, 64, 1),
    depth: number('Volume depth', 1.25, .3, 2.4, .05),
    shadow: number('Self-shadowing', 1.2, 0, 3, .05),
    lightAngle: number('Light azimuth · °', -35, -180, 180, 1),
    interactionMode: choice('Motion source', 'both', ['auto','pointer','both']),
    interactive: toggle('Pointer stirs smoke', true),
    scale: number('Turbulence scale', 3.2, 1, 10, 0.1),
    density: number('Density', 1.6, 0, 4, 0.05),
    turbulence: number('Curl strength', 0.85, 0, 2, 0.05),
    wind: number('Wind', 0.15, -1.5, 1.5, 0.05),
    spread: number('Plume width', 0.52, 0.1, 1.5, 0.02),
    rise: number('Rise speed', 0.3, 0, 1.5, 0.02),
    light: number('Lighting', 0.8, 0, 2, 0.05),
    color: color('Smoke color', 'oklch(0.76 0.018 260)')
  },
  clouds: {
    scale: number('Cloud scale', 2.8, 0.5, 7, 0.1),
    coverage: number('Coverage', 0.54, 0, 1, 0.01),
    density: number('Density', 1.2, 0, 3, 0.05),
    wind: number('Wind', 0.15, -1, 1, 0.01),
    light: number('Silver lining', 1.2, 0, 3, 0.05),
    softness: number('Edge softness', 0.15, 0.03, 0.4, 0.01),
    color: color('Cloud light', 'oklch(0.98 0.012 220)'),
    shadowColor: color('Cloud shadow', 'oklch(0.61 0.043 260)'),
    skyColor: color('Sky', 'oklch(0.67 0.135 240)'),
    transparent: toggle('Transparent sky', false)
  },
  aurora: {
    layers: number('Ray layers', 40, 8, 100, 1),
    auroraSpeed: number('Curtain speed', 0.32, 0, 4, 0.02),
    breathSpeed: number('Breathing speed', 0.45, 0, 3, 0.05),
    breath: number('Breathing amount', 0.08, 0, 0.35, 0.01),
    tilt: number('Camera tilt', 2, 0.2, 5, 0.1),
    sway: number('Camera sway', 0.14, 0, 1, 0.02),
    fov: number('Field of view', 1, 0.3, 2.5, 0.05),
    color: color('Lower curtain', 'oklch(0.83 0.19 160)'),
    topColor: color('Upper curtain', 'oklch(0.56 0.2 302)'),
    proportion: number('Color transition', 0.3, 0, 1, 0.02),
    stars: number('Star visibility', 0.8, 0, 1, 0.02)
  },
  glow: {
    shape: choice('Contour', 'rounded', ['rounded', 'ellipse']),
    speedMode: choice('Speed units', 'duration', ['duration', 'pixels']),
    velocity: number('Linear speed · px/s', 150, 0, 800, 5),
    bloomPlacement: choice('Bloom placement', 'outside', ['outside', 'inside', 'both']),
    palette: choice('Palette', 'custom', ['custom', ...Object.keys(ORIGINAL_PALETTES)]),
    width: number('Border width · px', 2, 0, 14, 0.25),
    glow: number('Bloom radius · px', 14, 0, 50, 1),
    intensity: number('Bloom strength', 0.55, 0, 1, 0.01),
    duration: number('Orbit duration · s', 5, 0.5, 30, 0.5),
    angle: number('Starting angle · °', 0, 0, 360, 1),
    reverse: toggle('Reverse orbit', false),
    trail: number('Trail length', 0.6, 0.08, 1, 0.02),
    color: color('Color A', 'oklch(0.8 0.14 190)'),
    color2: color('Color B', 'oklch(0.65 0.22 300)'),
    color3: color('Color C', 'oklch(0.78 0.14 55)')
  },
  fluid: {
    kind: choice('Fluid appearance', 'ink', ['ink','smoke','fire','neon']),
    resolution: number('Simulation resolution', 144, 48, 384, 8),
    pressureIterations: number('Pressure iterations', 20, 6, 48, 1),
    vorticity: number('Vortex strength', 22, 0, 65, 1),
    dissipation: number('Dye fading / second', .6, .05, 4, .05),
    viscosity: number('Velocity damping', .3, 0, 4, .05),
    radius: number('Brush radius', .048, .008, .18, .002),
    force: number('Pointer impulse', 55, 2, 160, 1),
    buoyancy: number('Upward lift', .45, 0, 4, .05),
    shading: number('Density lighting', .65, 0, 2, .05),
    color: color('Dye color', 'oklch(.73 .17 195)'),
    rainbow: toggle('Color cycle', true),
    autoEmit: toggle('Automatic source', true),
    interactive: toggle('Pointer interaction', true)
  },
  trail: {
    kind: choice('Particle shape', 'stars', ['stars','flowers','petals','smoke','embers','bubbles','fireflies','snow','ribbons','comet','confetti','mixed']),
    trigger: choice('Emission trigger', 'move', ['move','hover','press','click','auto','both','manual']),
    throttle: choice('Trail spacing method', 'distance', ['distance','time']),
    distanceInterval: number('Spacing · CSS px', 12, 1, 160, 1),
    timeInterval: number('Interval · ms', 32, 4, 1000, 1),
    burstCount: number('Click / manual burst size', 24, 1, 160, 1),
    colorMode: choice('Particle colors', 'palette', ['palette','gradient','rainbow','single']),
    variantMode: choice('Shape selection', 'random', ['random','cycle','fixed']),
    variant: number('Fixed shape variant', 0, 0, 3, 1),
    mix: choice('Mixed shape collection', 'botanical', ['botanical','celestial','celebration','all']),
    color3: color('Palette color C', 'oklch(.78 .14 210)'),
    color4: color('Palette color D', 'oklch(.83 .13 130)'),
    sizeVariation: number('Size variation', .6, 0, 1, .05),
    count: number('Particle budget', 450, 40, 1200, 10),
    emission: number('Legacy emission / second alias', 31.25, 1, 250, 1),
    size: number('Particle size · px', 14, 2, 60, 1),
    life: number('Lifetime · s', 2.4, .3, 8, .1),
    gravity: number('Gravity · px/s²', 22, -180, 240, 2),
    wind: number('Wind · px/s', 0, -200, 200, 2),
    turbulence: number('Swirl', 1, 0, 3, .05),
    spread: number('Emission spread', 28, 0, 140, 2),
    color: color('Primary color', 'oklch(.88 .12 80)'),
    color2: color('Secondary color', 'oklch(.7 .19 335)'),
    rainbow: toggle('Color cycle', false),
    autoEmit: toggle('Legacy automatic orbit alias', false),
    interactive: toggle('Pointer interaction', true)
  },
  field: {
    rainSpeed: number('Fall speed · CSS px/s', 620, 0, 1800, 10),
    rainWind: number('Crosswind · CSS px/s', 35, -450, 450, 5),
    rainGust: number('Gust variation', .12, 0, 1, .02),
    rainDepth: number('Depth / speed variation', .7, 0, 1, .05),
    rainLength: number('Blur length at base speed · px', 26, 2, 100, 1),
    rainDensity: number('Rain density', .55, 0, 1, .05),
    rainWidth: number('Streak width · px', 1.2, .4, 3, .1),
    kind: choice('Field', 'ocean', ['ocean','lava','nebula','rain','iridescence','magnetic']),
    oceanAmplitude: number('Wave relief', 1, 0, 2, .05),
    interactionMode: choice('Motion source', 'both', ['auto','pointer','both']),
    scale: number('Pattern scale', 3, .4, 12, .1),
    intensity: number('Intensity', 1, 0, 2.5, .05),
    detail: number('Detail', 5, 2, 8, 1),
    distortion: number('Domain distortion', .6, 0, 2, .02),
    wind: number('Drift', .3, -2, 2, .05),
    color: color('Primary', 'oklch(.51 .13 227)'),
    color2: color('Secondary', 'oklch(.9 .07 170)'),
    transparent: toggle('Transparent background', false),
    interactive: toggle('Pointer influence', true)
  }
  ,sea: {
    waveHeight: number('Wave amplitude', .12, 0, .8, .005),
    waveSpeed: number('Wave travel speed', 1, 0, 3, .05),
    waveDirection: number('Wave heading · °', 18, -180, 180, 1),
    ripples: number('Fine ripples', .25, 0, 1, .05),
    choppiness: number('Crest sharpness', .55, 0, 2.2, .05),
    waveScale: number('Wave frequency', 1.2, .3, 3, .05),
    wind: number('Wind ripple strength', .5, 0, 2, .05),
    horizon: number('Horizon height', .60, .35, .85, .01),
    sunElevation: number('Sun elevation', .22, -.15, 1, .01),
    sunAzimuth: number('Sun horizontal position', -.35, -1.5, 1.5, .05),
    sunSize: number('Sun / moon disc size', .035, .005, .08, .001),
    sunColor: color('Sun / moon color', '#ffdda4'),
    skyColor: color('Upper sky', '#406fa1'),
    horizonColor: color('Horizon light', '#ffc5a1'),
    waterColor: color('Water depth', '#083e55'),
    fog: number('Horizon mist', .035, .005, .15, .005),
    reflection: number('Reflectivity', .7, 0, 1, .05),
    detail: number('Wave octaves', 5, 2, 7, 1),
    interactive: toggle('Legacy interaction (ignored)', false)
  },
  art: {
    kind: choice('Optical field', 'metaballs', ['metaballs','silk','interference','tunnel']),
    interactionMode: choice('Motion source', 'both', ['auto','pointer','both']),
    interactionTrigger: choice('Brush activation', 'move', ['move','press']),
    interactionAction: choice('Metal brush', 'stir', ['stir','attract']),
    interactionRadius: number('Brush radius · CSS px', 170, 35, 400, 5),
    interactionStrength: number('Brush strength', 1, 0, 3, .05),
    viscosity: number('Motion damping', 4.5, 1, 12, .25),
    scale: number('Structure scale', 1, .4, 3, .05),
    amount: number('Structures / folds', 6, 3, 10, 1),
    relief: number('Relief / distortion', .65, .1, 1.5, .05),
    lightAngle: number('Light azimuth · °', -40, -180, 180, 1),
    color: color('Material body', '#264e68'),
    color2: color('Reflected light', '#e5bc7c'),
    background: color('Background', '#080d16'),
    transparent: toggle('Transparent background', false),
    interactive: toggle('Pointer interaction', true)
  },
  sketch: {
    kind: choice('Kinetic drawing', 'orbit', ['orbit','constellation','lightning','blobs','jellyfish']),
    interactionMode: choice('Motion source', 'auto', ['auto','pointer','both']),
    strikeTrigger: choice('Strike trigger', 'auto', ['auto','click','both','manual']),
    jaggedness: number('Lightning irregularity', .65, .15, 1.4, .05),
    count: number('Elements', 72, 12, 220, 1),
    scale: number('Composition scale', 1, .3, 1.6, .05),
    depth: number('Perspective depth', 1, .2, 2, .05),
    width: number('Line width · px', 1.2, .3, 5, .1),
    linkDistance: number('Connection reach · px', 100, 35, 230, 5),
    branchSpread: number('Branch divergence · °', 32, 8, 65, 1),
    branchLength: number('Branch length', .34, .06, .8, .02),
    tortuosity: number('Large-scale meander', .42, 0, 1, .02),
    taper: number('Branch attenuation', .58, .15, .9, .01),
    strikeDuration: number('Discharge persistence · s', .7, .1, 2, .05),
    strikeOriginX: number('Origin X', .5, 0, 1, .01),
    strikeOriginY: number('Origin Y · from top', .02, 0, 1, .01),
    strikeTargetX: number('Target X', .52, 0, 1, .01),
    strikeTargetY: number('Target Y · from top', .98, 0, 1, .01),
    strikeWander: number('Endpoint variation', .25, 0, .8, .01),
    branches: number('Lightning branches', 5, 0, 12, 1),
    strikeInterval: number('Strike interval · s', 4, 1.5, 15, .5),
    bloom: number('Soft glow · px', 12, 0, 25, 1),
    color: color('Primary', '#65d9d7'),
    color2: color('Secondary', '#eab5ec'),
    interactive: toggle('Pointer interaction', true)
  }

};
export const PRESETS = {
  glass: {liquid: {}, frosted: {variant: 'frosted', distortion: 65, frosting: 0.07, blur: 0.5, tintOpacity: 0.08}, 'clear-lens': {distortion: 240, tintOpacity: 0}, 'soft-frost': {variant: 'frosted', distortion: 30, frosting: 0.11, blur: 7}},
  surface: {},
  water: {pool: {}, 'original-water': {flowSpeed: 0.4, morphSpeed: 1, scale: 4, windX: 3, windY: 3, distortion: 0.001, caustic: 0.25, ridge: 3, tint: 'oklch(0.55 0.12 230)', tintOpacity: 0.45, highlight: 'oklch(0.95 0.05 230)'}, shallows: {texture: 'sand', tint: 'oklch(0.76 0.085 175)', caustic: 0.65, windX: 0.12, windY: 0.08, scale: 5.2}, midnight: {texture: 'none', tint: 'oklch(0.24 0.05 245)', highlight: 'oklch(0.7 0.075 215)', caustic: 0.28, speed: 0.5}},
  fire: {hearth: {model:'classic'}, 'classic-hearth': {model:'classic'}, 'ribbon-flame': {model:'ribbon',spread:.52,height:1.05,turbulence:.85,filament:.65,color:'#ac1f06',midColor:'#f55b10',coreColor:'#ffd09a',blueBase:.12}, candle:{model:'candle',spread:.18,height:.82,turbulence:.18,embers:0,blueBase:.65,gravity:.18}, embers:{model:'embers',height:.2,intensity:1.2,embers:.85}, 'burning-border':{model:'classic',mode:'out',direction:'outward',sourceEdge:'all',outPolicy:'border',reach:100,height:.82,spread:.85}, flamethrower:{model:'classic',scale:7,mode:'out',direction:'right',sourceEdge:'right',reach:240,height:1.3,gravity:1,spread:.4}, torch: {spread: 0.25, height: 1.05, scale: 3, wind: 0.1, turbulence: 0.55}, inferno: {height: 1.2, spread: 1.4, intensity: 1.4, turbulence: 1.1, speed: 1.4}, spectral: {color: 'oklch(0.43 0.19 285)', midColor: 'oklch(0.75 0.14 200)', coreColor: 'oklch(0.98 0.025 200)', embers: 0.2}},
  smoke: {plume: {}, incense: {spread: 0.17, density: 1.1, turbulence: 1.2, rise: 0.22}, billowing: {spread: 0.94, density: 2.2, scale: 2.3, turbulence: 1.2}, mist: {spread: 1.4, density: 0.7, scale: 1.6, rise: 0.06, wind: 0.05}},
  clouds: {cumulus: {}, overcast: {coverage: 0.78, density: 1.7, light: 0.7, skyColor: 'oklch(0.63 0.028 248)'}, sunset: {skyColor: '#e46446', color: '#ffbc76', shadowColor: '#a84c60', coverage: .48, density: 1, light: 1.15}, wisps: {coverage: 0.32, density: 0.7, softness: 0.24, scale: 4}},
  aurora: {borealis: {}, violet: {color: 'oklch(0.65 0.18 270)', topColor: 'oklch(0.74 0.22 330)', proportion: 0.55}, solar: {color: 'oklch(0.82 0.17 70)', topColor: 'oklch(0.54 0.23 330)'}, quiet: {speed: 0.25, breath: 0.03, sway: 0}},
  glow: {prism: {}, 'transparent-chase':{speedMode:'pixels',velocity:170,trail:.24,bloomPlacement:'outside'}, 'blue-trail': {trail: 0.2, color: 'oklch(0.61 0.22 260)', color2: 'oklch(0.85 0.13 215)', color3: 'oklch(0.98 0.02 200)'}, ember: {color: 'oklch(0.64 0.23 28)', color2: 'oklch(0.83 0.17 75)', color3: 'oklch(0.99 0.05 105)'}, mono: {color: 'oklch(0.93 0.03 190)', color2: 'oklch(0.93 0.03 190)', color3: 'oklch(0.93 0.03 190)', trail: 0.3}},
  fluid: {ink:{}, smoke:{kind:'smoke',rainbow:false,color:'oklch(.8 .01 260)',dissipation:.4,buoyancy:1.1,shading:1.3}, fire:{kind:'fire',rainbow:false,dissipation:1.3,buoyancy:2.5,vorticity:32}, neon:{kind:'neon',dissipation:.9,shading:.3}, 'quiet-ink':{autoEmit:false,force:30,radius:.06}},
  trail: {stars:{}, garden:{kind:'mixed',mix:'botanical',size:20,emission:32,life:4,gravity:28}, flowers:{kind:'flowers',size:20,emission:28,life:4,gravity:28,color:'oklch(.81 .12 350)',color2:'oklch(.92 .05 50)'}, petals:{kind:'petals',size:16,emission:38,life:4,gravity:30,color:'oklch(.82 .13 355)'}, smoke:{kind:'smoke',size:40,life:3.6,gravity:-32,emission:40,color:'oklch(.76 .02 260)'}, embers:{kind:'embers',size:4,gravity:-75,life:2.2,color:'oklch(.83 .18 65)'}, bubbles:{kind:'bubbles',size:18,life:3.8,gravity:-30,emission:30}, fireflies:{kind:'fireflies',size:4,life:4,emission:25,gravity:-8,color:'oklch(.9 .16 115)'}, snow:{kind:'snow',size:7,gravity:22,life:5,emission:30}, ribbons:{kind:'ribbons',emission:120,size:12,life:1.4,rainbow:true,gravity:0}, comet:{kind:'comet',size:5,life:1.2,emission:180,gravity:0,color:'oklch(.87 .1 210)'}, confetti:{kind:'confetti',size:10,life:3,emission:80,gravity:110,rainbow:true}},
  field: {ocean:{}, lava:{kind:'lava',color:'oklch(.55 .22 28)',color2:'oklch(.9 .15 85)',speed:.55,distortion:1}, nebula:{kind:'nebula',color:'oklch(.54 .17 300)',color2:'oklch(.73 .13 205)',speed:.4}, rain:{kind:'rain',color:'oklch(.64 .09 225)',color2:'oklch(.94 .025 200)',transparent:true,scale:4}, iridescence:{kind:'iridescence',color:'oklch(.8 .13 180)',color2:'oklch(.72 .19 330)',speed:.35}, magnetic:{kind:'magnetic',color:'oklch(.68 .21 295)',color2:'oklch(.86 .15 175)',speed:.7}}
};
Object.assign(PRESETS, {
  sea: {golden:{}, calm:{waveHeight:.035,choppiness:.18,ripples:.12,wind:.25,waveSpeed:.8}, glassy:{waveHeight:0,ripples:0,wind:0}, daylight:{skyColor:'#326da2',horizonColor:'#9ac8e6',sunColor:'#fff4d8',sunElevation:.72,waterColor:'#085368'}, sunset:{skyColor:'#513c77',horizonColor:'#ed6542',sunColor:'#ffbf7b',sunElevation:.075,sunAzimuth:-.1,waterColor:'#222e46'}, moonlight:{skyColor:'#060d26',horizonColor:'#253252',sunColor:'#cadfff',sunElevation:.36,sunSize:.022,waterColor:'#051325',waveHeight:.2}, storm:{skyColor:'#182736',horizonColor:'#84949b',sunColor:'#bcc8d4',sunElevation:.7,sunSize:.008,waveHeight:.7,choppiness:1.7,wind:1.25,fog:.08,waterColor:'#0b2c34'}},
  art: {metaballs:{}, chrome:{kind:'metaballs',color:'#81929b',color2:'#d6f4ff',relief:.85}, silk:{kind:'silk',color:'#7b3869',color2:'#efbaad',amount:7}, interference:{kind:'interference',color:'#439ca8',color2:'#f08d67',scale:.8}, tunnel:{kind:'tunnel',color:'#3f7eae',color2:'#f098c9',speed:.4}},
  sketch: {orbit:{}, constellation:{kind:'constellation',color:'#dce5ff',color2:'#81c6d4',count:90,bloom:5}, lightning:{kind:'lightning',color:'#779bed',color2:'#e9f4ff',width:1.4,count:48}, blobs:{kind:'blobs',color:'#d388a8',color2:'#766bdd',count:24,bloom:0,speed:.35}, jellyfish:{kind:'jellyfish',color:'#63cddc',color2:'#e2a4ed',count:60,bloom:8,speed:.5}}
});
for (const material of ['wood', 'marble', 'paper', 'wall']) {
  for (const [name, preset] of Object.entries(ORIGINAL_CONFIG.presets[material])) {
    PRESETS.surface[`${material}/${name}`] = {...preset, material};
  }
}
for (const name of Object.keys(ORIGINAL_PALETTES)) PRESETS.glow[name]={palette:name,trail:1};
// Legacy keys resolve, but are not a second tier of presets.
for (const name of Object.keys(ORIGINAL_PALETTES)) Object.defineProperty(PRESETS.glow,`original/${name}`,{value:PRESETS.glow[name],enumerable:false});

Object.assign(PRESETS.surface,{
  'wood/oak':{material:'wood',color:'oklch(.71 .095 70)',grainX:.002,grainY:.035,roughness:5,depth:28,contrast:.65,fibers:.55},
  'wood/walnut':{material:'wood',color:'oklch(.4 .06 50)',grainX:.003,grainY:.038,roughness:4,depth:40,contrast:.7},
  'wood/bleached-ash':{material:'wood',color:'oklch(.83 .05 85)',contrast:.35,grainX:.002,grainY:.05,roughness:3},
  'marble/carrara':{material:'marble',color:'oklch(.94 .01 90)',contrast:.62,depth:35,roughness:2,fibers:.15},
  'marble/nero':{material:'marble',color:'oklch(.25 .013 260)',contrast:1,depth:40,roughness:1,fibers:.1},
  'paper/cotton':{material:'paper',color:'oklch(.96 .018 85)',roughness:3,contrast:.35,fibers:.65,weathering:.03},
  'paper/watercolor':{material:'paper',color:'oklch(.94 .022 88)',roughness:5,contrast:.48,fibers:.8,weathering:.06},
  'paper/kraft':{material:'paper',color:'oklch(.69 .072 72)',roughness:4,contrast:.58,fibers:.8,weathering:.18},
  'paper/parchment':{material:'paper',color:'oklch(.87 .065 80)',roughness:3,contrast:.65,fibers:.28,weathering:.65},
  'wall/default':{material:'wall',color:'oklch(.8 .035 90)',roughness:5,contrast:.5,depth:14},
  'wall/limewash':{material:'wall',color:'oklch(.7 .04 62)',contrast:.7,roughness:4,weathering:.55},
  'linen/natural':{material:'linen',color:'oklch(.79 .055 90)',contrast:.7,roughness:6,fibers:.65},
  'linen/indigo':{material:'linen',color:'oklch(.36 .065 263)',contrast:.9,roughness:5},
  'slate/charcoal':{material:'slate',color:'oklch(.31 .016 240)',contrast:.85,roughness:7},
  'cork/natural':{material:'cork',color:'oklch(.66 .075 63)',contrast:.9,roughness:8},
  'sand/dunes':{material:'sand',color:'oklch(.82 .073 82)',contrast:.6,roughness:6},
  'granite/salt-pepper':{material:'granite',color:'oklch(.65 .013 80)',contrast:.9,roughness:5}
});
// Existing names remain valid; anatomical structure is independent of their palette.
for(const [name,preset] of Object.entries(PRESETS.surface)){
  if(preset.material==='wood'){
    const kind=name.slice(5).replace(/^smooth-/,''),species=kind==='bleached-ash'?'ash':['burnt','driftwood'].includes(kind)?'pine':kind;
    Object.assign(preset,{woodSpecies:species,woodCut:species==='mahogany'||species==='bamboo'?'quarter-sawn':'plain-sawn',woodFinish:name.includes('smooth-')?'smooth':kind==='driftwood'?'weathered':kind==='burnt'?'charred':'natural',
      grainX:.002,grainY:.035,depth:species==='walnut'?42:28,contrast:species==='maple'?.48:species==='ebony'?.85:.8,fibers:.55,roughness:name.includes('smooth-')?2:4,
      knots:['pine','cedar'].includes(species)&&!name.includes('smooth-')?.65:.12,ringScale:1,pores:1,weathering:kind==='driftwood'?.8:.15});
  }else if(preset.material==='marble')preset.marbleKind=name.slice(7);
  else if(preset.material==='paper')preset.paperKind=['cotton','watercolor','kraft','parchment'].includes(name.slice(6))?name.slice(6):'cotton';
}
const woodColors={oak:'oklch(.69 .072 72)',ash:'oklch(.78 .06 79)',walnut:'oklch(.43 .047 59)',maple:'oklch(.84 .058 78)',pine:'oklch(.78 .067 80)',cedar:'oklch(.61 .076 51)',cherry:'oklch(.65 .066 53)',mahogany:'oklch(.48 .071 36)',teak:'oklch(.62 .071 70)',rosewood:'oklch(.37 .055 30)',ebony:'oklch(.24 .012 57)',bamboo:'oklch(.79 .073 89)'};
for(const preset of Object.values(PRESETS.surface))if(preset.material==='wood'&&!['weathered','charred'].includes(preset.woodFinish))preset.color=woodColors[preset.woodSpecies]||preset.color;
PRESETS.surface['wood/bleached-ash'].color='oklch(.84 .025 84)';
Object.assign(PRESETS.surface,{
  'wood/quarter-sawn-oak':{...PRESETS.surface['wood/oak'],woodCut:'quarter-sawn',knots:0},
  'wood/end-grain-oak':{...PRESETS.surface['wood/oak'],woodCut:'end-grain',knots:0},
  'wood/end-grain-pine':{...PRESETS.surface['wood/pine'],woodCut:'end-grain',knots:0},
  'paper/laid':{...PRESETS.surface['paper/cotton'],paperKind:'laid',contrast:.55},
  'paper/washi':{...PRESETS.surface['paper/cotton'],paperKind:'washi',fibers:.9,roughness:4,contrast:.5}
});
Object.assign(SCHEMAS,UTILITY_SCHEMAS,{fall:FALL_SCHEMA});
Object.assign(PRESETS,UTILITY_PRESETS,{fall:FALL_PRESETS});
PRESETS.water.current=PRESETS.water['original-water'];
Object.defineProperty(PRESETS.water,'original-water',{value:PRESETS.water.current,enumerable:false});
Object.defineProperty(PRESETS.fire,'classic-hearth',{value:PRESETS.fire.hearth,enumerable:false});
Object.assign(PRESETS.fire.flamethrower,{flameSpeed:3.2,flickerSpeed:1.4,gravity:.4,turbulence:.6});
Object.assign(PRESETS.fire['burning-border'],{spread:1});
Object.assign(PRESETS.fire,{
  'gentle-flame':{...PRESETS.fire.hearth,flameSpeed:.45,flickerSpeed:.5,turbulence:.3,embers:.08},
  'fast-jet':{...PRESETS.fire.flamethrower,flameSpeed:5,spread:.2,respectGravity:false,wind:0,sourceOffset:.5},
  'edge-candles':{...PRESETS.fire['burning-border'],model:'candle',direction:'up',sourceEdge:'bottom',height:.65,reach:110,spread:1}
});
Object.assign(PRESETS.sketch,{
  'forked-lightning':{...PRESETS.sketch.lightning,branches:8,branchSpread:24,branchLength:.48,tortuosity:.6,jaggedness:.6},
  'cloud-crawler':{...PRESETS.sketch.lightning,branches:10,branchSpread:45,branchLength:.62,strikeOriginX:.08,strikeOriginY:.2,strikeTargetX:.92,strikeTargetY:.62,strikeWander:.13},
  'fine-discharge':{...PRESETS.sketch.lightning,branches:3,width:.7,bloom:3,branchLength:.24,tortuosity:.26,strikeDuration:.5}
});
export function canonicalPreset(effect,name){
  if(effect==='glow'&&name?.startsWith('original/'))return name.slice(9);
  if(effect==='water'&&name==='original-water')return 'current';
  if(effect==='fire'&&name==='classic-hearth')return 'hearth';
  return name;
}
export function getDefaults(effect, preset) {
  if (!Object.hasOwn(SCHEMAS,effect)) throw new RangeError(`Unknown effect: ${effect}`);
  const values = Object.fromEntries(Object.entries({...COMMON_SCHEMA, ...SCHEMAS[effect]}).map(([key, spec]) => [key, spec.default]));
  return {...values, ...(PRESETS[effect][preset] ?? {})};
}
export function normalizeOptions(effect, input = {}, base = getDefaults(effect)) {
  const result = {...base};
  const schema = {...COMMON_SCHEMA, ...SCHEMAS[effect]};
  for (const [key, value] of Object.entries(input ?? {})) {
    const spec = schema[key];
    if (!spec) continue;
    if (spec.kind === 'number') {
      const parsed=finite(value,base[key]);
      result[key]=clamp(['seed','fps','fallbackFPS','detail','layers','steps','pressureIterations','resolution','count','variant','burstCount','amount','branches','lines','maxPulses','maxParticles'].includes(key)?Math.round(parsed):parsed,spec.min,spec.max);
    }
    else if (spec.kind === 'boolean') result[key] = value === true || value === '' || value === 'true' || value === 1;
    else if (spec.kind === 'select' && spec.values.includes(value)) result[key] = value;
    else if (spec.kind === 'color' && typeof value === 'string' && value.length <= 180 && !/[;{}]/.test(value)) {
      if (typeof CSS === 'undefined' || CSS.supports('color', value)) result[key] = value;
    }
  }
  if(effect==='fall'&&!FALL_SHAPES[result.kind].includes(result.shape))result.shape='mixed';
  if(effect==='fire'){if(result.mode==='out')result.spread=Math.min(1,result.spread);else if(result.direction==='outward')result.direction='up';}
  if(effect==='backdrop')result.count=Math.min(result.count,result.kind==='contours'?10:result.kind==='waves'?12:80);
  if(effect==='trail'){
    if(Object.hasOwn(input??{},'emission')&&!Object.hasOwn(input??{},'timeInterval'))result.timeInterval=clamp(1000/result.emission,4,1000);
    if(Object.hasOwn(input??{},'timeInterval'))result.emission=1000/result.timeInterval;
    if(Object.hasOwn(input??{},'trigger')&&!Object.hasOwn(input??{},'autoEmit'))result.autoEmit=false;
    if(Object.hasOwn(input??{},'colorMode')&&!Object.hasOwn(input??{},'rainbow'))result.rainbow=false;
  }
  return result;
}
