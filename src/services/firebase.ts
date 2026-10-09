import {initializeApp,getApps} from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {getAuth,initializeAuth,signOut,onAuthStateChanged,type User,type Persistence} from 'firebase/auth';
import {resetAccountPassword,changeAccountPassword,type RegistrationFields} from './authentication';
import {registerWithProfile,signInWithProfile,ensureUserProfile,saveUserProfileName} from './user-profile';
import {getFirestore,doc,onSnapshot,runTransaction,setDoc,serverTimestamp,collection,query,where} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import type {AppState,Role} from '../data/types';
import {applyCommand,aheadOf,validate,preferenceData,type Command} from './domain';
export {accountError,verifyAccountEmail,reloadAccount} from './authentication';
const config={apiKey:process.env.EXPO_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.EXPO_PUBLIC_FIREBASE_APP_ID};
export const liveMode=process.env.EXPO_PUBLIC_DATA_MODE==='firebase';
export const configured=Boolean(config.apiKey&&config.projectId&&config.appId);
export const app=configured?(getApps()[0]||initializeApp(config)):null;
// Firebase publishes the React Native implementation through Metro's platform
// condition; its web declarations omit this native-only export.
const nativePersistence=(FirebaseAuth as unknown as {getReactNativePersistence:(storage:typeof AsyncStorage)=>Persistence}).getReactNativePersistence;
function initializePersistentAuth(){if(!app)return null;if(Platform.OS==='web')return getAuth(app);try{return initializeAuth(app,{persistence:nativePersistence(AsyncStorage)});}catch{return getAuth(app);}}
export const auth=initializePersistentAuth();
export const db=app?getFirestore(app):null;
export function watchAuth(callback:(user:User|null)=>void){if(auth)return onAuthStateChanged(auth,callback);callback(null);return ()=>{};}
function requireAccountAuth(){if(!auth)throw Error('Firebase configuration is missing.');return auth;}
function requireDatabase(){if(!db)throw Error('Database unavailable.');return db;}
export const login=(email:string,password:string)=>signInWithProfile(requireAccountAuth(),requireDatabase(),email,password);
export const register=(fields:RegistrationFields)=>registerWithProfile(requireAccountAuth(),requireDatabase(),fields);
export const loadUserProfile=(user:User)=>ensureUserProfile(requireDatabase(),user);
export const renameAccount=(user:User,name:string)=>saveUserProfileName(requireDatabase(),user,name);
export const resetPassword=(email:string)=>resetAccountPassword(requireAccountAuth(),email);
export const changePassword=(user:User,current:string,password:string,confirm:string)=>changeAccountPassword(requireAccountAuth(),user,current,password,confirm);
export async function logout(){if(auth)await signOut(auth);}
export async function accountRole(user:User):Promise<Role>{const {claims}=await user.getIdTokenResult();return claims.role==='admin'?'admin':claims.role==='staff'?'staff':'patient';}
export function subscribeLive(user:User,role:Role,callback:(data:Partial<AppState>)=>void,error:(message:string)=>void){
 if(!db)return ()=>{};const unsubs:(()=>void)[]=[];
 unsubs.push(onSnapshot(doc(db,'services','general-opd'),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'patients',user.uid),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'recoveryRequests',user.uid),s=>{if(s.exists())callback({recovery:s.data().status==='pending'?'pending':s.data().status==='approved'?'approved':s.data().status==='rejected'?'rejected':'none'});},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'tickets',user.uid),s=>{if(s.exists())callback({myToken:s.data().token,recovery:s.data().recovery||'none',patientsAhead:s.data().patientsAhead,patientName:s.data().patientName,ticketStatus:s.data().status});},e=>error(e.message)));
 unsubs.push(onSnapshot(query(collection(db,'caregiverShares'),where('caregiverId','==',user.uid)),s=>callback({sharedVisits:s.docs.map(d=>({id:d.id,token:d.data().token,status:d.data().status,patientsAhead:d.data().patientsAhead}))}),e=>error(e.message)));
 if(role!=='patient'){unsubs.push(onSnapshot(collection(db,'recoveryRequests'),s=>callback({recoveryRequests:s.docs.map(d=>({...d.data(),patientId:d.id}))} as Partial<AppState>),e=>error(e.message)));}
 if(role!=='patient')unsubs.push(onSnapshot(doc(db,'operations','current'),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 return ()=>unsubs.forEach(u=>u());
}
export async function savePreferences(user:User,data:Pick<AppState,'sms'|'appAlerts'|'language'|'largeText'>){if(!db)throw Error('Database unavailable.');await setDoc(doc(db,'patients',user.uid),preferenceData(data),{merge:true});}
export async function liveCommand(user:User,state:AppState,command:Command,fields:Record<string,string>,eventId:string):Promise<void>{
 if(!db)throw Error('Database unavailable.');const database=db;validate(command,fields,state.role);
 if(command==='preferences'){await savePreferences(user,state);return;}
 if(command==='caregiver'||command==='revokeCaregiver'){
  const next=applyCommand(state,command,fields),accountId=next.caregiver?.accountId;
  if(accountId&&(accountId.includes('/')||accountId===user.uid))throw Error('Enter a different caregiver account ID.');
  await runTransaction(database,async tx=>{
   const shareRef=doc(database,'caregiverShares',user.uid),ticket=await tx.get(doc(database,'tickets',user.uid));
   if(accountId&&!ticket.exists())throw Error('Link your issued token before sharing a visit.');
   tx.set(doc(database,'patients',user.uid),{caregiver:next.caregiver||null},{merge:true});
   if(accountId&&ticket.exists())tx.set(shareRef,{caregiverId:accountId,token:ticket.data().token,status:ticket.data().status||'waiting',patientsAhead:ticket.data().patientsAhead||0});
   else tx.delete(shareRef);
  });return;
 }
 if(command==='requestRecovery'){if(state.myToken==='—')throw Error('Ask the registration counter to link your issued token to your account.');await setDoc(doc(database,'recoveryRequests',user.uid),{patientId:user.uid,token:state.myToken,status:'pending',requestedAt:serverTimestamp()});return;}
 if(state.role==='patient')throw Error('An authorized staff account is required.');
 await runTransaction(database,async tx=>{
  const opRef=doc(database,'operations','current'),op=await tx.get(opRef);
  if(!op.exists())throw Error('An administrator must initialize the service before staff can make changes.');
  const current={...state,...op.data(),offlineActions:state.offlineActions,role:state.role} as AppState;
  const deciding=command==='approveRecovery'||command==='rejectRecovery';
  const patientId=deciding?(fields['Patient ID']||state.recoveryRequests?.find(r=>r.status==='pending')?.patientId):undefined;
  let commandFields=fields;
  if(deciding){
   if(!patientId)throw Error('Select the verified recovery request first.');
   const request=await tx.get(doc(database,'recoveryRequests',patientId));
   if(!request.exists()||request.data().status!=='pending')throw Error('This request is no longer pending.');
   commandFields={...fields,'Token':request.data().token,'Patient ID':patientId};
  }
  const shares=new Map<string,string>();
  for(const record of current.queue.filter(q=>q.accountLinked)){const share=await tx.get(doc(database,'caregiverShares',record.patientId));if(share.exists())shares.set(record.patientId,share.data().caregiverId);}
  if(command==='reconcile')for(const pending of state.offlineActions){if(!current.audit.some(e=>e.id===pending.id)){current.audit.unshift({id:pending.id,action:'manualRecord',detail:pending.action,at:pending.at,role:state.role});tx.set(doc(database,'audit',pending.id),{id:pending.id,action:'manualRecord',detail:pending.action,at:pending.at,role:state.role});}}
  const next=applyCommand(current,command,commandFields,new Date().toISOString(),eventId);
  const operations={queue:next.queue,audit:next.audit.slice(0,100),broadcasts:next.broadcasts,offlineActions:next.offlineActions,incidentVerified:next.incidentVerified,nowServing:next.nowServing,serviceStatus:next.serviceStatus,updatedAt:next.updatedAt};
  tx.set(opRef,operations);
  const event=next.audit.find(e=>e.id===eventId);if(event&&!current.audit.some(e=>e.id===eventId))tx.set(doc(database,'audit',eventId),event);
  for(const q of next.queue){if(q.accountLinked)tx.set(doc(database,'tickets',q.patientId),{token:q.token,patientName:q.patientName,patientsAhead:aheadOf(next.queue,q.token),status:q.status},{merge:true});}
  for(const record of next.queue){const caregiverId=shares.get(record.patientId);if(caregiverId)tx.set(doc(database,'caregiverShares',record.patientId),{caregiverId,token:record.token,status:record.status,patientsAhead:aheadOf(next.queue,record.token)});}
  tx.set(doc(database,'services','general-opd'),{nowServing:next.nowServing,serviceStatus:next.serviceStatus,updatedAt:next.updatedAt,broadcasts:next.broadcasts});
  if(deciding&&patientId){const status=command==='approveRecovery'?'approved':'rejected';tx.update(doc(database,'recoveryRequests',patientId),{status});tx.set(doc(database,'tickets',patientId),{recovery:status},{merge:true});}
 });
}

export async function initializeService(){if(!db)throw Error('Database unavailable.');await runTransaction(db,async tx=>{const ref=doc(db!,'operations','current');const existing=await tx.get(ref);if(existing.exists())return;const data={queue:[],audit:[],broadcasts:[],offlineActions:[],incidentVerified:false,nowServing:'—',serviceStatus:'open',updatedAt:new Date().toISOString()};tx.set(ref,data);tx.set(doc(db!,'services','general-opd'),{nowServing:'—',serviceStatus:'open',updatedAt:data.updatedAt,broadcasts:[]});});}
export async function linkTicket(uid:string,token:string){
 if(!db)throw Error('Database unavailable.');const database=db;uid=uid.trim();token=token.toUpperCase().trim();
 if(!uid||uid.includes('/'))throw Error('Enter the patient account ID.');
 await runTransaction(database,async tx=>{
  const opRef=doc(database,'operations','current'),op=await tx.get(opRef);
  if(!op.exists())throw Error('Initialize General OPD first.');
  const queue=op.data().queue as AppState['queue']||[],record=queue.find(q=>q.token===token);
  if(!record)throw Error('Register this patient before linking a token.');
  if(record.accountLinked&&record.patientId!==uid)throw Error('This token already belongs to another account.');
  if(queue.some(q=>q.accountLinked&&q.patientId===uid&&q.token!==token&&['waiting','called','missed'].includes(q.status)))throw Error('This account already has an active visit.');
  const ticketRef=doc(database,'tickets',uid),oldTicket=await tx.get(ticketRef);
  if(oldTicket.exists()&&oldTicket.data().token!==token)tx.delete(doc(database,'caregiverShares',uid));
  record.patientId=uid;record.accountLinked=true;tx.update(opRef,{queue});
  tx.set(ticketRef,{token:record.token,patientName:record.patientName,status:record.status,recovery:'none',patientsAhead:aheadOf(queue,record.token)});
 });
}
