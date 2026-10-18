// Run on a trusted owner machine or Google Cloud Shell. Administrator
// credentials never belong in the mobile app, .env, or this repository.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {createRequire} from 'node:module';
const [identity,role,...flags]=process.argv.slice(2),projectId='carequeue-db90e';
if(!identity||!['staff','admin','patient','lookup'].includes(role)||flags.some(f=>!['--firebase-cli','--create'].includes(f)))throw Error('Usage: node scripts/admin.mjs <email-or-UID> <staff|admin|patient|lookup> [--firebase-cli] [--create]');
if(flags.includes('--create')&&(role!=='admin'||!identity.includes('@')))throw Error('--create is limited to provisioning an administrator by email.');
const cli=flags.includes('--firebase-cli');
let credential=applicationDefault();
let ownerLabel='trusted-owner';
if(cli){
 // Reuse the owner’s existing CLI session without exporting tokens or creating a key.
 const require=createRequire(import.meta.url),ownerAuth=require('firebase-tools/lib/auth');
 const account=ownerAuth.getProjectDefaultAccount(process.cwd());
 if(!account)throw Error('Sign in with firebase login before using --firebase-cli.');
 ownerLabel=account.user.email;
 credential={getAccessToken:async()=>{
  const token=await ownerAuth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
  return {access_token:token.access_token,expires_in:Math.max(1,Math.floor(((token.expires_at||Date.now()+3600000)-Date.now())/1000))};
 }};
 console.log(`Using Firebase CLI owner session: ${account.user.email}`);
}
initializeApp({credential,projectId});
const auth=getAuth();let user;
try{user=identity.includes('@')?await auth.getUserByEmail(identity):await auth.getUser(identity);}
catch(e){
 if(e.code!=='auth/user-not-found')throw e;
 if(flags.includes('--create')){user=await auth.createUser({email:identity,displayName:'CareQueue administrator'});console.log('Created the administrator login without a password. Use Administrator sign in → Forgot password to set it privately. No email was sent by this script.');}
 else{console.log(`NOT REGISTERED: ${identity}. Create this account in CareQueue first, then rerun this command.`);process.exit(2);}
}
if(role==='lookup'){console.log(JSON.stringify({uid:user.uid,email:user.email,role:user.customClaims?.role||'patient',disabled:user.disabled}));process.exit(0);}
if(role==='patient'||role==='staff'){
 const access={uid:user.uid,approved:role==='staff',status:role==='staff'?'active':'revoked',approvedBy:`owner:${ownerLabel}`,updatedAt:new Date()};
 if(cli){
  const token=await credential.getAccessToken(),fields=Object.fromEntries(Object.entries(access).map(([key,value])=>[key,value instanceof Date?{timestampValue:value.toISOString()}:typeof value==='boolean'?{booleanValue:value}:{stringValue:value}]));
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/staffAccess/${user.uid}`,{method:'PATCH',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({fields})});
  if(!response.ok)throw Error('The staff access record could not be updated; the requested claim change was not applied.');
 }else await getFirestore().doc(`staffAccess/${user.uid}`).set(access);
}
await auth.setCustomUserClaims(user.uid,{...user.customClaims,role});
const verified=await auth.getUser(user.uid);if(verified.customClaims?.role!==role)throw Error('The role assignment could not be verified.');
console.log(`Assigned ${role} to ${user.email||user.uid}. Sign out and sign in through the ${role==='admin'?'administrator':role} page.`);
