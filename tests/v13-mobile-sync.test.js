import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layout,ROWS} from '../public/catalog.js';
import {sampleTimedLight,isLightSample,lightTrackPath} from '../public/youtube-light-sync.js';
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../public/theater-three.js',import.meta.url),'utf8');
const sample=seed=>({zones:[0,1,2].map(i=>({color:[seed,i/3,.3],brightness:seed})),global:{color:[seed,.2,.3],brightness:seed}});
test('mobile map fits all 13 rows in width, with accessible named seats',()=>{
 assert.equal(ROWS.length,13);assert.ok(layout.length>250);
 assert.match(app,/style="--seat-count:\$\{g\.length\}"/);
 assert.match(css,/\.seat-map-viewport\{[^}]*overflow-x:hidden/);
 assert.match(css,/\.seat-map\{min-width:0!important;width:100%/);
 assert.match(css,/\.seat-row \.seat-group\{[^}]*grid-template-columns:repeat\(var\(--seat-count\),minmax\(0,1fr\)\)/);
 assert.match(app,/aria-label="Seat \$\{s\.id\}/);
});
test('seat details on mobile are dismissible to right with accessible toggle, desktop keeps HUD',()=>{
 assert.match(app,/data-action="hud-toggle"/);
 assert.match(app,/aria-expanded="false"/);
 assert.match(app,/panel\.inert=mobile&&!state\.hudOpen/);
 assert.match(css,/\.theater-page \.hud\{[^}]*transform:translate\(103%,-50%\)/);
 assert.match(css,/\.theater-page\.hud-open \.hud\{transform:translate\(0,-50%\)/);
 assert.match(css,/\.theater-page \.hud-toggle/);
});
test('YouTube IFrame Player API clock sync supports pause, seek, muted sound',()=>{
 assert.match(engine,/new YT\.Player\(iframe/);
 assert.match(engine,/getCurrentTime\(\)/);
 assert.match(engine,/onStateChange/);
 assert.match(engine,/this\.youtubePlayer\.unMute\(\)/);
 assert.match(engine,/this\.pollYouTubeClock\(t\)/);
 assert.match(engine,/toFov:\(mobile\?/);
});
test('YouTube light samples are clock deterministic and never claim frame capture',()=>{
 const palettes=[sample(.25),sample(.8)];
 assert.ok(isLightSample(palettes[0]));
 const a=sampleTimedLight(palettes,3.4);
 const b=sampleTimedLight(palettes,3.4);
 assert.deepEqual(a,b);
 assert.notDeepEqual(sampleTimedLight(palettes,3.4),sampleTimedLight(palettes,13.5));
 const keyed=sampleTimedLight(palettes,4,[{time:0,sample:sample(.1)},{time:8,sample:sample(.9)}]);
 assert.ok(keyed.global.brightness>.1&&keyed.global.brightness<.9);
 assert.equal(lightTrackPath('/assets/light-tracks/abc123.json'),'/assets/light-tracks/abc123.json');
 assert.equal(lightTrackPath('https://youtube.com/watch?v=x'),null);
});
