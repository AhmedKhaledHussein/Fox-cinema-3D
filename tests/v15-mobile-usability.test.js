import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('V15 showtimes render 3/4 equally sized, non-scrolling mobile pills with two labels',()=>{
 assert.match(app,/class="booking-times" data-count="\$\{state\.screenFormat==='Standard'\?4:3\}"/);
 assert.match(app,/class="time-value"/);assert.match(app,/class="time-format"/);
 assert.match(app,/aria-pressed="\$\{time===state\.time\}"/);
 assert.match(css,/\.booking-times\[data-count="3"\]\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.booking-times button\{[^}]*white-space:normal/);
});
test('V15 prevents older HUD animations from overriding the collapsed drawer transform',()=>{
 assert.match(css,/html\[data-fox-route="theater"\] \.theater-page \.hud,\s*\.theater-page \.hud\{animation:none!important/);
 assert.match(css,/transform:translate3d\(calc\(100% \+ 8px\),-50%,0\)!important/);
 assert.match(css,/\.theater-page\.hud-open \.hud\{[^}]*transform:translate3d\(0,-50%,0\)!important/);
 assert.match(css,/visibility:hidden;pointer-events:none/);
});
test('V15 mobile HUD opens and closes via arrow, inside X, scrim, and Escape',()=>{
 assert.match(app,/class="hud-scrim"[^>]*data-action="hud-toggle"/);
 assert.match(app,/class="hud-dismiss"[^>]*data-action="hud-toggle"/);
 assert.match(app,/case 'hud-toggle':setHudOpen\(!state\.hudOpen\)/);
 assert.match(app,/state\.hudOpen=mobile&&Boolean\(next\)/);
 assert.match(app,/panel\.inert=mobile&&!state\.hudOpen/);
 assert.match(app,/toggle\.setAttribute\('aria-expanded',String\(state\.hudOpen\)\)/);
 assert.match(app,/event\.key==='Escape'&&router\(\)==='3d'&&state\.hudOpen/);
});
test('V15 seat map preserves all rows and prevents initial horizontal clipping',()=>{
 assert.match(css,/\.seat-map-viewport\{[^}]*overflow-x:hidden/);
 assert.match(css,/\.seat-row \.seat-group\{[^}]*grid-template-columns:repeat\(var\(--seat-count\),minmax\(0,1fr\)\)/);
 assert.match(app,/aria-label="Seat \$\{s\.id\}/);
 assert.match(css,/\.booking-actions \.booking-total small\{[^}]*text-overflow:ellipsis/);
 assert.match(css,/@media \(max-width:350px\) and \(max-height:620px\)/);
});
