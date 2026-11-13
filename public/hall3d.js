/* FOX CINEMA — self-contained WebGL2 procedural cinema.
   No external runtime libraries, textures beyond user-provided video-derived assets.
   A real perspective 3D geometry scene, not a flat screenshot or CSS projection. */
import {layout, getSeat} from './catalog.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vert,frag){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vert));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
function norm(v){let d=Math.hypot(...v)||1;return v.map(n=>n/d)}
function minus(a,b){return a.map((x,i)=>x-b[i])}
function dot(a,b){return a.reduce((t,v,i)=>t+v*b[i],0)}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function lookAt(eye,target){const z=norm(minus(eye,target));let x=norm(cross([0,1,0],z));let y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),n=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0]}
function matMul(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
const C={wall:[.25,.046,.065],redPanel:[.38,.057,.085],carpet:[.083,.075,.09],floor:[.105,.103,.119],riser:[.13,.126,.146],chair:[.058,.058,.066],cushion:[.105,.11,.12],premium:[.13,.13,.15],regular:[.22,.07,.085],metal:[.4,.42,.46],rail:[.52,.55,.57],glow:[.42,.9,.6],lamp:[.8,.7,.54],screenBorder:[.16,.17,.2]};
function sceneMesh(){const v=[];function tri(a,b,c,n,color){for(const p of [a,b,c])v.push(...p,...color,...n)}
 function quad(a,b,c,d,n,color){tri(a,b,c,n,color);tri(a,c,d,n,color)}
 function box(x,y,z,w,h,d,color){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
  quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],color);
  quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],color);
  quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],color);
  quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],color);
  quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],color);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],color);
 }
 function ellipsoid(cx,cy,cz,rx,ry,rz,color){const slices=9,stacks=6;function p(u,t){let a=u*2*Math.PI,b=t*Math.PI;return [cx+rx*Math.sin(b)*Math.cos(a),cy+ry*Math.cos(b),cz+rz*Math.sin(b)*Math.sin(a)]}function ns(P){return norm([(P[0]-cx)/rx,(P[1]-cy)/ry,(P[2]-cz)/rz])}
  for(let i=0;i<slices;i++)for(let j=0;j<stacks;j++){let a=p(i/slices,j/stacks),b=p((i+1)/slices,j/stacks),c=p((i+1)/slices,(j+1)/stacks),d=p(i/slices,(j+1)/stacks);tri(a,b,c,ns(a),color);tri(a,c,d,ns(c),color);}}
 function line(a,b,r,color){const len=Math.hypot(...minus(b,a));let mid=a.map((x,i)=>(x+b[i])/2);if(Math.abs(a[0]-b[0])>Math.max(Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2])))box(...mid,len,r,r,color);else if(Math.abs(a[2]-b[2])>Math.abs(a[1]-b[1]))box(...mid,r,r,len,color);else box(...mid,r,len,r,color)}
 // Deep auditorium shell, ceiling beams, side acoustic panels.
 box(0,5.5,-5.7,29.6,12.3,.5,[.025,.026,.03]);
 box(-15,6,17,.35,17,49,C.wall);box(15,6,17,.35,17,49,C.wall);
 box(0,13,17,30,.35,49,[.032,.029,.037]);
 box(0,-.6,19,29.5,.45,51,C.floor);
 for(let i=0;i<10;i++){
  const z=-2+i*4.8;
  box(0,12.7,z,30,.65,.56,[.045,.043,.05]);
  box(-13,12.35,z,1.2,.35,.45,C.wall);box(13,12.35,z,1.2,.35,.45,C.wall);
  for(let x=-11;x<=11;x+=5.5){box(x,12.1,z+.23,.23,.07,.15,C.lamp);box(x,12.08,z+.27,.1,.06,.09,[.92,.82,.57]);}
 }
 for(let side of [-1,1]){
  for(let z=0;z<43;z+=4.2){box(side*14.76,5.8,z,0.2,8.2,3.7, z%8.4<1?[.27,.04,.065]:C.wall);box(side*14.72,5.5,z+1.92,.22,10,.08,[.53,.085,.105]);}
  for(let z=3;z<41;z+=8.2){box(side*14.68,2,z,.24,.12,3.8,[.18,.19,.2]);}
 }
 // Raised carpet stairs: each row has its own depth/platform.
 for(let r=0;r<13;r++){
  let z=5+r*2.15,y=r*.31;
  box(0,y-.20,z,28.65,.40,2.13,C.carpet);
  box(0,y-.40,z-1.04,28.65,.13,.055,[.28,.27,.28]);
  for(let x of [-8.55,8.1]){box(x,y-.001,z,1.24,.045,2.02,[.12,.12,.13]);box(x-.36,y+.02,z-.96,.47,.04,.06,[.17,.35,.2]);}
 }
 // Front stage, border, screen frame and floor edge lighting.
 box(0,.6,-2.0,27,1.2,2.6,[.047,.047,.054]);
 box(0,1.22,-2.55,26,.06,.13,[.57,.53,.44]);
 box(0,6.6,-4.4,24.9,10.65,.5,C.screenBorder);
 box(0,6.6,-4.11,23.1,9.45,.12,[.02,.025,.033]);
 for(let side of [-1,1]){box(side*13.2,7,-3.3,.72,10.8,.5,[.045,.035,.045]);}
 // Two illuminated side-panel frames, tangible geometry.
 for(let side of [-1,1]){
  let x=side*14.57;box(x,7.15,5,.28,5.2,5.2,[.05,.055,.063]);
  box(x,9.6,5,.32,.065,5.25,[.75,.25,.29]);box(x,4.65,5,.32,.065,5.25,[.75,.25,.29]);
  box(x,7.1,2.42,.33,5.15,.07,[.76,.26,.28]);box(x,7.1,7.55,.33,5.15,.07,[.76,.26,.28]);
 }
 // Speakers and illuminated exits.
 for(let z of [0,15,28,38])for(let side of [-1,1]){box(side*14.5,6.2,z,.6,1.85,1.15,[.028,.029,.033]);box(side*14.15,6.2,z,.13,1.22,.75,[.09,.09,.11]);}
 for(let side of [-1,1]){box(side*13.3,1.8,35,.12,.5,1.4,[.12,.5,.27]);}
 // Railings around selected aisles and rows, with vertical poles, 3-dimensional occlusion.
 for(let z of [11.3,20.8,29.5])for(let side of [-1,1]){
  let x=side*7.8;line([x,1.9+(z-5)*.14,z],[x,1.9+(z-5)*.14,z+4],.055,C.rail);
  for(let zz=z;zz<=z+4;zz+=1.25)line([x,.4+(z-5)*.14,zz],[x,1.9+(z-5)*.14,zz],.045,C.rail);
 }
 // Seat meshes: every seat has frame, rounded foam back, pad, arms, feet and cupholder.
 for(const s of layout){const {x,z,y}=s;const premium=s.type==='Premium';const width=premium?.92:.78;const main=premium?C.premium:C.chair;const cushion=premium?[.13,.13,.15]:[.125,.084,.094];
  box(x,y+.91,z+.23,width,1.48,.25,main);
  ellipsoid(x,y+1.00,z+.37,width*.49,.65,.16,cushion);
  box(x,y+.52,z-.23,width*.89,.20,.79,main);
  ellipsoid(x,y+.59,z-.22,width*.43,.12,.40,cushion);
  for(let side of [-1,1]){
   box(x+side*(width*.57),y+.69,z-.03,.19,.24,1.08,[.075,.073,.081]);
   box(x+side*(width*.56),y+.39,z+.34,.12,.55,.20,[.07,.07,.074]);
   // Single reflective cup holder near armrest end.
   if(side===1)ellipsoid(x+side*(width*.57),y+.82,z-.42,.105,.024,.11,[.32,.32,.35]);
  }
  box(x-.20,y+.25,z+.30,.16,.50,.14,C.chair);box(x+.20,y+.25,z+.30,.16,.50,.14,C.chair);
 }
 return new Float32Array(v);
}
function makeScreenCanvas(){const c=document.createElement('canvas');c.width=1536;c.height=720;const x=c.getContext('2d');let bg=x.createLinearGradient(0,0,1536,720);bg.addColorStop(0,'#05111c');bg.addColorStop(.52,'#21445e');bg.addColorStop(1,'#17161d');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);return {canvas:c,ctx:x};}
function makeMaxCanvas(){const c=document.createElement('canvas');c.width=640;c.height=350;const x=c.getContext('2d');x.fillStyle='#12141a';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#d65b61';x.lineWidth=11;x.strokeRect(14,14,612,322);x.fillStyle='#c95456';x.textAlign='center';x.font='bold 132px Arial';x.fillText('MAX',320,213);x.fillStyle='#aa9d8d';for(let i=0;i<14;i++)x.fillRect(70+(i*39)%500,240+Math.floor(i/7)*26,20,3);return c}
function createTexture(gl,canvas){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);return t}
function texturedQuad(corners){const [a,b,c,d]=corners;const arr=[];for(const [p,uv] of [[a,[0,0]],[b,[1,0]],[c,[1,1]],[a,[0,0]],[c,[1,1]],[d,[0,1]]])arr.push(...p,...uv);return new Float32Array(arr)}
const shaderV=`attribute vec3 aPosition;attribute vec3 aColor;attribute vec3 aNormal;uniform mat4 uMVP;uniform vec3 uEye;varying vec3 vColor;varying vec3 vNorm;varying float vDist;void main(){gl_Position=uMVP*vec4(aPosition,1.);vColor=aColor;vNorm=aNormal;vDist=distance(uEye,aPosition);}`;
const shaderF=`precision mediump float;varying vec3 vColor;varying vec3 vNorm;varying float vDist;void main(){float key=max(dot(normalize(vNorm),normalize(vec3(.35,.78,.42))),0.);float brightness=.50+.55*key;vec3 c=vColor*brightness;float fog=clamp((vDist-15.)/55.,0.,.56);c=mix(c,vec3(.027,.027,.032),fog);gl_FragColor=vec4(pow(c,vec3(.92)),1.);}`;
const texV=`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uMVP;varying vec2 vUV;void main(){gl_Position=uMVP*vec4(aPosition,1.);vUV=aUV;}`;
const texF=`precision mediump float;varying vec2 vUV;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUV);}`;
export class Theater3D{
 constructor(canvas,onReady){this.canvas=canvas;this.disposed=false;this.selected='G9';this.yaw=0;this.pitch=0;this.fov=74;this.pointer=null;this.currentEye=null;this.clock=performance.now();this.dirty=true;
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'})||canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('WebGL is not supported by this browser.');this.gl=gl;
 this.colorProg=program(gl,shaderV,shaderF);this.texProg=program(gl,texV,texF);
 this.colorBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuf);const mesh=sceneMesh();gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);this.colorCount=mesh.length/9;
 const quad=texturedQuad([[-11.5,2.05,-3.94],[11.5,2.05,-3.94],[11.5,11.15,-3.94],[-11.5,11.15,-3.94]]);
 this.screenBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.screenBuf);gl.bufferData(gl.ARRAY_BUFFER,quad,gl.STATIC_DRAW);
 const maxQuad=texturedQuad([[14.37,5.2,7.45],[14.37,5.2,2.55],[14.37,9.3,2.55],[14.37,9.3,7.45]]);
 this.maxBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.maxBuf);gl.bufferData(gl.ARRAY_BUFFER,maxQuad,gl.STATIC_DRAW);
 const obj=makeScreenCanvas();this.screenCanvas=obj.canvas;this.screenCtx=obj.ctx;this.screenTex=createTexture(gl,obj.canvas);this.maxTex=createTexture(gl,makeMaxCanvas());
 const image=new Image();image.onload=()=>{this.drawScreen(image);this.dirty=true};image.src='/assets/poster-godzilla.jpg';
 this.attachInput();this.setSeat(this.selected,true);this.resize();this.raf=requestAnimationFrame(t=>this.frame(t));onReady?.();
 }
 drawScreen(image){const {canvas:c,ctx:x}=this;const g=x.createLinearGradient(0,0,1536,720);g.addColorStop(0,'#0a1a29');g.addColorStop(1,'#081b2d');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);x.globalAlpha=.47;x.drawImage(image,0,-700,1150,1600);x.globalAlpha=1;x.fillStyle='#05080b65';x.fillRect(0,0,1536,720);x.textBaseline='top';x.fillStyle='#e4e7ed';x.font='bold 30px Arial';x.fillText('NOW SHOWING AT FOX CINEMA',82,220);x.font='bold 78px Arial';x.fillText('GODZILLA MINUS',79,291);x.fillText('ZERO',79,382);x.fillStyle='#ffffff';x.font='bold 26px Arial';x.fillText('FILMED FOR IMAX',1006,35);x.drawImage(image,1050,100,340,512);const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.screenTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);}
 setSeat(id,immediate=false){const s=getSeat(id);if(!s)return;this.selected=id;const eye=[s.x,s.y+2.15,s.z+.12];this.destEye=eye;if(!this.currentEye||immediate)this.currentEye=[...eye];this.yaw=0;this.pitch=0;}
 resize(){const rect=this.canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,1.6);const w=Math.max(1,Math.floor(rect.width*dpr));const h=Math.max(1,Math.floor(rect.height*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}}
 attachInput(){this.down=e=>{if(e.button!==0)return;this.pointer=[e.clientX,e.clientY];this.canvas.setPointerCapture(e.pointerId)};this.move=e=>{if(!this.pointer)return;const dx=e.clientX-this.pointer[0],dy=e.clientY-this.pointer[1];this.yaw=clamp(this.yaw+dx*.003,-.75,.75);this.pitch=clamp(this.pitch-dy*.003,-.5,.5);this.pointer=[e.clientX,e.clientY]};this.up=()=>this.pointer=null;this.wheel=e=>{e.preventDefault();this.fov=clamp(this.fov+e.deltaY*.021,45,100)};this.canvas.addEventListener('pointerdown',this.down);this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerup',this.up);this.canvas.addEventListener('pointercancel',this.up);this.canvas.addEventListener('wheel',this.wheel,{passive:false});this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);}
 reset(){this.yaw=0;this.pitch=0;this.fov=74}
 frame(t){if(this.disposed)return;const gl=this.gl;this.resize();const dt=clamp((t-this.clock)/1000,.001,.05);this.clock=t;for(let i=0;i<3;i++)this.currentEye[i]+=(this.destEye[i]-this.currentEye[i])*Math.min(1,dt*4.6);const target=[Math.sin(this.yaw)*13,5.6+Math.sin(this.pitch)*13,-4+Math.max(0,1-Math.cos(this.yaw))*6];const view=lookAt(this.currentEye,target),proj=perspective(this.fov*Math.PI/180,this.canvas.width/this.canvas.height,.09,120),mvp=matMul(proj,view);
 gl.clearColor(.01,.011,.014,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
 gl.useProgram(this.colorProg);gl.uniformMatrix4fv(gl.getUniformLocation(this.colorProg,'uMVP'),false,new Float32Array(mvp));gl.uniform3fv(gl.getUniformLocation(this.colorProg,'uEye'),new Float32Array(this.currentEye));gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuf);const stride=36;for(const [attr,sz,off] of [['aPosition',3,0],['aColor',3,12],['aNormal',3,24]]){let loc=gl.getAttribLocation(this.colorProg,attr);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,stride,off);}gl.drawArrays(gl.TRIANGLES,0,this.colorCount);
 gl.useProgram(this.texProg);gl.uniformMatrix4fv(gl.getUniformLocation(this.texProg,'uMVP'),false,new Float32Array(mvp));const ap=gl.getAttribLocation(this.texProg,'aPosition'),au=gl.getAttribLocation(this.texProg,'aUV');for(let [buf,tex] of [[this.screenBuf,this.screenTex],[this.maxBuf,this.maxTex]]){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(au);gl.vertexAttribPointer(au,2,gl.FLOAT,false,20,12);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(this.texProg,'uTexture'),0);gl.drawArrays(gl.TRIANGLES,0,6);}
 this.raf=requestAnimationFrame(time=>this.frame(time));}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.up);this.canvas.removeEventListener('wheel',this.wheel);window.removeEventListener('resize',this.onResize);const gl=this.gl;for(const b of [this.colorBuf,this.screenBuf,this.maxBuf])gl.deleteBuffer(b);for(const t of [this.screenTex,this.maxTex])gl.deleteTexture(t);gl.deleteProgram(this.colorProg);gl.deleteProgram(this.texProg);}
}
