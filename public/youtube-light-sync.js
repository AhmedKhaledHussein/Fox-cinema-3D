/** Optional YouTube IFrame Player API sync. No API key is needed.
 * YouTube does not expose decoded frames to the host page. Colours below are
 * approximate artwork samples, or licensed/pre-analysed light-track samples.
 * The API clock keeps changes in step with play, pause and seek.
 */
const validNumber=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let loader;
export function loadYouTubeIFrameAPI(win=window){
 if(win.YT?.Player)return Promise.resolve(win.YT);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  let finished=false;
  const old=win.onYouTubeIframeAPIReady;
  const finish=()=>{if(finished)return;finished=true;clearTimeout(timeout);resolve(win.YT);};
  win.onYouTubeIframeAPIReady=()=>{try{if(typeof old==='function')old();}finally{if(win.YT?.Player)finish();}};
  const timeout=setTimeout(()=>{if(!finished){finished=true;loader=null;reject(new Error('YouTube IFrame API unavailable'));}},9000);
  if(win.YT?.Player){finish();return;}
  const script=win.document.createElement('script');script.async=true;script.src='https://www.youtube.com/iframe_api';
  script.onerror=()=>{if(!finished){finished=true;clearTimeout(timeout);loader=null;reject(new Error('YouTube IFrame API blocked'));}};
  win.document.head.appendChild(script);
 });
 return loader;
}
function blend(a,b,t){return a+(b-a)*t;}
function mixSamples(a,b,t){
 const k=clamp(t,0,1);
 const zones=a.zones.map((z,i)=>({color:z.color.map((value,c)=>blend(value,b.zones[i].color[c],k)),brightness:blend(z.brightness,b.zones[i].brightness,k)}));
 return {zones,global:{color:a.global.color.map((value,c)=>blend(value,b.global.color[c],k)),brightness:blend(a.global.brightness,b.global.brightness,k)}};
}
export function isLightSample(value){return value?.zones?.length===3&&value.zones.every(z=>z.color?.length===3&&validNumber(z.brightness))&&value.global?.color?.length===3;}
/** A licensed light track is [{time: seconds,sample: zones+global},...].
 * Never claim a track is sampled from YouTube: YouTube iframes are opaque.
 */
export function sampleTimedLight(palettes,seconds,track=null){
 const samples=(palettes||[]).filter(isLightSample);
 if(!samples.length)return null;
 const time=Math.max(0,validNumber(seconds)?seconds:0);
 if(Array.isArray(track)&&track.length){
  const valid=track.filter(x=>validNumber(x.time)&&x.time>=0&&isLightSample(x.sample)).sort((a,b)=>a.time-b.time);
  if(valid.length){
   if(time<=valid[0].time)return valid[0].sample;
   if(time>=valid.at(-1).time)return valid.at(-1).sample;
   for(let i=0;i<valid.length-1;i++){const a=valid[i],b=valid[i+1];if(time>=a.time&&time<=b.time)return mixSamples(a.sample,b.sample,(time-a.time)/Math.max(.001,b.time-a.time));}
  }
 }
 if(samples.length===1)return samples[0];
 // Visual *approximation* from this film's artwork palettes, not a video read.
 // Deterministic in playback time: pausing or seeking returns a stable light state.
 const period=9,cycle=time/period,index=Math.floor(cycle)%samples.length;
 const fraction=cycle-Math.floor(cycle);
 const smooth=fraction*fraction*(3-2*fraction);
 const sample=mixSamples(samples[index],samples[(index+1)%samples.length],smooth);
 const energy=.86+.12*Math.sin(time*.53)+.09*Math.sin(time*.19+1.1);
 for(const z of sample.zones)z.brightness=clamp(z.brightness*energy,.06,1.8);
 sample.global.brightness=clamp(sample.global.brightness*energy,.06,1.8);
 return sample;
}
/** Safe metadata tracks may be added only from same-origin JSON, with explicit provenance. */
export function lightTrackPath(value){return typeof value==='string'&&/^\/assets\/light-tracks\/[a-zA-Z0-9_-]+\.json$/.test(value)?value:null;}
