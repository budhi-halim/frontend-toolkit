// Instrumented WebGL API stub: tests JavaScript lifecycle, NOT shader rendering.
(() => {
  const original=HTMLCanvasElement.prototype.getContext;
  globalThis.GLContract={contexts:[],enableWebGL2:false};
  function context(canvas){
    const state={uniformValues:{},uploads:[],draws:0,lost:false,deleted:[]};
    const gl={
      FLOAT:5126,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,SAMPLER_2D:35678,
      VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ACTIVE_UNIFORMS:35718,
      FRAMEBUFFER:36160,FRAMEBUFFER_COMPLETE:36053,COLOR_ATTACHMENT0:36064,COLOR_BUFFER_BIT:16384,RGBA16F:34842,HALF_FLOAT:5131,
      MAX_TEXTURE_SIZE:3379,MAX_VIEWPORT_DIMS:3386,TEXTURE_2D:3553,TEXTURE0:33984,TRIANGLES:4,
      createShader:type=>({type}),shaderSource:(s,source)=>{s.source=source;},compileShader(){},getShaderParameter:()=>true,deleteShader(){},getShaderInfoLog:()=>'',
      createProgram:()=>({shaders:[],uniforms:[]}),attachShader:(p,s)=>p.shaders.push(s),bindAttribLocation(){},
      linkProgram(p){for(const s of p.shaders)for(const match of s.source.matchAll(/uniform\s+(float|vec2|vec3|vec4|sampler2D)\s+([^;]+);/g))for(const name of match[2].split(','))p.uniforms.push({name:name.trim().replace(/\[\d+\]$/, '[0]'),type:({float:5126,vec2:35664,vec3:35665,vec4:35666,sampler2D:35678})[match[1]]});},
      getProgramParameter:(p,key)=>key===35714?true:p.uniforms.length,getProgramInfoLog:()=>'',getActiveUniform:(p,i)=>p.uniforms[i],getUniformLocation:(p,name)=>name,useProgram(){},
      uniform1f:(name,v)=>{state.uniformValues[name]=v;},uniform1i:(name,v)=>{state.uniformValues[name]=v;},
      uniform2fv:(name,v)=>{state.uniformValues[name]=[...v];},uniform3fv:(name,v)=>{state.uniformValues[name]=[...v];},uniform4fv:(name,v)=>{state.uniformValues[name]=[...v];},
      createBuffer:()=>({}),bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},
      createTexture:()=>({}),activeTexture(){},bindTexture(){},texParameteri(){},pixelStorei(){},
      texImage2D(...args){const image=args.at(-1);state.uploads.push({width:image?.width??args[3],height:image?.height??args[4],source:image});},
      texSubImage2D(...args){const image=args.at(-1);state.uploads.push({width:image?.width,height:image?.height,source:image,reused:true});},
      createFramebuffer:()=>({}),bindFramebuffer(){},framebufferTexture2D(){},checkFramebufferStatus:()=>36053,clearColor(){},clear(){state.clears=(state.clears||0)+1;},deleteFramebuffer(){state.deleted.push('framebuffer');},
      getParameter:key=>key===3379?4096:[4096,4096],disable(){},viewport(){},drawArrays(){state.draws++;},
      deleteTexture(){state.deleted.push('texture');},deleteProgram(){state.deleted.push('program');},deleteBuffer(){state.deleted.push('buffer');},
      isContextLost:()=>state.lost,getExtension:name=>name==='EXT_color_buffer_float'&&GLContract.enableWebGL2?{}:name==='WEBGL_lose_context'?{loseContext:()=>{state.lost=true;}}:null,
      state,canvas
    };
    GLContract.contexts.push(gl);return gl;
  }
  HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'&&GLContract.enableWebGL2)return this.__contractGL??=context(this);return original.call(this,type,...args);};
})();
