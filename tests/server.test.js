import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
let proc,port=43219,tmp;
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base=`http://127.0.0.1:${port}`;
async function request(url,method='GET',body,cookie){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
before(async()=>{tmp=await mkdtemp(path.join(os.tmpdir(),'fox-test-'));proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),FOX_DB_PATH:path.join(tmp,'db.json')},stdio:'pipe'});for(let i=0;i<70;i++){await new Promise(r=>setTimeout(r,100));try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}}throw Error('Server failed to start');});
after(async()=>{proc?.kill('SIGTERM');await rm(tmp,{recursive:true,force:true})});
test('Health and static pages load',async()=>{const r=await fetch(base+'/');assert.equal(r.status,200);assert.match(await r.text(),/FOX Cinema/);const j=await request('/api/health');assert.equal(j.status,200);assert.equal(j.data.mode,'local-demo')});
test('Real seat hold conflict, expiry metadata and confirmed ticket',async()=>{
 const a=await request('/api/seats?show=godzilla-minus-zero:city-centre-alexandria:2026-11-15:21:45');const cookieA=a.cookie;
 const b=await request('/api/seats?show=godzilla-minus-zero:city-centre-alexandria:2026-11-15:21:45');const cookieB=b.cookie;
 assert.ok(cookieA&&cookieB&&cookieA!==cookieB);
 const showId='godzilla-minus-zero:city-centre-alexandria:2026-11-15:21:45';
 const seats=['C16','D1','D9','D24','G2','G9','G10','M6','M27'];
 const hold=await request('/api/holds','POST',{showId,seats},cookieA);assert.equal(hold.status,201);assert.ok(hold.data.expiresAt>Date.now());assert.equal(hold.data.bill.subtotal,2220);assert.equal(hold.data.bill.serviceFee,135);assert.equal(hold.data.bill.vat,329.7);assert.equal(hold.data.bill.total,2684.7);
 const conflict=await request('/api/holds','POST',{showId,seats:['G9']},cookieB);assert.equal(conflict.status,409);
 const draft=await request('/api/bookings','POST',{holdId:hold.data.holdId,email:'test@example.com',firstName:'Test',lastName:'Viewer',phone:'+201234567890'},cookieA);assert.equal(draft.status,201);assert.equal(draft.data.status,'awaiting_demo_payment');
 const paid=await request('/api/pay-demo','POST',{bookingId:draft.data.bookingId},cookieA);assert.equal(paid.status,200);assert.equal(paid.data.status,'confirmed');assert.ok(paid.data.ticketCode);
 const again=await request('/api/holds','POST',{showId,seats:['G9']},cookieB);assert.equal(again.status,409);
 const fetchTicket=await request('/api/bookings/'+encodeURIComponent(paid.data.bookingId),'GET',null,cookieA);assert.equal(fetchTicket.status,200);assert.equal(fetchTicket.data.seats.length,9);
});
test('Invalid seat and invalid contact rejected',async()=>{const res=await request('/api/holds','POST',{showId:'a:b:c:d',seats:['Z999']});assert.equal(res.status,400);assert.match(res.data.error,/Invalid seat/)});
test('Registration login and password validation',async()=>{const s=await request('/api/me');const cookie=s.cookie;const register=await request('/api/register','POST',{name:'Cinema Visitor',email:'guest@fox.test',password:'hello-fox-demo'},cookie);assert.equal(register.status,201);const me=await request('/api/me','GET',null,cookie);assert.equal(me.data.account.email,'guest@fox.test');const logout=await request('/api/logout','POST',{},cookie);assert.equal(logout.status,200);const login=await request('/api/login','POST',{email:'guest@fox.test',password:'hello-fox-demo'},cookie);assert.equal(login.status,200)});
