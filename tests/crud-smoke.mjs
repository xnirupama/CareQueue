// Actual application persistence functions against the isolated Firestore emulator.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,updateDoc,deleteDoc,getDocs,collection,query,where}=require('firebase/firestore');
import {initialState} from '../src/data/seed.ts';
import {runOperationalCommand} from '../src/services/queue-operations.ts';
import {runPatientCommand} from '../src/services/patient-records.ts';
import {createSupport,editSupport,answerSupport,deleteSupport} from '../src/services/support.ts';
const env=await initializeTestEnvironment({projectId:'demo-carequeue',firestore:{rules:fs.readFileSync('firebase/firestore.rules','utf8'),host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').at(-1)||8180)}});
const patient=env.authenticatedContext('crud-patient').firestore(),other=env.authenticatedContext('crud-other').firestore(),staff=env.authenticatedContext('crud-staff',{role:'staff'}).firestore(),admin=env.authenticatedContext('crud-admin',{role:'admin'}).firestore();
const state=()=>({...initialState(),role:'staff',queue:[],nowServing:'—',myToken:'—',audit:[],broadcasts:[],offlineActions:[]});
let event=0;
const command=(db,role,cmd,fields={})=>runOperationalCommand(db,{...state(),role},cmd,fields,`crud-event-${++event}`);
const op=async()=> (await getDoc(doc(staff,'operations','current'))).data();
async function reset(){await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'operations','current'),{queue:[],audit:[],broadcasts:[],offlineActions:[],lastIssuedNumber:0,incidentVerified:false,nowServing:'—',serviceStatus:'open',updatedAt:'2026-10-17'});});}
try{
 await test('SDK queue CRUD persists, deletes only closed visits, and never reissues a deleted number',async()=>{
  await reset();await command(staff,'staff','register',{'Patient name':'Fictional patient'});
  assert.equal((await op()).queue[0].token,'A001');
  await command(staff,'staff','editPatient',{'Token':'A001','Patient name':'Updated patient','Phone number':'0771234567'});
  assert.equal((await op()).queue[0].patientName,'Updated patient');
  await assert.rejects(()=>command(staff,'staff','deletePatient',{'Token':'A001'}),/Complete or cancel/);
  await command(staff,'staff','cancel',{'Token':'A001'});await command(staff,'staff','deletePatient',{'Token':'A001'});
  assert.equal((await op()).queue.length,0);assert.ok((await getDocs(collection(staff,'audit'))).size>=4);
  await command(staff,'staff','register',{'Patient name':'Next patient'});assert.equal((await op()).queue[0].token,'A002');
  await assert.rejects(()=>command(patient,'staff','register',{'Patient name':'Forged role'}),e=>e.code==='permission-denied');
 });
 await test('SDK announcement CRUD propagates to service feed; staff cannot edit, delete or bypass via summary',async()=>{
  await reset();await command(admin,'admin','verifyIncident');await command(admin,'admin','broadcast',{'Message':'Original update'});
  let item=(await op()).broadcasts[0];
  await command(admin,'admin','editBroadcast',{'Broadcast ID':item.id,'Message':'Corrected update'});
  assert.equal((await getDoc(doc(patient,'services','general-opd'))).data().broadcasts[0].message,'Corrected update');
  assert.equal((await op()).broadcasts[0].at,item.at);
  await assert.rejects(()=>command(staff,'admin','editBroadcast',{'Broadcast ID':item.id,'Message':'Forged admin'}),e=>e.code==='permission-denied');
  await assert.rejects(()=>command(staff,'admin','removeBroadcast',{'Broadcast ID':item.id}),e=>e.code==='permission-denied');
  await assertFails(updateDoc(doc(staff,'services','general-opd'),{serviceStatus:'open'}));
  await command(staff,'staff','broadcast',{'Message':'Additional counter update'});assert.equal((await op()).broadcasts.length,2);
  await command(admin,'admin','removeBroadcast',{'Broadcast ID':item.id});assert.equal((await op()).broadcasts.length,1);
  await command(admin,'admin','serviceStatus',{'Status':'unavailable'});
  await command(staff,'staff','broadcast',{'Message':'Please ask at the counter'});assert.equal((await op()).serviceStatus,'unavailable');
 });
 await test('SDK recovery CRUD enforces missed ticket, private ownership, pending edits, staff decisions and deletion',async()=>{
  await reset();const uid='crud-patient';
  await setDoc(doc(staff,'tickets',uid),{token:'A001',status:'waiting',patientName:'Test',patientsAhead:0});
  const missed={...initialState(),myToken:'A001',ticketStatus:'missed',recovery:'none',queue:[]};
  await assert.rejects(()=>runPatientCommand(patient,uid,missed,'requestRecovery',{'Reason':'Missed call'}),/missed-turn/);
  await updateDoc(doc(staff,'tickets',uid),{status:'missed'});
  await runPatientCommand(patient,uid,missed,'requestRecovery',{'Reason':'Missed call'});
  const ref=doc(patient,'recoveryRequests',uid);assert.equal((await getDoc(ref)).data().reason,'Missed call');
  await assertFails(getDoc(doc(other,'recoveryRequests',uid)));
  await runPatientCommand(patient,uid,{...missed,recovery:'pending'},'editRecovery',{'Reason':'Was at pharmacy'});
  assert.equal((await getDoc(ref)).data().reason,'Was at pharmacy');await assertFails(updateDoc(ref,{status:'approved'}));
  await runPatientCommand(patient,uid,{...missed,recovery:'pending'},'cancelRecovery',{});assert.equal((await getDoc(ref)).exists(),false);
  await runPatientCommand(patient,uid,missed,'requestRecovery',{'Reason':'Request another review'});
  await updateDoc(doc(staff,'operations','current'),{queue:[{token:'A001',patientId:uid,accountLinked:true,patientName:'Test',phone:'',status:'missed',createdAt:'2026-10-17'}]});
  await assert.rejects(()=>command(staff,'staff','deleteRecovery',{'Patient ID':uid}),/Resolve/);
  await command(staff,'staff','approveRecovery',{'Patient ID':uid});assert.equal((await getDoc(ref)).data().status,'approved');assert.equal((await getDoc(doc(patient,'tickets',uid))).data().status,'waiting');
  await command(staff,'staff','deleteRecovery',{'Patient ID':uid});assert.equal((await getDoc(ref)).exists(),false);
 });
 await test('SDK caregiver CRUD and preference deletion keep consent and preferences independent',async()=>{
  await reset();const uid='crud-patient',base=initialState(),fields={'Caregiver name':'Caregiver One','Phone number':'0771234567','Caregiver account ID':'crud-other'};
  await setDoc(doc(staff,'tickets',uid),{token:'A001',status:'waiting',patientsAhead:2});
  await runPatientCommand(patient,uid,{...base,largeText:true},'preferences',{});
  assert.equal((await getDoc(doc(patient,'patients',uid))).data().largeText,true);
  await runPatientCommand(patient,uid,base,'caregiver',fields);assert.equal((await getDoc(doc(other,'caregiverShares',uid))).data().token,'A001');
  await runPatientCommand(patient,uid,base,'caregiver',{...fields,'Caregiver name':'Updated caregiver'});assert.equal((await getDoc(doc(patient,'patients',uid))).data().caregiver.name,'Updated caregiver');
  await runPatientCommand(patient,uid,base,'resetPreferences',{});assert.deepEqual(Object.keys((await getDoc(doc(patient,'patients',uid))).data()),['caregiver']);
  await runPatientCommand(patient,uid,base,'revokeCaregiver',{});await assertFails(getDoc(doc(other,'caregiverShares',uid)));assert.equal((await getDoc(doc(patient,'patients',uid))).data().caregiver,undefined);
  await runPatientCommand(patient,uid,base,'resetPreferences',{});assert.equal((await getDoc(doc(patient,'patients',uid))).exists(),false);
 });
 await test('SDK support CRUD is private, validates ownership and reserves replies for staff',async()=>{
  await reset();const created=await createSupport(patient,'crud-patient','Patient','Accessibility','Need a larger printed token');
  const ref=doc(patient,'supportRequests',created.id);assert.equal((await getDoc(ref)).data().status,'open');
  await assertFails(getDoc(doc(other,'supportRequests',created.id)));await assertFails(getDocs(collection(patient,'supportRequests')));
  assert.equal((await getDocs(query(collection(patient,'supportRequests'),where('ownerId','==','crud-patient')))).size,1);
  await editSupport(patient,created.id,'Directions','Where is Room 04?');assert.equal((await getDoc(ref)).data().message,'Where is Room 04?');
  await assert.rejects(()=>editSupport(other,created.id,'Other','Cannot edit'),e=>e.code==='permission-denied');
  await assert.rejects(()=>answerSupport(patient,created.id,'Forged reply','resolved'),e=>e.code==='permission-denied');
  await answerSupport(staff,created.id,'Please ask Counter 03 for directions.','resolved');assert.equal((await getDoc(ref)).data().status,'resolved');
  await assert.rejects(()=>editSupport(patient,created.id,'Other','Closed edit'),e=>e.code==='permission-denied');
  await assert.rejects(()=>deleteSupport(staff,created.id),e=>e.code==='permission-denied');
  await deleteSupport(patient,created.id);assert.equal((await getDocs(query(collection(patient,'supportRequests'),where('ownerId','==','crud-patient')))).size,0);
 });
 await test('deleting a historical visit keeps the newer ticket; deleting the latest closed visit cannot resurrect history',async()=>{
  await reset();await command(staff,'staff','register',{'Patient name':'First visit'});await command(staff,'staff','cancel',{'Token':'A001'});
  await command(staff,'staff','register',{'Patient name':'Second visit'});
  const data=await op();data.queue.forEach(q=>{q.patientId='crud-patient';q.accountLinked=true;});
  await updateDoc(doc(staff,'operations','current'),{queue:data.queue});await setDoc(doc(staff,'tickets','crud-patient'),{token:'A002',status:'waiting',patientsAhead:0});
  await command(staff,'staff','deletePatient',{'Token':'A001'});assert.equal((await getDoc(doc(patient,'tickets','crud-patient'))).data().token,'A002');
  await command(staff,'staff','cancel',{'Token':'A002'});await command(staff,'staff','deletePatient',{'Token':'A002'});
  assert.equal((await getDoc(doc(patient,'tickets','crud-patient'))).exists(),false);
  await command(staff,'staff','register',{'Patient name':'Third visit'});assert.equal((await getDoc(doc(patient,'tickets','crud-patient'))).exists(),false);assert.equal((await op()).queue[0].token,'A003');
 });
 await test('revocation overrides legacy staff claims; immutable audits cannot be erased',async()=>{
  await reset();
  await assert.rejects(()=>command(staff,'admin','register',{'Patient name':'Forged administrator audit'}),e=>e.code==='permission-denied');
  assert.equal((await op()).queue.length,0);
  await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'staffAccess','crud-staff'),{uid:'crud-staff',approved:false,status:'revoked'});});
  await assertFails(getDoc(doc(staff,'operations','current')));
  await command(admin,'admin','register',{'Patient name':'Audit test'});
  const audit=(await getDocs(collection(admin,'audit'))).docs[0];await assertFails(deleteDoc(doc(admin,'audit',audit.id)));
 });
}finally{await env.cleanup();}
