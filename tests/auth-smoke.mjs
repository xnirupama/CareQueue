// Uses only the isolated local Auth emulator. Does not send real email.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
// Match the TS service's Node CJS condition; mixing SDK conditions can wrap
// expected Auth errors as network errors even when the server responds normally.
const require=createRequire(import.meta.url);
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,signOut,deleteUser,applyActionCode,confirmPasswordReset}=require('firebase/auth');
import {registerAccount,signInAccount,renameAccount,verifyAccountEmail,reloadAccount,resetAccountPassword,changeAccountPassword} from '../src/services/authentication.ts';
import {registerWithProfile,signInWithProfile,ensureUserProfile,saveUserProfileName} from '../src/services/user-profile.ts';
import {approveStaffAccount,resolveAccountRole} from '../src/services/account-access.ts';
const {getFirestore,connectFirestoreEmulator,doc,getDoc,deleteDoc,terminate}=require('firebase/firestore');
const project='demo-carequeue',host=process.env.FIREBASE_AUTH_EMULATOR_HOST||'127.0.0.1:9099';
const adminSdkApp=require('firebase-admin/app'),adminSdkAuth=require('firebase-admin/auth');
const trustedApp=adminSdkApp.initializeApp({projectId:project},'role-tests');
if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))throw Error('Auth test must target the local emulator.');
const app=initializeApp({apiKey:'fake-emulator-key',projectId:project}),auth=getAuth(app);
connectAuthEmulator(auth,`http://${host}`,{disableWarnings:true});
const firestoreHost=process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8180';
if(!/^(127\.0\.0\.1|localhost):\d+$/.test(firestoreHost))throw Error('Profile test must target the local emulator.');
const db=getFirestore(app);connectFirestoreEmulator(db,firestoreHost.split(':')[0],Number(firestoreHost.split(':')[1]));
const email=`account-check-${randomUUID()}@example.com`,password='Original pass 12!',newPassword='Changed pass 34!',reset='Reset pass 56!';
let account;
async function codeFor(type){const response=await fetch(`http://${host}/emulator/v1/projects/${project}/oobCodes`);assert.ok(response.ok);const codes=(await response.json()).oobCodes;const code=codes.filter(c=>c.email===email&&c.requestType===type).at(-1);assert.ok(code,`Expected ${type} email action in emulator`);return code.oobCode;}
try{
 const blockedApp=initializeApp({apiKey:'fake-emulator-key',projectId:project},'profile-write-denied'),blockedDb=getFirestore(blockedApp);
 connectFirestoreEmulator(blockedDb,firestoreHost.split(':')[0],Number(firestoreHost.split(':')[1]));
 const recoverEmail=`profile-recovery-${randomUUID()}@example.com`;
 try{
  await assert.rejects(()=>registerWithProfile(auth,blockedDb,{name:'Recoverable Patient',email:recoverEmail,password,confirmPassword:password,accountType:'patient'}),/login account was created/);
  assert.equal(auth.currentUser,null);
  const recovered=await signInWithProfile(auth,db,recoverEmail,password);
  assert.equal(recovered.profile.fullName,'Recoverable Patient');
  await deleteDoc(doc(db,'users',recovered.user.uid));await deleteUser(recovered.user);
  console.log('PASS: failed database save reports incomplete registration, signs out and recovers using the same credentials');
 }finally{await terminate(blockedDb);await deleteApp(blockedApp);}
 const result=await registerWithProfile(auth,db,{name:'  Test Patient  ',email:` ${email} `,password,confirmPassword:password,accountType:'patient'});account=result.user;
 assert.equal(result.profileSaved,true);assert.equal(account.displayName,'Test Patient');assert.equal((await account.getIdTokenResult()).claims.role,undefined);
 const registered=(await getDoc(doc(db,'users',account.uid))).data();
 assert.equal(registered.fullName,'Test Patient');assert.equal(registered.email,email);assert.equal(registered.uid,account.uid);
 assert.deepEqual(Object.keys(registered).sort(),['accountType','createdAt','email','fullName','uid','updatedAt']);
 const createdAt=registered.createdAt.toMillis();await ensureUserProfile(db,account);assert.equal((await getDoc(doc(db,'users',account.uid))).data().createdAt.toMillis(),createdAt);
 await assert.rejects(()=>registerAccount(auth,{name:'Duplicate',email,password,confirmPassword:password,accountType:'patient'}),e=>e.code==='auth/email-already-in-use');
 console.log('PASS: registration, name persistence, duplicate email denial, and no elevated role');
 await signOut(auth);assert.equal(auth.currentUser,null);
 await assert.rejects(()=>signInAccount(auth,email,'Wrong pass 12!'));
 const signedIn=await signInWithProfile(auth,db,` ${email} `,password);account=signedIn.user;assert.equal(account.displayName,'Test Patient');assert.equal(signedIn.profile.fullName,'Test Patient');
 await saveUserProfileName(db,account,'Updated Patient');await reloadAccount(account);assert.equal(account.displayName,'Updated Patient');
 const updated=(await getDoc(doc(db,'users',account.uid))).data();assert.equal(updated.fullName,'Updated Patient');assert.equal(updated.createdAt.toMillis(),createdAt);
 console.log('PASS: sign out, rejected credentials, sign in and synchronized database profile editing');
 await deleteDoc(doc(db,'users',account.uid));await signOut(auth);
 const legacy=await signInWithProfile(auth,db,email,password);account=legacy.user;assert.equal(legacy.profile.fullName,'Updated Patient');
 console.log('PASS: existing login accounts receive a missing database profile without losing their credentials');
 await verifyAccountEmail(account);await applyActionCode(auth,await codeFor('VERIFY_EMAIL'));await reloadAccount(account);assert.equal(account.emailVerified,true);
 console.log('PASS: verification email action and verified status refresh');
 await assert.rejects(()=>changeAccountPassword(auth,account,'Wrong pass 12!',newPassword,newPassword));
 await changeAccountPassword(auth,account,password,newPassword,newPassword);await signOut(auth);
 await assert.rejects(()=>signInAccount(auth,email,password));account=(await signInAccount(auth,email,newPassword)).user;
 console.log('PASS: password change requires current credentials and rejects old password');
 await resetAccountPassword(auth,email);await resetAccountPassword(auth,`unknown-${randomUUID()}@example.com`);
 await confirmPasswordReset(auth,await codeFor('PASSWORD_RESET'),reset);await signOut(auth);
 await assert.rejects(()=>signInAccount(auth,email,newPassword));account=(await signInAccount(auth,email,reset)).user;
 console.log('PASS: password reset action and sign in with the reset password');
 const applicantEmail=`staff-applicant-${randomUUID()}@example.com`;
 await assert.rejects(()=>signInWithProfile(auth,db,email,reset,'admin'),/administrator account/);assert.equal(auth.currentUser,null);
 const applicant=await registerWithProfile(auth,db,{name:'Test Staff',email:applicantEmail,password,confirmPassword:password,accountType:'staff'});
 assert.equal(applicant.profile.accountType,'staff');assert.equal(await resolveAccountRole(db,applicant.user),'patient');
 await assert.rejects(()=>getDoc(doc(db,'operations','current')),e=>e.code==='permission-denied');
 await assert.rejects(()=>approveStaffAccount(db,applicant.user,applicant.user.uid),/Administrator access/);
 await signOut(auth);
 await adminSdkAuth.getAuth(trustedApp).setCustomUserClaims(account.uid,{role:'admin'});
 await assert.rejects(()=>signInWithProfile(auth,db,email,reset),/Administrator sign in/);assert.equal(auth.currentUser,null);
 const adminLogin=await signInWithProfile(auth,db,email,reset,'admin');assert.equal(adminLogin.role,'admin');account=adminLogin.user;
 await approveStaffAccount(db,account,applicant.user.uid);
 await signOut(auth);
 const approved=await signInWithProfile(auth,db,applicantEmail,password);assert.equal(approved.role,'staff');
 assert.equal((await getDoc(doc(db,'operations','current'))).exists(),true);
 await assert.rejects(()=>signInWithProfile(auth,db,applicantEmail,password,'admin'),/administrator account/);
 await signInWithProfile(auth,db,email,reset,'admin');
 await deleteDoc(doc(db,'staffAccess',applicant.user.uid));
 await signInWithProfile(auth,db,applicantEmail,password);await deleteDoc(doc(db,'users',applicant.user.uid));await deleteUser(auth.currentUser);
 await signInWithProfile(auth,db,email,reset,'admin');
 console.log('PASS: Staff selection remains pending, administrator-only login is verified, administrator approval enables staff queue access, and staff cannot enter the admin portal');
}finally{if(!auth.currentUser&&account){try{await signInAccount(auth,email,reset);}catch{try{await signInAccount(auth,email,newPassword);}catch{await signInAccount(auth,email,password);}}}if(auth.currentUser){await deleteDoc(doc(db,'users',auth.currentUser.uid));await deleteUser(auth.currentUser);}await terminate(db);await deleteApp(app);await adminSdkApp.deleteApp(trustedApp);}
