// Local Auth/Firestore only; captures email in memory and never contacts Resend.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {createResetService} from '../functions/reset-service.mjs';
import {finishEmailPasswordReset} from '../src/services/password-reset.ts';
const require=createRequire(import.meta.url);
for(const key of ['FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST'])if(!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env[key]||''))throw Error('Both local emulators are required.');
const project='demo-carequeue',run=randomUUID(),secret=randomUUID()+randomUUID();
const adminApp=require('firebase-admin/app'),adminAuth=require('firebase-admin/auth'),adminFirestore=require('firebase-admin/firestore');
const trusted=adminApp.initializeApp({projectId:project},'reset-'+run),database=adminFirestore.getFirestore(trusted),accounts=adminAuth.getAuth(trusted);
const {initializeApp,deleteApp}=require('firebase/app'),{getAuth,connectAuthEmulator,signInWithEmailAndPassword,signOut}=require('firebase/auth');
const {getFirestore,connectFirestoreEmulator,doc,getDoc,terminate}=require('firebase/firestore');
const client=initializeApp({apiKey:'fake-emulator-key',projectId:project},'reset-client-'+run),auth=getAuth(client),db=getFirestore(client);
connectAuthEmulator(auth,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});
const [firestoreHost,firestorePort]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(db,firestoreHost,Number(firestorePort));
let clock=Date.now();const sent=[],userIds=[];
const service=createResetService({db:database,auth:accounts,secret,now:()=>clock,sendCode:async mail=>sent.push(mail)});
async function requestCode(...args){const challenge=await service.request(...args);await service.deliver(challenge.challengeId);return challenge;}
try{
 for(const role of ['patient','staff','admin']){
  const email=`reset-${role}-${run}@example.com`,oldPassword='Original password 12!',password='New private password 34!';
  const account=await accounts.createUser({email,...(role!=='admin'?{password:oldPassword}:{})});userIds.push(account.uid);
  await accounts.setCustomUserClaims(account.uid,{role});
  const profile={uid:account.uid,fullName:'Reset test',email,accountType:role==='staff'?'staff':'patient'};await database.doc(`users/${account.uid}`).set(profile);
  const request=await requestCode(email,`test-${run}`),code=sent.at(-1).code;
  assert.match(code,/^\d{6}$/);assert.equal('resetToken' in request,false);
  await assert.rejects(()=>service.verify(request.challengeId,code==='999999'?'888888':'999999'));
  const {resetToken}=await service.verify(request.challengeId,code);
  await assert.rejects(()=>finishEmailPasswordReset(auth,resetToken,'short','short'),/8 characters/);
  await assert.rejects(()=>finishEmailPasswordReset(auth,resetToken,password,'Mismatch'),/do not match/);
  await finishEmailPasswordReset(auth,resetToken,password,password);
  await assert.rejects(()=>service.verify(request.challengeId,code));
  await assert.rejects(()=>finishEmailPasswordReset(auth,resetToken,password,password));
  const login=await signInWithEmailAndPassword(auth,email,password);
  assert.equal((await login.user.getIdTokenResult()).claims.role,role);
  assert.deepEqual((await database.doc(`users/${account.uid}`).get()).data(),profile);
  for(const path of [`_passwordResetChallenges/${request.challengeId}`,'_passwordResetRecipients/private','_passwordResetRateLimits/private'])await assert.rejects(()=>getDoc(doc(db,path)),error=>error.code==='permission-denied');
  await signOut(auth);assert.equal(auth.currentUser,null);
  await assert.rejects(()=>signInWithEmailAndPassword(auth,email,oldPassword));assert.equal(auth.currentUser,null);
  console.log(`PASS: ${role} email code resets the real emulator password, preserves role/profile, rejects replay, hides private reset records, and logs out`);
 }
 const missing=await requestCode(`unknown-${run}@example.com`,`test-${run}`);assert.equal(sent.length,3);await assert.rejects(()=>service.verify(missing.challengeId,'123456'));
 console.log('PASS: an unregistered address returns a generic challenge without receiving email or a usable token');
 const latest=sent.at(-1);await assert.rejects(()=>service.request(latest.to,`test-${run}`),error=>error.code==='resource-exhausted');clock+=60_001;
 const renewed=await requestCode(latest.to,`test-${run}`);assert.ok(renewed.challengeId);clock+=10*60*1000;
 await assert.rejects(()=>service.verify(renewed.challengeId,sent.at(-1).code));
 console.log('PASS: Firestore transaction cooldown and server-enforced expiry persist across calls');
}finally{
 await signOut(auth);
 for(const uid of userIds){await database.doc(`users/${uid}`).delete();await accounts.deleteUser(uid);}
 for(const name of ['_passwordResetChallenges','_passwordResetRecipients','_passwordResetRateLimits']){const snapshot=await database.collection(name).get();const batch=database.batch();snapshot.docs.forEach(item=>batch.delete(item.ref));await batch.commit();}
 await terminate(db);await deleteApp(client);await adminApp.deleteApp(trusted);
}
