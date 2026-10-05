// Creates only temporary verification accounts in the explicitly selected project.
// Never prints passwords or tokens. Cleans up its own profile and Auth account.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,createUserWithEmailAndPassword,deleteUser} from 'firebase/auth';
import {getFirestore,doc,setDoc,getDoc,deleteDoc,terminate} from 'firebase/firestore';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const app=initializeApp({apiKey:env.EXPO_PUBLIC_FIREBASE_API_KEY,projectId:env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,appId:env.EXPO_PUBLIC_FIREBASE_APP_ID});
const auth=getAuth(app),db=getFirestore(app);
let user,profileCreated=false;
const timeout=setTimeout(()=>{console.error('Live verification timed out. Check Firebase console for a carequeue-check verification account.');process.exit(1)},55000);
async function denied(action){await assert.rejects(action,e=>e.code==='permission-denied');}
try{
 await denied(()=>getDoc(doc(db,'operations','current')));
 user=(await createUserWithEmailAndPassword(auth,`carequeue-check-${randomUUID()}@example.com`,randomUUID()+randomUUID())).user;
 const profile=doc(db,'patients',user.uid);
 await setDoc(profile,{sms:false,appAlerts:true,language:'en',largeText:false});profileCreated=true;
 assert.equal((await getDoc(profile)).data().sms,false);
 await denied(()=>getDoc(doc(db,'patients','different-user')));
 await denied(()=>setDoc(profile,{role:'admin'},{merge:true}));
 await denied(()=>setDoc(profile,{sms:'yes'},{merge:true}));
 await denied(()=>setDoc(doc(db,'operations','current'),{incidentVerified:true}));
 await denied(()=>setDoc(doc(db,'tickets',user.uid),{token:'A001'}));
 await denied(()=>setDoc(doc(db,'recoveryRequests',user.uid),{patientId:user.uid,token:'A001',status:'approved',requestedAt:new Date()}));
 console.log(`PASS: ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}: email sign-in, own profile persistence, cross-user isolation, role escalation denial, preference validation, staff-only queue writes, and recovery validation.`);
}finally{
 if(user){if(profileCreated)await deleteDoc(doc(db,'patients',user.uid));await deleteUser(user);console.log('Temporary verification profile and account removed.');}
 clearTimeout(timeout);await terminate(db);await deleteApp(app);
}
