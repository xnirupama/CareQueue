import {collection,doc,query,where,onSnapshot,addDoc,updateDoc,deleteDoc,runTransaction,serverTimestamp,type Firestore,type Timestamp} from 'firebase/firestore';
import type {Role} from '../data/types';
import {supportMessageError} from './patient-validation';
export const supportCategories=['Queue help','Directions','Accessibility','Other'] as const;
export interface SupportRequest {id:string;ownerId:string;ownerName:string;category:string;message:string;status:'open'|'resolved';response:string;createdAt?:Timestamp;updatedAt?:Timestamp;}
export function supportFields(category:string,message:string){
 if(!supportCategories.includes(category as typeof supportCategories[number]))throw Error('Choose a support category.');
 const error=supportMessageError(message);if(error)throw Error(error);
 return {category,message:message.trim()};
}
export function watchSupport(db:Firestore,uid:string,role:Role,callback:(rows:SupportRequest[])=>void,error:(message:string)=>void){
 const source=role==='patient'?query(collection(db,'supportRequests'),where('ownerId','==',uid)):collection(db,'supportRequests');
 return onSnapshot(source,snap=>callback(snap.docs.map(d=>({...d.data(),id:d.id} as SupportRequest)).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))),e=>error(e.message));
}
export async function createSupport(db:Firestore,uid:string,name:string,category:string,message:string){
 const fields=supportFields(category,message);
 return addDoc(collection(db,'supportRequests'),{ownerId:uid,ownerName:name.trim().slice(0,80)||'Patient',...fields,status:'open',response:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export async function editSupport(db:Firestore,id:string,category:string,message:string){
 const fields=supportFields(category,message);
 await runTransaction(db,async tx=>{
  const ref=doc(db,'supportRequests',id),saved=await tx.get(ref);
  if(!saved.exists())throw Error('This support request was deleted. Create a new request.');
  if(saved.data().status!=='open')throw Error('This support request is resolved. Create a new request for further help.');
  tx.update(ref,{...fields,updatedAt:serverTimestamp()});
 });
}
export async function answerSupport(db:Firestore,id:string,response:string,status:'open'|'resolved'){
 if(!response.trim()||response.trim().length>1000)throw Error('Enter a reply between 1 and 1,000 characters.');
 if(!['open','resolved'].includes(status))throw Error('Choose a valid support status.');
 await updateDoc(doc(db,'supportRequests',id),{response:response.trim(),status,updatedAt:serverTimestamp()});
}
export async function deleteSupport(db:Firestore,id:string){await deleteDoc(doc(db,'supportRequests',id));}
