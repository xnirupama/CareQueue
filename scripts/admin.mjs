// Run on a trusted owner machine or Google Cloud Shell. Administrator
// credentials never belong in the mobile app, .env, or this repository.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const [uid,role]=process.argv.slice(2);
if(!uid||!['staff','admin','patient'].includes(role))throw Error('Usage: node scripts/admin.mjs <Firebase user UID> <staff|admin|patient>');
initializeApp({credential:applicationDefault(),projectId:'carequeue-db90e'});
const auth=getAuth(),user=await auth.getUser(uid);
await auth.setCustomUserClaims(uid,{...user.customClaims,role});
if(role==='patient')await getFirestore().doc(`staffAccess/${uid}`).delete();
console.log(`Assigned ${role} to ${uid}. Sign out and sign in again to refresh the account role.`);
