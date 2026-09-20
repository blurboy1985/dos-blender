import * as THREE from 'three';

export const defaultAvatar = {name:'Visitor',gender:'male',hair:'short',hairColor:'#30231f',skin:'#c58c63',outfit:'smart',top:'#487c74',bottom:'#263c49'};
export function createAvatar(settings={}, seated=false) {
  const s={...defaultAvatar,...settings}, root=new THREE.Group(), joints={};
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.8});
  const skin=mat(s.skin),hair=mat(s.hairColor),top=mat(s.top),bottom=mat(s.bottom),shoe=mat('#273139'),white=mat('#fff6e9'),ink=mat('#293136');
  const add=(geo,m,pos,parent=root,scale=null)=>{const o=new THREE.Mesh(geo,m);o.position.set(...pos);if(scale)o.scale.set(...scale);parent.add(o);return o;};
  const sphere=(r,m,pos,parent=root,scale=null)=>add(new THREE.SphereGeometry(r,20,12),m,pos,parent,scale);
  const capsule=(r,l,m,pos,parent=root)=>add(new THREE.CapsuleGeometry(r,l,5,12),m,pos,parent);
  const shoulder=s.gender==='male'?.255:s.gender==='female'?.205:.23;
  const hip=s.gender==='female'?.2:.18;
  const skirted=['skirt','dress'].includes(s.outfit);
  // All characters face local +Z. Limbs pivot at the shoulder / hip.
  const pelvis=sphere(.22,s.outfit==='dress'?top:bottom,[0,.91,0],root,[hip/.22,.7,.68]);
  const torso=add(new THREE.CylinderGeometry(shoulder,.18,.49,20),top,[0,1.18,0],root,[1,1,.66]);
  capsule(.065,.08,skin,[0,1.5,0]);
  sphere(.185,skin,[0,1.67,0],root,[.88,1.13,.91]);
  sphere(.038,skin,[0,1.67,.16],root,[.75,1,1]);
  for(const x of [-.07,.07]){sphere(.023,white,[x,1.71,.154],root,[1,1,.45]);sphere(.012,ink,[x,1.71,.165],root,[1,1,.45]);}
  for(const x of [-.17,.17])sphere(.04,skin,[x,1.66,0],root,[.6,1,.8]);
  add(new THREE.BoxGeometry(.05,.009,.008),mat('#8c5246'),[0,1.59,.169]);
  if(s.hair!=='bald') {
    const cap=add(new THREE.SphereGeometry(.192,24,14,0,Math.PI*2,0,Math.PI*.35),hair,[0,1.69,0],root,[.92,1.05,1]);
    if(s.hair==='short')sphere(.13,hair,[-.065,1.82,.055],root,[1.15,.48,1]);
    if(s.hair==='bob'||s.hair==='long'){
      const length=s.hair==='long'?.42:.20;
      capsule(.085,length,hair,[-.153,1.65-length*.2,-.04]);capsule(.085,length,hair,[.153,1.65-length*.2,-.04]);
      add(new THREE.BoxGeometry(.3,length+.20,.13),hair,[0,1.65-length*.2,-.12]);
    }
    if(s.hair==='bun')sphere(.105,hair,[0,1.87,-.1]);
    if(s.hair==='ponytail'){sphere(.09,hair,[0,1.76,-.18]);capsule(.075,.27,hair,[0,1.56,-.22]);}
    if(s.hair==='curly')for(let i=0;i<18;i++){const a=i*2.4,r=.13*Math.sqrt((i+.5)/18);sphere(.062,hair,[Math.cos(a)*r,1.83+.04*(1-r/.13),Math.sin(a)*r]);}
  }
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*(shoulder+.025),1.36,0);root.add(arm);
    capsule(.067,.18,top,[0,-.13,0],arm);
    capsule(.054,.17,skin,[0,-.35,0],arm);sphere(.062,skin,[0,-.49,0],arm);
    arm.rotation.z=side*.07;joints[side<0?'armL':'armR']=arm;
    const leg=new THREE.Group();leg.position.set(side*.105,.9,0);root.add(leg);
    capsule(.083,.28,skirted?skin:bottom,[0,-.20,0],leg);
    const knee=new THREE.Group();knee.position.y=-.42;leg.add(knee);capsule(.069,.24,skirted?skin:bottom,[0,-.17,0],knee);
    add(new THREE.BoxGeometry(.15,.105,.28),shoe,[0,-.43,.055],knee);
    joints[side<0?'legL':'legR']=leg;
    if(seated){leg.rotation.x=-Math.PI/2;knee.rotation.x=Math.PI/2;arm.rotation.x=-.65;}
  }
  if(skirted){
    add(new THREE.CylinderGeometry(.175,.30,.47,28),s.outfit==='dress'?top:bottom,[0,.77,0],root,[1,1,.72]);
    add(new THREE.CylinderGeometry(.184,.184,.035,28),s.outfit==='dress'?bottom:top,[0,1.015,0],root,[1,1,.70]);
  }
  if(s.outfit==='blazer'||s.outfit==='skirt'){
    add(new THREE.BoxGeometry(.105,.36,.025),white,[0,1.22,.125]);
    for(const side of [-1,1]){const lapel=add(new THREE.BoxGeometry(.075,.31,.03),top,[side*.092,1.25,.14]);lapel.rotation.z=-side*.17;}
    if(s.outfit==='blazer')add(new THREE.BoxGeometry(.023,.18,.015),mat('#c8964d'),[0,1.24,.15]);
  } else if(s.outfit==='dress'||s.outfit==='blouse') {
    add(new THREE.TorusGeometry(.077,.014,6,24),white,[0,1.42,.067]).rotation.x=Math.PI*.35;
    if(s.outfit==='blouse')for(const side of [-1,1])sphere(.07,top,[side*(shoulder+.025),1.31,0],root,[1.2,1.3,1.1]);
  } else if(s.outfit==='casual') {
    add(new THREE.TorusGeometry(.071,.018,6,24),white,[0,1.43,.07]).rotation.x=Math.PI*.35;
    add(new THREE.BoxGeometry(.065,.07,.014),white,[.095,1.23,.15]);
  } else {
    for(const side of [-1,1]){const collar=add(new THREE.BoxGeometry(.07,.10,.025),white,[side*.05,1.39,.125]);collar.rotation.z=side*.4;}
    for(let i=0;i<4;i++)sphere(.009,white,[0,1.3-i*.08,.14]);
  }
  // A restrained lanyard and visitor / staff badge.
  for(const side of [-1,1]){const strap=add(new THREE.BoxGeometry(.012,.25,.008),mat('#d6bd78'),[side*.047,1.27,.163]);strap.rotation.z=-side*.23;}
  add(new THREE.BoxGeometry(.085,.11,.016),white,[0,1.10,.166]);
  if(seated)root.position.y=-.42;
  root.userData={joints,settings:s,seated};return root;
}

export function animateAvatar(root,phase,moving){
  if(root.userData.seated)return;
  const j=root.userData.joints, swing=moving?Math.sin(phase)*.42:0;
  j.legL.rotation.x=swing;j.legR.rotation.x=-swing;j.armL.rotation.x=-swing*.75;j.armR.rotation.x=swing*.75;
}
export function disposeAvatar(root){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});const mats=new Set();root.traverse(o=>{if(o.material)mats.add(o.material);});mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}

export function nameLabel(name){
  const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(20,55,48,.9)';ctx.beginPath();ctx.roundRect(4,4,504,88,22);ctx.fill();
  ctx.fillStyle='#f5f8ef';ctx.font='500 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,256,50,460);
  const texture=new THREE.CanvasTexture(c),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.scale.set(1.45,.27,1);sprite.position.y=2.13;return sprite;
}
