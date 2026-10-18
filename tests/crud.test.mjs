import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/data/seed.ts';
import {applyCommand,nextToken} from '../src/services/domain.ts';
const at='2026-10-17T05:00:00.000Z';
test('deleted registration numbers stay issued and active registrations cannot be deleted',()=>{
 let s={...initialState(),role:'staff'};
 assert.throws(()=>applyCommand(s,'deletePatient',{'Token':'A143'}),/Complete or cancel/);
 s=applyCommand(s,'cancel',{'Token':'A143'},at,'cancel');s=applyCommand(s,'deletePatient',{'Token':'A143'},at,'delete');
 assert.equal(s.queue.some(q=>q.token==='A143'),false);assert.equal(nextToken(s),'A144');
 assert.ok(s.audit.some(e=>e.id==='delete'));assert.ok(s.audit.some(e=>e.id==='cancel'));
});
test('recovery CRUD requires a missed ticket and only pending requests can be changed or withdrawn',()=>{
 let s=initialState();assert.throws(()=>applyCommand(s,'requestRecovery',{'Reason':'Missed call'}),/missed turn/);
 s.ticketStatus='missed';s.queue.find(q=>q.token===s.myToken).status='missed';
 s=applyCommand(s,'requestRecovery',{'Reason':'Did not hear my call'},at,'create');assert.equal(s.ownRecovery.reason,'Did not hear my call');
 assert.throws(()=>applyCommand(s,'requestRecovery',{'Reason':'Duplicate'}),/Edit or withdraw/);
 s=applyCommand(s,'editRecovery',{'Reason':'Was away at pharmacy'},at,'edit');assert.equal(s.ownRecovery.reason,'Was away at pharmacy');
 assert.throws(()=>applyCommand({...s,role:'staff'},'deleteRecovery',{'Patient ID':s.ownRecovery.patientId}),/Resolve/);
 s=applyCommand(s,'cancelRecovery',{},at,'delete');assert.equal(s.recovery,'none');assert.equal(s.ownRecovery,undefined);
 assert.throws(()=>applyCommand(s,'editRecovery',{'Reason':'Too late'}),/pending/);
});
test('announcement editing retains identity and publication date; staff cannot edit or delete',()=>{
 let s={...initialState(),role:'admin',incidentVerified:true};s=applyCommand(s,'broadcast',{'Message':'Original'},at,'announcement');
 s=applyCommand(s,'editBroadcast',{'Broadcast ID':'announcement','Message':'Updated'},'2026-10-17T05:30:00.000Z','edit');
 assert.equal(s.broadcasts[0].id,'announcement');assert.equal(s.broadcasts[0].at,at);assert.equal(s.broadcasts[0].message,'Updated');
 for(const command of ['editBroadcast','removeBroadcast'])assert.throws(()=>applyCommand({...s,role:'staff'},command,{'Broadcast ID':'announcement','Message':'Forbidden'}),/administrator/);
 assert.equal(applyCommand(s,'removeBroadcast',{'Broadcast ID':'announcement'},at,'delete').broadcasts.length,0);
});
test('pending staff notes support editing and deletion without changing staff queue freshness',()=>{
 let s={...initialState(),role:'staff'};const original=s.updatedAt;
 s=applyCommand(s,'manualRecord',{'Manual action':'A120 called at 10:30'},at,'note');
 s=applyCommand(s,'editManualRecord',{'Note ID':'note','Manual action':'A120 called at 10:35'},at,'edit');
 assert.equal(s.offlineActions[0].action,'A120 called at 10:35');assert.equal(s.updatedAt,original);
 s=applyCommand(s,'deleteManualRecord',{'Note ID':'note'},at,'delete');assert.equal(s.offlineActions.length,0);assert.equal(s.updatedAt,original);
});
test('resetting preferences preserves independent caregiver consent and staff announcements',()=>{
 const s={...initialState(),largeText:true,language:'ta',sms:false,caregiver:{name:'Test contact',phone:'0771234567'}};
 const next=applyCommand(s,'resetPreferences',{},at,'reset');
 assert.deepEqual([next.largeText,next.language,next.sms,next.appAlerts],[false,'en',true,true]);assert.deepEqual(next.caregiver,s.caregiver);
});
test('staff publication and reconciliation cannot reopen an unavailable service',()=>{
 let s={...initialState(),role:'staff',serviceStatus:'unavailable'};
 s=applyCommand(s,'broadcast',{'Message':'Remain near the counter'},at,'publish');assert.equal(s.serviceStatus,'unavailable');
 assert.equal(applyCommand(s,'reconcile',{},at,'reconcile').serviceStatus,'unavailable');
});

test('deleting an old closed visit preserves a newer recovery request for the same account',()=>{
 const s={...initialState(),role:'staff',recoveryRequests:[{patientId:'demo-kamala',token:'A126',status:'pending'}]};
 s.queue.find(q=>q.token==='A125').status='completed';
 const next=applyCommand(s,'deletePatient',{'Token':'A125'},at,'delete-history');
 assert.equal(next.recoveryRequests[0].token,'A126');
});
