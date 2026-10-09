import {doc,getDoc,runTransaction,serverTimestamp,type Firestore,type Timestamp} from 'firebase/firestore';
import {signOut,type Auth,type User} from 'firebase/auth';
import {registerAccount,signInAccount,renameAccount,type RegistrationFields,type RegistrationAccountType} from './authentication';
import {claimRole,resolveAccountRole,validatePortal,type LoginPortal} from './account-access';

export interface UserProfile {
 uid:string; fullName:string; email:string; accountType?:RegistrationAccountType; createdAt:Timestamp; updatedAt:Timestamp;
}
function profileName(user:User,name?:string){
 const value=name===undefined?(user.displayName?.trim()||user.email?.split('@')[0]||'Patient').slice(0,80):name.trim();
 if(!value||value.length>80)throw Error('Enter a name between 1 and 80 characters.');
 return value;
}
export async function ensureUserProfile(db:Firestore,user:User,name?:string,accountType?:RegistrationAccountType):Promise<UserProfile>{
 if(!user.email)throw Error('An email account is required.');
 const ref=doc(db,'users',user.uid);
 if(name===undefined){const existing=await getDoc(ref);if(existing.exists()&&existing.data().accountType)return existing.data() as UserProfile;}
 const type=accountType||(claimRole((await user.getIdTokenResult()).claims)==='staff'?'staff':'patient');
 const fullName=profileName(user,name);
 await runTransaction(db,async tx=>{
  const existing=await tx.get(ref);
  if(!existing.exists())tx.set(ref,{uid:user.uid,fullName,email:user.email,accountType:type,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  else{
   const patch:Record<string,unknown>={};
   if(!existing.data().accountType)patch.accountType=type;
   if(name!==undefined&&existing.data().fullName!==fullName)patch.fullName=fullName;
   if(Object.keys(patch).length)tx.update(ref,{...patch,updatedAt:serverTimestamp()});
  }
 });
 const saved=await getDoc(ref);
 if(!saved.exists())throw Error('Your account profile could not be saved. Please try signing in again.');
 return saved.data() as UserProfile;
}
export async function registerWithProfile(auth:Auth,db:Firestore,fields:RegistrationFields){
 const result=await registerAccount(auth,fields);
 try{return {...result,profile:await ensureUserProfile(db,result.user,fields.name,fields.accountType as RegistrationAccountType)};}
 catch{
  // Auth and Firestore cannot share an atomic transaction. Keep the valid
  // credentials recoverable, but do not report a finished registration.
  await signOut(auth);
  throw Error('Your login account was created, but we could not save your profile. Check your connection, then sign in with the same email and password to finish setup. You can update your name from Account.');
 }
}
export async function signInWithProfile(auth:Auth,db:Firestore,email:string,password:string,portal:LoginPortal='standard'){
 const result=await signInAccount(auth,email,password);
 try{const role=await resolveAccountRole(db,result.user,true);validatePortal(role,portal);return {...result,role,profile:await ensureUserProfile(db,result.user)};}
 catch(error){await signOut(auth);throw error;}
}
export async function saveUserProfileName(db:Firestore,user:User,name:string){
 const profile=await ensureUserProfile(db,user,name);
 // Firestore is the account profile source. Auth's display name is a mirror;
 // a failed mirror update must not undo a successfully saved profile.
 try{await renameAccount(user,profile.fullName);}catch{/* Retry on a later edit. */}
 return profile;
}
