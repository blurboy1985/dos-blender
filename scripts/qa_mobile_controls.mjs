import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const ws=new WebSocket(process.argv[2]);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0,session;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
const send=(method,params={},scoped=true)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(scoped&&session?{sessionId:session}:{})}));});
const {targetInfos}=await send('Target.getTargets');const page=targetInfos.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:4174/'));assert(page,'Local test tab exists');session=(await send('Target.attachToTarget',{targetId:page.targetId,flatten:true},false)).sessionId;
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const touch=async(type,points=[])=>{await send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:3,radiusY:3,force:1}))});};
const center=selector=>run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,1]})()`);
const tap=async selector=>{await touch('touchStart',[await center(selector)]);await touch('touchEnd');await pause(80);};
try {
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await pause(100);
await run("document.querySelector('[data-gallery=\"1\"]').click()");await pause(100);
let start=await run('dosStatus()');assert.equal(start.mode,'walk');
await tap('#zoom-out');assert((await run('dosStatus().followDistance'))>start.followDistance);
await tap('#zoom-in');assert(Math.abs(await run('dosStatus().followDistance')-start.followDistance)<.001);
const yaw=await run('dosStatus().yaw');await tap('#turn-left');assert((await run('dosStatus().yaw'))>yaw);await tap('#turn-right');assert(Math.abs(await run('dosStatus().yaw')-yaw)<.001);
await tap('#reset-camera');assert.equal(await run('dosStatus().followDistance'),4.3);
await touch('touchStart',[[150,300,1],[250,300,2]]);await touch('touchMove',[[125,300,1],[275,300,2]]);await touch('touchEnd');await pause(100);
const pinched=await run('dosStatus().followDistance');assert(pinched<4.3,'Pinch-out zooms in');
await tap('#reset-camera');const before=await run('dosStatus().position');await touch('touchStart',[await center('[data-move=left]')]);await pause(420);await touch('touchEnd');await pause(70);const after=await run('dosStatus().position');assert(after[0]<before[0]-.3,'Hold walks left');await pause(220);const stopped=await run('dosStatus().position');assert(Math.abs(stopped[0]-after[0])<.01,'Release stops movement');
await tap('#overview');assert.equal(await run('dosStatus().mode'),'overview');let d=await run('Math.hypot(...dosStatus().camera)');await tap('#zoom-in');let di=await run('Math.hypot(...dosStatus().camera)');assert(di<d,'Floor plan zoom in');await tap('#zoom-out');assert(Math.abs(await run('Math.hypot(...dosStatus().camera)')-d)<.01);await tap('#reset-camera');
const report={portrait:[390,844],zoomButtons:true,turnButtons:true,reset:true,pinch:{before:4.3,after:pinched},holdToWalk:{before,after,stopped},floorPlanZoom:true};
console.log(JSON.stringify(report,null,2));writeFileSync('../docs/mobile-controls-validation.json',JSON.stringify(report,null,2));
}finally{ws.close();}
