// Preset data retained from the uploaded unified prototype.
export const ORIGINAL_CONFIG = {
    // Global Fallbacks
    defaults: {
      orientation: "auto", // Smart Default: Horizontal if w>=h, Vertical if w<h
      detail: 10,
      color: "oklch(0.65 0.12 50)",
      depth: 50,
      roughness: 9,
      grainX: 0.002,
      grainY: 0.02,
      glassBlur: "0px",
      glassBrightness: 1,
      glassDistortion: 200,
      glassFrosting: 0.01,
      glassEdgeColor: "oklch(1 0 0 / 0.7)"
    },

    // ALL Specific Material & Type Presets
    presets: {
      glass: {
        clear: {
          glassDistortion: 200
        },
        frosted: {
          glassFrosting: 0.01,
          glassDistortion: 200
        }
      },
      water: {
        default: {
          waterFlowSpeed: 0.4,
          waterMorphSpeed: 1.0,
          waterScale: 4.0,
          waterWindX: 3.0,
          waterWindY: 3.0,
          waterDistortion: 0.001,
          waterCaustic: 0.25,
          waterRidge: 3.0,
          waterTint: "oklch(0.55 0.12 230)",
          waterTintOpacity: 0.45,
          waterHighlight: "oklch(0.95 0.05 230)"
        }
      },
      wood: {
        // Original Woods
        oak: {
          color: "oklch(0.65 0.12 50)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 10,
          depth: 50,
          roughness: 9
        },
        mahogany: {
          color: "oklch(0.40 0.12 30)",
          grainX: 0.002,
          grainY: 0.04,
          detail: 12,
          depth: 50,
          roughness: 9
        },
        walnut: {
          color: "oklch(0.35 0.08 50)",
          grainX: 0.003,
          grainY: 0.015,
          detail: 12,
          depth: 70,
          roughness: 10
        },
        pine: {
          color: "oklch(0.80 0.10 80)",
          grainX: 0.001,
          grainY: 0.008,
          detail: 8,
          depth: 50,
          roughness: 8
        },
        cherry: {
          color: "oklch(0.55 0.14 40)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 10,
          depth: 50,
          roughness: 5
        },
        bamboo: {
          orientation: "vertical",
          color: "oklch(0.75 0.12 95)",
          grainX: 0.0001,
          grainY: 0.05,
          detail: 3,
          depth: 20,
          roughness: 6
        },
        driftwood: {
          color: "oklch(0.65 0.02 240)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 10,
          depth: 60,
          roughness: 12
        },
        burnt: {
          color: "oklch(0.25 0.02 40)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 12,
          depth: 50,
          roughness: 14
        },
        maple: {
          color: "oklch(0.85 0.08 75)",
          grainX: 0.001,
          grainY: 0.015,
          detail: 10,
          depth: 20,
          roughness: 4
        },
        teak: {
          color: "oklch(0.60 0.14 60)",
          grainX: 0.005,
          grainY: 0.03,
          detail: 10,
          depth: 40,
          roughness: 8
        },
        cedar: {
          color: "oklch(0.55 0.13 45)",
          grainX: 0.002,
          grainY: 0.025,
          detail: 10,
          depth: 45,
          roughness: 7
        },
        ash: {
          color: "oklch(0.80 0.08 80)",
          grainX: 0.004,
          grainY: 0.01,
          detail: 10,
          depth: 80,
          roughness: 9
        },
        rosewood: {
          color: "oklch(0.28 0.10 20)",
          grainX: 0.003,
          grainY: 0.03,
          detail: 15,
          depth: 70,
          roughness: 12
        },
        ebony: {
          color: "oklch(0.20 0.02 0)",
          grainX: 0.002,
          grainY: 0.06,
          detail: 10,
          depth: 30,
          roughness: 3
        },

        // Smooth Woods
        "smooth-oak": {
          color: "oklch(0.70 0.15 65)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 2,
          depth: 80,
          roughness: 6
        },
        "smooth-mahogany": {
          color: "oklch(0.45 0.15 30)",
          grainX: 0.002,
          grainY: 0.04,
          detail: 2,
          depth: 90,
          roughness: 7
        },
        "smooth-walnut": {
          color: "oklch(0.40 0.10 50)",
          grainX: 0.003,
          grainY: 0.015,
          detail: 1,
          depth: 120,
          roughness: 8
        },
        "smooth-pine": {
          color: "oklch(0.82 0.14 75)",
          grainX: 0.001,
          grainY: 0.015,
          detail: 2,
          depth: 90,
          roughness: 4
        },
        "smooth-cherry": {
          color: "oklch(0.60 0.16 45)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 1,
          depth: 70,
          roughness: 5
        },
        "smooth-bamboo": {
          orientation: "vertical",
          color: "oklch(0.80 0.14 95)",
          grainX: 0.0001,
          grainY: 0.03,
          detail: 1,
          depth: 40,
          roughness: 4
        },
        "smooth-driftwood": {
          color: "oklch(0.70 0.04 240)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 2,
          depth: 100,
          roughness: 8
        },
        "smooth-burnt": {
          color: "oklch(0.30 0.03 40)",
          grainX: 0.002,
          grainY: 0.02,
          detail: 2,
          depth: 110,
          roughness: 10
        },
        "smooth-maple": {
          color: "oklch(0.88 0.10 80)",
          grainX: 0.001,
          grainY: 0.015,
          detail: 1,
          depth: 30,
          roughness: 4
        },
        "smooth-teak": {
          color: "oklch(0.65 0.16 65)",
          grainX: 0.005,
          grainY: 0.03,
          detail: 2,
          depth: 50,
          roughness: 6
        },
        "smooth-cedar": {
          color: "oklch(0.60 0.15 45)",
          grainX: 0.002,
          grainY: 0.025,
          detail: 2,
          depth: 60,
          roughness: 6
        },
        "smooth-ash": {
          color: "oklch(0.85 0.10 85)",
          grainX: 0.004,
          grainY: 0.01,
          detail: 1,
          depth: 100,
          roughness: 5
        },
        "smooth-rosewood": {
          color: "oklch(0.35 0.12 25)",
          grainX: 0.003,
          grainY: 0.03,
          detail: 2,
          depth: 90,
          roughness: 8
        },
        "smooth-ebony": {
          color: "oklch(0.25 0.03 0)",
          grainX: 0.002,
          grainY: 0.06,
          detail: 1,
          depth: 40,
          roughness: 3
        }
      },
      marble: {
        carrara: {
          color: "oklch(0.95 0.01 220)",
          grainX: 0.003,
          grainY: 0.006,
          detail: 6,
          depth: 25,
          roughness: 3
        },
        nero: {
          color: "oklch(0.18 0.01 240)",
          grainX: 0.004,
          grainY: 0.012,
          detail: 8,
          depth: 40,
          roughness: 5
        },
        calacatta: {
          color: "oklch(0.95 0.01 40)",
          grainX: 0.004,
          grainY: 0.01,
          detail: 10,
          depth: 80,
          roughness: 9
        },
        statuario: {
          color: "oklch(0.92 0.005 240)",
          grainX: 0.001,
          grainY: 0.01,
          detail: 10,
          depth: 60,
          roughness: 12
        }
      },
      paper: {
        watercolor: {
          color: "oklch(0.96 0.04 80)",
          grainX: 0.05,
          grainY: 0.05,
          detail: 4,
          depth: 6,
          roughness: 0.8
        },
        buffalo: {
          color: "oklch(0.75 0.12 70)",
          grainX: 0.03,
          grainY: 0.03,
          detail: 5,
          depth: 8,
          roughness: 1.2
        }
      },
      wall: {
        default: {
          color: "oklch(0.94 0.02 240)",
          grainX: 0.3,
          grainY: 0.3,
          detail: 2,
          depth: 3,
          roughness: 0.3
        }
      }
    }
  };
