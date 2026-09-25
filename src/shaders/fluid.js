// === INCOMPRESSIBLE 2D FLUID PASSES, GLSL ES 3 ===
export const FLUID_VERTEX=`#version 300 es
in vec2 aPosition;out vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const HEADER=`#version 300 es
precision highp float;precision highp sampler2D;
in vec2 vUv;out vec4 frag;
uniform sampler2D uSource,uVelocity,uPressure,uDivergence,uCurl,uDye;
uniform vec2 uTexel,uPoint,uImpulse;
uniform vec3 uColor;
uniform float uDt,uDamping,uAspect,uRadius,uStrength,uBuoyancy,uKind,uShading;
vec4 bilerp(sampler2D source,vec2 uv){vec2 size=vec2(textureSize(source,0)),p=uv*size-.5,i=floor(p),f=fract(p);vec2 a=(i+.5)/size,b=(i+1.5)/size;return mix(mix(texture(source,a),texture(source,vec2(b.x,a.y)),f.x),mix(texture(source,vec2(a.x,b.y)),texture(source,b),f.x),f.y);}
`;
export const FLUID_SHADERS={
  copy:HEADER+`void main(){frag=bilerp(uSource,vUv)*uDamping;}`,
  splat:HEADER+`void main(){vec2 d=(vUv-uPoint)*vec2(uAspect,1.);float g=exp(-dot(d,d)/max(uRadius*uRadius,.000001));frag=texture(uSource,vUv)+vec4(uColor*g,0.);}`,
  advect:HEADER+`void main(){vec2 velocity=bilerp(uVelocity,vUv).xy;frag=bilerp(uSource,clamp(vUv-uDt*velocity,vec2(0.),vec2(1.)))*exp(-uDamping*uDt);}`,
  curl:HEADER+`void main(){float l=texture(uVelocity,vUv-vec2(uTexel.x,0.)).y,r=texture(uVelocity,vUv+vec2(uTexel.x,0.)).y,b=texture(uVelocity,vUv-vec2(0.,uTexel.y)).x,t=texture(uVelocity,vUv+vec2(0.,uTexel.y)).x;frag=vec4((r-l)/(2.*uTexel.x)-(t-b)/(2.*uTexel.y),0.,0.,1.);}`,
  force:HEADER+`void main(){float l=abs(texture(uCurl,vUv-vec2(uTexel.x,0.)).x),r=abs(texture(uCurl,vUv+vec2(uTexel.x,0.)).x),b=abs(texture(uCurl,vUv-vec2(0.,uTexel.y)).x),t=abs(texture(uCurl,vUv+vec2(0.,uTexel.y)).x),c=texture(uCurl,vUv).x;vec2 gradient=vec2((r-l)/uTexel.x,(t-b)/uTexel.y);gradient/=max(length(gradient),.0001);vec2 velocity=texture(uVelocity,vUv).xy+vec2(gradient.y,-gradient.x)*c*uStrength*uDt;float density=max(max(texture(uDye,vUv).r,texture(uDye,vUv).g),texture(uDye,vUv).b);velocity.y+=uBuoyancy*density*uDt*.14;frag=vec4(clamp(velocity,vec2(-4.),vec2(4.)),0.,1.);}`,
  divergence:HEADER+`void main(){vec2 v=texture(uVelocity,vUv).xy;float l=texture(uVelocity,vUv-vec2(uTexel.x,0.)).x,r=texture(uVelocity,vUv+vec2(uTexel.x,0.)).x,b=texture(uVelocity,vUv-vec2(0.,uTexel.y)).y,t=texture(uVelocity,vUv+vec2(0.,uTexel.y)).y;if(vUv.x<uTexel.x)l=-v.x;if(vUv.x>1.-uTexel.x)r=-v.x;if(vUv.y<uTexel.y)b=-v.y;if(vUv.y>1.-uTexel.y)t=-v.y;frag=vec4(.5*((r-l)/uTexel.x+(t-b)/uTexel.y),0.,0.,1.);}`,
  pressure:HEADER+`void main(){float l=texture(uPressure,vUv-vec2(uTexel.x,0.)).x,r=texture(uPressure,vUv+vec2(uTexel.x,0.)).x,b=texture(uPressure,vUv-vec2(0.,uTexel.y)).x,t=texture(uPressure,vUv+vec2(0.,uTexel.y)).x,d=texture(uDivergence,vUv).x;vec2 h=uTexel*uTexel;frag=vec4(((l+r)*h.y+(b+t)*h.x-d*h.x*h.y)/(2.*(h.x+h.y)),0.,0.,1.);}`,
  project:HEADER+`void main(){float l=texture(uPressure,vUv-vec2(uTexel.x,0.)).x,r=texture(uPressure,vUv+vec2(uTexel.x,0.)).x,b=texture(uPressure,vUv-vec2(0.,uTexel.y)).x,t=texture(uPressure,vUv+vec2(0.,uTexel.y)).x;vec2 velocity=texture(uVelocity,vUv).xy-vec2(r-l,t-b)/(2.*uTexel);if(vUv.x<uTexel.x||vUv.x>1.-uTexel.x)velocity.x=0.;if(vUv.y<uTexel.y||vUv.y>1.-uTexel.y)velocity.y=0.;frag=vec4(velocity,0.,1.);}`,
  display:HEADER+`void main(){vec3 dye=max(bilerp(uDye,vUv).rgb,0.);float density=max(max(dye.r,dye.g),dye.b),alpha=1.-exp(-density*1.3);float left=length(bilerp(uDye,vUv-vec2(uTexel.x,0.)).rgb),top=length(bilerp(uDye,vUv+vec2(0.,uTexel.y)).rgb);float shade=clamp(.8+(density-left*.58+top*.2)*uShading,.2,1.7);vec3 col=(1.-exp(-dye))*shade;if(uKind>.5&&uKind<1.5){col=uColor*clamp(.34+(left-top)*uShading*.6+.55/(1.+density*.45),.15,1.2);}else if(uKind>1.5&&uKind<2.5){float hot=1.-exp(-density*.48);col=mix(vec3(.43,.012,.001),vec3(.98,.21,.012),smoothstep(.015,.5,hot));col=mix(col,vec3(1.,.6,.1),smoothstep(.5,.85,hot));col=mix(col,vec3(1.,.9,.58),smoothstep(.89,1.,hot)*.65);alpha=(1.-exp(-density*.85))*smoothstep(.015,.12,hot);}else if(uKind>2.5)col=min(vec3(1.5),col*1.7);frag=vec4(col,alpha);}`
};
