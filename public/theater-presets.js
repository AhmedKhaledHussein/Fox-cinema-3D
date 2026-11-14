/** Reference-inspired auditorium profiles. Demo show formats are not real cinema specifications. */
export const SCREEN_PROFILES=Object.freeze({
  Standard:Object.freeze({label:'STANDARD',screenWidth:23.2,screenHeight:10.5,accent:'#9ab2c7'}),
  MAX:Object.freeze({label:'MAX',screenWidth:27.25,screenHeight:11.55,accent:'#ef897a'}),
  IMAX:Object.freeze({label:'IMAX',screenWidth:27.8,screenHeight:11.65,accent:'#8baed6'}),
  GOLD:Object.freeze({label:'GOLD',screenWidth:24.7,screenHeight:10.9,accent:'#e2b67e'}),
  '4DX':Object.freeze({label:'4DX',screenWidth:26.5,screenHeight:11.25,accent:'#6fd3c1'}),
  KIDS:Object.freeze({label:'KIDS',screenWidth:23.7,screenHeight:10.6,accent:'#c6a2ed'}),
});
export function normalizeScreenFormat(value){return Object.hasOwn(SCREEN_PROFILES,value)?value:'Standard';}
export function screenProfile(value){return SCREEN_PROFILES[normalizeScreenFormat(value)];}
export function trailerEmbedUrl(key,{origin='',muted=true}={}){
  if(!/^[A-Za-z0-9_-]{11}$/.test(String(key||'')))return null;
  const query=new URLSearchParams({autoplay:'1',mute:muted?'1':'0',playsinline:'1',controls:'1',rel:'0',modestbranding:'1',enablejsapi:'1'});
  if(origin && /^https?:\/\/[^/]+$/.test(origin))query.set('origin',origin);
  return `https://www.youtube-nocookie.com/embed/${key}?${query}`;
}
