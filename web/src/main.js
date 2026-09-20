import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAvatar,animateAvatar,disposeAvatar,defaultAvatar,nameLabel} from './avatar.js';
import {avatarOptions,randomAvatar} from './avatar-options.js';
import {addWallDisplays,wallDisplays} from './wall-displays.js';
import {addOfficers} from './officers.js';
import {emailHref,sandraHref} from './contacts.js';
import './style.css';

const $=id=>document.getElementById(id);
const [content,manifest,contacts]=await Promise.all(['exhibits','scene','contacts'].map(async n=>{
  const r=await fetch(`/assets/${n}.json`);if(!r.ok)throw new Error(`Could not load ${n}`);return r.json();
}));
const compact=()=>innerWidth<=900;
const cameraPointers=new Map();
const exhibits=content.exhibits,visited=new Set(),completed=new Set(),keys=new Set(),touch=new Set();
let mode='welcome',active=-1,current=-1,nearest=-1,nearOfficer=-1,contactIndex=-1,ready=false,dragging=false;
let yaw=0,elevation=.40,followDistance=4.3,renderer,orbit,avatarChosen=false,pendingTravel=-1,phase=0;
let settings={...defaultAvatar},previewRenderer,previewAvatar;
const playerPosition=new THREE.Vector3(0,.05,10);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.05,150);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e5ece7');
scene.add(new THREE.HemisphereLight(0xeaf5ff,0x617264,2.5));
const sunlight=new THREE.DirectionalLight(0xfff0d8,3.2);sunlight.position.set(-8,20,12);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xd5eaff,1.3);fill.position.set(16,12,-10);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#dce7de',roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.35;scene.add(ground);
let player=createAvatar(settings);player.visible=false;scene.add(player);
const officers=addOfficers(scene,exhibits);
const wallArt=addWallDisplays(scene,exhibits);

