import * as THREE from 'three';
import {createAvatar,nameLabel} from './avatar.js';

export function addOfficers(scene,exhibits){
  const profiles=[{gender:'female',hair:'bun',skin:'#b67d55',top:'#3c8b82'},{gender:'male',hair:'short',skin:'#e0b597',top:'#6689bc'},{gender:'male',hair:'curly',skin:'#744c39',top:'#9774aa'},{gender:'female',hair:'bob',skin:'#c99974',top:'#b1874e'}];
  return exhibits.map((e,i)=>{
    const group=new THREE.Group();group.position.set(e.x+2.45,.045,-e.y+.25);scene.add(group);
    const box=(size,pos,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.75}));m.position.set(...pos);group.add(m);};
    box([.56,.10,.54],[0,.47,0],'#263e4c');box([.56,.53,.08],[0,.72,-.26],'#263e4c');
    for(const x of [-.22,.22])for(const z of [-.2,.2])box([.035,.46,.035],[x,.23,z],'#687c7b');
    box([1.12,.08,.65],[0,.76,.62],'#bd9770');for(const x of [-.45,.45])box([.05,.73,.50],[x,.37,.62],'#e7e9dc');
    box([.28,.012,.23],[.25,.811,.63],'#faf9ec');
    const avatar=createAvatar({...profiles[i],outfit:profiles[i].gender==='female'?'blouse':'blazer'},true);group.add(avatar);
    const label=nameLabel(['Statistics officer','Digital services officer','Standards officer','Surveys officer'][i]);label.position.y=1.96;label.scale.set(1.65,.31,1);group.add(label);
    return {index:i,group,avatar,position:group.position.clone(),box:{center:[group.position.x,.5,group.position.z+.35],size:[1.15,1,1.45]}};
  });
}
