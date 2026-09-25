/* Frontend Toolkit demo model. MIT; see LICENSE and NOTICE.txt. */
(() => {
  'use strict';
  const catalog = [
  {
    "id": "glass",
    "effect": "glass",
    "preset": "liquid",
    "name": "Liquid glass",
    "group": "Optics",
    "description": "Drag the card across the backdrop to inspect its refraction."
  },
  {
    "id": "frosted",
    "effect": "glass",
    "preset": "frosted",
    "name": "Frosted glass",
    "group": "Optics",
    "description": "Move the translucent pane. Try a grid or photograph behind it."
  },
  {
    "id": "water",
    "effect": "water",
    "preset": "pool",
    "name": "Water",
    "group": "Fluid",
    "description": "Moving caustics and refraction. Use an image, canvas, video, or an explicit HTML snapshot as the source."
  },
  {
    "id": "wood",
    "effect": "surface",
    "preset": "wood/oak",
    "name": "Wood",
    "group": "Surfaces",
    "description": "Species-specific growth, pores and rays. Compare plain-sawn, quarter-sawn and end grain; color is independent of anatomy."
  },
  {
    "id": "marble",
    "effect": "surface",
    "preset": "marble/carrara",
    "name": "Marble",
    "group": "Surfaces",
    "description": "Fine mineral veins and a quiet stone surface."
  },
  {
    "id": "paper",
    "effect": "surface",
    "preset": "paper/cotton",
    "name": "Paper",
    "group": "Surfaces",
    "description": "Cotton pulp, tiny fibers and restrained relief; try kraft or parchment too."
  },
  {
    "id": "wall",
    "effect": "surface",
    "preset": "wall/limewash",
    "name": "Limewash",
    "group": "Surfaces",
    "description": "Broad plaster variation with a finely textured finish."
  },
  {
    "id": "linen",
    "effect": "surface",
    "preset": "linen/natural",
    "name": "Linen",
    "group": "Surfaces",
    "description": "Interlaced warp and weft, thread variation and directional lighting."
  },
  {
    "id": "slate",
    "effect": "surface",
    "preset": "slate/charcoal",
    "name": "Slate",
    "group": "Surfaces",
    "description": "Layered, fractured stone with grazing-light relief."
  },
  {
    "id": "cork",
    "effect": "surface",
    "preset": "cork/natural",
    "name": "Cork",
    "group": "Surfaces",
    "description": "Cellular grain and irregular flecks. No repeating bitmap tile."
  },
  {
    "id": "sand",
    "effect": "surface",
    "preset": "sand/dunes",
    "name": "Sand",
    "group": "Surfaces",
    "description": "Wind-shaped ripples and small grains under directional light."
  },
  {
    "id": "granite",
    "effect": "surface",
    "preset": "granite/salt-pepper",
    "name": "Granite",
    "group": "Surfaces",
    "description": "A dense mix of fine and coarse mineral flecks."
  },
  {
    "id": "fire",
    "effect": "fire",
    "preset": "hearth",
    "name": "Fire",
    "group": "Atmosphere",
    "description": "Inside flames, burning borders, and directional jets with separate flow and flicker speeds."
  },
  {
    "id": "candle",
    "effect": "fire",
    "preset": "candle",
    "name": "Candle",
    "group": "Atmosphere",
    "description": "A narrow, gently flickering flame with a dark fuel core and optional blue base."
  },
  {
    "id": "burning-border",
    "effect": "fire",
    "preset": "burning-border",
    "name": "Burning border",
    "group": "Atmosphere",
    "description": "Flame emitted outside the rounded edge. The middle remains transparent."
  },
  {
    "id": "flamethrower",
    "effect": "fire",
    "preset": "flamethrower",
    "name": "Directional fire",
    "group": "Atmosphere",
    "description": "A right-facing jet that bends upward with distance. Try direction, source edge and buoyancy."
  },
  {
    "id": "smoke",
    "effect": "smoke",
    "preset": "plume",
    "name": "Volumetric smoke",
    "group": "Atmosphere",
    "description": "Ray-marched three-dimensional density with internal shadowing. Stir locally with the pointer; there is no camera parallax."
  },
  {
    "id": "clouds",
    "effect": "clouds",
    "preset": "cumulus",
    "name": "Clouds",
    "group": "Atmosphere",
    "description": "Soft billows, internal shading and a configurable sky."
  },
  {
    "id": "aurora",
    "effect": "aurora",
    "preset": "borealis",
    "name": "Aurora",
    "group": "Atmosphere",
    "description": "Layered light curtains with configurable colours, speed, and detail."
  },
  {
    "id": "glow",
    "effect": "glow",
    "preset": "prism",
    "name": "Glowing border",
    "group": "Light",
    "description": "A truly transparent center. The light advances by distance along the contour, not by angle."
  },
  {
    "id": "fluid",
    "effect": "fluid",
    "preset": "ink",
    "name": "Interactive fluid",
    "group": "Interactive",
    "description": "Move your pointer to inject dye and velocity. Switch between ink, smoke, fire and neon."
  },
  {
    "id": "stars",
    "effect": "trail",
    "preset": "stars",
    "name": "Star trails",
    "group": "Interactive",
    "description": "Paint a trail of stars. Emission, lifetime, gravity and color are adjustable."
  },
  {
    "id": "flowers",
    "effect": "trail",
    "preset": "flowers",
    "name": "Flower trails",
    "group": "Interactive",
    "description": "Pointer-driven flower particles with configurable colours, spacing, and lifetime."
  },
  {
    "id": "smoke-trail",
    "effect": "trail",
    "preset": "smoke",
    "name": "Smoke trails",
    "group": "Interactive",
    "description": "A portable particle trail, distinct from the volume and fluid smoke renderers."
  },
  {
    "id": "comet",
    "effect": "trail",
    "preset": "comet",
    "name": "Comet trails",
    "group": "Interactive",
    "description": "Sparks with directional streaks and a luminous tail."
  },
  {
    "id": "ocean",
    "effect": "field",
    "preset": "ocean",
    "name": "Ocean light",
    "group": "Fields",
    "description": "Moving wave normals, reflected light and highlights. A decorative field, not a DOM refraction effect."
  },
  {
    "id": "lava",
    "effect": "field",
    "preset": "lava",
    "name": "Molten lava",
    "group": "Fields",
    "description": "Bright fissures move beneath a cooling crust."
  },
  {
    "id": "nebula",
    "effect": "field",
    "preset": "nebula",
    "name": "Nebula",
    "group": "Fields",
    "description": "Drifting color, layered fractal density and stars."
  },
  {
    "id": "rain",
    "effect": "field",
    "preset": "rain",
    "name": "Rain",
    "group": "Fields",
    "description": "Layered falling drops with explicit CSS-pixel speed, crosswind and depth. Motion follows continuous trajectories."
  },
  {
    "id": "iridescence",
    "effect": "field",
    "preset": "iridescence",
    "name": "Iridescence",
    "group": "Fields",
    "description": "Shifting bands of color with a gently warped, thin-film appearance."
  },
  {
    "id": "magnetic",
    "effect": "field",
    "preset": "magnetic",
    "name": "Magnetic lines",
    "group": "Fields",
    "description": "A moving contour field that responds to your pointer."
  },
  {
    "id": "sea",
    "effect": "sea",
    "preset": "golden",
    "name": "Open sea",
    "group": "Landscapes",
    "description": "A bounded height-field sea reflecting a sky, sun and distant haze. Signed travelling waves, analytical normals and an actually flat Glassy preset. Try Calm, daylight, sunset or moonlight."
  },
  {
    "id": "metaballs",
    "effect": "art",
    "preset": "metaballs",
    "name": "Liquid metal",
    "group": "Optical art",
    "description": "Smoothly merging 3D implicit surfaces with moving reflected lights. Stir every nearby surface with the local brush, or switch to autonomous motion."
  },
  {
    "id": "silk",
    "effect": "art",
    "preset": "silk",
    "name": "Silk",
    "group": "Optical art",
    "description": "Soft fabric folds, directional sheen and slow deformation."
  },
  {
    "id": "interference",
    "effect": "art",
    "preset": "interference",
    "name": "Interference",
    "group": "Optical art",
    "description": "Two wave sources create a changing interference pattern. Move the pointer to reposition one source."
  },
  {
    "id": "tunnel",
    "effect": "art",
    "preset": "tunnel",
    "name": "Light tunnel",
    "group": "Optical art",
    "description": "An autonomous perspective light lattice without pointer-driven camera movement."
  },
  {
    "id": "orbit",
    "effect": "sketch",
    "preset": "orbit",
    "name": "Orbital filaments",
    "group": "Kinetic art",
    "description": "Perspective-projected knot curves with depth-sensitive line weight and traveling highlights."
  },
  {
    "id": "constellation",
    "effect": "sketch",
    "preset": "constellation",
    "name": "Constellation",
    "group": "Kinetic art",
    "description": "Locally connected drifting points. A spatial grid bounds neighbor searches."
  },
  {
    "id": "lightning",
    "effect": "sketch",
    "preset": "lightning",
    "name": "Lightning",
    "group": "Atmosphere",
    "description": "Branching discharges without a full-screen flash. Reduced motion suppresses this effect by default."
  },
  {
    "id": "blobs",
    "effect": "sketch",
    "preset": "blobs",
    "name": "Organic forms",
    "group": "Kinetic art",
    "description": "Smooth harmonic silhouettes that respond locally to the pointer."
  },
  {
    "id": "jellyfish",
    "effect": "sketch",
    "preset": "jellyfish",
    "name": "Jellyfish",
    "group": "Nature",
    "description": "Translucent bells, rhythmic pulses and layered drifting tentacles."
  },
  {
    "id": "spotlight",
    "effect": "highlight",
    "preset": "spotlight",
    "name": "Surface spotlight",
    "group": "Feedback",
    "description": "A local soft highlight follows the pointer over a card without moving its content. Choose hover, focus, press or automatic activation."
  },
  {
    "id": "sheen",
    "effect": "highlight",
    "preset": "sheen",
    "name": "Sweep highlight",
    "group": "Feedback",
    "description": "A restrained diagonal sheen for calls to action and product cards. Hover, click, automatic or manual pulses."
  },
  {
    "id": "ripple",
    "effect": "highlight",
    "preset": "ripple",
    "name": "Click ripple",
    "group": "Feedback",
    "description": "Click to emit an expanding, fading surface ripple. Real buttons still receive their normal clicks; keyboard activation works too."
  },
  {
    "id": "sparkle",
    "effect": "highlight",
    "preset": "sparkle",
    "name": "Surface sparkles",
    "group": "Feedback",
    "description": "Small local glints for premium finishes, rewards and subtle celebrations. Independent of pointer trails."
  },
  {
    "id": "foil",
    "effect": "highlight",
    "preset": "foil",
    "name": "Holographic foil",
    "group": "Feedback",
    "description": "A reflective finish for product and membership cards. Light moves locally; the card itself stays in place."
  },
  {
    "id": "edge-light",
    "effect": "highlight",
    "preset": "edge-light",
    "name": "Proximity edge light",
    "group": "Feedback",
    "description": "A transparent rounded-edge highlight near the pointer. Try the Keyboard focus preset for a focus-triggered decorative accent."
  },
  {
    "id": "soft-pulse",
    "effect": "highlight",
    "preset": "soft-pulse",
    "name": "Soft pulse",
    "group": "Feedback",
    "description": "A gentle expanding accent for location markers or opt-in notifications. Repetition, size and opacity are configurable."
  },
  {
    "id": "mesh",
    "effect": "backdrop",
    "preset": "mesh",
    "name": "Mesh gradient",
    "group": "Backgrounds",
    "description": "Layered soft color fields for hero sections and cards, with a static fine-grain finish. Set drift speed to zero for a cached still composition."
  },
  {
    "id": "bokeh",
    "effect": "backdrop",
    "preset": "bokeh",
    "name": "Bokeh lights",
    "group": "Backgrounds",
    "description": "Defocused aperture lights add depth without distracting from content. Sprites are cached rather than reconstructed every frame."
  },
  {
    "id": "sunbeams",
    "effect": "backdrop",
    "preset": "sunbeams",
    "name": "Sunbeams",
    "group": "Backgrounds",
    "description": "Soft directional shafts with a configurable origin, tint, width and movement. A decorative overlay, not scene-aware ray tracing."
  },
  {
    "id": "window-shadows",
    "effect": "backdrop",
    "preset": "window-shadows",
    "name": "Window shadows",
    "group": "Backgrounds",
    "description": "Quiet architectural shadows for editorial layouts. Change the caster, direction, density and surface color."
  },
  {
    "id": "leaf-shadows",
    "effect": "backdrop",
    "preset": "leaf-shadows",
    "name": "Leaf shadows",
    "group": "Backgrounds",
    "description": "Soft moving foliage silhouettes for lifestyle pages, product scenes and natural materials."
  },
  {
    "id": "wave-divider",
    "effect": "backdrop",
    "preset": "wave-divider",
    "name": "Wave divider",
    "group": "Backgrounds",
    "description": "Layered moving waves anchored to any edge, with a genuinely transparent empty region. Useful for separating page sections."
  },
  {
    "id": "contours",
    "effect": "backdrop",
    "preset": "contours",
    "name": "Topographic contours",
    "group": "Backgrounds",
    "description": "Thin map-like isolines for technical, outdoor or editorial layouts. Static by setting drift speed to zero."
  },
  {
    "id": "dots",
    "effect": "pattern",
    "preset": "dots",
    "name": "Dot grid",
    "group": "Patterns",
    "description": "A resolution-aware dot texture. Control CSS-pixel spacing, dot size, irregularity and coverage; no frame loop when static."
  },
  {
    "id": "grid",
    "effect": "pattern",
    "preset": "grid",
    "name": "Grid lines",
    "group": "Patterns",
    "description": "Fine grid geometry for diagrams, dashboards and technical backgrounds. Try Blueprint for an opaque colored base."
  },
  {
    "id": "crosses",
    "effect": "pattern",
    "preset": "crosses",
    "name": "Cross grid",
    "group": "Patterns",
    "description": "Small registration marks for structured layouts. All geometry is procedural; spacing is independent of element size."
  },
  {
    "id": "hexagons",
    "effect": "pattern",
    "preset": "hexagons",
    "name": "Hexagon grid",
    "group": "Patterns",
    "description": "A seamless honeycomb field for technical or scientific backgrounds. Line weight and cell spacing are independent."
  },
  {
    "id": "diagonal",
    "effect": "pattern",
    "preset": "diagonal",
    "name": "Diagonal hatching",
    "group": "Patterns",
    "description": "Transparent hatching for chart regions, card overlays and quiet background structure. Optional drift remains opt-in."
  },
  {
    "id": "halftone",
    "effect": "pattern",
    "preset": "halftone",
    "name": "Halftone field",
    "group": "Patterns",
    "description": "A two-tone dot field with spatially varying mark sizes, useful for editorial covers and understated print-like texture."
  },
  {
    "id": "arches",
    "effect": "pattern",
    "preset": "arches",
    "name": "Scalloped arches",
    "group": "Patterns",
    "description": "A decorative architectural rhythm with independent ink, spacing and orientation controls."
  },
  {
    "id": "tiles",
    "effect": "pattern",
    "preset": "tiles",
    "name": "Winding tiles",
    "group": "Patterns",
    "description": "Seeded quarter-circle tiles create continuous interlocking paths, for decorative surfaces or packaging-inspired layouts."
  },
  {
    "id": "skeleton",
    "effect": "status",
    "preset": "skeleton",
    "name": "Loading skeleton",
    "group": "Status",
    "description": "A clipped placeholder layout with a gentle sweep. Your application owns loading state and accessible status text."
  },
  {
    "id": "avatar-placeholder",
    "effect": "status",
    "preset": "avatar-placeholder",
    "name": "Profile placeholder",
    "group": "Status",
    "description": "A circular avatar beside evenly spaced, aligned text bars. Avatar size, column gap and text spacing are configurable."
  },
  {
    "id": "card-placeholder",
    "effect": "status",
    "preset": "card-placeholder",
    "name": "Card placeholder",
    "group": "Status",
    "description": "A media block and text skeleton for cards. Layout, line count, position and dimensions are configurable."
  },
  {
    "id": "progress-ring",
    "effect": "status",
    "preset": "progress-ring",
    "name": "Progress ring",
    "group": "Status",
    "description": "A complete circular track with value-driven progress. Zero to one controls the filled portion, not the track circumference."
  },
  {
    "id": "progress-bar",
    "effect": "status",
    "preset": "progress-bar",
    "name": "Progress bar",
    "group": "Status",
    "description": "A rounded progress track driven by your application. Opt into indeterminate motion only when the amount is unknown."
  },
  {
    "id": "segmented-progress",
    "effect": "status",
    "preset": "segmented-progress",
    "name": "Segmented progress",
    "group": "Status",
    "description": "A segmented value indicator, including a partially filled final segment. Adjust count, gaps, thickness and corner shape."
  },
  {
    "id": "loading-ring",
    "effect": "status",
    "preset": "loading-ring",
    "name": "Loading ring",
    "group": "Status",
    "description": "A moving arc over a complete circular track. Adjust cycle duration and stroke; reduced motion keeps a still indicator."
  },
  {
    "id": "loading-dots",
    "effect": "status",
    "preset": "loading-dots",
    "name": "Loading dots",
    "group": "Status",
    "description": "A small phased-dot loading indicator, with a configurable number of dots, duration and amplitude."
  },
  {
    "id": "equalizer",
    "effect": "status",
    "preset": "equalizer",
    "name": "Activity bars",
    "group": "Status",
    "description": "A compact decorative activity visualization. This is not audio-reactive; control visibility and amplitude from your application."
  },
  {
    "id": "snowfall",
    "effect": "fall",
    "preset": "snow",
    "name": "Snowfall",
    "group": "Atmosphere",
    "description": "Round snow, six-armed snowflakes and hexagonal crystals, separately or mixed. Adjust fall speed, crosswind and density."
  },
  {
    "id": "autumn-leaves",
    "effect": "fall",
    "preset": "autumn-leaves",
    "name": "Autumn leaves",
    "group": "Atmosphere",
    "description": "Maple, oak and birch leaves descend with depth, lateral drift and tumbling. Shapes and colors are independently configurable."
  },
  {
    "id": "falling-petals",
    "effect": "fall",
    "preset": "cherry-petals",
    "name": "Falling petals",
    "group": "Atmosphere",
    "description": "Cherry, rose and oval petals with soft shading and gentle flutter. A transparent overlay for existing content."
  },
  {
    "id": "drifting-seeds",
    "effect": "fall",
    "preset": "dandelion-seeds",
    "name": "Drifting seeds",
    "group": "Atmosphere",
    "description": "Light parachute seeds and seed down carried by a configurable crosswind. No pointer interaction or downloaded images."
  }
];
  const groups = {
    glass: 'Materials', surface: 'Materials', water: 'Nature', fire: 'Nature',
    fall: 'Nature', smoke: 'Nature', clouds: 'Nature', aurora: 'Nature', sea: 'Nature',
    glow: 'Borders & feedback', highlight: 'Borders & feedback',
    trail: 'Interaction', fluid: 'Interaction',
    field: 'Atmosphere & art', art: 'Atmosphere & art', sketch: 'Atmosphere & art',
    backdrop: 'Backgrounds', pattern: 'Patterns', status: 'Loading & progress'
  };
  const labels = {fall:'Falling particles',glass:'Glass',surface:'Materials',water:'Water',fire:'Fire',smoke:'Smoke',clouds:'Clouds',aurora:'Aurora',glow:'Glowing borders',trail:'Pointer trails',fluid:'Fluid',field:'Atmospheric fields',sea:'Open sea',art:'Procedural art',sketch:'Generative drawing',highlight:'Surface feedback',backdrop:'Backgrounds',pattern:'Patterns',status:'Loading and progress'};
  const byId = new Map(catalog.map(item => [item.id, item]));
  const pretty = value => String(value).replaceAll('/', ' / ').replaceAll('-', ' ').replace(/\b[a-z]/g, c => c.toUpperCase());
  const html = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const attr = key => key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  function defaults(item, preset = item.preset) {
    return {...FrontendToolkit.getDefaults(item.effect, preset)};
  }
  function presets(item) {
    const base = defaults(item);
    return Object.keys(FrontendToolkit.PRESETS[item.effect]).filter(name => {
      const o = defaults(item, name);
      if (item.effect === 'surface') return o.material === base.material;
      if (['art','sketch','highlight','pattern','status','backdrop','field','fall'].includes(item.effect)) return o.kind === base.kind;
      return true;
    });
  }
  function controls(item, o) {
    const family = item.effect;
    if (family === 'fall') return ['shape','fallSpeed','wind'];
    if (family === 'glass') return ['distortion','blur','tintOpacity'];
    if (family === 'surface') return o.material === 'wood' ? ['woodCut','contrast','roughness'] : ['contrast','fibers','roughness'];
    if (family === 'fire') return ['flameSpeed','flickerSpeed','spread'];
    if (family === 'glow') return ['speedMode',o.speedMode === 'pixels' ? 'velocity' : 'duration','glow'];
    if (family === 'trail') return ['trigger','throttle',o.throttle === 'distance' ? 'distanceInterval' : 'timeInterval'];
    if (family === 'status') return ['ring','bar','segments'].includes(o.kind) ? [o.indeterminate ? 'cycle' : 'value',o.kind === 'ring' ? 'size' : 'width','thickness'] : o.kind === 'skeleton' ? ['shimmer','lines','cycle'] : ['cycle','size','amplitude'];
    if (family === 'highlight') return ['activation','intensity',o.kind === 'sheen' || o.kind === 'foil' ? 'angle' : o.kind === 'sparkle' ? 'count' : 'radius'];
    if (family === 'backdrop') return ['driftSpeed','intensity',o.kind === 'mesh' ? 'amplitude' : 'count'];
    if (family === 'pattern') return ['spacing',['dots','crosses','halftone'].includes(o.kind) ? 'size' : 'lineWidth','fade'];
    if (family === 'field' && o.kind === 'rain') return ['rainSpeed','rainWind','rainDensity'];
    if (family === 'art' && o.kind === 'metaballs') return ['interactionMode','interactionStrength','viscosity'];
    if (family === 'sketch' && o.kind === 'lightning') return ['strikeTrigger','strikeInterval','branches'];
    return ({water:['flowSpeed','distortion','caustic'],smoke:['density','depth','wind'],clouds:['coverage','density','wind'],aurora:['auroraSpeed','layers','stars'],fluid:['autoEmit','vorticity','radius'],field:['scale','intensity','detail'],sea:['waveHeight','waveSpeed','sunElevation'],art:['scale','amount','relief'],sketch:['count','bloom','scale']})[family] || ['speed','opacity','quality'];
  }
  function hint(item, o) {
    if (item.effect === 'glass') return 'Drag the panel across the background. Arrow keys move it; Home resets its position.';
    if (item.effect === 'trail') return o.trigger === 'move' ? 'Move across the preview to draw a trail. On touch screens, drag inside the preview.' : o.trigger === 'manual' ? 'Use the lab or the element’s burst() method for manual emission.' : 'Particle trigger: ' + o.trigger + '. Adjust spacing in the controls below.';
    if (item.effect === 'fluid') return 'Drag across the preview to add colour and movement.';
    if (item.effect === 'art' && o.kind === 'metaballs') return 'Move through the surface to stir nearby shapes.';
    if (item.effect === 'highlight') return 'Interact with the panel or focus its button to preview surface feedback.';
    if (item.effect === 'status') return 'Decorative visual only. Your application supplies progress and accessible status text.';
    if (item.effect === 'fire' && o.mode === 'out') return 'Outside flames need overflow space around the element.';
    if (item.effect === 'sketch' && o.kind === 'lightning') return 'Strike trigger: ' + o.strikeTrigger + '. The reduced-motion preview suppresses discharges.';
    if (item.effect === 'glow') return 'The interior is transparent. The glow is painted separately from the content.';
    return item.description;
  }
  function snippets(item, preset, options) {
    const base = defaults(item,preset), changed = {};
    const previewOnly = new Set(['motion','paused','dragEnabled','quality','dprCap','fps','forceFallback']);
    for (const key of Object.keys({...FrontendToolkit.COMMON_SCHEMA,...FrontendToolkit.SCHEMAS[item.effect]})) {
      if (!previewOnly.has(key) && options[key] !== base[key]) changed[key] = options[key];
    }
    const tag = 'ft-' + item.effect;
    const attrs = Object.entries(changed).map(([k,v]) => `  ${attr(k)}="${html(v)}"`).join('\n');
    const markup = `<script src="./dist/frontend-toolkit.js" defer></script>\n\n<div class="effect-demo">\n<${tag} class="effect-card" preset="${html(preset)}"${attrs ? '\n'+attrs : ''}>\n  <div class="content">\n    <h2>Project overview</h2>\n    <p>Your content remains standard HTML.</p>\n  </div>\n</${tag}>\n</div>`;
    const css = `.effect-demo {\n  padding: 3rem;\n  background: linear-gradient(125deg, #304e42, #7d9988);\n}\n\n.effect-card {\n  display: block;\n  width: min(100%, 600px);\n  min-height: 280px;\n  margin-inline: auto;\n  border-radius: 20px;\n  color: #f5f7ee;\n}\n\n.content {\n  position: relative;\n  padding: 2rem;\n}\n\n/* Do not clip ancestor overflow for outside flames or glow. */`;
    const js = `// With the classic script loaded, custom elements are registered.\nconst element = document.querySelector('${tag}');\nawait customElements.whenDefined('${tag}');\n\nelement.configure(${JSON.stringify(changed,null,2)});\n\n// Examples of lifecycle control:\n// element.pause();\n// element.play();\n// element.setPreset('${preset}');\n// Removing the element releases its renderer.\n\n// System-aware by default; this is an explicit opt-in only:\n// element.configure({ motion: 'always' });`;
    return {html:markup,css,js};
  }
  globalThis.ToolkitSiteModel = {catalog,groups,labels,byId,pretty,attr,defaults,presets,controls,hint,snippets};
})();