// Player collision is independent of the follow camera.
const worldBoxes=manifest.colliders.map(c=>({center:[c.center[0],c.center[2],-c.center[1]],size:[c.size[0],c.size[2],c.size[1]]}));
worldBoxes.push(...officers.map(o=>o.box));
const obstacles=worldBoxes.filter(c=>c.center[1]+c.size[1]/2>.03&&c.center[1]-c.size[1]/2<1.8).map(c=>({
  minX:c.center[0]-c.size[0]/2-.32,maxX:c.center[0]+c.size[0]/2+.32,
  minZ:c.center[2]-c.size[2]/2-.32,maxZ:c.center[2]+c.size[2]/2+.32
}));
const cameraBoxes=worldBoxes.map(c=>new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...c.center),new THREE.Vector3(...c.size).addScalar(.18)));
const ray=new THREE.Ray(),hit=new THREE.Vector3(),target=new THREE.Vector3(),desired=new THREE.Vector3();
function free(x,z){return x>-13.5&&x<13.5&&z>-11.5&&z<11.5&&!obstacles.some(b=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ);}
function followCamera(){
  target.copy(playerPosition).add(new THREE.Vector3(0,.97,0));
  desired.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
  ray.set(target,desired);let distance=followDistance;
  for(const box of cameraBoxes){if(box.containsPoint(target))continue;if(ray.intersectBox(box,hit))distance=Math.min(distance,Math.max(.65,target.distanceTo(hit)-.15));}
  camera.position.copy(target).addScaledVector(desired,distance);camera.lookAt(target);
}
const modalOpen=()=>Boolean(document.querySelector('dialog[open]'));
function stopInput(){keys.clear();touch.clear();cameraPointers.clear();dragging=false;document.querySelectorAll('[data-move]').forEach(b=>b.classList.remove('held'));}
function updateProgress(){
  $('progress').textContent=`${visited.size} / 4`;
  document.querySelectorAll('[data-gallery]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.gallery)===current);b.classList.toggle('done',completed.has(Number(b.dataset.gallery)));});
}
exhibits.forEach((e,i)=>{
  const b=document.createElement('button');b.className='room-button';b.dataset.gallery=i;
  const num=document.createElement('span');num.className='number';num.textContent=`0${i+1}`;
  const label=document.createElement('span');label.textContent=['Statistics','Digital services','Standards','Surveys'][i];
  const small=document.createElement('small');small.textContent=['Evidence for decisions','Your digital toolkit','A common language','Responses to insights'][i];
  label.append(small);b.append(num,label);b.onclick=()=>renderer?travel(i):openExhibit(i);$('gallery-list').append(b);
});
function showWalkUI(){
  document.body.classList.add('walking');$('welcome').hidden=true;
  const mobile=compact();$('navigation').hidden=mobile;$('gallery-toggle').hidden=!mobile;$('gallery-toggle').setAttribute('aria-expanded','false');
  $('location').hidden=false;$('edit-avatar').hidden=false;$('overview').hidden=!renderer;$('walk').hidden=true;
  $('location-text').textContent=current<0?'Reception':exhibits[current].short_title.toLowerCase().replace(/^./,c=>c.toUpperCase());
  $('touch-controls').hidden=!renderer||!matchMedia('(pointer:coarse), (max-width:900px)').matches;
  $('instructions').textContent='WASD / arrows to walk · Drag to turn · E: gallery · T: officer';
  $('camera-controls').hidden=!renderer;$('mobile-hint').hidden=!renderer;$('mobile-hint').textContent='Hold arrows to walk · Drag to look · Pinch to zoom';
}
function travel(i){
  if(!avatarChosen){pendingTravel=i;openCreator();return;}
  mode='walk';current=i;active=-1;stopInput();if($('exhibit').open)$('exhibit').close();if(orbit)orbit.enabled=false;
  const p=manifest.sockets[i<0?'Start':`Station_${i}`];playerPosition.set(p[0],.05,-p[1]);
  if(i<0)playerPosition.z=9;
  yaw=0;elevation=.4;player.position.copy(playerPosition);player.rotation.y=Math.PI;player.visible=!!renderer;
  camera.clearViewOffset();followCamera();showWalkUI();updateProgress();updateNear();
}
function overview(){
  if(!ready)return;mode='overview';stopInput();$('welcome').hidden=true;document.body.classList.add('walking');
  $('navigation').hidden=compact();$('gallery-toggle').hidden=!compact();$('gallery-toggle').setAttribute('aria-expanded',String(!$('navigation').hidden));
  $('interact').hidden=true;$('talk').hidden=true;$('touch-controls').hidden=true;$('overview').hidden=true;$('walk').hidden=false;
  if(renderer){camera.clearViewOffset();orbit.enabled=true;resetCamera();}
  $('camera-controls').hidden=!renderer;$('mobile-hint').hidden=!renderer;$('mobile-hint').textContent='Drag to orbit · Pinch or tap + / − to zoom';
  $('instructions').textContent='Drag to orbit · Scroll to zoom · Select a gallery to visit';
}
function zoomCamera(factor){
  if(!renderer||modalOpen())return;
  if(mode==='walk')followDistance=THREE.MathUtils.clamp(followDistance*factor,2.8,8);
  else if(mode==='overview'){
    const offset=camera.position.clone().sub(orbit.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,orbit.minDistance,orbit.maxDistance));
    camera.position.copy(orbit.target).add(offset);orbit.update();
  }
}
function turnCamera(angle){
  if(!renderer||modalOpen())return;
  if(mode==='walk')yaw+=angle;
  else if(mode==='overview'){
    const offset=camera.position.clone().sub(orbit.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
    camera.position.copy(orbit.target).add(offset);orbit.update();
  }
}
function resetCamera(){
  if(mode==='walk'){yaw=player.rotation.y-Math.PI;elevation=.4;followDistance=4.3;followCamera();}
  else if(mode==='overview'){
    const distance=THREE.MathUtils.clamp(22/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect),45,90);
    orbit.target.set(0,0,0);camera.position.set(26,30,32).setLength(distance);orbit.update();
  }
}
$('zoom-in').onclick=()=>zoomCamera(1/1.2);$('zoom-out').onclick=()=>zoomCamera(1.2);
$('turn-left').onclick=()=>turnCamera(Math.PI/8);$('turn-right').onclick=()=>turnCamera(-Math.PI/8);
$('reset-camera').onclick=()=>{if(!modalOpen())resetCamera();};
function updateNear(){
  nearest=-1;nearOfficer=-1;
  if(mode!=='walk'||!renderer){$('interact').hidden=true;$('talk').hidden=true;return;}
  let best=2.2;exhibits.forEach((e,i)=>{const d=Math.hypot(playerPosition.x-e.x,playerPosition.z+e.y-2);if(d<best){best=d;nearest=i;}});
  best=2.1;officers.forEach((o,i)=>{const d=Math.hypot(playerPosition.x-o.position.x,playerPosition.z-o.position.z);if(d<best){best=d;nearOfficer=i;}});
  $('interact').hidden=nearest<0;$('talk').hidden=nearOfficer<0;
  if(nearest>=0)$('interact').querySelector('span').textContent=`Explore ${['statistics','digital services','standards','surveys'][nearest]}`;
  if(nearOfficer>=0)$('talk').querySelector('span').textContent=`Talk to ${['statistics','digital services','standards','surveys'][nearOfficer]} officer`;
}
function openExhibit(i){
  if(i<0)return;stopInput();active=i;current=i;visited.add(i);updateProgress();const e=exhibits[i];
  $('exhibit-category').textContent=`GALLERY 0${i+1} / ${e.short_title}`;$('exhibit-title').textContent=e.title.replace(/^\d+\s+/,'');
  $('exhibit-body').textContent=e.body;
  const art=wallDisplays[i];$('wall-image').src=art.image;$('wall-image').alt=art.description;$('wall-description').textContent=art.description;$('wall-source').href=art.source;document.querySelector('.wall-display').open=false;$('question').textContent=e.activity;
  $('feedback').textContent=completed.has(i)?'You have completed this activity. Try it again, or continue exploring.':'';
  $('choices').replaceChildren();e.choices.forEach((choice,n)=>{const b=document.createElement('button');b.textContent=`${n+1} · ${choice}`;b.onclick=()=>answer(n+1);$('choices').append(b);});
  $('source-link').href=e.url;$('source-label').textContent=e.source_label;$('exhibit').showModal();
}
function answer(n){if(active<0)return;const e=exhibits[active],correct=n===e.answer;$('feedback').textContent=correct?e.explanation:'Try again. Think about the purpose of each option.';if(correct){completed.add(active);$('choices').children[n-1].classList.add('correct');updateProgress();}}
function closeExhibit(){$('exhibit').close();active=-1;stopInput();}

