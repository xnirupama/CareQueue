import {doc,getDoc,runTransaction,serverTimestamp,type Firestore,type Timestamp} from 'firebase/firestore';
import {signOut,deleteUser,EmailAuthProvider,reauthenticateWithCredential,type Auth,type User} from 'firebase/auth';
import {registerAccount,signInAccount,renameAccount,type RegistrationFields,type RegistrationAccountType} from './authentication';
import {claimRole,resolveAccountRole,validatePortal,type LoginPortal} from './account-access';
import {personNameError,normalizePersonName} from './patient-validation';

export interface UserProfile {
 uid:string; fullName:string; email:string; accountType?:RegistrationAccountType; createdAt:Timestamp; updatedAt:Timestamp;
}
function profileName(user:User,name?:string){
 // Existing/recoverable accounts may have an email-derived legacy display name.
 if(name!==undefined){const error=personNameError(name);if(error)throw Error(error);}
 const value=name===undefined?(user.displayName?.trim()||user.email?.split('@')[0]||'Patient').slice(0,80):normalizePersonName(name);
 if(!value||value.length>80)throw Error('Enter a name between 1 and 80 characters.');
 return value;
}
export async function ensureUserProfile(db:Firestore,user:User,name?:string,accountType?:RegistrationAccountType):Promise<UserProfile>{
 if(!user.email)throw Error('An email account is required.');
 const requestedName=name===undefined?undefined:profileName(user,name);
 const ref=doc(db,'users',user.uid);
 if(name===undefined){const existing=await getDoc(ref);if(existing.exists()&&existing.data().accountType)return existing.data() as UserProfile;}
 const type=accountType||(claimRole((await user.getIdTokenResult()).claims)==='staff'?'staff':'patient');
 const fullName=requestedName??profileName(user);
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
export async function signInWithProfile(auth:Auth,db:Firestore,email:string,password:string,portal:LoginPortal='patient'){
 const result=await signInAccount(auth,email,password);
 // A failed registration profile write can leave a recoverable Auth account.
 // The staff portal preserves that requested type; approval is still required.
 try{const [role,profile]=await Promise.all([resolveAccountRole(db,result.user,true),ensureUserProfile(db,result.user,undefined,portal==='staff'?'staff':undefined)]);validatePortal(role,portal,profile);return {...result,role,profile};}
 catch(error){await signOut(auth);throw error;}
}
export async function saveUserProfileName(db:Firestore,user:User,name:string){
 const profile=await ensureUserProfile(db,user,name);
 // Firestore is the account profile source. Auth's display name is a mirror;
 // a failed mirror update must not undo a successfully saved profile.
 try{await renameAccount(user,profile.fullName);}catch{/* Retry on a later edit. */}
 return profile;
}
export async function deletePatientAccount(db:Firestore,user:User,password:string){
 if(!user.email||!password)throw Error('Enter your current password to delete your account.');
 const profile=await ensureUserProfile(db,user),role=await resolveAccountRole(db,user,true);
 if(role!=='patient'||profile.accountType==='staff')throw Error('Staff and administrator accounts must be managed by the hospital administrator.');
 await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,password));
 await runTransaction(db,async tx=>{
  const ticket=await tx.get(doc(db,'tickets',user.uid));
  if(ticket.exists()&&['waiting','called','missed'].includes(ticket.data().status))throw Error('Ask staff to complete or cancel your active visit before deleting your account.');
  tx.delete(doc(db,'users',user.uid));tx.delete(doc(db,'patients',user.uid));tx.delete(doc(db,'caregiverShares',user.uid));
 });
 try{await deleteUser(user);}catch{throw Error('Your private profile was removed, but your login could not be deleted. Check your connection and retry account deletion with the same credentials.');}
}
