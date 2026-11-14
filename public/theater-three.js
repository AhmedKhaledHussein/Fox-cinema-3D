/** FOX CINEMA V7 — Three.js physically based auditorium and screen-aligned official trailer.
 * Three.js loaded as an ESM dependency from jsDelivr, with the legacy WebGL renderer
 * retained in app.js as a network-failure fallback. No screenshot/video-frame set dressing.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import {getMovie,getSeat,layout} from './catalog.js';
import {screenProfile,normalizeScreenFormat,trailerEmbedUrl} from './theater-presets.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const assign=(obj,x,y,z,sx=1,sy=1,sz=1)=>{obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);return obj};
// Deterministic leather grain adds surface texture without external/binary image assets.
let grainTexture;
function upholsteryGrain(){
 if(grainTexture)return grainTexture;
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 const d=x.createImageData(128,128);for(let y=0;y<128;y++)for(let a=0;a<128;a++){
  const h=(Math.sin(a*12.9898+y*78.233)*43758.5453)%1,noise=Math.floor(125+Math.abs(h)*55);
  const i=(y*128+a)*4;d.data[i]=d.data[i+1]=d.data[i+2]=noise;d.data[i+3]=255;
 }x.putImageData(d,0,0);grainTexture=new THREE.CanvasTexture(c);
 grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.repeat.set(3,3);return grainTexture;
}
const leather=(color,roughness=.5)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,clearcoat:.21,clearcoatRoughness:.57,bumpMap:upholsteryGrain(),bumpScale:.011});
const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const color={charcoal:0x111217,coal:0x0c0e12,carpet:0x121216,wall:0x4d111c,red:0x651a24,trim:0xa94b4b,gold:0xe9ac78,rail:0x9ca8b3,step:0x75e6a7};
function panelTexture(){
 const c=document.createElement('canvas');c.width=128;c.height=512;
 const x=c.getContext('2d'),g=x.createLinearGradient(0,0,128,0);g.addColorStop(0,'#3c1119');g.addColorStop(.45,'#6a1924');g.addColorStop(1,'#351014');x.fillStyle=g;x.fillRect(0,0,128,512);
 for(let k=0;k<32;k++){x.fillStyle=k%3===0?'#ffffff07':'#00000008';x.fillRect(k*4,0,2,512);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);return t;
}
function box(scene,w,h,d,material,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.receiveShadow=true;scene.add(o);return o;}
function pipe(scene,start,end,radius,material,sides=10){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);const d=b.clone().sub(a);const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,d.length(),sides),material);o.position.copy(a.clone().add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());scene.add(o);return o;}
function signTexture(format='MAX',accent='#ef897a'){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#0f1118';x.fillRect(0,0,1024,512);x.strokeStyle=accent;x.lineWidth=20;x.strokeRect(19,19,986,474);x.textAlign='center';x.textBaseline='middle';x.fillStyle=accent;x.font=`900 ${format.length>5?125:format.length>4?175:format.length>3?210:230}px Arial`;x.fillText(format,512,257);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function pillTexture(){const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle='#161619';x.fillRect(0,0,128,128);x.fillStyle='#eac5a0';x.beginPath();x.arc(64,64,32,0,Math.PI*2);x.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
/** Sculptured upholstery shell: beveled front/back with a consistent rectangular
 * silhouette, replacing the balloon-like sphere used by the earlier demo. */
