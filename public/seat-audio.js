/** Seat-aware acoustic preview: screen is centered at x=0,z=-4 in the 3D scene.
 * YouTube IFrame API supports VOLUME, NOT stereo panning. Panning applies only
 * to local, authorized videos when Web Audio can access the sound stream.
 */
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function seatAudioProfile(seat){
 if(!seat||!Number.isFinite(seat.x)||!Number.isFinite(seat.z))return {volume:60,pan:0,distance:25};
 const distance=Math.hypot(seat.x,seat.z+4);
 const normalized=clamp((distance-8)/37,0,1);
 // Gentle near/far difference, hearing-safe, no boosts above the player's volume.
 const side=clamp(Math.abs(seat.x)/15,0,1);
 const volume=Math.round(clamp(84-36*normalized-5*side,35,84));
 // When seated right of the center line, the screen is perceived to the left.
 const pan=clamp(-seat.x/15*.62,-.62,.62);
 return {volume,pan:Math.round(pan*100)/100,distance:Math.round(distance*10)/10};
}
