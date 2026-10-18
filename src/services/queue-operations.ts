import {doc,runTransaction,type Firestore} from 'firebase/firestore';
import type {AppState,RecoveryRequest} from '../data/types';
import {applyCommand,aheadOf,issuedSequence,type Command} from './domain';

export async function runOperationalCommand(db:Firestore,state:AppState,command:Command,fields:Record<string,string>,eventId:string){
 if(state.role==='patient')throw Error('An authorized staff account is required.');
 await runTransaction(db,async tx=>{
  const opRef=doc(db,'operations','current'),op=await tx.get(opRef);
  if(!op.exists())throw Error('An administrator must initialize General OPD first.');
  const current={...state,...op.data(),offlineActions:state.offlineActions,role:state.role} as AppState;
  // The server snapshot owns queue data; local drafts never replace it.
  const deciding=['approveRecovery','rejectRecovery','deleteRecovery'].includes(command);
  let patientId=deciding?(fields['Patient ID']||state.recoveryRequests?.find(r=>r.status==='pending')?.patientId):undefined;
  let commandFields=fields;
  if(deciding){
   if(!patientId)throw Error('Select a recovery request first.');
   const request=await tx.get(doc(db,'recoveryRequests',patientId));
   if(!request.exists())throw Error('Recovery request not found.');
   if(command!=='deleteRecovery'&&request.data().status!=='pending')throw Error('This request is no longer pending.');
   current.recoveryRequests=[{...request.data(),patientId} as RecoveryRequest];
   commandFields={...fields,'Token':request.data().token,'Patient ID':patientId};
  }
  const deleted=command==='deletePatient'?current.queue.find(q=>q.token===fields['Token']):undefined;
  let deleteLinkedTicket=false,deleteLinkedRecovery=false;
  if(deleted?.accountLinked){
   const ticket=await tx.get(doc(db,'tickets',deleted.patientId)),recovery=await tx.get(doc(db,'recoveryRequests',deleted.patientId));
   if(recovery.exists()&&recovery.data().token===deleted.token&&recovery.data().status==='pending')throw Error('Resolve the pending recovery request before deleting this registration.');
   deleteLinkedTicket=ticket.exists()&&ticket.data().token===deleted.token;
   deleteLinkedRecovery=recovery.exists()&&recovery.data().token===deleted.token;
  }
  // At most one current ticket per account. Historical visits cannot overwrite it.
  const latest=new Map(current.queue.filter(q=>q.accountLinked).map(q=>[q.patientId,q]));
  const shares=new Map<string,string>();
  for(const uid of latest.keys()){const share=await tx.get(doc(db,'caregiverShares',uid));if(share.exists())shares.set(uid,share.data().caregiverId);}
  if(command==='reconcile')for(const note of state.offlineActions)if(!current.audit.some(e=>e.id===note.id))current.audit.unshift({id:note.id,action:'manualRecord',detail:note.action,at:note.at,role:state.role});
  const next=applyCommand(current,command,commandFields,new Date().toISOString(),eventId);
  if(deleteLinkedTicket&&deleted)next.queue.filter(q=>q.patientId===deleted.patientId).forEach(q=>{q.accountLinked=false;});
  const operations={lastIssuedNumber:issuedSequence(next),queue:next.queue,audit:next.audit.slice(0,100),broadcasts:next.broadcasts,offlineActions:[],incidentVerified:next.incidentVerified,nowServing:next.nowServing,serviceStatus:next.serviceStatus,updatedAt:next.updatedAt};
  tx.set(opRef,operations);
  if(command==='reconcile')for(const note of state.offlineActions)if(!((op.data().audit||[]) as AppState['audit']).some(e=>e.id===note.id))tx.set(doc(db,'audit',note.id),{id:note.id,action:'manualRecord',detail:note.action,at:note.at,role:state.role});
  const event=next.audit.find(e=>e.id===eventId);if(event&&!current.audit.some(e=>e.id===eventId))tx.set(doc(db,'audit',eventId),event);
  const nextLatest=new Map(next.queue.filter(q=>q.accountLinked).map(q=>[q.patientId,q]));
  for(const [uid,q] of nextLatest){
   // If the latest visit was deleted, do not restore an older completed ticket.
   if(deleteLinkedTicket&&deleted?.patientId===uid)continue;
   const ticket={token:q.token,patientName:q.patientName,patientsAhead:aheadOf(next.queue,q.token),status:q.status};
   tx.set(doc(db,'tickets',uid),ticket,{merge:true});
   const caregiverId=shares.get(uid);if(caregiverId)tx.set(doc(db,'caregiverShares',uid),{caregiverId,token:q.token,status:q.status,patientsAhead:ticket.patientsAhead});
  }
  if(deleted?.accountLinked){
   if(deleteLinkedTicket){tx.delete(doc(db,'tickets',deleted.patientId));tx.delete(doc(db,'caregiverShares',deleted.patientId));}
   if(deleteLinkedRecovery)tx.delete(doc(db,'recoveryRequests',deleted.patientId));
  }
  tx.set(doc(db,'services','general-opd'),{nowServing:next.nowServing,serviceStatus:next.serviceStatus,updatedAt:next.updatedAt,broadcasts:next.broadcasts});
  if(deciding&&patientId){
   if(command==='deleteRecovery')tx.delete(doc(db,'recoveryRequests',patientId));
   else tx.update(doc(db,'recoveryRequests',patientId),{status:command==='approveRecovery'?'approved':'rejected'});
  }
 });
}
