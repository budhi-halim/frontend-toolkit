import {decorate} from './utils.js';

// === MINIMAL WEBGL DEVICE ===
const VERTEX='attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}';
const same=(a,b)=>Array.isArray(b)||ArrayBuffer.isView(b)?a?.length===b.length&&Array.from(b).every((v,i)=>a[i]===v):a===b;
export class GLDevice{
  constructor(mount,fragment,onState=()=>{}){
    this.mount=mount;this.fragment=fragment;this.onState=onState;this.values={};this.source=null;this.sourceVersion=0;this.disposed=false;this.lost=false;this.cancelLoad=null;this.videoTime=-1;
    this.canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',borderRadius:'inherit',pointerEvents:'none'});
    const attributes={alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'default'};
    let creationError='';const rejected=event=>{creationError=event.statusMessage||'Context creation rejected';};
    this.canvas.addEventListener('webglcontextcreationerror',rejected);
    try{this.gl=this.canvas.getContext('webgl',attributes)||this.canvas.getContext('experimental-webgl',attributes);}finally{this.canvas.removeEventListener('webglcontextcreationerror',rejected);}
    if(!this.gl)throw new Error(creationError||'WebGL is unavailable or disabled.');
    this.handleLost=event=>{event.preventDefault();if(this.disposed)return;this.lost=true;this.canvas.style.visibility='hidden';this.onState('context-lost','WebGL context lost; switching to the portable renderer.');};
    this.handleRestored=()=>{
      if(this.disposed)return;
      try{this.lost=false;this.init();this.setUniforms(this.values);if(this.source)this.uploadSource(this.source);this.canvas.style.visibility='';this.onState('restored');}
      catch(error){this.lost=true;this.onState('error',error.message);}
    };
    this.canvas.addEventListener('webglcontextlost',this.handleLost);this.canvas.addEventListener('webglcontextrestored',this.handleRestored);
    try{this.init();mount.append(this.canvas);}catch(error){this.destroy();throw error;}
  }
  compile(type,source){
    const gl=this.gl,shader=gl.createShader(type);if(!shader)throw new Error('Could not allocate a shader.');
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(`Shader compilation failed: ${log}`);}return shader;
  }
  init(){
    const gl=this.gl,vertex=this.compile(gl.VERTEX_SHADER,VERTEX);let fragment;
    try{fragment=this.compile(gl.FRAGMENT_SHADER,this.fragment);}catch(error){gl.deleteShader(vertex);throw error;}
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.bindAttribLocation(program,0,'aPosition');gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const log=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(`Shader linking failed: ${log}`);}
    this.program=program;gl.useProgram(program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    this.uniforms=new Map();this.uploaded=new Map();
    for(let i=0,count=gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i<count;i++){const info=gl.getActiveUniform(program,i);this.uniforms.set(info.name,{location:gl.getUniformLocation(program,info.name),type:info.type});}
    this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));this.textureSize=[1,1];
    this.limit=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS),4096);
    const precision=gl.getShaderPrecisionFormat?.(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
    this.capabilities={api:'WebGL 1',fragmentHighp:precision?.precision??null,maxRenderSize:this.limit};
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }
  setUniforms(values){
    Object.assign(this.values,values);if(this.disposed||this.lost)return;
    const gl=this.gl;gl.useProgram(this.program);
    for(const [key,value]of Object.entries(values)){
      const uniform=this.uniforms.get(key);if(!uniform||same(this.uploaded.get(key),value))continue;
      const {location,type}=uniform;
      if(type===gl.FLOAT)gl.uniform1f(location,Number(value));else if(type===gl.FLOAT_VEC2)gl.uniform2fv(location,value);else if(type===gl.FLOAT_VEC3)gl.uniform3fv(location,value);else if(type===gl.FLOAT_VEC4)gl.uniform4fv(location,value);else gl.uniform1i(location,Number(value));
      this.uploaded.set(key,Array.isArray(value)||ArrayBuffer.isView(value)?Array.from(value):value);
    }
  }
  resize(width,height,scale=1){
    let w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));const reduction=Math.min(1,this.limit/w,this.limit/h,Math.sqrt(4194304/(w*h)));w=Math.max(1,Math.floor(w*reduction));h=Math.max(1,Math.floor(h*reduction));
    if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}
    if(!this.disposed&&!this.lost)this.gl.viewport(0,0,w,h);this.setUniforms({uResolution:[w,h],u_resolution:[w,h],uTexture:0});
  }
  uploadSource(source){
    if(this.disposed||this.lost)return;
    let w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;if(!w||!h)throw new Error('The water source is not ready or has no dimensions.');
    const factor=Math.min(1,this.limit/w,this.limit/h,Math.sqrt(4194304/(w*h)));let image=source;
    if(factor<1){this.staging??=document.createElement('canvas');const sw=Math.max(1,Math.floor(w*factor)),sh=Math.max(1,Math.floor(h*factor));if(this.staging.width!==sw||this.staging.height!==sh){this.staging.width=sw;this.staging.height=sh;}const context=this.staging.getContext('2d');context.clearRect(0,0,sw,sh);context.drawImage(source,0,0,sw,sh);image=this.staging;w=sw;h=sh;}
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    if(this.textureSize[0]===w&&this.textureSize[1]===h)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,image);else{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);this.textureSize=[w,h];}
    this.setUniforms({uImageResolution:[w,h]});
  }
  async setSource(source){
    const version=++this.sourceVersion;this.cancelLoad?.();this.cancelLoad=null;
    if(!source){this.source=null;if(!this.lost&&!this.disposed){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));this.textureSize=[1,1];this.setUniforms({uImageResolution:[1,1]});}return;}
    let image=source;
    if(typeof source==='string'){
      const url=new URL(source,document.baseURI);if(!['http:','https:','data:','blob:','file:'].includes(url.protocol))throw new TypeError('Unsupported texture URL protocol.');image=new Image();if(/^https?:$/.test(url.protocol))image.crossOrigin='anonymous';
      await new Promise((resolve,reject)=>{
        let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;if(this.sourceVersion===version)this.cancelLoad=null;error?reject(error):resolve();};
        const timer=setTimeout(()=>finish(new Error('Texture loading timed out.')),30000);
        this.cancelLoad=()=>{finish();image.src='';};image.onload=()=>finish();image.onerror=()=>finish(new Error('Texture failed to load. Check its URL and CORS permissions.'));image.src=url.href;
      });
    }
    if(typeof source!=='string'&&((source?.tagName==='IMG'&&(!source.complete||!source.naturalWidth))||(source?.tagName==='VIDEO'&&source.readyState<2))){
      await new Promise((resolve,reject)=>{
        let done=false;const event=source.tagName==='VIDEO'?'loadeddata':'load';
        const finish=error=>{if(done)return;done=true;clearTimeout(timer);source.removeEventListener(event,ready);source.removeEventListener('error',failed);if(this.sourceVersion===version)this.cancelLoad=null;error?reject(error):resolve();};
        const ready=()=>finish(),failed=()=>finish(new Error('The image/video source failed to become ready.'));
        const timer=setTimeout(()=>finish(new Error('The image/video source did not become ready within 30 seconds.')),30000);this.cancelLoad=()=>finish();source.addEventListener(event,ready,{once:true});source.addEventListener('error',failed,{once:true});
      });
    }
    if(version!==this.sourceVersion||this.disposed)return;this.uploadSource(image);this.source=image;this.videoTime=-1;
  }
  render(time){
    if(this.disposed||this.lost)return;
    if(this.source?.tagName==='VIDEO'&&this.source.readyState>=2&&this.videoTime!==this.source.currentTime){this.uploadSource(this.source);this.videoTime=this.source.currentTime;}
    this.setUniforms({uTime:time,u_time:time});this.gl.drawArrays(this.gl.TRIANGLES,0,3);
  }
  getState(){return this.capabilities;}
  destroy(){
    if(this.disposed)return;this.disposed=true;this.sourceVersion++;this.cancelLoad?.();this.cancelLoad=null;
    this.canvas.removeEventListener('webglcontextlost',this.handleLost);this.canvas.removeEventListener('webglcontextrestored',this.handleRestored);
    if(this.gl&&!this.gl.isContextLost()){this.gl.deleteTexture(this.texture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
    this.source=null;if(this.staging){this.staging.width=1;this.staging.height=1;this.staging=null;}this.canvas.remove();
  }
}
