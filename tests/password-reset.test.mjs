import test from 'node:test';
import assert from 'node:assert/strict';
import {createResetService,MAX_ATTEMPTS,CODE_LIFETIME_MS} from '../functions/reset-service.mjs';
import {createResendMailer} from '../functions/resend-mailer.mjs';

function fixture(overrides={}){
 const records=new Map(),mail=[],secret='test-only-secret-'.repeat(4);let clock=Date.now(),sequence=0,chain=Promise.resolve();
 const ref=path=>({path,get:async()=>({data:()=>records.get(path)}),update:async value=>records.set(path,{...records.get(path),...value})});
 const db={doc:ref,runTransaction:action=>{const task=chain.then(()=>action({get:async ref=>({data:()=>records.get(ref.path)}),set:(ref,value)=>records.set(ref.path,value),update:(ref,value)=>records.set(ref.path,{...records.get(ref.path),...value})}));chain=task.catch(()=>{});return task;}};
 const auth={getUserByEmail:async email=>{if(email.startsWith('unknown'))throw Object.assign(Error('Missing'),{code:'auth/user-not-found'});return {disabled:email.startsWith('disabled')};},generatePasswordResetLink:async()=> 'https://internal.example/action?oobCode=private-firebase-action-token'};
 const service=createResetService({db,auth,secret,now:()=>clock,makeId:()=>String(++sequence).padStart(48,'0'),makeCode:()=>String(100000+sequence),sendCode:async message=>mail.push(message),...overrides});
 const request=async(...args)=>{const challenge=await service.request(...args);await service.deliver(challenge.challengeId);return challenge;};
 return {service,request,records,mail,advance:ms=>{clock+=ms;}};
}
test('public requests queue encrypted mail without looking up an account; repeated delivery does not resend',async()=>{
 let lookups=0;
 const f=fixture({auth:{getUserByEmail:async()=>{lookups++;return {disabled:false};},generatePasswordResetLink:async()=> 'https://internal.example/action?oobCode=private-token'}});
 const challenge=await f.service.request('patient@example.com');
 assert.equal(lookups,0);assert.equal(f.mail.length,0);
 const queued=JSON.stringify([...f.records.values()]);assert.equal(queued.includes('patient@example.com'),false);assert.equal(Object.hasOwn(f.records.get(`_passwordResetChallenges/${challenge.challengeId}`),'code'),false);
 await f.service.deliver(challenge.challengeId);await f.service.deliver(challenge.challengeId);
 assert.equal(lookups,1);assert.equal(f.mail.length,1);
});
test('email reset returns generic challenges and persists only hashed identifiers and an encrypted action token',async()=>{
 const f=fixture(),known=await f.request(' Patient@example.com ','test-ip'),unknown=await f.request('unknown@example.com','test-ip');
 assert.deepEqual(Object.keys(known),Object.keys(unknown));assert.equal(f.mail.length,1);
 const stored=JSON.stringify([...f.records.values()]);
 for(const value of ['Patient@example.com','patient@example.com','unknown@example.com','test-ip','private-firebase-action-token'])assert.equal(stored.includes(value),false,value);
 const result=await f.service.verify(known.challengeId,f.mail[0].code);assert.equal(result.resetToken,'private-firebase-action-token');
 await assert.rejects(()=>f.service.verify(known.challengeId,f.mail[0].code),e=>e.code==='permission-denied');
});
test('codes expire, lock after five wrong attempts, and cannot be used twice concurrently',async()=>{
 let f=fixture(),challenge=await f.request('patient@example.com');
 for(let i=0;i<MAX_ATTEMPTS;i++)await assert.rejects(()=>f.service.verify(challenge.challengeId,'999999'));
 await assert.rejects(()=>f.service.verify(challenge.challengeId,f.mail[0].code));
 f=fixture();challenge=await f.request('patient@example.com');f.advance(CODE_LIFETIME_MS);
 await assert.rejects(()=>f.service.verify(challenge.challengeId,f.mail[0].code));
 f=fixture();challenge=await f.request('patient@example.com');
 const results=await Promise.allSettled([f.service.verify(challenge.challengeId,f.mail[0].code),f.service.verify(challenge.challengeId,f.mail[0].code)]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
});
test('resending enforces cooldown, invalidates the previous code, and limits recipient and IP request bursts',async()=>{
 const f=fixture(),first=await f.request('patient@example.com');
 await assert.rejects(()=>f.request('patient@example.com'),e=>e.code==='resource-exhausted');
 f.advance(60_001);const next=await f.request('patient@example.com');
 await assert.rejects(()=>f.service.verify(first.challengeId,f.mail[0].code));
 assert.ok((await f.service.verify(next.challengeId,f.mail[1].code)).resetToken);
 for(let i=0;i<3;i++){f.advance(60_001);await f.request('patient@example.com');}
 f.advance(60_001);await assert.rejects(()=>f.request('patient@example.com'),e=>e.code==='resource-exhausted');
 const ip=fixture();for(let i=0;i<30;i++)await ip.request(`unknown-${i}@example.com`,'same-ip');
 await assert.rejects(()=>ip.request('unknown-extra@example.com','same-ip'),e=>e.code==='resource-exhausted');
});
test('missing/disabled accounts and mail failures never return a usable reset token',async()=>{
 const f=fixture();for(const email of ['unknown@example.com','disabled@example.com']){const challenge=await f.request(email);await assert.rejects(()=>f.service.verify(challenge.challengeId,'100001'));}assert.equal(f.mail.length,0);
 let failures=0;const failed=fixture({sendCode:async()=>{throw Error('provider response must stay private');},onDeliveryFailure:()=>failures++});
 const challenge=await failed.request('patient@example.com');assert.equal(failures,1);await assert.rejects(()=>failed.service.verify(challenge.challengeId,'100001'));
 await assert.rejects(()=>failed.request('bad-email'),e=>e.code==='invalid-argument');
});
test('Resend sends a code-only email, keeps the API key in the request header, and uses idempotency',async()=>{
 let request;const send=createResendMailer({apiKey:'test-api-key',from:'CareQueue <security@example.com>',fetcher:async(url,options)=>{request={url,...options};return {ok:true};}});
 await send({to:'patient@example.com',code:'012345',challengeId:'test-request'});
 const body=JSON.parse(request.body);assert.equal(request.url,'https://api.resend.com/emails');assert.equal(request.headers.Authorization,'Bearer test-api-key');assert.equal(request.headers['Idempotency-Key'],'carequeue-reset-test-request');
 for(const content of [body.text,body.html]){assert.ok(content.includes('012345'));assert.doesNotMatch(content,/https?:\/\/|<a\b|href=|test-api-key/);}
 assert.deepEqual(body.to,['patient@example.com']);
});
