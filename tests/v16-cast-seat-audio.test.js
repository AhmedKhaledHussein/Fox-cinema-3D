import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCast} from '../lib/cast.mjs';
import {seatAudioProfile} from '../public/seat-audio.js';
import {castMarkup} from '../public/cast-ui.js';
import {getSeat} from '../public/catalog.js';
test('real movie credits include actor, character and verified portrait path',()=>{
 const c=normalizeCast({cast:[{id:20,name:'Actor',character:'Hero',profile_path:'/avatar.jpg',order:0}]});
 assert.equal(c[0].character,'Hero');
 assert.equal(c[0].portrait,'https://image.tmdb.org/t/p/w342/avatar.jpg');
});
test('TV credits use aggregate roles and animation has voice labels',()=>{
 const c=normalizeCast({cast:[{id:30,name:'Voice artist',roles:[{character:'Panda (voice)'}],profile_path:null}]},{type:'tv'});
 assert.equal(c[0].voice,true);
 assert.match(castMarkup({cast:c},'en'),/Voice of/);
});
test('safe cast HTML escapes untrusted roles',()=>{
 const html=castMarkup({cast:normalizeCast({cast:[{id:4,name:'<script>',character:'<b>Role</b>'}]})},'en');
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;b&gt;/);
});
test('seat volume decays with distance and pan direction changes with side',()=>{
 assert.ok(seatAudioProfile(getSeat('A14')).volume>seatAudioProfile(getSeat('M14')).volume);
 assert.ok(seatAudioProfile(getSeat('K2')).pan>0);
 assert.ok(seatAudioProfile(getSeat('K21')).pan<0);
});
