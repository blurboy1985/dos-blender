export function emailHref(email,{name,topic,kind,message}) {
  if(!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email||''))return null;
  const subject=`DOS Discovery Office | ${topic} | ${kind}`;
  const body=`Hello,\n\n${message.trim()}\n\nVisitor: ${name}\nGallery: ${topic}\nType: ${kind}\n\nSent from the DOS Discovery Office contact draft.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function sandraHref(contact){
  if(contact.chatUrl){try{const u=new URL(contact.chatUrl);if(u.protocol==='https:'&&u.hostname==='www.singstat.gov.sg'&&u.pathname==='/chatwithsandra-beta')return u.href;}catch{}}
  return null;
}
