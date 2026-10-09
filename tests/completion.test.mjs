import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initialState} from '../src/data/seed.ts';
import {applyCommand,aheadOf,nextToken,operationalMetrics,waitEstimate,preferenceData} from '../src/services/domain.ts';
const at='2026-10-07T05:00:00.000Z';
const empty=()=>({...initialState(),role:'staff',queue:[],nowServing:'—',myToken:'—',audit:[]});
test('FT01 first live registration starts at A001 and cancelled tokens are not reused',()=>{
 let s=applyCommand(empty(),'register',{'Patient name':'Fictional patient'},at,'r1');assert.equal(s.queue[0].token,'A001');
 s=applyCommand(s,'cancel',{'Token':'A001'},at,'cancel');assert.equal(nextToken(s),'A002');
 assert.equal(applyCommand(s,'register',{'Patient name':'Second patient'},at,'r2').queue[1].token,'A002');
});
test('FT02 patients ahead follows clinical call order and excludes missed/completed/cancelled visits',()=>{
 let s={...initialState(),role:'staff'};s=applyCommand(s,'priority',{'Token':'A130','Reason':'Clinician reviewed'},at,'priority');
 assert.equal(aheadOf(s.queue,'A130'),1);assert.equal(aheadOf(s.queue,'A125'),7);
 s.queue.find(q=>q.token==='A120').status='missed';s.queue.find(q=>q.token==='A121').status='cancelled';s.queue.find(q=>q.token==='A122').status='completed';assert.equal(aheadOf(s.queue,'A125'),4);
 assert.equal(aheadOf(s.queue,'UNKNOWN'),0);
});
test('FT03 edit changes only selected patient and retains account link and token',()=>{
 const s={...initialState(),role:'staff'};const q=s.queue.find(q=>q.token==='A125');q.accountLinked=true;
 const n=applyCommand(s,'editPatient',{'Token':'A125','Patient name':'Edited fictional patient','Phone number':'0771234567'},at,'edit');
 assert.equal(n.queue.find(q=>q.token==='A125').patientId,q.patientId);assert.equal(n.queue.find(q=>q.token==='A125').accountLinked,true);assert.deepEqual(n.queue.find(q=>q.token==='A126'),s.queue.find(q=>q.token==='A126'));
 assert.throws(()=>applyCommand(s,'editPatient',{'Token':'A125','Patient name':'Edited','Phone number':'invalid'}),/phone/);
});
test('FT04 missed/completed transitions require a called visit; cancellation preserves history',()=>{
 let s={...initialState(),role:'staff'};assert.throws(()=>applyCommand(s,'complete',{'Token':'A125'}),/called/);
 s=applyCommand(s,'markMissed',{'Token':'A119'},at,'missed');assert.equal(s.nowServing,'—');assert.equal(s.queue[0].status,'missed');
 s=applyCommand(s,'cancel',{'Token':'A120'},at,'cancel');assert.equal(s.queue.find(q=>q.token==='A120').status,'cancelled');
 assert.equal(operationalMetrics(s).missed,1);assert.equal(operationalMetrics(s).cancelled,1);
});
test('FT05 recovery approval and rejection have distinct states and preserve terminal visits',()=>{
 const s={...initialState(),role:'staff',recoveryRequests:[{patientId:'demo-kamala',token:'A125',status:'pending'}]};s.queue.find(q=>q.token==='A125').status='missed';
 assert.equal(applyCommand(s,'rejectRecovery',{'Patient ID':'demo-kamala'},at,'reject').recovery,'rejected');
 const n=applyCommand(s,'approveRecovery',{'Patient ID':'demo-kamala'},at,'approve');assert.equal(n.queue.find(q=>q.token==='A125').status,'waiting');assert.equal(n.recoveryRequests[0].status,'approved');
 s.queue.find(q=>q.token==='A125').status='completed';assert.throws(()=>applyCommand(s,'approveRecovery',{},at,'bad'),/completed or cancelled/);
});
test('FT06 service changes stop calls; only admin changes availability or withdraws messages',()=>{
 const s={...initialState(),role:'admin'};const n=applyCommand(s,'serviceStatus',{'Status':'unavailable'},at,'status');assert.throws(()=>applyCommand(n,'callNext'),/service must be open/);assert.equal(waitEstimate(n),'Estimate unavailable');
 assert.throws(()=>applyCommand({...s,role:'staff'},'serviceStatus',{'Status':'open'}),/administrator/);
 const verified=applyCommand(s,'verifyIncident',{},at,'verify');const published=applyCommand(verified,'broadcast',{'Message':'General OPD delayed'},at,'pub');const removed=applyCommand(published,'removeBroadcast',{'Broadcast ID':'pub'},at,'remove');assert.equal(removed.broadcasts.length,0);assert.ok(removed.audit.some(e=>e.id==='pub'));
});
test('FT07 patient role cannot mutate operational records',()=>{
 for(const cmd of ['register','editPatient','markMissed','complete','cancel','priority','approveRecovery','rejectRecovery','broadcast','removeBroadcast','serviceStatus','manualRecord','reconcile','verifyIncident'])assert.throws(()=>applyCommand(initialState(),cmd),/authorized staff/);
});
test('FT08 wait report derives times from recorded calls and omits missing samples',()=>{
 let s=applyCommand(empty(),'register',{'Patient name':'Fictional patient'},at,'register');s=applyCommand(s,'callNext',{},'2026-10-07T05:12:00.000Z','call');assert.equal(operationalMetrics(s).meanWaitMinutes,12);assert.equal(operationalMetrics(s).measuredCalls,1);assert.equal(operationalMetrics(empty()).meanWaitMinutes,null);
});
test('FT09 manual notes require content, remain device pending until reconciliation, and retry is safe',()=>{
 const s={...initialState(),role:'staff'};assert.throws(()=>applyCommand(s,'manualRecord',{}),/Describe/);
 const n=applyCommand(s,'manualRecord',{'Manual action':'A120 called on paper'},at,'note');assert.equal(n.offlineActions.length,1);assert.equal(n.updatedAt,s.updatedAt);assert.deepEqual(applyCommand(n,'manualRecord',{'Manual action':'A120 called on paper'},at,'note'),n);assert.equal(applyCommand(n,'reconcile',{},at,'sync').offlineActions.length,0);
});

