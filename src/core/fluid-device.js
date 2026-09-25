import {FLUID_VERTEX,FLUID_SHADERS} from '../shaders/fluid.js';
import {decorate} from './utils.js';

// === FLOAT-TEXTURE FLUID DEVICE ===
export class FluidDevice{
  constructor(mount,onState=()=>{}){
    this.onState=onState;this.lost=false;this.disposed=false;this.programs=new Map();this.targets=[];this.width=1;this.height=1;
    this.canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});
    this.gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});
    if(!this.gl)throw new Error('WebGL 2 is unavailable.');
    this.onLost=e=>{e.preventDefault();if(this.disposed)return;this.lost=true;this.canvas.style.visibility='hidden';this.onState('context-lost','Fluid context lost; portable solver active.');};
    this.onRestored=()=>{if(this.disposed)return;try{this.lost=false;this.programs.clear();this.targets=[];this.velocity=null;this.dye=null;this.pressure=null;this.init();this.resizeGrid(this.width,this.height,false);this.canvas.style.visibility='';this.onState('restored','Fluid simulation restarted after context restoration.');}catch(error){this.lost=true;this.onState('error',error.message);}};
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    try{this.init();mount.append(this.canvas);}catch(error){this.destroy();throw error;}
  }
  shader(type,source){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message);}return s;}
  init(){
    const gl=this.gl;if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('Floating-point render targets unavailable.');
    const vertex=this.shader(gl.VERTEX_SHADER,FLUID_VERTEX);
    try{for(const [name,source]of Object.entries(FLUID_SHADERS)){const fragment=this.shader(gl.FRAGMENT_SHADER,source),program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.bindAttribLocation(program,0,'aPosition');gl.linkProgram(program);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(message);}const uniforms=new Map();for(let i=0,count=gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i<count;i++){const info=gl.getActiveUniform(program,i);uniforms.set(info.name,{location:gl.getUniformLocation(program,info.name),type:info.type});}this.programs.set(name,{program,uniforms});}}finally{gl.deleteShader(vertex);}
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);this.limit=Math.min(2048,gl.getParameter(gl.MAX_TEXTURE_SIZE));
  }
  target(w,h){
    const gl=this.gl,texture=gl.createTexture(),fbo=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteTexture(texture);gl.deleteFramebuffer(fbo);throw new Error('The device cannot render into RGBA16F textures.');}
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);const result={texture,fbo,width:w,height:h};this.targets.push(result);return result;
  }
  pair(w,h){const value={read:this.target(w,h),write:this.target(w,h),swap(){[this.read,this.write]=[this.write,this.read];}};return value;}
  removeTarget(t){this.gl.deleteTexture(t.texture);this.gl.deleteFramebuffer(t.fbo);}
  resizeGrid(w,h,preserve=true){
    if(this.disposed||this.lost)return;if(w===this.width&&h===this.height&&this.velocity)return;
    const old={targets:this.targets,velocity:this.velocity,dye:this.dye,pressure:this.pressure,divergence:this.divergence,curl:this.curl,width:this.width,height:this.height};this.targets=[];
    try{
      const velocity=this.pair(w,h),dye=this.pair(w,h),pressure=this.pair(w,h),divergence=this.target(w,h),curl=this.target(w,h);
      Object.assign(this,{velocity,dye,pressure,divergence,curl,width:w,height:h});
      if(preserve&&old.velocity&&old.dye){this.pass('copy',velocity.read,{uSource:old.velocity.read,uDamping:1});this.pass('copy',dye.read,{uSource:old.dye.read,uDamping:1});}
      for(const t of old.targets)this.removeTarget(t);
    }catch(error){for(const t of this.targets)this.removeTarget(t);Object.assign(this,old);throw error;}
  }
  resizeCanvas(w,h){if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}}
  pass(name,target,values){
    const gl=this.gl,{program,uniforms}=this.programs.get(name);gl.useProgram(program);gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fbo??null);gl.viewport(0,0,target?.width??this.canvas.width,target?.height??this.canvas.height);let unit=0;
    for(const [key,value]of Object.entries({uTexel:[1/this.width,1/this.height],...values})){const u=uniforms.get(key);if(!u)continue;if(value?.texture){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,value.texture);gl.uniform1i(u.location,unit++);}else if(u.type===gl.FLOAT_VEC2)gl.uniform2fv(u.location,value);else if(u.type===gl.FLOAT_VEC3)gl.uniform3fv(u.location,value);else gl.uniform1f(u.location,Number(value));}
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  splat(x,y,dx,dy,color,radius,aspect){
    if(this.disposed||this.lost||!this.velocity)return;
    this.pass('splat',this.velocity.write,{uSource:this.velocity.read,uPoint:[x,y],uColor:[dx,dy,0],uRadius:radius,uAspect:aspect});this.velocity.swap();this.pass('splat',this.dye.write,{uSource:this.dye.read,uPoint:[x,y],uColor:color,uRadius:radius,uAspect:aspect});this.dye.swap();
  }
  step(dt,o){
    if(this.disposed||this.lost||!this.velocity)return;
    this.pass('advect',this.velocity.write,{uVelocity:this.velocity.read,uSource:this.velocity.read,uDt:dt,uDamping:o.viscosity});this.velocity.swap();
    this.pass('curl',this.curl,{uVelocity:this.velocity.read});
    this.pass('force',this.velocity.write,{uVelocity:this.velocity.read,uCurl:this.curl,uDye:this.dye.read,uDt:dt,uStrength:o.vorticity*.0004,uBuoyancy:o.buoyancy});this.velocity.swap();
    this.pass('divergence',this.divergence,{uVelocity:this.velocity.read});this.pass('copy',this.pressure.write,{uSource:this.pressure.read,uDamping:.75});this.pressure.swap();
    for(let i=0;i<o.pressureIterations;i++){this.pass('pressure',this.pressure.write,{uPressure:this.pressure.read,uDivergence:this.divergence});this.pressure.swap();}
    this.pass('project',this.velocity.write,{uVelocity:this.velocity.read,uPressure:this.pressure.read});this.velocity.swap();
    this.pass('advect',this.dye.write,{uVelocity:this.velocity.read,uSource:this.dye.read,uDt:dt,uDamping:o.dissipation});this.dye.swap();
  }
  display(o,color){if(!this.disposed&&!this.lost&&this.dye)this.pass('display',null,{uDye:this.dye.read,uKind:['ink','smoke','fire','neon'].indexOf(o.kind),uColor:color,uShading:o.shading});}
  clear(){if(this.lost||this.disposed)return;const gl=this.gl;for(const t of this.targets){gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}}
  destroy(){
    if(this.disposed)return;this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
    if(this.gl&&!this.gl.isContextLost()){for(const t of this.targets)this.removeTarget(t);for(const p of this.programs.values())this.gl.deleteProgram(p.program);this.gl.deleteBuffer(this.buffer);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}this.targets=[];this.programs.clear();this.canvas.remove();
  }
}
