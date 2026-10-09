import {doc,getDoc,runTransaction,serverTimestamp,collection,query,where,onSnapshot,type Firestore} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import type {Role} from '../data/types';
import type {UserProfile} from './user-profile';

export type LoginPortal='standard'|'admin';
export function claimRole(claims:Record<string,unknown>):Role{return claims.role==='admin'?'admin':claims.role==='staff'?'staff':'patient';}
export function validatePortal(role:Role,portal:LoginPortal){
 if(portal==='admin'&&role!=='admin')throw Error('An administrator account is required. Use patient or staff sign in for this account.');
 if(portal==='standard'&&role==='admin')throw Error('Use Administrator sign in for this account.');
}
export async function resolveAccountRole(db:Firestore,user:User,refresh=false):Promise<Role>{
 const role=claimRole((await user.getIdTokenResult(refresh)).claims);
 if(role!=='patient')return role;
 const approval=await getDoc(doc(db,'staffAccess',user.uid));
 return approval.exists()&&approval.data().approved===true?'staff':'patient';
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
  tx.set(doc(db,'staffAccess',uid),{uid,approved:true,approvedBy:admin.uid,updatedAt:serverTimestamp()});
 });
}
