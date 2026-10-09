import fs from 'node:fs';
import {preferenceData} from '../src/services/domain.ts';
import {initialState} from '../src/data/seed.ts';
import test from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
const environment=await initializeTestEnvironment({projectId:'demo-carequeue',firestore:{rules:fs.readFileSync('firebase/firestore.rules','utf8'),host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').at(-1)||8180)}});
const patient=environment.authenticatedContext('patient-one',{email:'patient-one@example.com'}).firestore(),other=environment.authenticatedContext('patient-two').firestore(),staff=environment.authenticatedContext('staff',{role:'staff'}).firestore(),admin=environment.authenticatedContext('admin',{role:'admin'}).firestore();
await environment.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'operations','current'),{queue:[],audit:[],broadcasts:[],offlineActions:[],incidentVerified:false,nowServing:'—',serviceStatus:'open',updatedAt:'2026-10-05'});await setDoc(doc(c.firestore(),'tickets','patient-one'),{token:'A125',recovery:'none',status:'waiting',patientsAhead:6});});
const caregiver=environment.authenticatedContext('caregiver-one').firestore();
try{
 await test('registered user profile is private, validates identity and contains no password or client-assigned role',async()=>{
  const ref=doc(patient,'users','patient-one'),data={uid:'patient-one',fullName:'Test Patient',email:'patient-one@example.com',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertFails(setDoc(ref,{...data,password:'Should never be stored'}));
  await assertFails(setDoc(ref,{...data,role:'admin'}));
  await assertFails(setDoc(ref,{...data,uid:'patient-two'}));
  await assertFails(setDoc(ref,{...data,email:'another@example.com'}));
  await assertFails(setDoc(ref,{...data,fullName:''}));
  await assertFails(setDoc(ref,{...data,createdAt:new Date('2020-01-01')}));
  await assertSucceeds(setDoc(ref,data));
  await assertSucceeds(getDoc(ref));
  await assertFails(getDoc(doc(other,'users','patient-one')));
  await assertFails(getDoc(doc(staff,'users','patient-one')));
  await assertSucceeds(updateDoc(ref,{fullName:'Updated Patient',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{role:'admin',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{email:'other@example.com',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(other,'users','patient-one')));
  await assertSucceeds(deleteDoc(ref));
 });
 await test('caregiver receives only explicitly shared visit fields and revocation removes access',async()=>{
  const share={caregiverId:'caregiver-one',token:'A125',status:'waiting',patientsAhead:6};
  await assertSucceeds(setDoc(doc(patient,'caregiverShares','patient-one'),share));
  await assertSucceeds(getDoc(doc(caregiver,'caregiverShares','patient-one')));
  await assertFails(getDoc(doc(other,'caregiverShares','patient-one')));
  await assertFails(getDoc(doc(caregiver,'tickets','patient-one')));
  await assertFails(setDoc(doc(patient,'caregiverShares','patient-one'),{...share,patientName:'Private name'}));
  await assertFails(setDoc(doc(patient,'caregiverShares','patient-one'),{...share,token:'A999'}));
  await assertSucceeds(deleteDoc(doc(patient,'caregiverShares','patient-one')));
  await assertFails(getDoc(doc(caregiver,'caregiverShares','patient-one')));
 });
 await test('profile owner can save settings; other patients and staff cannot read the profile',async()=>{await assertSucceeds(setDoc(doc(patient,'patients','patient-one'),preferenceData(initialState())));await assertFails(getDoc(doc(other,'patients','patient-one')));await assertFails(getDoc(doc(staff,'patients','patient-one')));await assertFails(updateDoc(doc(patient,'patients','patient-one'),{role:'admin'}));});
 await test('staff may call patients but only admin can verify incidents',async()=>{await assertSucceeds(updateDoc(doc(staff,'operations','current'),{nowServing:'A125'}));await assertFails(updateDoc(doc(staff,'operations','current'),{incidentVerified:true}));await assertSucceeds(updateDoc(doc(admin,'operations','current'),{incidentVerified:true}));await assertFails(updateDoc(doc(patient,'operations','current'),{nowServing:'A126'}));});
 await test('recovery request must belong to the issued ticket and waits for staff',async()=>{await assertSucceeds(setDoc(doc(patient,'recoveryRequests','patient-one'),{patientId:'patient-one',token:'A125',status:'pending',requestedAt:new Date()}));await assertFails(updateDoc(doc(patient,'recoveryRequests','patient-one'),{status:'approved'}));await assertSucceeds(updateDoc(doc(staff,'recoveryRequests','patient-one'),{status:'approved'}));await assertFails(setDoc(doc(patient,'recoveryRequests','patient-one'),{patientId:'patient-one',token:'A125',status:'pending',requestedAt:new Date()}));await assertSucceeds(updateDoc(doc(staff,'tickets','patient-one'),{status:'missed'}));await assertSucceeds(setDoc(doc(patient,'recoveryRequests','patient-one'),{patientId:'patient-one',token:'A125',status:'pending',requestedAt:new Date()}));await assertFails(setDoc(doc(other,'recoveryRequests','patient-two'),{patientId:'patient-two',token:'A125',status:'pending',requestedAt:new Date()}));});
}finally{await environment.cleanup();}
