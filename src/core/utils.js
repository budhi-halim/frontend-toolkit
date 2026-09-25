// === VALUE AND DOM UTILITIES ===
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const kebab = value => value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
export const finite = (value, fallback = 0) => Number.isFinite(Number(value)) && value !== '' && value !== null ? Number(value) : fallback;
export function uid(prefix = 'ft') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}
export function svgNode(tag, attributes = {}, parent) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  parent?.append(node);
  return node;
}
export function decorate(node, css) {
  Object.assign(node.style, css);
  node.setAttribute('aria-hidden', 'true');
  return node;
}
let colorContext;
const colorCache = new Map();
export function colorRGB(value) {
  const key = String(value);
  if (colorCache.has(key)) return colorCache.get(key);
  if (!colorContext) colorContext = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  if (!colorContext) return [1, 1, 1];
  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillStyle = '#ffffff';
  colorContext.fillStyle = key;
  colorContext.fillRect(0, 0, 1, 1);
  const p = colorContext.getImageData(0, 0, 1, 1).data;
  const result = [p[0] / 255, p[1] / 255, p[2] / 255];
  if (colorCache.size > 128) colorCache.clear();
  colorCache.set(key, result);
  return result;
}
export function emit(target, name, detail) {
  target?.dispatchEvent(new CustomEvent(name, {detail, bubbles: true, composed: true}));
}
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = state;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