// Names and contact messages are kept in memory; nothing is sent by this app.
function openOfficer(i){
  if(i<0)return;stopInput();contactIndex=i;const c={...contacts.default,...contacts.officers[exhibits[i].id]};
  $('officer-title').textContent=c.role;$('officer-greeting').textContent=`Hello ${settings.name}. How can we help with ${exhibits[i].short_title.toLowerCase()}? Choose an enquiry or leave feedback below.`;
  $('contact-message').value='';$('contact-kind').value='Enquiry';updateContact();$('officer-dialog').showModal();
}
function updateContact(){
  if(contactIndex<0)return;const e=exhibits[contactIndex],c={...contacts.default,...contacts.officers[e.id]};
  const email=emailHref(c.email,{name:settings.name,topic:e.short_title,kind:$('contact-kind').value,message:$('contact-message').value});
  const chat=sandraHref(c);$('email-officer').hidden=!email;if(email)$('email-officer').href=email;else $('email-officer').removeAttribute('href');
  $('sandra-officer').hidden=!chat;if(chat)$('sandra-officer').href=chat;else $('sandra-officer').removeAttribute('href');
  $('contact-recipient').textContent=email?`Email recipient: ${c.email} · ${c.emailLabel||c.role}`:'An email contact has not been configured for this gallery.';
}
function findOfficer(){
  const i=active;if(i<0)return;closeExhibit();if(!renderer){openOfficer(i);return;}
  travel(i);if(!avatarChosen)return;playerPosition.copy(officers[i].position).add(new THREE.Vector3(0,0,1.85));playerPosition.y=.05;
  player.position.copy(playerPosition);followCamera();updateNear();
}
$('contact-kind').onchange=updateContact;$('contact-message').oninput=updateContact;
$('close-officer').onclick=()=>$('officer-dialog').close();$('officer-dialog').addEventListener('close',()=>{contactIndex=-1;$('contact-message').value='';stopInput();});

