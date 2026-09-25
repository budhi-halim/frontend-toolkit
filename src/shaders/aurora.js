// Retained original aurora field/ray accumulation, with numerical guards.
export const AURORA_FRAGMENT = `
                precision highp float;
                uniform vec2 u_resolution; uniform float u_time; 
                uniform float u_cameraSpeed; uniform float u_cameraSwaySpeed; uniform float u_cameraSwayAmplitude;
                uniform float u_cameraTilt; uniform float u_cameraFov; uniform float u_cameraDistance;
                uniform float u_auroraLayers; uniform float u_auroraSpeed;
                uniform float u_breathSpeed; uniform float u_breathOffset; uniform float u_breathAmplitude;
                uniform vec3 u_colorBottom; uniform vec3 u_colorTop; uniform float u_colorProportion;
                uniform vec3 u_skyTop; uniform vec3 u_skyBottom;
                uniform float u_showStars; uniform float u_starDistance; uniform float u_starSize;
                uniform vec3 u_starColor; uniform float u_starOpacity;
                uniform float u_starDensityBottom; uniform float u_starDensityTop; uniform float u_starSkewExponent;

                float random(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }

                mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
                    vec3 rr = vec3(sin(roll), cos(roll), 0.0);
                    vec3 ww = normalize(target - origin);
                    vec3 uu = cross(ww, rr);
                    vec3 vv = cross(uu, ww);
                    return mat3(uu, vv, ww);
                }

                mat2 mm2(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
                float tri(in float x){return clamp(abs(fract(x)-0.5), 0.01, 0.49);}
                vec2 tri2(in vec2 p){return vec2(tri(p.x)+tri(p.y), tri(p.y+tri(p.x)));}

                float fbmAurora(vec2 p) {
                    float z = 1.8; float z2 = 2.5; float rz = 0.0;
                    p *= mm2(p.x * 0.06); vec2 bp = p;
                    for (int i = 0; i < 5; i++) {
                        vec2 dg = tri2(bp * 1.85) * 0.75;
                        dg *= mm2(u_time * u_auroraSpeed);
                        p -= dg / z2; bp *= 1.3; z2 *= 0.45; z *= 0.42;
                        p *= 1.21 + (rz - 1.0) * 0.02;
                        rz += tri(p.x + tri(p.y)) * z;
                        float breath = u_breathOffset + u_breathAmplitude * sin(u_time * u_breathSpeed);
                        p *= breath;
                    }
                    return clamp(1.0 / pow(rz * 20.0, 1.3), 0.0, 1.0);
                }

                vec4 aurora(vec3 rd) {
                    vec4 col = vec4(0.0); vec4 avgCol = vec4(0.0);
                    float brightnessComp = 50.0 / max(1.0, u_auroraLayers);
                    for (int i = 0; i < 150; i++) {
                        if (float(i) >= u_auroraLayers) break;
                        float fi = float(i);
                        float of = 0.006 * random(gl_FragCoord.xy) * smoothstep(0.0, 15.0, fi);
                        float den = rd.y * 2.0 + 0.4;
                        den = (den < 0.0 ? -1.0 : 1.0) * max(abs(den), 0.015);
                        float pt = ((0.8 + pow(fi, 1.4) * 0.002)) / den;
                        pt -= of;
                        vec3 bpos = 5.5 + pt * rd; vec2 p = bpos.zx;
                        float rzt = fbmAurora(p);
                        float alt = fi / max(1.0, u_auroraLayers); 
                        float blendAmount = smoothstep(u_colorProportion - 0.4, u_colorProportion + 0.4, alt);
                        vec3 layerColor = mix(u_colorBottom, u_colorTop, blendAmount);
                        vec4 col2 = vec4(layerColor * rzt, rzt);
                        avgCol = mix(avgCol, col2, 0.5);
                        float mapped_i = alt * 50.0;
                        col += avgCol * exp2(-mapped_i * 0.065 - 2.5) * smoothstep(0.0, 5.0, mapped_i) * brightnessComp;
                    }
                    col *= clamp(rd.y * 15.0 + 0.4, 0.0, 1.0);
                    return smoothstep(0.0, 1.1, col * 1.5);
                }

                vec3 renderStars(vec2 uv, vec2 res) {
                    if (u_showStars < 0.5) return vec3(0.0);
                    vec2 p = uv * res; vec2 grid = p / max(u_starDistance, 1.0);
                    vec2 id = floor(grid); vec2 f = fract(grid) - 0.5;
                    float existence = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
                    float brightness = fract(sin(dot(id, vec2(72.09, 31.32))) * 231.43);
                    float density = mix(u_starDensityBottom, u_starDensityTop, pow(uv.y, u_starSkewExponent));
                    if (existence > density) return vec3(0.0);
                    float r1 = fract(sin(dot(id, vec2(14.2, 53.1))) * 43758.5);
                    float r2 = fract(sin(dot(id, vec2(39.3, 11.1))) * 43758.5);
                    vec2 offset = vec2(r1, r2) - 0.5;
                    float d = length(f - offset * 0.8);
                    float pixelDist = d * max(u_starDistance, 1.0);
                    float radius = u_starSize * brightness;
                    float glow = (1.0 - smoothstep(radius, radius + 1.0, pixelDist));
                    return u_starColor * glow * brightness * u_starOpacity;
                }

                void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
                    vec2 uv = fragCoord.xy / u_resolution.xy;
                    vec2 p = (-u_resolution.xy + 2.0 * gl_FragCoord.xy) / u_resolution.y;
                    float t = u_time * u_cameraSpeed; 
                    vec3 ro = vec3(0.0, 0.0, t);
                    float sway = sin(u_time * u_cameraSwaySpeed) * u_cameraSwayAmplitude;
                    vec3 target = ro + vec3(sway, u_cameraTilt, u_cameraDistance);
                    mat3 cam = calcLookAtMatrix(ro, target, 0.0);
                    vec3 rd = cam * normalize(vec3(p.xy, u_cameraFov));
                    vec3 color = mix(u_skyTop, u_skyBottom, uv.y);
                    color += renderStars(uv, u_resolution.xy);
                    color += aurora(rd).rgb;
                    color = pow(color, vec3(1.0 / 2.2));
                    fragColor = vec4(smoothstep(0.0, 1.0, color), 1.0);
                }
                
                void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
            `;
