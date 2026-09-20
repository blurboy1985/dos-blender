import * as THREE from 'three';

const hes='https://www.singstat.gov.sg/-/media/files/visualising_data/infographics/households/HES-ownershipofconsumerdurables.pdf';
export const wallDisplays=[
  {image:'/assets/walls/population.svg',source:'https://www.singstat.gov.sg/-/media/files/publications/population/population2025.pdf',description:'Singapore’s total population was 6.11 million at end-June 2025, up 1.2% from end-June 2024. Source: DOS Population Trends 2025. This is a historical snapshot.'},
  {image:'/assets/walls/connected.svg',source:hes,description:'Resident households with an internet subscription: 78.0% in 2012/13, 87.3% in 2017/18 and 90.8% in 2023. Source: DOS Household Expenditure Survey 2023. The chart starts at zero.'},
  {image:'/assets/walls/standards.svg',source:'https://www.singstat.gov.sg/standard-classifications/national-classifications/singapore-standard-occupational-classification-ssoc',description:'SSOC 2024 groups occupations from broad major groups down to detailed occupations. This simplified diagram illustrates the hierarchy; refer to the official classification for its full structure and definitions.'},
  {image:'/assets/walls/households.svg',source:hes,description:'In 2023, 99.1% of all resident households owned a mobile phone, 96.4% a washing machine, 81.9% an air conditioner and 71.7% a laptop. Source: DOS Household Expenditure Survey 2023. Bars use a 0–100% scale.'}
];

export function addWallDisplays(scene,exhibits){
  const loader=new THREE.TextureLoader();
  return wallDisplays.map((art,i)=>{
    const e=exhibits[i],group=new THREE.Group();
    group.position.set(e.x-2.95,1.31,-e.y-1.20);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(1.94,1.76,.065),new THREE.MeshStandardMaterial({color:'#c49d67',roughness:.7}));group.add(frame);
    const texture=loader.load(art.image);texture.colorSpace=THREE.SRGBColorSpace;
    const poster=new THREE.Mesh(new THREE.PlaneGeometry(1.84,1.656),new THREE.MeshBasicMaterial({map:texture}));poster.position.z=.036;group.add(poster);
    scene.add(group);return group;
  });
}
