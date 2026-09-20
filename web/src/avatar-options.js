export const avatarOptions = {
  male: {
    hair: [['short','Side part'],['crop','Close crop'],['curly','Short curls'],['bald','Bald']],
    outfit: [['smart','Shirt & trousers'],['blazer','Blazer & trousers'],['casual','Polo & trousers']]
  },
  female: {
    hair: [['bob','Bob'],['long','Long hair'],['bun','Bun'],['ponytail','Ponytail']],
    outfit: [['blouse','Blouse & trousers'],['skirt','Jacket & skirt'],['dress','Dress']]
  }
};
export function randomAvatar(name='', rng=Math.random) {
  const pick=items=>items[Math.floor(rng()*items.length)];
  const gender=pick(Object.keys(avatarOptions)), options=avatarOptions[gender];
  return {name:name.trim()||'Visitor',gender,hair:pick(options.hair)[0],outfit:pick(options.outfit)[0],
    skin:pick(['#f0cfb6','#dfb18d','#c58c63','#a66e48','#805136','#55392e']),
    hairColor:pick(['#241c18','#493021','#785437','#ad8656','#74706d']),
    top:pick(['#487c74','#5274a2','#945a71','#826da1','#a57c49','#3c5967']),
    bottom:pick(['#263c49','#3c383c','#565f50','#5d493f'])};
}