function upholsteredPad(low=false){
 const r=.35,shape=new THREE.Shape();
 shape.moveTo(-1+r,-1);shape.lineTo(1-r,-1);
 shape.quadraticCurveTo(1,-1,1,-1+r);shape.lineTo(1,1-r);
 shape.quadraticCurveTo(1,1,1-r,1);shape.lineTo(-1+r,1);
 shape.quadraticCurveTo(-1,1,-1,1-r);shape.lineTo(-1,-1+r);
 shape.quadraticCurveTo(-1,-1,-1+r,-1);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:1.45,steps:1,bevelEnabled:true,bevelThickness:.12,bevelSize:.09,bevelSegments:low?2:3,curveSegments:low?3:6});
 geo.translate(0,0,-.725);geo.computeVertexNormals();return geo;
}
function createSeatInstances(scene,low=false){
 const sphere=upholsteredPad(low);
 const cylinder=new THREE.CylinderGeometry(1,1,1,low?9:15);
 const parts=[
  {name:'back-shell',geo:sphere,pos:[0,1.09,.30],scale:[.49,.75,.29]},
  {name:'back-inset',geo:sphere,pos:[0,1.08,.48],scale:[.43,.60,.095]},
  {name:'headrest',geo:sphere,pos:[0,1.67,.37],scale:[.44,.215,.20]},
  {name:'seat',geo:sphere,pos:[0,.56,-.24],scale:[.47,.17,.46]},
  {name:'front',geo:sphere,pos:[0,.44,-.63],scale:[.44,.105,.21]},
  {name:'left-arm',geo:sphere,pos:[-.58,.77,-.1],scale:[.17,.13,.51]},
  {name:'right-arm',geo:sphere,pos:[.58,.77,-.1],scale:[.17,.13,.51]},
  {name:'left-cup',geo:new THREE.TorusGeometry(.076,.017,8,14),pos:[-.60,.87,-.35],scale:[1,1,1]},
  {name:'right-cup',geo:new THREE.TorusGeometry(.076,.017,8,14),pos:[.60,.87,-.35],scale:[1,1,1]},
  {name:'pedestal',geo:cylinder,pos:[0,.16,.06],scale:[.19,.31,.20]},
 ];
 const groups={regular:layout.filter(s=>s.type!=='Premium'),premium:layout.filter(s=>s.type==='Premium')};
 const materials={
  regular:{shell:leather(0x181b20,.62),cushion:leather(0x25272d,.54),head:leather(0x303139,.51),arm:leather(0x20232a,.58)},
  premium:{shell:leather(0x171b23,.58),cushion:leather(0x272d36,.48),head:leather(0x353d45,.46),arm:leather(0x262b33,.55)},
  cup:mat(0x81909b,.24,.86),pedestal:mat(0x141519,.75,.25)};
 const dummy=new THREE.Object3D();
 for(const [kind,seats] of Object.entries(groups)){
  for(const part of parts){
   const m=part.name.includes('cup')?materials.cup:part.name==='pedestal'?materials.pedestal:
    part.name==='headrest'?materials[kind].head:part.name.includes('arm')?materials[kind].arm:part.name==='back-shell'?materials[kind].shell:materials[kind].cushion;
   const o=new THREE.InstancedMesh(part.geo,m,seats.length);o.frustumCulled=false;
   seats.forEach((s,i)=>{const w=(kind==='premium'?1:.88);dummy.position.set(s.x+part.pos[0]*w,s.y+part.pos[1],s.z+part.pos[2]);dummy.scale.set(part.scale[0]*w,part.scale[1],part.scale[2]);dummy.rotation.set(part.name.includes('cup')?-Math.PI/2:0,0,0);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)});
   o.instanceMatrix.needsUpdate=true;scene.add(o);
  }
 }
}
function drawScreenCanvas(movie,image){
 const c=document.createElement('canvas');c.width=2048;c.height=864;const x=c.getContext('2d'),W=c.width,H=c.height;
 const grad=x.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#08131e');grad.addColorStop(.5,'#112333');grad.addColorStop(1,'#090d16');x.fillStyle=grad;x.fillRect(0,0,W,H);
 if(image?.naturalWidth){
  const sc=Math.max(W/image.naturalWidth,H/image.naturalHeight);x.filter='blur(20px) saturate(1.28)';x.globalAlpha=.76;
  x.drawImage(image,(W-image.naturalWidth*sc)/2,(H-image.naturalHeight*sc)/2,image.naturalWidth*sc,image.naturalHeight*sc);
  x.filter='none';x.globalAlpha=1;
  const ph=H*.83,pw=ph*image.naturalWidth/image.naturalHeight;
  const px=Math.min(W-pw-55,W*.69);x.fillStyle='#0d0d17';x.shadowColor='#000';x.shadowBlur=50;x.fillRect(px-9,(H-ph)/2-9,pw+18,ph+18);x.shadowBlur=0;
  x.drawImage(image,px,(H-ph)/2,pw,ph);
 }
 const fade=x.createLinearGradient(0,0,W,0);fade.addColorStop(0,'#030812ed');fade.addColorStop(.44,'#06111baa');fade.addColorStop(.67,'#07121a22');fade.addColorStop(1,'#02060a55');x.fillStyle=fade;x.fillRect(0,0,W,H);
 x.fillStyle='#d3dce1';x.font='600 29px Arial';x.textBaseline='top';x.fillText('FOX CINEMA  •  NOW SHOWING',112,H*.32);
 x.fillStyle='#f3f6f9';x.shadowColor='#000';x.shadowBlur=24;x.font='900 88px Arial';let line='',rows=[];
 for(const word of String(movie.title||'CINEMA').toUpperCase().split(' ')){if((line+' '+word).length>15&&line){rows.push(line);line=word;}else line=(line+' '+word).trim();}if(line)rows.push(line);
 rows.slice(0,3).forEach((row,i)=>x.fillText(row,112,H*.41+i*96));
 x.shadowBlur=0;return c;
}
function imageSource(movie){
 const official=movie.posterUrl;
 if(official?.startsWith('https://image.tmdb.org/'))return official;
 if(official?.startsWith('https://'))return `https://wsrv.nl/?url=${encodeURIComponent(official)}&w=900&output=jpg`;
 return `/assets/posters/${encodeURIComponent(movie.id)}.webp`;
}
// Four-corner CSS homography: embeds a licensed YouTube trailer visually on the theater's 3D screen.
// YouTube video streams cannot legally/technically be sampled into a cross-origin WebGL VideoTexture.
function homography(q,W,H){
 const eq=[];for(let i=0;i<4;i++){const [X,Y]=[[0,0],[1,0],[1,1],[0,1]][i], [x,y]=q[i];
  eq.push([[X,Y,1,0,0,0,-x*X,-x*Y],x]);eq.push([[0,0,0,X,Y,1,-y*X,-y*Y],y]);}
 for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(eq[r][0][c])>Math.abs(eq[p][0][c]))p=r;[eq[c],eq[p]]=[eq[p],eq[c]];
  const dv=eq[c][0][c];if(Math.abs(dv)<1e-8)return null;
  for(let k=c;k<8;k++)eq[c][0][k]/=dv;eq[c][1]/=dv;
  for(let r=0;r<8;r++)if(r!==c){const f=eq[r][0][c];for(let k=c;k<8;k++)eq[r][0][k]-=f*eq[c][0][k];eq[r][1]-=f*eq[c][1];}}
 const [a,b,c,d,e,f,g,h]=eq.map(z=>z[1]);return `matrix3d(${a/W},${d/W},0,${g/W},${b/H},${e/H},0,${h/H},0,0,1,0,${c},${f},0,1)`;
}
export class TheaterThree{
 constructor(canvas,onReady,movieId='godzilla-minus-zero',selectedFormat='Standard'){
  this.canvas=canvas;this.movie=getMovie(movieId);this.showFormat=normalizeScreenFormat(selectedFormat);this.profile=screenProfile(this.showFormat);this.disposed=false;this.soundEnabled=false;this.trailerActive=false;this.selected='G9';this.yaw=0;this.pitch=0;this.fov=54;this.currentEye=v(0,20.8,38);this.currentTarget=v(0,4.7,9);
  this.destEye=this.currentEye.clone();this.destTarget=this.currentTarget.clone();this.entry=true;this.pointer=null;this.tween=null;
  const isMobile=window.innerWidth<760,low=isMobile||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.41;
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1.45:1.9));this.renderer.setClearColor(0x050507);
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x060608);this.scene.fog=new THREE.FogExp2(0x09090d,.007);
  this.camera=new THREE.PerspectiveCamera(54,1,.16,110);
  this.scene.add(new THREE.HemisphereLight(0x9cb1cc,0x51232c,1.13));this.scene.add(new THREE.AmbientLight(0x98a0b5,.25));
  this.buildAuditorium(low);createSeatInstances(this.scene,low);
  this.buildScreen();this.loadPoster();
  this.setupOverlay();this.attachInput();this.setSeat('G9');this.resize();
  this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);onReady?.();
 }
 buildAuditorium(low){const s=this.scene;
  const wall=mat(0x711e2b,.86),fabric=new THREE.MeshStandardMaterial({map:panelTexture(),color:0xe4d3d6,roughness:.91});
  const floor=mat(0x15181b,.92),trim=mat(0xcf8275,.36,.38),edge=mat(0xa4b4be,.27,.78),black=mat(0x0c0e12,.83),carpet=mat(0x121316,.96);
  box(s,31,.45,52,floor,0,-.8,18);box(s,30,1.2,2.8,black,0,.52,-2.2);
  box(s,31,.4,53,black,0,12.7,19);
  for(const side of [-1,1]){
   box(s,.6,17.8,53,wall,side*15.12,4.4,19);
   for(let z=-2;z<43;z+=3.6){box(s,.13,10.7,3.53,fabric,side*14.79,6,z);
    box(s,.095,10.7,.08,trim,side*14.63,6,z+1.79);}
   // Illuminated stepped screen trim and dark MAX signage.
   const p=box(s,.20,5.9,7.4,black,side*14.39,7,4.9);
   for(const z of [1.1,8.7])box(s,.11,5.9,.09,trim,side*14.22,7,z);
   for(const y of [3.98,10.05])box(s,.11,.08,7.55,trim,side*14.20,y,4.9);
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.3,3.2),new THREE.MeshBasicMaterial({map:signTexture(this.profile.label,this.profile.accent),toneMapped:false,side:THREE.DoubleSide}));
   sign.position.set(side*14.18,7,4.9);sign.rotation.y=side===1?-Math.PI/2:Math.PI/2;s.add(sign);
   for(const z of [2,18,33]){
    box(s,.5,1.4,1.15,black,side*14.25,6.3,z);
    if(z===18){const point=new THREE.PointLight(0xd75252,low?.32:.48,10,2);point.position.set(side*14,5.8,z+2);s.add(point);}
   }
   for(let z=0;z<42;z+=7.5){box(s,.09,1.3,.08,trim,side*14.18,2.4,z);}
  }
  for(let i=0;i<11;i++){
   const z=-1+i*4.5;box(s,31,.65,.65,black,0,12.30,z);
   box(s,29,.05,.14,mat(0x343039,.55),0,11.96,z+.4);
   for(let x=-12;x<=12;x+=6){
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0xffd6b2,toneMapped:false}));bulb.position.set(x,11.93,z+.43);s.add(bulb);
    if(i%3===0&&(x===-6||x===6)){const p=new THREE.PointLight(0xffd4a2,low?.50:.62,13,2.2);p.position.set(x,11.75,z+.43);s.add(p);}
   }
  }
  // 13 rising row terraces. Stair strips are real lit meshes, no billboard screenshot.
  for(let row=0;row<13;row++){
   const z=5+2.15*row,y=row*.31;
   box(s,29.5,.42,2.15,floor,0,y-.38,z);
   box(s,29.4,.08,2.13,carpet,0,y-.13,z);
   for(const x of [-8.26,8.26]){
    box(s,1.55,.055,2.1,black,x,y-.075,z);
    box(s,1.38,.043,.105,mat(0x4c9f6e,.40),x,y-.025,z-1.0);
    // Glowing step strips are emissive geometry; dozens of point lights would stall Safari.
   }
  }
  // Screen border, silver trim, projection bounce lighting.
  const sw=this.profile.screenWidth,sh=this.profile.screenHeight;
  const cy=6.65,borderW=sw+.60,borderH=sh+.57;
  box(s,borderW,borderH,.29,mat(0x111318,.59),0,cy,-4.32);
  for(const x of [-borderW/2,borderW/2])box(s,.16,borderH,.21,edge,x,cy,-4.15);
  for(const y of [cy-borderH/2,cy+borderH/2])box(s,borderW,.13,.21,edge,0,y,-4.14);
  for(const x of [-4,4]){const projector=new THREE.SpotLight(0xb9cff1,low?31:44,52,1.04,.84,1);projector.position.set(x,9.0,-4.2);projector.target.position.set(x/2,1.9,13);s.add(projector,projector.target);}
  // The floor and railings are three-dimensional round metal (no flat polygons).
  for(const z of [11,21,30])for(const x of [-7.64,7.64]){
   const y=(z-5)*.145+1.25;
   pipe(s,[x,y,z],[x,y,z+4.4],.050,edge,14);
   pipe(s,[x,y-.58,z],[x,y-.58,z+4.4],.025,edge,12);
   for(let j=0;j<5;j++){let zz=z+j*1.1;pipe(s,[x,y-1.22,zz],[x,y,zz],.032,edge,10);}
  }
  for(let x=-13;x<13;x+=2.5){pipe(s,[x,1.28,-1.15],[x+2.5,1.28,-1.15],.035,edge,14);pipe(s,[x,.36,-1.15],[x,1.28,-1.15],.025,edge,10);}
  const p=new THREE.PointLight(0xb5c9f9,low?3.8:5.3,44,1.60);p.position.set(0,8,-2.8);s.add(p);this.screenSpill=p;this.screenSpillBase=p.intensity;
 }
 buildScreen(){
  const material=new THREE.MeshBasicMaterial({toneMapped:false,side:THREE.DoubleSide});
  this.screen=new THREE.Mesh(new THREE.PlaneGeometry(this.profile.screenWidth,this.profile.screenHeight),material);this.screen.position.set(0,6.65,-4.01);this.scene.add(this.screen);
  this.screenTexture=new THREE.CanvasTexture(drawScreenCanvas(this.movie,null));this.screenTexture.colorSpace=THREE.SRGBColorSpace;material.map=this.screenTexture;material.needsUpdate=true;
 }
 loadPoster(){const sources=[imageSource(this.movie),`/assets/posters/${encodeURIComponent(this.movie.id)}.webp`];let index=0;
  const tryNext=()=>{if(this.disposed||index>=sources.length)return;const image=new Image();image.crossOrigin='anonymous';image.decoding='async';
   image.onload=()=>{if(this.disposed)return;const tex=new THREE.CanvasTexture(drawScreenCanvas(this.movie,image));tex.colorSpace=THREE.SRGBColorSpace;this.screen.material.map.dispose();this.screen.material.map=tex;this.screen.material.needsUpdate=true;};
   image.onerror=()=>{index++;tryNext();};image.src=sources[index];};tryNext();
 }
 setupOverlay(){
  const parent=this.canvas.parentElement;this.overlay=document.createElement('div');this.overlay.className='theater-screen-video';this.overlay.dataset.format=this.showFormat;this.videoFrameHeight=Math.round(1280*this.profile.screenHeight/this.profile.screenWidth);this.overlay.style.setProperty('--fox-frame-height',this.videoFrameHeight+'px');
  this.overlay.setAttribute('aria-label','Official movie trailer when available');this.overlay.style.display='none';parent.appendChild(this.overlay);
  // Do not load or autoplay third-party video before the three-second intro.
  if(this.movie.trailer&&/^[A-Za-z0-9_-]{11}$/.test(this.movie.trailer)){
   this.timer=setTimeout(()=>{if(this.disposed)return;
    this.overlay.innerHTML='<div class="theater-video-black"></div>';
    this.overlay.style.display='block';this.overlay.classList.add('theater-video-enter');this.trailerActive=true;
    this.videoTimer=setTimeout(()=>{if(this.disposed)return;
      const frame=document.createElement('iframe');frame.title=`${this.movie.title} — Official trailer`;
      frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.referrerPolicy='strict-origin-when-cross-origin';
      frame.src=trailerEmbedUrl(this.movie.trailer,{origin:location.origin,muted:true});
      frame.setAttribute('allowfullscreen','');frame.className='theater-trailer-iframe';this.overlay.appendChild(frame);this.videoIframe=frame;frame.addEventListener('load',()=>{if(this.soundEnabled)this.applySound(true);},{once:true});
      requestAnimationFrame(()=>{this.overlay.querySelector('.theater-video-black')?.classList.add('fade-out');});
    },650);
   },3000);
  }else{
   this.info=document.createElement('div');this.info.className='trailer-note';this.info.textContent='Official trailer currently unavailable — showing movie artwork';
   parent.appendChild(this.info);this.infoTimeout=setTimeout(()=>this.info?.remove(),4500);
  }
 }
 /** YouTube postMessage API is opt-in; unmuting requires explicit user action on Safari. */
 applySound(enabled){
  if(!this.videoIframe?.contentWindow)return false;
  const command=func=>this.videoIframe.contentWindow.postMessage(JSON.stringify({event:'command',func,args:[]}), 'https://www.youtube-nocookie.com');
  command(enabled?'unMute':'mute');
  if(enabled)command('playVideo');
  return true;
 }
 setSoundEnabled(enabled){this.soundEnabled=Boolean(enabled);return this.applySound(this.soundEnabled);}
 updateOverlay(){if(!this.overlay||this.overlay.style.display==='none')return;
  const x=this.profile.screenWidth/2,y=this.profile.screenHeight/2,cy=6.65;
  const screenCorners=[[-x,cy+y,-3.92],[x,cy+y,-3.92],[x,cy-y,-3.92],[-x,cy-y,-3.92]];
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
  const projected=screenCorners.map(p=>{const q=new THREE.Vector3(...p).project(this.camera);return [(q.x+1)*w/2,(-q.y+1)*h/2,q.z]});
  if(projected.some(p=>p[2]>1)){this.overlay.style.visibility='hidden';return;}this.overlay.style.visibility='visible';
  const m=homography(projected.map(p=>p.slice(0,2)),1280,this.videoFrameHeight);if(m)this.overlay.style.transform=m;
 }
 setSeat(id,immediate=false){const s=getSeat(id);if(!s)return;this.selected=id;
  const eye=v(s.x,s.y+2.07,s.z+.15),look=v(0,6.5,-4);this.destEye=eye;this.destTarget=look;
  if(immediate||reduced()){this.currentEye.copy(eye);this.currentTarget.copy(look);this.entry=false;this.tween=null;}
  else this.tween={fromEye:this.currentEye.clone(),fromTarget:this.currentTarget.clone(),toEye:eye,toTarget:look,started:performance.now(),duration:this.entry?1650:1100,fromFov:this.fov,toFov:54,isEntry:this.entry};
  this.yaw=0;this.pitch=0;
 }
 reset(){this.yaw=0;this.pitch=0;this.fov=54;}
 attachInput(){
  this.down=e=>{if(e.button!==0)return;this.pointer=[e.clientX,e.clientY];this.canvas.setPointerCapture(e.pointerId)};
  this.move=e=>{if(!this.pointer)return;this.yaw=clamp(this.yaw+(e.clientX-this.pointer[0])*.003,-.72,.72);this.pitch=clamp(this.pitch+(e.clientY-this.pointer[1])*.003,-.40,.42);this.pointer=[e.clientX,e.clientY];};
  this.up=()=>this.pointer=null;
  this.wheel=e=>{e.preventDefault();this.fov=clamp(this.fov+e.deltaY*.019,42,95)};
  this.canvas.addEventListener('pointerdown',this.down);this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerup',this.up);this.canvas.addEventListener('pointercancel',this.up);this.canvas.addEventListener('wheel',this.wheel,{passive:false});
  this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);
 }
 resize(){const width=Math.max(this.canvas.clientWidth,1),height=Math.max(this.canvas.clientHeight,1);this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 frame(t){if(this.disposed)return;
  if(this.tween){const a=this.tween;let p=clamp((t-a.started)/a.duration,0,1);p=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
    this.currentEye.lerpVectors(a.fromEye,a.toEye,p);this.currentTarget.lerpVectors(a.fromTarget,a.toTarget,p);
    if(!a.isEntry)this.currentEye.y+=.4*Math.sin(p*Math.PI);this.fov=a.fromFov+(a.toFov-a.fromFov)*p;
    if(p===1){this.tween=null;this.entry=false;}
  }
  this.camera.position.copy(this.currentEye);
  const look=this.currentTarget.clone();const dist=look.distanceTo(this.camera.position);
  look.x+=Math.sin(this.yaw)*dist*.28;look.y+=Math.sin(this.pitch)*dist*.25;
  this.camera.fov=this.fov;this.camera.updateProjectionMatrix();this.camera.lookAt(look);
  // Motion is deliberately restrained: an approximate screen-color bounce
  // while a trailer runs. Cross-origin YouTube frames cannot be sampled.
  if(this.screenSpill) this.screenSpill.intensity=this.screenSpillBase*
      (this.trailerActive ? (1+.10*Math.sin(t*.0013)+.07*Math.sin(t*.0031)) : 1);
  if(document.visibilityState!=='hidden'){this.renderer.render(this.scene,this.camera);this.updateOverlay();}
  this.raf=requestAnimationFrame(this.frame);
 }
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);clearTimeout(this.timer);clearTimeout(this.videoTimer);clearTimeout(this.videoRevealTimer);clearTimeout(this.infoTimeout);this.videoIframe=null;
  this.overlay?.remove();this.info?.remove();window.removeEventListener('resize',this.onResize);
  this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.up);this.canvas.removeEventListener('wheel',this.wheel);
  grainTexture?.dispose?.();grainTexture=null;this.scene.traverse(obj=>{obj.geometry?.dispose?.();if(obj.material){const a=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of a){m.map?.dispose?.();m.dispose?.();}}});this.renderer.dispose();
 }
}
