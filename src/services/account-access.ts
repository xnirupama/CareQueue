import {doc,getDoc,runTransaction,serverTimestamp,collection,query,where,onSnapshot,type Firestore} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import type {Role} from '../data/types';
import type {UserProfile} from './user-profile';

export type LoginPortal='patient'|'staff'|'admin';
export const portalPath=(portal:LoginPortal)=>portal==='admin'?'/admin-login':portal==='staff'?'/staff-login':'/patient-login';
export function claimRole(claims:Record<string,unknown>):Role{return claims.role==='admin'?'admin':claims.role==='staff'?'staff':'patient';}
export function accountPortal(role:Role,profile?:Pick<UserProfile,'accountType'>):LoginPortal{
 return role==='admin'?'admin':role==='staff'||profile?.accountType==='staff'?'staff':'patient';
}
export function validatePortal(role:Role,portal:LoginPortal,profile?:Pick<UserProfile,'accountType'>){
 const expected=accountPortal(role,profile);
 if(portal===expected)return;
 if(portal==='admin')throw Error('An administrator account is required. Choose the sign-in page for your account.');
 throw Error(`Use ${expected==='admin'?'Administrator':expected==='staff'?'Staff':'Patient'} sign in for this account.`);
}
export async function resolveAccountRole(db:Firestore,user:User,refresh=false):Promise<Role>{
 const role=claimRole((await user.getIdTokenResult(refresh)).claims);
 if(role==='admin')return role;
 const approval=await getDoc(doc(db,'staffAccess',user.uid));
 // A retained suspension/revocation overrides legacy staff claims as well.
 return approval.exists()?(approval.data().approved===true?'staff':'patient'):role;
}
export interface StaffApplicant extends UserProfile {id:string;}
export function watchStaffApplicants(db:Firestore,callback:(applicants:StaffApplicant[])=>void,error:(message:string)=>void){
 return onSnapshot(query(collection(db,'users'),where('accountType','==','staff')),snapshot=>callback(snapshot.docs.map(d=>({...d.data(),id:d.id} as StaffApplicant))),e=>error(e.message));
}
export async function approveStaffAccount(db:Firestore,admin:User,uid:string){
 if(claimRole((await admin.getIdTokenResult(true)).claims)!=='admin')throw Error('Administrator access is required.');
 if(!uid||uid.includes('/'))throw Error('Choose a valid staff account.');
 await runTransaction(db,async tx=>{
  const profile=await tx.get(doc(db,'users',uid));
  if(!profile.exists()||profile.data().accountType!=='staff')throw Error('This account has not registered as staff.');
  tx.set(doc(db,'staffAccess',uid),{uid,approved:true,status:'active',approvedBy:admin.uid,updatedAt:serverTimestamp()});
 });
}
export type StaffAccessStatus='active'|'suspended'|'revoked';
export async function changeStaffAccess(db:Firestore,admin:User,uid:string,status:Exclude<StaffAccessStatus,'active'>){
 if(claimRole((await admin.getIdTokenResult(true)).claims)!=='admin')throw Error('Administrator access is required.');
 if(!uid||uid.includes('/')||uid===admin.uid)throw Error('Choose another staff account.');
 if(!['suspended','revoked'].includes(status))throw Error('Choose a valid access change.');
 await runTransaction(db,async tx=>{
  const ref=doc(db,'staffAccess',uid),approval=await tx.get(ref);
  if(!approval.exists()||approval.data().approved!==true)throw Error('This staff account has no active approval.');
  // Retain the denial so removing access cannot reactivate an old staff claim.
  tx.set(ref,{uid,approved:false,status,approvedBy:admin.uid,updatedAt:serverTimestamp()});
 });
}
