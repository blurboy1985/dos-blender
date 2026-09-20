import test from 'node:test';
import assert from 'node:assert/strict';
import {emailHref,sandraHref} from '../src/contacts.js';

test('email draft preserves enquiry and feedback content without extra recipients',()=>{
  const href=emailHref('info@singstat.gov.sg',{name:'A & B',topic:'STANDARDS',kind:'Feedback',message:'Please explain SSOC? &bcc=other@example.org\nThanks.'});
  const url=new URL(href);
  assert.equal(url.pathname,'info@singstat.gov.sg');
  assert.equal(url.searchParams.get('subject'),'DOS Discovery Office | STANDARDS | Feedback');
  assert.match(url.searchParams.get('body'),/Please explain SSOC\? &bcc=other@example.org/);
  assert.match(url.searchParams.get('body'),/Visitor: A & B/);
  assert.equal(url.searchParams.has('bcc'),false);
  assert.equal(emailHref('bad\nrecipient@example.org',{}),null);
});
test('SANDRA opens only the configured official destination',()=>{
  assert.equal(sandraHref({chatUrl:'https://www.singstat.gov.sg/chatwithsandra-beta'}),'https://www.singstat.gov.sg/chatwithsandra-beta');
  for(const chatUrl of ['javascript:alert(1)','https://www.singstat.gov.sg.evil.example/chatwithsandra-beta','https://example.org/',''])assert.equal(sandraHref({chatUrl}),null);
});
