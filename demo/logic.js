(() => {
  'use strict';
  const FT=globalThis.FrontendToolkit;
  const CATALOG=[
  {
    "id": "glass",
    "effect": "glass",
    "preset": "liquid",
    "name": "Liquid glass",
    "group": "Optics",
    "description": "The exact original displacement map. Drag the card across the backdrop to inspect its refraction.",
    "word": "Liquid glass",
    "badge": "Displacement optics",
    "label": "01"
  },
  {
    "id": "frosted",
    "effect": "glass",
    "preset": "frosted",
    "name": "Frosted glass",
    "group": "Optics",
    "description": "Move the translucent pane. Try a grid or photograph behind it.",
    "word": "Frosted glass",
    "badge": "Turbulent refraction",
    "label": "02"
  },
  {
    "id": "water",
    "effect": "water",
    "preset": "pool",
    "name": "Water",
    "group": "Fluid",
    "description": "Moving caustics. Supply a texture or capture the editable HTML sample below.",
    "word": "Water",
    "badge": "Live-source refraction",
    "label": "03"
  },
  {
    "id": "wood",
    "effect": "surface",
    "preset": "wood/oak",
    "name": "Wood",
    "group": "Surfaces",
    "description": "Species-specific growth, pores and rays. Compare plain-sawn, quarter-sawn and end grain; color is independent of anatomy.",
    "word": "Wood",
    "badge": "Growth-ring texture",
    "label": "04"
  },
  {
    "id": "marble",
    "effect": "surface",
    "preset": "marble/carrara",
    "name": "Marble",
    "group": "Surfaces",
    "description": "Fine mineral veins and a quiet stone surface.",
    "word": "Marble",
    "badge": "Mineral veins",
    "label": "05"
  },
  {
    "id": "paper",
    "effect": "surface",
    "preset": "paper/cotton",
    "name": "Paper",
    "group": "Surfaces",
    "description": "Cotton pulp, tiny fibers and restrained relief; try kraft or parchment too.",
    "word": "Paper",
    "badge": "Pulp & fibers",
    "label": "06"
  },
  {
    "id": "wall",
    "effect": "surface",
    "preset": "wall/limewash",
    "name": "Limewash",
    "group": "Surfaces",
    "description": "Broad plaster variation with a finely textured finish.",
    "word": "Limewash",
    "badge": "Architectural surface",
    "label": "07"
  },
  {
    "id": "linen",
    "effect": "surface",
    "preset": "linen/natural",
    "name": "Linen",
    "group": "Surfaces",
    "description": "Interlaced warp and weft, thread variation and directional lighting.",
    "word": "Linen",
    "badge": "Woven threads",
    "label": "08"
  },
  {
    "id": "slate",
    "effect": "surface",
    "preset": "slate/charcoal",
    "name": "Slate",
    "group": "Surfaces",
    "description": "Layered, fractured stone with grazing-light relief.",
    "word": "Slate",
    "badge": "Stone strata",
    "label": "09"
  },
  {
    "id": "cork",
    "effect": "surface",
    "preset": "cork/natural",
    "name": "Cork",
    "group": "Surfaces",
    "description": "Cellular grain and irregular flecks. No repeating bitmap tile.",
    "word": "Cork",
    "badge": "Cellular grain",
    "label": "10"
  },
  {
    "id": "sand",
    "effect": "surface",
    "preset": "sand/dunes",
    "name": "Sand",
    "group": "Surfaces",
    "description": "Wind-shaped ripples and small grains under directional light.",
    "word": "Sand",
    "badge": "Wind-shaped dunes",
    "label": "11"
  },
  {
    "id": "granite",
    "effect": "surface",
    "preset": "granite/salt-pepper",
    "name": "Granite",
    "group": "Surfaces",
    "description": "A dense mix of fine and coarse mineral flecks.",
    "word": "Granite",
    "badge": "Mineral aggregate",
    "label": "12"
  },
  {
    "id": "fire",
    "effect": "fire",
    "preset": "hearth",
    "name": "Fire",
    "group": "Atmosphere",
    "description": "The classic hearth style, with external emitters and directional buoyancy added. Try the ribbon-flame preset for folded sheets inspired by the reference.",
    "word": "Fire",
    "badge": "Folded flame sheets",
    "label": "13"
  },
  {
    "id": "candle",
    "effect": "fire",
    "preset": "candle",
    "name": "Candle",
    "group": "Atmosphere",
    "description": "A narrow, gently flickering flame with a dark fuel core and optional blue base.",
    "word": "Candle",
    "badge": "Analytic flame shell",
    "label": "14"
  },
  {
    "id": "burning-border",
    "effect": "fire",
    "preset": "burning-border",
    "name": "Burning border",
    "group": "Atmosphere",
    "description": "Flame emitted outside the rounded edge. The middle remains transparent.",
    "word": "Burning border",
    "badge": "External emitter",
    "label": "15"
  },
  {
    "id": "flamethrower",
    "effect": "fire",
    "preset": "flamethrower",
    "name": "Directional fire",
    "group": "Atmosphere",
    "description": "A right-facing jet that bends upward with distance. Try direction, source edge and buoyancy.",
    "word": "Directional fire",
    "badge": "Buoyant jet",
    "label": "16"
  },
  {
    "id": "smoke",
    "effect": "smoke",
    "preset": "plume",
    "name": "Volumetric smoke",
    "group": "Atmosphere",
    "description": "Ray-marched three-dimensional density with internal shadowing. Stir locally with the pointer; there is no camera parallax.",
    "word": "Volumetric smoke",
    "badge": "Lit density volume",
    "label": "17"
  },
  {
    "id": "clouds",
    "effect": "clouds",
    "preset": "cumulus",
    "name": "Clouds",
    "group": "Atmosphere",
    "description": "Soft billows, internal shading and a configurable sky.",
    "word": "Clouds",
    "badge": "Layered density field",
    "label": "18"
  },
  {
    "id": "aurora",
    "effect": "aurora",
    "preset": "borealis",
    "name": "Aurora",
    "group": "Atmosphere",
    "description": "Light curtains, now sharing the adaptive frame-budget controller.",
    "word": "Aurora",
    "badge": "Layered curtain field",
    "label": "19"
  },
  {
    "id": "glow",
    "effect": "glow",
    "preset": "prism",
    "name": "Glowing border",
    "group": "Light",
    "description": "A truly transparent center. The light advances by distance along the contour, not by angle.",
    "word": "Glowing border",
    "badge": "Arc-length motion",
    "label": "20"
  },
  {
    "id": "fluid",
    "effect": "fluid",
    "preset": "ink",
    "name": "Interactive fluid",
    "group": "Interactive",
    "description": "Move your pointer to inject dye and velocity. Switch between ink, smoke, fire and neon.",
    "word": "Interactive fluid",
    "badge": "Pressure-projected fluid",
    "label": "21"
  },
  {
    "id": "stars",
    "effect": "trail",
    "preset": "stars",
    "name": "Star trails",
    "group": "Interactive",
    "description": "Paint a trail of stars. Emission, lifetime, gravity and color are adjustable.",
    "word": "Star trails",
    "badge": "Pooled particles",
    "label": "22"
  },
  {
    "id": "flowers",
    "effect": "trail",
    "preset": "flowers",
    "name": "Flower trails",
    "group": "Interactive",
    "description": "Bloom with every gesture. Try petals, confetti, bubbles, fireflies or snow in the preset menu.",
    "word": "Flower trails",
    "badge": "Procedural sprites",
    "label": "23"
  },
  {
    "id": "smoke-trail",
    "effect": "trail",
    "preset": "smoke",
    "name": "Smoke trails",
    "group": "Interactive",
    "description": "A portable particle trail, distinct from the volume and fluid smoke renderers.",
    "word": "Smoke trails",
    "badge": "Curling billboards",
    "label": "24"
  },
  {
    "id": "comet",
    "effect": "trail",
    "preset": "comet",
    "name": "Comet trails",
    "group": "Interactive",
    "description": "Sparks with directional streaks and a luminous tail.",
    "word": "Comet trails",
    "badge": "Luminous motion",
    "label": "25"
  },
  {
    "id": "ocean",
    "effect": "field",
    "preset": "ocean",
    "name": "Ocean light",
    "group": "Fields",
    "description": "Moving wave normals, reflected light and highlights. A decorative field, not a DOM refraction effect.",
    "word": "Ocean light",
    "badge": "Wave-normal shading",
    "label": "26"
  },
  {
    "id": "lava",
    "effect": "field",
    "preset": "lava",
    "name": "Molten lava",
    "group": "Fields",
    "description": "Bright fissures move beneath a cooling crust.",
    "word": "Molten lava",
    "badge": "Emissive fracture field",
    "label": "27"
  },
  {
    "id": "nebula",
    "effect": "field",
    "preset": "nebula",
    "name": "Nebula",
    "group": "Fields",
    "description": "Drifting color, layered fractal density and stars.",
    "word": "Nebula",
    "badge": "Procedural star field",
    "label": "28"
  },
  {
    "id": "rain",
    "effect": "field",
    "preset": "rain",
    "name": "Rain",
    "group": "Fields",
    "description": "Layered falling drops with explicit CSS-pixel speed, crosswind and depth. Motion follows continuous trajectories.",
    "word": "Rain",
    "badge": "Droplet field",
    "label": "29"
  },
  {
    "id": "iridescence",
    "effect": "field",
    "preset": "iridescence",
    "name": "Iridescence",
    "group": "Fields",
    "description": "Shifting bands of color with a gently warped, thin-film appearance.",
    "word": "Iridescence",
    "badge": "Thin-film colors",
    "label": "30"
  },
  {
    "id": "magnetic",
    "effect": "field",
    "preset": "magnetic",
    "name": "Magnetic lines",
    "group": "Fields",
    "description": "A moving contour field that responds to your pointer.",
    "word": "Magnetic lines",
    "badge": "Interactive contours",
    "label": "31"
  },
  {
    "id": "snowfall",
    "effect": "fall",
    "preset": "snow",
    "name": "Snowfall",
    "group": "Atmosphere",
    "description": "Round snow, six-armed snowflakes and hexagonal crystals, separately or mixed. Adjust fall speed, crosswind and density.",
    "word": "Snowfall",
    "badge": "Falling particles",
    "label": "73"
  },
  {
    "id": "autumn-leaves",
    "effect": "fall",
    "preset": "autumn-leaves",
    "name": "Autumn leaves",
    "group": "Atmosphere",
    "description": "Maple, oak and birch leaves descend with depth, lateral drift and tumbling. Shapes and colors are independently configurable.",
    "word": "Autumn leaves",
    "badge": "Falling particles",
    "label": "74"
  },
  {
    "id": "falling-petals",
    "effect": "fall",
    "preset": "cherry-petals",
    "name": "Falling petals",
    "group": "Atmosphere",
    "description": "Cherry, rose and oval petals with soft shading and gentle flutter. A transparent overlay for existing content.",
    "word": "Falling petals",
    "badge": "Falling particles",
    "label": "75"
  },
  {
    "id": "drifting-seeds",
    "effect": "fall",
    "preset": "dandelion-seeds",
    "name": "Drifting seeds",
    "group": "Atmosphere",
    "description": "Light parachute seeds and seed down carried by a configurable crosswind. No pointer interaction or downloaded images.",
    "word": "Drifting seeds",
    "badge": "Falling particles",
    "label": "76"
  }
];
  CATALOG.push(
{"id": "sea", "effect": "sea", "preset": "golden", "name": "Open sea", "group": "Landscapes", "description": "A bounded height-field sea reflecting a sky, sun and distant haze. Signed travelling waves, analytical normals and an actually flat Glassy preset. Try Calm, daylight, sunset or moonlight.", "word": "Open sea", "badge": "Sky reflection", "label": "32"},
{"id": "metaballs", "effect": "art", "preset": "metaballs", "name": "Liquid metal", "group": "Optical art", "description": "Smoothly merging 3D implicit surfaces with moving reflected lights. Stir every nearby surface with the local brush, or switch to autonomous motion.", "word": "Liquid metal", "badge": "Implicit geometry", "label": "33"},
{"id": "silk", "effect": "art", "preset": "silk", "name": "Silk", "group": "Optical art", "description": "Soft fabric folds, directional sheen and slow deformation.", "word": "Silk", "badge": "Folded surface", "label": "34"},
{"id": "interference", "effect": "art", "preset": "interference", "name": "Interference", "group": "Optical art", "description": "Two wave sources create a changing interference pattern. Move the pointer to reposition one source.", "word": "Interference", "badge": "Wave superposition", "label": "35"},
{"id": "tunnel", "effect": "art", "preset": "tunnel", "name": "Light tunnel", "group": "Optical art", "description": "An autonomous perspective light lattice without pointer-driven camera movement.", "word": "Light tunnel", "badge": "Log-polar lattice", "label": "36"},
{"id": "orbit", "effect": "sketch", "preset": "orbit", "name": "Orbital filaments", "group": "Kinetic art", "description": "Perspective-projected knot curves with depth-sensitive line weight and traveling highlights.", "word": "Orbital filaments", "badge": "Projected line geometry", "label": "37"},
{"id": "constellation", "effect": "sketch", "preset": "constellation", "name": "Constellation", "group": "Kinetic art", "description": "Locally connected drifting points. A spatial grid bounds neighbor searches.", "word": "Constellation", "badge": "Spatial neighbor grid", "label": "38"},
{"id": "lightning", "effect": "sketch", "preset": "lightning", "name": "Lightning", "group": "Atmosphere", "description": "Branching discharges without a full-screen flash. Reduced motion suppresses this effect by default.", "word": "Lightning", "badge": "Branching paths", "label": "39"},
{"id": "blobs", "effect": "sketch", "preset": "blobs", "name": "Organic forms", "group": "Kinetic art", "description": "Smooth harmonic silhouettes that respond locally to the pointer.", "word": "Organic forms", "badge": "Harmonic contours", "label": "40"},
{"id": "jellyfish", "effect": "sketch", "preset": "jellyfish", "name": "Jellyfish", "group": "Nature", "description": "Translucent bells, rhythmic pulses and layered drifting tentacles.", "word": "Jellyfish", "badge": "Layered living geometry", "label": "41"}
  );
  CATALOG.push(...[
  {
    "id": "spotlight",
    "effect": "highlight",
    "preset": "spotlight",
    "name": "Surface spotlight",
    "group": "Feedback",
    "description": "A local soft highlight follows the pointer over a card without moving its content. Choose hover, focus, press or automatic activation.",
    "word": "Surface spotlight",
    "badge": "Local illumination",
    "label": "42"
  },
  {
    "id": "sheen",
    "effect": "highlight",
    "preset": "sheen",
    "name": "Sweep highlight",
    "group": "Feedback",
    "description": "A restrained diagonal sheen for calls to action and product cards. Hover, click, automatic or manual pulses.",
    "word": "Sweep highlight",
    "badge": "Clipped light sweep",
    "label": "43"
  },
  {
    "id": "ripple",
    "effect": "highlight",
    "preset": "ripple",
    "name": "Click ripple",
    "group": "Feedback",
    "description": "Click to emit an expanding, fading surface ripple. Real buttons still receive their normal clicks; keyboard activation works too.",
    "word": "Click ripple",
    "badge": "Bounded feedback pulse",
    "label": "44"
  },
  {
    "id": "sparkle",
    "effect": "highlight",
    "preset": "sparkle",
    "name": "Surface sparkles",
    "group": "Feedback",
    "description": "Small local glints for premium finishes, rewards and subtle celebrations. Independent of pointer trails.",
    "word": "Surface sparkles",
    "badge": "Seeded glints",
    "label": "45"
  },
  {
    "id": "foil",
    "effect": "highlight",
    "preset": "foil",
    "name": "Holographic foil",
    "group": "Feedback",
    "description": "A reflective finish for product and membership cards. Light moves locally; the card itself stays in place.",
    "word": "Holographic foil",
    "badge": "Foil microstructure",
    "label": "46"
  },
  {
    "id": "edge-light",
    "effect": "highlight",
    "preset": "edge-light",
    "name": "Proximity edge light",
    "group": "Feedback",
    "description": "A transparent rounded-edge highlight near the pointer. Try the Keyboard focus preset for a focus-triggered decorative accent.",
    "word": "Proximity edge light",
    "badge": "Local edge illumination",
    "label": "47"
  },
  {
    "id": "soft-pulse",
    "effect": "highlight",
    "preset": "soft-pulse",
    "name": "Soft pulse",
    "group": "Feedback",
    "description": "A gentle expanding accent for location markers or opt-in notifications. Repetition, size and opacity are configurable.",
    "word": "Soft pulse",
    "badge": "Low-opacity pulse",
    "label": "48"
  },
  {
    "id": "mesh",
    "effect": "backdrop",
    "preset": "mesh",
    "name": "Mesh gradient",
    "group": "Backgrounds",
    "description": "Layered soft color fields for hero sections and cards, with a static fine-grain finish. Set drift speed to zero for a cached still composition.",
    "word": "Mesh gradient",
    "badge": "Layered color fields",
    "label": "49"
  },
  {
    "id": "bokeh",
    "effect": "backdrop",
    "preset": "bokeh",
    "name": "Bokeh lights",
    "group": "Backgrounds",
    "description": "Defocused aperture lights add depth without distracting from content. Sprites are cached rather than reconstructed every frame.",
    "word": "Bokeh lights",
    "badge": "Cached aperture sprites",
    "label": "50"
  },
  {
    "id": "sunbeams",
    "effect": "backdrop",
    "preset": "sunbeams",
    "name": "Sunbeams",
    "group": "Backgrounds",
    "description": "Soft directional shafts with a configurable origin, tint, width and movement. A decorative overlay, not scene-aware ray tracing.",
    "word": "Sunbeams",
    "badge": "Directional light shafts",
    "label": "51"
  },
  {
    "id": "window-shadows",
    "effect": "backdrop",
    "preset": "window-shadows",
    "name": "Window shadows",
    "group": "Backgrounds",
    "description": "Quiet architectural shadows for editorial layouts. Change the caster, direction, density and surface color.",
    "word": "Window shadows",
    "badge": "Projected window geometry",
    "label": "52"
  },
  {
    "id": "leaf-shadows",
    "effect": "backdrop",
    "preset": "leaf-shadows",
    "name": "Leaf shadows",
    "group": "Backgrounds",
    "description": "Soft moving foliage silhouettes for lifestyle pages, product scenes and natural materials.",
    "word": "Leaf shadows",
    "badge": "Foliage silhouettes",
    "label": "53"
  },
  {
    "id": "wave-divider",
    "effect": "backdrop",
    "preset": "wave-divider",
    "name": "Wave divider",
    "group": "Backgrounds",
    "description": "Layered moving waves anchored to any edge, with a genuinely transparent empty region. Useful for separating page sections.",
    "word": "Wave divider",
    "badge": "Edge-attached waves",
    "label": "54"
  },
  {
    "id": "contours",
    "effect": "backdrop",
    "preset": "contours",
    "name": "Topographic contours",
    "group": "Backgrounds",
    "description": "Thin map-like isolines for technical, outdoor or editorial layouts. Static by setting drift speed to zero.",
    "word": "Topographic contours",
    "badge": "Marching-squares contours",
    "label": "55"
  },
  {
    "id": "dots",
    "effect": "pattern",
    "preset": "dots",
    "name": "Dot grid",
    "group": "Patterns",
    "description": "A resolution-aware dot texture. Control CSS-pixel spacing, dot size, irregularity and coverage; no frame loop when static.",
    "word": "Dot grid",
    "badge": "Cached dot tile",
    "label": "56"
  },
  {
    "id": "grid",
    "effect": "pattern",
    "preset": "grid",
    "name": "Grid lines",
    "group": "Patterns",
    "description": "Fine grid geometry for diagrams, dashboards and technical backgrounds. Try Blueprint for an opaque colored base.",
    "word": "Grid lines",
    "badge": "Cached line grid",
    "label": "57"
  },
  {
    "id": "crosses",
    "effect": "pattern",
    "preset": "crosses",
    "name": "Cross grid",
    "group": "Patterns",
    "description": "Small registration marks for structured layouts. All geometry is procedural; spacing is independent of element size.",
    "word": "Cross grid",
    "badge": "Registration texture",
    "label": "58"
  },
  {
    "id": "hexagons",
    "effect": "pattern",
    "preset": "hexagons",
    "name": "Hexagon grid",
    "group": "Patterns",
    "description": "A seamless honeycomb field for technical or scientific backgrounds. Line weight and cell spacing are independent.",
    "word": "Hexagon grid",
    "badge": "Hexagonal lattice",
    "label": "59"
  },
  {
    "id": "diagonal",
    "effect": "pattern",
    "preset": "diagonal",
    "name": "Diagonal hatching",
    "group": "Patterns",
    "description": "Transparent hatching for chart regions, card overlays and quiet background structure. Optional drift remains opt-in.",
    "word": "Diagonal hatching",
    "badge": "Directional hatch",
    "label": "60"
  },
  {
    "id": "halftone",
    "effect": "pattern",
    "preset": "halftone",
    "name": "Halftone field",
    "group": "Patterns",
    "description": "A two-tone dot field with spatially varying mark sizes, useful for editorial covers and understated print-like texture.",
    "word": "Halftone field",
    "badge": "Variable dot area",
    "label": "61"
  },
  {
    "id": "arches",
    "effect": "pattern",
    "preset": "arches",
    "name": "Scalloped arches",
    "group": "Patterns",
    "description": "A decorative architectural rhythm with independent ink, spacing and orientation controls.",
    "word": "Scalloped arches",
    "badge": "Repeating arch geometry",
    "label": "62"
  },
  {
    "id": "tiles",
    "effect": "pattern",
    "preset": "tiles",
    "name": "Winding tiles",
    "group": "Patterns",
    "description": "Seeded quarter-circle tiles create continuous interlocking paths, for decorative surfaces or packaging-inspired layouts.",
    "word": "Winding tiles",
    "badge": "Truchet-style paths",
    "label": "63"
  },
  {
    "id": "skeleton",
    "effect": "status",
    "preset": "skeleton",
    "name": "Loading skeleton",
    "group": "Status",
    "description": "A clipped placeholder layout with a gentle sweep. Your application owns loading state and accessible status text.",
    "word": "Loading skeleton",
    "badge": "Cached placeholder mask",
    "label": "64"
  },
  {
    "id": "avatar-placeholder",
    "effect": "status",
    "preset": "avatar-placeholder",
    "name": "Profile placeholder",
    "group": "Status",
    "description": "A circular avatar placeholder with configurable text bars and shimmer. No image or text is downloaded.",
    "word": "Profile placeholder",
    "badge": "Avatar and text placeholders",
    "label": "65"
  },
  {
    "id": "card-placeholder",
    "effect": "status",
    "preset": "card-placeholder",
    "name": "Card placeholder",
    "group": "Status",
    "description": "A media block and text skeleton for cards. Layout, line count, position and dimensions are configurable.",
    "word": "Card placeholder",
    "badge": "Media placeholder layout",
    "label": "66"
  },
  {
    "id": "progress-ring",
    "effect": "status",
    "preset": "progress-ring",
    "name": "Progress ring",
    "group": "Status",
    "description": "A real value-driven arc. Set value from zero to one; completion is never inferred or fabricated by the effect.",
    "word": "Progress ring",
    "badge": "Determinate progress",
    "label": "67"
  },
  {
    "id": "progress-bar",
    "effect": "status",
    "preset": "progress-bar",
    "name": "Progress bar",
    "group": "Status",
    "description": "A rounded progress track driven by your application. Opt into indeterminate motion only when the amount is unknown.",
    "word": "Progress bar",
    "badge": "Value-driven track",
    "label": "68"
  },
  {
    "id": "segmented-progress",
    "effect": "status",
    "preset": "segmented-progress",
    "name": "Segmented progress",
    "group": "Status",
    "description": "A segmented value indicator, including a partially filled final segment. Adjust count, gaps, thickness and corner shape.",
    "word": "Segmented progress",
    "badge": "Partial-segment fill",
    "label": "69"
  },
  {
    "id": "loading-ring",
    "effect": "status",
    "preset": "loading-ring",
    "name": "Loading arc",
    "group": "Status",
    "description": "A compact indeterminate arc with adjustable sweep, timing and stroke. Reduced motion leaves a quiet static indicator.",
    "word": "Loading arc",
    "badge": "Indeterminate arc",
    "label": "70"
  },
  {
    "id": "loading-dots",
    "effect": "status",
    "preset": "loading-dots",
    "name": "Loading dots",
    "group": "Status",
    "description": "A small phased-dot loading indicator, with a configurable number of dots, duration and amplitude.",
    "word": "Loading dots",
    "badge": "Phased indicator",
    "label": "71"
  },
  {
    "id": "equalizer",
    "effect": "status",
    "preset": "equalizer",
    "name": "Activity bars",
    "group": "Status",
    "description": "A compact decorative activity visualization. This is not audio-reactive; control visibility and amplitude from your application.",
    "word": "Activity bars",
    "badge": "Decorative activity bars",
    "label": "72"
  }
]);
  const lookup=id=>CATALOG.find(item=>item.id===id);
  const defaults=id=>({...FT.getDefaults(lookup(id).effect,lookup(id).preset),dragEnabled:['glass','frosted'].includes(id)});
  function initial(){return {current:'glass',configs:Object.fromEntries(CATALOG.map(item=>[item.id,defaults(item.id)])),presets:Object.fromEntries(CATALOG.map(item=>[item.id,item.preset])),scene:{background:'palette',width:72,height:290,radius:30,content:true,fill:0},codeTab:'html'};}
  function cleanScene(scene={}){
    return {background:['palette','grid','photo','dark','light','checker'].includes(scene.background)?scene.background:'palette',width:Math.min(100,Math.max(30,Number(scene.width)||78)),height:Math.min(520,Math.max(150,Number(scene.height)||290)),radius:Math.min(90,Math.max(0,Number.isFinite(Number(scene.radius))?Number(scene.radius):30)),content:scene.content!==false,fill:Math.min(1,Math.max(0,Number(scene.fill)||0))};
  }
  function validate(document){
    if(!document||typeof document!=='object'||document.version!==2||!lookup(document.id))throw new Error('This is not a version 2 Material Lab configuration.');
    const item=lookup(document.id);
    if(item.effect==='trail'&&!Object.hasOwn(document.config??{},'trigger'))document={...document,config:{...document.config,trigger:'move',autoEmit:false}};
    const preset=typeof document.preset==='string'&&Object.hasOwn(FT.PRESETS[item.effect],document.preset)?FT.canonicalPreset(item.effect,document.preset):item.preset;
    return {id:item.id,config:FT.normalizeOptions(item.effect,document.config??{},{...defaults(item.id),...FT.getDefaults(item.effect,preset)}),preset,scene:cleanScene(document.scene)};
  }
  function serialize(state){return {version:2,revision:7,id:state.current,preset:state.presets[state.current],config:state.configs[state.current],scene:state.scene};}
  function apply(state,input){const data=validate(input);state.current=data.id;state.configs[data.id]=data.config;state.presets[data.id]=data.preset;state.scene=data.scene;return state;}
  function load(){
    const state=initial();
    let notice='';
    try{const saved=localStorage.getItem('ft-material-lab-v2');if(saved){const data=JSON.parse(saved);apply(state,data);if(!data.revision||data.revision<7)notice='Earlier settings preserved. Reset the preset to try the current defaults.';}}catch{}
    if(location.hash.startsWith('#lab='))try{
      if(location.hash.length>24000)throw new Error('Shared configuration is too large.');
      apply(state,JSON.parse(decodeURIComponent(location.hash.slice(5))));notice='Shared configuration loaded.';
    }catch(error){notice=error.message;}
    if(!location.hash.startsWith('#lab=')){const selected=new URLSearchParams(location.search).get('effect');if(lookup(selected))state.current=selected;}
    return {state,notice};
  }
  function save(state){try{localStorage.setItem('ft-material-lab-v2',JSON.stringify(serialize(state)));}catch{}}
  function patch(state,values){const item=lookup(state.current);state.configs[item.id]=FT.normalizeOptions(item.effect,values,state.configs[item.id]);}
  function preset(state,name){const item=lookup(state.current);if(!FT.PRESETS[item.effect][name])return;state.presets[item.id]=FT.canonicalPreset(item.effect,name);const drag=state.configs[item.id].dragEnabled;state.configs[item.id]={...FT.getDefaults(item.effect,name),dragEnabled:drag};}
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  function snippet(state,tab){
    const item=lookup(state.current),config=state.configs[item.id];const presetName=state.presets[item.id];
    const base=FT.getDefaults(item.effect,presetName);
    const changes=Object.fromEntries(Object.entries(config).filter(([key,value])=>value!==base[key]));
    const tag=`ft-${item.effect}`;
    if(tab==='loading')return `<script type="module" src="./dist/frontend-toolkit.loader.js"></script>\n<${tag} loading="visible" preset="${escape(presetName)}">…</${tag}>\n\n<!-- Modes: eager | visible | load | idle | manual.\n     Selective modules need HTTP(S), not file://. -->\n\n<script type="module">\n  import { preload } from './dist/frontend-toolkit.loader.js';\n  await preload(['${item.effect}'], { when: 'idle' });\n  // Manual element: await element.load();\n</script>\n\n<!-- The classic script is the all-in-one alternative.\n     Use ONE entry point, not both. Idle loading schedules\n     work on the main thread; it is not a worker. -->`;
    if(tab==='json')return JSON.stringify(serialize(state),null,2);
    if(tab==='js')return `import { create${item.effect[0].toUpperCase()+item.effect.slice(1)}Renderer, getDefaults }\n  from './dist/frontend-toolkit.esm.js';\n\n// 'layer' is a positioned decorative div, sized by your CSS.\nconst renderer = create${item.effect[0].toUpperCase()+item.effect.slice(1)}Renderer(\n  document.querySelector('.effect-layer'),\n  { ...getDefaults('${item.effect}', '${presetName}'),\n    ...${JSON.stringify(changes,null,2).replaceAll('\n','\n    ')} }\n);\nrenderer.resize(${Math.round(720*state.scene.width/100)}, ${state.scene.height});\nrenderer.render(0); // Seconds. Supply your own clock if animating.\n\n// Update without recreating the renderer:\nrenderer.setOptions({ ${item.effect==='glass'?'distortion: 120':item.effect==='surface'?'depth: 30':item.effect==='glow'?'width: 3':item.effect==='aurora'?'layers: 32':item.effect==='fluid'?'vorticity: 20':item.effect==='trail'?'size: 18':item.effect==='sea'?'waveHeight: .4':item.effect==='sketch'?'width: 2':item.effect==='highlight'?'intensity: .7':item.effect==='backdrop'?'driftSpeed: .1':item.effect==='pattern'?'spacing: 24':item.effect==='status'?'value: .8':item.effect==='fire'?'flameSpeed: 3':'scale: 3'} });\n// renderer.destroy(); // Release resources when done.\n\n// Low-level render(time) receives effect time directly.\n// For automatic clocks, resize, pause and visibility: mountEffect().`;
    if(tab==='css')return `${tag} {\n  width: min(100%, ${Math.round(720*state.scene.width/100)}px);\n  min-height: ${state.scene.height}px;\n  border-radius: ${state.scene.radius}px;\n}\n\n.card-content {\n  position: relative;\n  padding: 2rem;\n}\n\n/* For glass, paint a background behind the element.\n   For glow, allow overflow so the outer bloom is visible.\n   A CSS-only renderer uses no per-frame WebGL work. */`;
    const attrs=Object.entries(changes).map(([key,value])=>`  ${key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}="${escape(value)}"`).join('\n');
    return `<script src="./dist/frontend-toolkit.js" defer></script>\n\n<${tag} preset="${escape(presetName)}"${attrs?'\n'+attrs:''}>\n  <div class="card-content">\n    <h2>Your content stays real HTML.</h2>\n    <button type="button">Try it</button>\n  </div>\n</${tag}>\n\n<!-- Add the dimensions from the CSS tab.\n     No CDN, package install, or framework required. -->`;
  }
  globalThis.ToolkitLab={CATALOG,lookup,defaults,initial,cleanScene,validate,serialize,apply,load,save,patch,preset,snippet};
})();
