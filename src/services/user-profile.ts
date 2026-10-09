import {doc,getDoc,runTransaction,serverTimestamp,type Firestore,type Timestamp} from 'firebase/firestore';
import {signOut,type Auth,type User} from 'firebase/auth';
import {registerAccount,signInAccount,renameAccount,type RegistrationFields} from './authentication';

export interface UserProfile {
 uid:string; fullName:string; email:string; createdAt:Timestamp; updatedAt:Timestamp;
}
function profileName(user:User,name?:string){
 const value=name===undefined?(user.displayName?.trim()||user.email?.split('@')[0]||'Patient').slice(0,80):name.trim();
 if(!value||value.length>80)throw Error('Enter a name between 1 and 80 characters.');
 return value;
}
export async function ensureUserProfile(db:Firestore,user:User,name?:string):Promise<UserProfile>{
 if(!user.email)throw Error('An email account is required.');
 const ref=doc(db,'users',user.uid);
 if(name===undefined){const existing=await getDoc(ref);if(existing.exists())return existing.data() as UserProfile;}
 const fullName=profileName(user,name);
 await runTransaction(db,async tx=>{
  const existing=await tx.get(ref);
  if(!existing.exists())tx.set(ref,{uid:user.uid,fullName,email:user.email,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  else if(name!==undefined&&existing.data().fullName!==fullName)tx.update(ref,{fullName,updatedAt:serverTimestamp()});
 });
 const saved=await getDoc(ref);
 if(!saved.exists())throw Error('Your account profile could not be saved. Please try signing in again.');
 return saved.data() as UserProfile;
}
export async function registerWithProfile(auth:Auth,db:Firestore,fields:RegistrationFields){
 const result=await registerAccount(auth,fields);
 try{return {...result,profile:await ensureUserProfile(db,result.user,fields.name)};}
 catch{
  // Auth and Firestore cannot share an atomic transaction. Keep the valid
  // credentials recoverable, but do not report a finished registration.
  await signOut(auth);
  throw Error('Your login account was created, but we could not save your profile. Check your connection, then sign in with the same email and password to finish setup. You can update your name from Account.');
 }
}
export async function signInWithProfile(auth:Auth,db:Firestore,email:string,password:string){
 const result=await signInAccount(auth,email,password);
 try{return {...result,profile:await ensureUserProfile(db,result.user)};}
 catch(error){await signOut(auth);throw error;}
}
export async function saveUserProfileName(db:Firestore,user:User,name:string){
 const profile=await ensureUserProfile(db,user,name);
 // Firestore is the account profile source. Auth's display name is a mirror;
 // a failed mirror update must not undo a successfully saved profile.
 try{await renameAccount(user,profile.fullName);}catch{/* Retry on a later edit. */}
 return profile;
}
