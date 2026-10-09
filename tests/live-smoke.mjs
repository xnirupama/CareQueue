// Creates only temporary verification accounts in the explicitly selected project.
// Never prints passwords or tokens. Cleans up its own profile and Auth account.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,signOut,deleteUser}=require('firebase/auth');
import {registerAccount,signInAccount,reloadAccount,changeAccountPassword} from '../src/services/authentication.ts';
import {registerWithProfile,signInWithProfile,saveUserProfileName} from '../src/services/user-profile.ts';
import {resolveAccountRole,approveStaffAccount} from '../src/services/account-access.ts';
const {getFirestore,doc,setDoc,getDoc,deleteDoc,terminate}=require('firebase/firestore');
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>!l.trim().startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const app=initializeApp({apiKey:env.EXPO_PUBLIC_FIREBASE_API_KEY,projectId:env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,appId:env.EXPO_PUBLIC_FIREBASE_APP_ID});
const auth=getAuth(app),db=getFirestore(app);
let user,profileCreated=false;
let staffUser,staffApp,staffAuth,staffDb;
const email=`carequeue-check-${randomUUID()}@example.com`,password=`Original-${randomUUID()}!`,changedPassword=`Changed-${randomUUID()}!`;
const timeout=setTimeout(()=>{console.error('Live verification timed out. Check Firebase console for a carequeue-check verification account.');process.exit(1)},120000);
async function denied(action){await assert.rejects(action,e=>e.code==='permission-denied');}
try{
 await denied(()=>getDoc(doc(db,'operations','current')));
 const registration=await registerWithProfile(auth,db,{name:'Verification Patient',email,password,confirmPassword:password,accountType:'patient'});
 user=registration.user;assert.equal(registration.profileSaved,true);assert.equal(user.displayName,'Verification Patient');assert.equal((await user.getIdTokenResult()).claims.role,undefined);
 const accountDocument=(await getDoc(doc(db,'users',user.uid))).data();
 assert.equal(accountDocument.uid,user.uid);assert.equal(accountDocument.email,email);assert.equal(accountDocument.fullName,'Verification Patient');
 assert.deepEqual(Object.keys(accountDocument).sort(),['accountType','createdAt','email','fullName','uid','updatedAt']);
 await assert.rejects(()=>registerAccount(auth,{name:'Duplicate',email,password,confirmPassword:password,accountType:'patient'}),e=>e.code==='auth/email-already-in-use');
 await signOut(auth);await assert.rejects(()=>signInAccount(auth,email,'Incorrect-password-123!'));
 const signedIn=await signInWithProfile(auth,db,email,password);user=signedIn.user;assert.equal(signedIn.profile.fullName,'Verification Patient');
 await saveUserProfileName(db,user,'Updated Verification Patient');await reloadAccount(user);assert.equal(user.displayName,'Updated Verification Patient');
 assert.equal((await getDoc(doc(db,'users',user.uid))).data().fullName,'Updated Verification Patient');
 await denied(()=>getDoc(doc(db,'users','different-user')));
 await denied(()=>setDoc(doc(db,'users',user.uid),{password:'Must not be saved'},{merge:true}));
 await changeAccountPassword(auth,user,password,changedPassword,changedPassword);await signOut(auth);
 await assert.rejects(()=>signInAccount(auth,email,password));user=(await signInAccount(auth,email,changedPassword)).user;
 const profile=doc(db,'patients',user.uid);
 await setDoc(profile,{sms:false,appAlerts:true,language:'en',largeText:false});profileCreated=true;
 assert.equal((await getDoc(profile)).data().sms,false);
 await denied(()=>getDoc(doc(db,'patients','different-user')));
 await denied(()=>setDoc(profile,{role:'admin'},{merge:true}));
 await denied(()=>setDoc(profile,{sms:'yes'},{merge:true}));
 await denied(()=>setDoc(doc(db,'operations','current'),{incidentVerified:true}));
 await denied(()=>setDoc(doc(db,'tickets',user.uid),{token:'A001'}));
 await denied(()=>setDoc(doc(db,'recoveryRequests',user.uid),{patientId:user.uid,token:'A001',status:'approved',requestedAt:new Date()}));
 await assert.rejects(()=>signInWithProfile(auth,db,email,changedPassword,'admin'),/administrator account/);
 user=(await signInWithProfile(auth,db,email,changedPassword)).user;
 staffApp=initializeApp({apiKey:env.EXPO_PUBLIC_FIREBASE_API_KEY,projectId:env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,appId:env.EXPO_PUBLIC_FIREBASE_APP_ID},'staff-live-check');staffAuth=getAuth(staffApp);staffDb=getFirestore(staffApp);
 const staffEmail=`staff-check-${randomUUID()}@example.com`;
 const registeredStaff=await registerWithProfile(staffAuth,staffDb,{name:'Verification Staff',email:staffEmail,password,confirmPassword:password,accountType:'staff'});staffUser=registeredStaff.user;
 assert.equal(registeredStaff.profile.accountType,'staff');assert.equal(await resolveAccountRole(staffDb,staffUser),'patient');
 await denied(()=>getDoc(doc(staffDb,'operations','current')));
 await denied(()=>setDoc(doc(staffDb,'staffAccess',staffUser.uid),{uid:staffUser.uid,approved:true,approvedBy:staffUser.uid,updatedAt:new Date()}));
 await assert.rejects(()=>approveStaffAccount(staffDb,staffUser,staffUser.uid),/Administrator access/);
 await assert.rejects(()=>signInWithProfile(staffAuth,staffDb,staffEmail,password,'admin'),/administrator account/);
 staffUser=(await signInWithProfile(staffAuth,staffDb,staffEmail,password)).user;
 console.log('PASS: live Staff registration saves the requested type without granting queue access; self-approval and administrator login are rejected.');
 console.log(`PASS: ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}: registration/password policy, duplicate email denial, sign-out/sign-in, invalid credentials, profile editing, password change, own profile persistence, cross-user isolation, role escalation denial, preference validation, staff-only queue writes, and recovery validation. No real email was sent.`);
}finally{
 if(staffUser){if(!staffAuth.currentUser)await signInAccount(staffAuth,staffUser.email,password);await deleteDoc(doc(staffDb,'users',staffUser.uid));await deleteUser(staffAuth.currentUser);}
 if(staffDb)await terminate(staffDb);if(staffApp)await deleteApp(staffApp);
 if(user){if(profileCreated)await deleteDoc(doc(db,'patients',user.uid));await deleteDoc(doc(db,'users',user.uid));await deleteUser(user);console.log('Temporary verification database profiles and Auth account removed.');}
 clearTimeout(timeout);await terminate(db);await deleteApp(app);
}
