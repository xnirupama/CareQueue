import {doc,runTransaction,serverTimestamp,setDoc,deleteField,type Firestore} from 'firebase/firestore';
import type {AppState} from '../data/types';
import {applyCommand,preferenceData,type Command} from './domain';
import {patientFormErrors,requireValidFields} from './patient-validation';

/** SDK-only persistence shared by the app and emulator integration tests. */
export async function savePatientSettings(db:Firestore,uid:string,state:AppState){
 const settings=preferenceData(state);
 await setDoc(doc(db,'patients',uid),settings,{merge:true});
}
export async function runPatientCommand(db:Firestore,uid:string,state:AppState,command:Command,fields:Record<string,string>){
 requireValidFields(patientFormErrors(command,fields,uid));
 const next=applyCommand(state,command,fields);
 if(command==='preferences')return savePatientSettings(db,uid,state);
 if(command==='resetPreferences'){
  await runTransaction(db,async tx=>{const ref=doc(db,'patients',uid),saved=await tx.get(ref);if(saved.data()?.caregiver)tx.set(ref,{caregiver:saved.data()!.caregiver});else tx.delete(ref);});return;
 }
 if(command==='caregiver'||command==='revokeCaregiver'){
  const accountId=next.caregiver?.accountId;
  await runTransaction(db,async tx=>{
   const ref=doc(db,'patients',uid),share=doc(db,'caregiverShares',uid),ticket=await tx.get(doc(db,'tickets',uid));
   if(accountId&&(!ticket.exists()||ticket.data().token!==state.myToken||!['waiting','called','missed'].includes(ticket.data().status)))throw Error('Link your active issued token before sharing a visit.');
   tx.set(ref,{caregiver:next.caregiver||deleteField()},{merge:true});
   if(accountId&&ticket.exists())tx.set(share,{caregiverId:accountId,token:ticket.data().token,status:ticket.data().status,patientsAhead:ticket.data().patientsAhead||0});else tx.delete(share);
  });return;
 }
 if(['requestRecovery','editRecovery','cancelRecovery'].includes(command)){
  await runTransaction(db,async tx=>{
   const ref=doc(db,'recoveryRequests',uid),request=await tx.get(ref),ticket=await tx.get(doc(db,'tickets',uid));
   if(command==='cancelRecovery'){
    if(request.data()?.status!=='pending')throw Error('Only a pending request can be withdrawn.');
    if(request.data()?.token!==state.myToken||ticket.data()?.token!==state.myToken)throw Error('Your visit changed. Refresh before withdrawing this request.');
    tx.delete(ref);return;
   }
   if(!ticket.exists()||ticket.data().token!==state.myToken||ticket.data().status!=='missed')throw Error('Recovery requires your current missed-turn ticket.');
   if(command==='editRecovery'){
    if(request.data()?.status!=='pending'||request.data()?.token!==ticket.data().token)throw Error('Only your current pending request can be edited.');
    tx.update(ref,{reason:fields['Reason'].trim(),updatedAt:serverTimestamp()});
   }else{
    if(request.data()?.status==='pending')throw Error('Edit or withdraw your pending request.');
    tx.set(ref,{patientId:uid,token:ticket.data().token,status:'pending',reason:fields['Reason'].trim(),requestedAt:serverTimestamp(),updatedAt:serverTimestamp()});
   }
  });return;
 }
 throw Error('Unknown patient action.');
}