// Live avatar preview uses the exact same procedural model as the player.
const previewScene=new THREE.Scene();previewScene.background=new THREE.Color('#e7eee0');
previewScene.add(new THREE.HemisphereLight(0xffffff,0x7c9276,2.6));const previewLight=new THREE.DirectionalLight(0xfff2dd,3);previewLight.position.set(2,4,4);previewScene.add(previewLight);
const previewCamera=new THREE.PerspectiveCamera(33,1,.1,20);previewCamera.position.set(2.5,1.6,4.5);previewCamera.lookAt(0,.95,0);
function readAvatarForm(){return {...Object.fromEntries(new FormData($('avatar-form'))),name:$('avatar-name').value.trim()||'Visitor'};}
function refreshPreview(){
  if(previewAvatar){previewScene.remove(previewAvatar);disposeAvatar(previewAvatar);}
  const draft=readAvatarForm();previewAvatar=createAvatar(draft);previewScene.add(previewAvatar);$('preview-name').textContent=draft.name;
  if(previewRenderer){const box=$('avatar-preview').getBoundingClientRect();previewRenderer.setSize(box.width,box.height);previewCamera.aspect=box.width/box.height;previewCamera.updateProjectionMatrix();previewRenderer.render(previewScene,previewCamera);}
}
function syncAvatarOptions(gender,values={}){
  const form=$('avatar-form');
  for(const key of ['hair','outfit']){
    const select=form.elements.namedItem(key),wanted=values[key]||select.value;
    select.replaceChildren(...avatarOptions[gender][key].map(([value,label])=>new Option(label,value)));
    if(avatarOptions[gender][key].some(([value])=>value===wanted))select.value=wanted;
  }
}
function fillAvatarForm(values){
  syncAvatarOptions(values.gender,values);
  for(const [key,value] of Object.entries(values)){const field=$('avatar-form').elements.namedItem(key);if(field)field.value=value;}
  $('avatar-name').setCustomValidity('');
}
syncAvatarOptions('male');
$('avatar-form').elements.namedItem('gender').addEventListener('input',e=>syncAvatarOptions(e.target.value));
$('avatar-form').elements.namedItem('gender').addEventListener('change',e=>syncAvatarOptions(e.target.value));
$('random-avatar').onclick=()=>{
  fillAvatarForm(randomAvatar($('avatar-name').value));refreshPreview();
  $('random-status').textContent='A fresh look, ready to explore. You can still change any detail.';
};
function openCreator(){
  stopInput();if(avatarChosen)fillAvatarForm(settings);$('random-status').textContent='';
  $('avatar-creator').showModal();
  try{if(!previewRenderer){previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;$('avatar-preview').append(previewRenderer.domElement);}}
  catch{$('avatar-preview').textContent='3D preview unavailable. You can still choose your avatar details.';}
  refreshPreview();
}
$('avatar-form').addEventListener('input',refreshPreview);
$('avatar-form').addEventListener('change',refreshPreview);
$('avatar-form').addEventListener('submit',e=>{
  e.preventDefault();if(!$('avatar-name').value.trim()){$('avatar-name').setCustomValidity('Enter a name for your avatar.');$('avatar-name').reportValidity();return;}
  settings=readAvatarForm();const oldRotation=player.rotation.y;scene.remove(player);disposeAvatar(player);player=createAvatar(settings);player.add(nameLabel(settings.name));scene.add(player);
  const wasChosen=avatarChosen;avatarChosen=true;$('avatar-creator').close();$('edit-avatar').textContent=settings.name;
  if(wasChosen){player.position.copy(playerPosition);player.rotation.y=oldRotation;player.visible=!!renderer;}
  else travel(pendingTravel);
});
$('avatar-name').addEventListener('input',()=>$('avatar-name').setCustomValidity(''));
$('close-avatar').onclick=()=>$('avatar-creator').close();$('edit-avatar').onclick=openCreator;
$('avatar-creator').addEventListener('close',stopInput);

$('start').onclick=()=>{pendingTravel=-1;openCreator();};$('reception').onclick=()=>travel(-1);
$('next').onclick=()=>renderer?travel((current+1)%4):openExhibit((current+1)%4);
$('overview').onclick=overview;$('walk').onclick=()=>travel(current);$('interact').onclick=()=>openExhibit(nearest);$('talk').onclick=()=>openOfficer(nearOfficer);
$('close-exhibit').onclick=closeExhibit;$('continue').onclick=closeExhibit;$('find-officer').onclick=findOfficer;
$('exhibit').addEventListener('close',()=>{active=-1;stopInput();});
$('help').onclick=()=>{stopInput();$('guide').showModal();};$('close-guide').onclick=()=>$('guide').close();
$('brand').onclick=e=>{e.preventDefault();stopInput();$('guide').showModal();};
$('gallery-toggle').onclick=()=>{$('navigation').hidden=!$('navigation').hidden;$('gallery-toggle').setAttribute('aria-expanded',String(!$('navigation').hidden));};
window.addEventListener('keydown',e=>{
  if($('exhibit').open){if(e.key==='1'||e.key==='2')answer(Number(e.key));if(['e','q'].includes(e.key.toLowerCase()))closeExhibit();return;}
  if(modalOpen()||mode==='welcome')return;
  const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k);}
  if(e.repeat)return;if(k==='e')openExhibit(nearest);if(k==='t')openOfficer(nearOfficer);if(k==='g')renderer?travel((current+1)%4):openExhibit((current+1)%4);if(k==='h')travel(-1);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',stopInput);
document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(mode!=='walk'||modalOpen())return;e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(b.dataset.move);b.classList.add('held');});for(const n of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(n,()=>{touch.delete(b.dataset.move);b.classList.remove('held');});});