test('FT10 personal preferences, consent and recovery requests do not claim a fresh staff queue update',()=>{
 const s=initialState();
 for(const [command,fields] of [['preferences',{}],['caregiver',{'Caregiver name':'Fictional caregiver','Phone number':'0771234567'}],['revokeCaregiver',{}],['requestRecovery',{}]])assert.equal(applyCommand(s,command,fields,at,command).updatedAt,s.updatedAt);
});

test('FT11 full application state cannot leak role or patient queue data into preference writes',()=>{
 const s={...initialState(),role:'admin',largeText:true};
 assert.deepEqual(preferenceData(s),{sms:true,appAlerts:true,language:'en',largeText:true});
 assert.equal('queue' in preferenceData(s),false);assert.equal('role' in preferenceData(s),false);
});

test('FT12 raster filenames match their native resource signatures',()=>{
 for(const name of fs.readdirSync('assets/figma')){
  if(!/\.(png|jpe?g)$/.test(name))continue;
  const header=fs.readFileSync('assets/figma/'+name).subarray(0,8);
  if(name.endsWith('.png'))assert.deepEqual(header,Buffer.from([137,80,78,71,13,10,26,10]),name);
  else assert.deepEqual(header.subarray(0,3),Buffer.from([255,216,255]),name);
 }
});

test('FT13 called and ended visits do not show a waiting estimate or ask for another call',()=>{
 const s=initialState();
 assert.equal(waitEstimate({...s,ticketStatus:'called'}),'Your turn');
 assert.equal(waitEstimate({...s,ticketStatus:'completed'}),'Completed');
 assert.equal(waitEstimate({...s,ticketStatus:'cancelled'}),'Cancelled');
 assert.equal(waitEstimate({...s,ticketStatus:'missed'}),'Ask staff for help');
});
