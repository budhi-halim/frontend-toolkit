// Source-module entry. The distribution build replaces this with a self-contained Blob worker.
export function createMaterialWorker() {
  const worker = new Worker(new URL('../workers/material.js', import.meta.url), {type: 'module'});
  return {worker, dispose() {}};
}