try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;$('viewport').append(renderer.domElement);
  orbit=new OrbitControls(camera,renderer.domElement);orbit.enabled=false;orbit.minDistance=15;orbit.maxDistance=90;orbit.maxPolarAngle=Math.PI*.47;
  const mobile=compact();camera.position.set(...(mobile?[45,38,51]:[20,18,23]));camera.lookAt(0,0,0);
  camera.setViewOffset(innerWidth,innerHeight,mobile?0:-innerWidth*.22,mobile?-innerHeight*.23:0,innerWidth,innerHeight);
  const model=await new GLTFLoader().loadAsync('/assets/office.glb',e=>{if(e.total)$('load-status').textContent=`Loading office · ${Math.round(e.loaded/e.total*100)}%`;});scene.add(model.scene);
  const canvas=renderer.domElement;
  const pinchDistance=()=>{const [a,b]=[...cameraPointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
  canvas.addEventListener('pointerdown',e=>{
    if(mode!=='walk'||modalOpen()||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragging=true;canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging||mode!=='walk'||modalOpen()||!cameraPointers.has(e.pointerId))return;
    const previous=cameraPointers.get(e.pointerId),before=pinchDistance();
    cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cameraPointers.size>1){const after=pinchDistance();if(before>0&&after>0)zoomCamera(before/after);}
    else {yaw-=(e.clientX-previous.x)*.004;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-previous.y)*.003,.16,.9);}
  });
  canvas.addEventListener('wheel',e=>{if(mode==='walk'&&!modalOpen()){e.preventDefault();zoomCamera(Math.exp(e.deltaY*.001));}}, {passive:false});
  for(const n of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(n,e=>{cameraPointers.delete(e.pointerId);dragging=cameraPointers.size>0;});
  let last=performance.now();renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-last)/1000,.05);last=now;let moving=false;
    if(mode==='walk'&&!modalOpen()){
      let f=Number(keys.has('w')||keys.has('arrowup')||touch.has('forward'))-Number(keys.has('s')||keys.has('arrowdown')||touch.has('back'));
      let r=Number(keys.has('d')||keys.has('arrowright')||touch.has('right'))-Number(keys.has('a')||keys.has('arrowleft')||touch.has('left'));
      const len=Math.hypot(f,r)||1;f/=len;r/=len;
      const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*dt*2.6,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*dt*2.6;
      const before=playerPosition.clone();if(free(playerPosition.x+dx,playerPosition.z))playerPosition.x+=dx;if(free(playerPosition.x,playerPosition.z+dz))playerPosition.z+=dz;
      moving=before.distanceToSquared(playerPosition)>.000001;
      if(moving){const desiredYaw=Math.atan2(playerPosition.x-before.x,playerPosition.z-before.z);player.rotation.y+=Math.atan2(Math.sin(desiredYaw-player.rotation.y),Math.cos(desiredYaw-player.rotation.y))*Math.min(1,dt*12);phase+=dt*9;}
      player.position.copy(playerPosition);updateNear();
    }
    animateAvatar(player,phase,moving);if(mode==='walk')followCamera();if(mode==='overview')orbit.update();renderer.render(scene,camera);
  });
}catch(error){
  console.error('3D preview unavailable',error);if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null;}
  document.body.classList.add('fallback');$('load-status').textContent='3D is unavailable on this device. You can still explore the galleries.';$('overview').hidden=true;
}
ready=true;$('start').disabled=false;$('start').innerHTML='Create your avatar <span>↗</span>';$('overview').disabled=false;
if(renderer)$('load-status').textContent='Ready when you are. No installation needed.';
window.addEventListener('resize',()=>{
  if(renderer){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    if(mode==='welcome')camera.setViewOffset(innerWidth,innerHeight,!compact()?-innerWidth*.22:0,!compact()?0:-innerHeight*.23,innerWidth,innerHeight);
    if(mode==='walk')showWalkUI();
    if(mode==='overview'){$('navigation').hidden=compact();$('gallery-toggle').hidden=!compact();$('gallery-toggle').setAttribute('aria-expanded',String(!$('navigation').hidden));}}
  if($('avatar-creator').open)refreshPreview();
});
window.dosStatus=()=>({ready,webgl:!!renderer,mode,current,nearest,nearOfficer,visited:[...visited],completed:[...completed],position:playerPosition.toArray(),camera:camera.position.toArray(),followDistance,yaw,elevation,active,avatarChosen,avatar:{...settings},officers:officers.length,wallDisplays:wallArt.length,preview:previewAvatar?.userData.settings,collisionShapes:obstacles.length});
