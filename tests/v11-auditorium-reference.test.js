import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layout,getSeat} from '../public/catalog.js';
import {screenProfile,trailerEmbedUrl} from '../public/theater-presets.js';
const three=fs.readFileSync(new URL('../public/theater-three.js',import.meta.url),'utf8');

test('V11 seat backrest is genuinely curved and instanced instead of faceted extruded block',()=>{
 assert.match(three,/function upholsteredPad\(low=false\)/);
 assert.match(three,/new THREE\.SphereGeometry\(1,low\?16:32,low\?12:24\)/);
 assert.match(three,/function curvedReclinerShell\(low=false\)/);
 assert.match(three,/new THREE\.BoxGeometry\(2,2,2,low\?4:9,low\?6:12,low\?3:6\)/);
 assert.match(three,/n\.setXYZ\(i,nx,ny,nz\)/);
 assert.doesNotMatch(three,/new THREE\.ExtrudeGeometry/);
 assert.match(three,/new THREE\.InstancedMesh\(part\.geo,m,seats\.length\)/);
 assert.match(three,/geo\.computeVertexNormals\(\)/);
 assert.match(three,/clearcoat:\.10/);
 assert.match(three,/name:'back-inset'/);
 assert.match(three,/name:'headrest'/);
 assert.ok(layout.length>=300,'full auditorium geometry remains available');
});
test('V11 camera maintains perspective by selected seat and prioritizes screen composition',()=>{
 assert.match(three,/const eye=v\(s\.x,s\.y\+2\.02,s\.z\+\.15\),look=v\(0,4\.80,-4\)/);
 assert.match(three,/toFov:\(s\.rowIndex<3\?52:49\)/);
 assert.ok(getSeat('M27').x>10);
 assert.ok(getSeat('M13').x<getSeat('M27').x);
});
test('V11 preserves interactive video, audio and format-aware screen',()=>{
 assert.match(three,/this\.profile\.screenWidth/);
 assert.match(three,/this\.profile\.label/);
 assert.match(three,/setSoundEnabled\(enabled\)/);
 assert.match(three,/this\.overlay\.appendChild\(frame\)/);
 assert.match(three,/function homography/);
 assert.ok(screenProfile('MAX').screenWidth>screenProfile('Standard').screenWidth);
 assert.match(trailerEmbedUrl('U9t-slLl30E'),/mute=1/);
});
test('V11 limits redundant GPU materials and texture disposal',()=>{
 assert.match(three,/const geometries=new Set\(\),materials=new Set\(\),textures=new Set\(\)/);
 assert.match(three,/const ceilingBulbGeometry=new THREE\.SphereGeometry/);
 assert.match(three,/const ceilingBulbMaterial=new THREE\.MeshBasicMaterial/);
 assert.match(three,/this\.renderer\.setPixelRatio\(Math\.min/);
});
