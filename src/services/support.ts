import {collection,doc,query,where,onSnapshot,addDoc,updateDoc,deleteDoc,serverTimestamp,type Firestore,type Timestamp} from 'firebase/firestore';
import type {Role} from '../data/types';
export const supportCategories=['Queue help','Directions','Accessibility','Other'] as const;
export interface SupportRequest {id:string;ownerId:string;ownerName:string;category:string;message:string;status:'open'|'resolved';response:string;createdAt?:Timestamp;updatedAt?:Timestamp;}
export function supportFields(category:string,message:string){
 if(!supportCategories.includes(category as typeof supportCategories[number]))throw Error('Choose a support category.');
 if(!message.trim()||message.trim().length>1000)throw Error('Enter a support message between 1 and 1,000 characters.');
 return {category,message:message.trim()};
}
export function watchSupport(db:Firestore,uid:string,role:Role,callback:(rows:SupportRequest[])=>void,error:(message:string)=>void){
 const source=role==='patient'?query(collection(db,'supportRequests'),where('ownerId','==',uid)):collection(db,'supportRequests');
 return onSnapshot(source,snap=>callback(snap.docs.map(d=>({...d.data(),id:d.id} as SupportRequest)).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))),e=>error(e.message));
}
export async function createSupport(db:Firestore,uid:string,name:string,category:string,message:string){
 return addDoc(collection(db,'supportRequests'),{ownerId:uid,ownerName:name.trim().slice(0,80)||'Patient',...supportFields(category,message),status:'open',response:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export async function editSupport(db:Firestore,id:string,category:string,message:string){await updateDoc(doc(db,'supportRequests',id),{...supportFields(category,message),updatedAt:serverTimestamp()});}
export async function answerSupport(db:Firestore,id:string,response:string,status:'open'|'resolved'){
 if(!response.trim()||response.trim().length>1000)throw Error('Enter a reply between 1 and 1,000 characters.');
 if(!['open','resolved'].includes(status))throw Error('Choose a valid support status.');
 await updateDoc(doc(db,'supportRequests',id),{response:response.trim(),status,updatedAt:serverTimestamp()});
}
export async function deleteSupport(db:Firestore,id:string){await deleteDoc(doc(db,'supportRequests',id));}
