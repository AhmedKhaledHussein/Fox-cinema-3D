/** CPU-side light probe for media we are permitted to sample.
 * This is deliberately independent of Three.js and can be tested in Node.
 * Cross-origin iframes (YouTube) are NOT readable by this module.
 */
export const PROBE_WIDTH = 48;
export const PROBE_HEIGHT = 27;
export const PROBE_INTERVAL_MS = 140;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(x)?x:lo));
export const clamp01=x=>clamp(x,0,1);

const blankZone=()=>({color:[.18,.30,.42],brightness:.18});
/** Compute left, centre and right screen contributions from real pixel data.
 * Alpha-zero pixels are omitted; bright pixels contribute more to their light
 * colour, but dark frames still reduce the overall projected energy.
 * Input is RGBA ImageData.data, and RGB outputs are sRGB in [0,1].
 */
export function analyzeScreenPixels(pixels,width,height){
 if(!pixels || !Number.isInteger(width)||!Number.isInteger(height) || width<=0||height<=0 ||
     pixels.length<width*height*4) throw new TypeError('Invalid screen pixel buffer');
 const sums=Array.from({length:3},()=>({r:0,g:0,b:0,w:0,luma:0,count:0,high:0}));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,alpha=pixels[i+3]/255;
  if(alpha<.2)continue;
  const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
  const luma=.2126*r+.7152*g+.0722*b;
  const saturation=Math.max(r,g,b)-Math.min(r,g,b);
  const weight=(.025+Math.pow(luma,1.55))*(1+.22*saturation)*alpha;
  const zone=Math.min(2,Math.floor(3*x/width));const s=sums[zone];
  s.r+=r*weight;s.g+=g*weight;s.b+=b*weight;s.w+=weight;
  s.luma+=luma*alpha;s.count+=alpha;
  if(luma>.60)s.high+=alpha;
 }
 const zones=sums.map(s=>{
  if(s.count===0)return blankZone();
  const mean=s.luma/s.count,high=s.high/s.count;
  const energy=clamp(.09+Math.pow(mean,.83)*1.35+high*.32,.10,1.75);
  const color=s.w>0?[s.r/s.w,s.g/s.w,s.b/s.w]:[mean,mean,mean];
  return {color:color.map(clamp01),brightness:energy};
 });
 const global={color:[0,1,2].map(i=>zones.reduce((s,z)=>s+z.color[i]*z.brightness,0)/Math.max(.001,zones.reduce((s,z)=>s+z.brightness,0))),
  brightness:zones.reduce((s,z)=>s+z.brightness,0)/3};
 return {zones,global};
}
/** Smooth color/brightness transitions to prevent painful strobing and
 * unrealistic single-frame jumps. timeMs is elapsed real time, not frame count.
 */
export function smoothLightSample(previous,target,timeMs=16,reducedMotion=false){
 if(!target?.zones || target.zones.length!==3)return previous;
 if(!previous)return structuredCloneSample(target);
 const ms=clamp(timeMs,0,300);
 const halfLife=reducedMotion?650:210;
 const alpha=1-Math.exp(-Math.LN2*ms/halfLife);
 const blend=(a,b)=>a+(b-a)*alpha;
 return {zones:previous.zones.map((z,i)=>({color:z.color.map((c,k)=>blend(c,target.zones[i].color[k])),brightness:blend(z.brightness,target.zones[i].brightness)})),
  global:{color:previous.global.color.map((c,k)=>blend(c,target.global.color[k])),brightness:blend(previous.global.brightness,target.global.brightness)}};
}
export function structuredCloneSample(sample){return {zones:sample.zones.map(z=>({color:[...z.color],brightness:z.brightness})),global:{color:[...sample.global.color],brightness:sample.global.brightness}};}

/** Only genuine same-origin videos may enter frame sampling / VideoTexture.
 * Never allow a remote media URL disguised as a relative path.
 */
export function localTrailerPath(value){
 if(typeof value!=='string'||!/^\/assets\/trailers\/[a-z0-9_-]+\.(?:mp4|webm|m4v)$/i.test(value))return null;
 return value;
}

export class ScreenFrameProbe{
 constructor(doc=document){this.canvas=doc.createElement('canvas');this.canvas.width=PROBE_WIDTH;this.canvas.height=PROBE_HEIGHT;
  this.context=this.canvas.getContext('2d',{willReadFrequently:true,alpha:false});this.last=0;}
 sample(media,now=performance.now(),minimumInterval=PROBE_INTERVAL_MS){
  if(!this.context||now-this.last<minimumInterval)return null;
  if(media?.tagName==='VIDEO' && (media.readyState<2 || !media.videoWidth || !media.videoHeight))return null;
  if(!media)return null;
  try{
   this.context.drawImage(media,0,0,PROBE_WIDTH,PROBE_HEIGHT);
   const frame=this.context.getImageData(0,0,PROBE_WIDTH,PROBE_HEIGHT);
   this.last=now;
   return analyzeScreenPixels(frame.data,PROBE_WIDTH,PROBE_HEIGHT);
  }catch{
   // A cross-origin image can taint the probe permanently. Resetting the
   // canvas restores a clean surface before a permitted local video arrives.
   this.canvas.width=PROBE_WIDTH;this.canvas.height=PROBE_HEIGHT;
   this.context=this.canvas.getContext('2d',{willReadFrequently:true,alpha:false});
   return null;
  }
 }
}
