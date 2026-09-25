import {materialPixels} from '../core/material-texture.js';

// Compiled independently so minification cannot break cross-function bindings.
self.onmessage = event => {
  try {
    const result = materialPixels(event.data);
    self.postMessage(result, [result.data]);
  } catch (error) {
    self.postMessage({error: error.message});
  }
};
