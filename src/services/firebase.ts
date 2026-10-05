import {initializeApp,getApps} from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {getAuth,initializeAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,onAuthStateChanged,type User,type Persistence} from 'firebase/auth';
import {getFirestore,doc,onSnapshot,runTransaction,setDoc,serverTimestamp,collection} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import type {AppState,Role} from '../data/types';
import {applyCommand,type Command} from './domain';
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
export function watchAuth(callback:(user:User|null)=>void){return auth?onAuthStateChanged(auth,callback):()=>{};}
export async function login(email:string,password:string,register=false){if(!auth)throw Error('Firebase configuration is missing.');return register?createUserWithEmailAndPassword(auth,email.trim(),password):signInWithEmailAndPassword(auth,email.trim(),password);}
export async function logout(){if(auth)await signOut(auth);}
export async function accountRole(user:User):Promise<Role>{const {claims}=await user.getIdTokenResult();return claims.role==='admin'?'admin':claims.role==='staff'?'staff':'patient';}
export function subscribeLive(user:User,role:Role,callback:(data:Partial<AppState>)=>void,error:(message:string)=>void){
 if(!db)return ()=>{};const unsubs:(()=>void)[]=[];
 unsubs.push(onSnapshot(doc(db,'services','general-opd'),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'patients',user.uid),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'recoveryRequests',user.uid),s=>{if(s.exists())callback({recovery:s.data().status==='pending'?'pending':s.data().status==='approved'?'approved':'none'});},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'tickets',user.uid),s=>{if(s.exists())callback({myToken:s.data().token,recovery:s.data().recovery||'none',patientsAhead:s.data().patientsAhead,patientName:s.data().patientName});},e=>error(e.message)));
 if(role!=='patient'){unsubs.push(onSnapshot(collection(db,'recoveryRequests'),s=>callback({recoveryRequests:s.docs.map(d=>({...d.data(),patientId:d.id}))} as Partial<AppState>),e=>error(e.message)));}
 if(role!=='patient')unsubs.push(onSnapshot(doc(db,'operations','current'),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 return ()=>unsubs.forEach(u=>u());
}
export async function savePreferences(user:User,data:Pick<AppState,'sms'|'appAlerts'|'language'|'largeText'>){if(!db)throw Error('Database unavailable.');await setDoc(doc(db,'patients',user.uid),data,{merge:true});}
export async function liveCommand(user:User,state:AppState,command:Command,fields:Record<string,string>,eventId:string):Promise<void>{
 if(!db)throw Error('Database unavailable.');const database=db;
 if(command==='preferences'){await savePreferences(user,state);return;}
 if(command==='caregiver'||command==='revokeCaregiver'){const next=applyCommand(state,command,fields);await setDoc(doc(database,'patients',user.uid),{caregiver:next.caregiver||null},{merge:true});return;}
 if(command==='requestRecovery'){if(state.myToken==='—')throw Error('Ask the registration counter to link your issued token to your account.');await setDoc(doc(database,'recoveryRequests',user.uid),{patientId:user.uid,token:state.myToken,status:'pending',requestedAt:serverTimestamp()});return;}
 if(state.role==='patient')throw Error('An authorized staff account is required.');
 await runTransaction(database,async tx=>{
  const opRef=doc(database,'operations','current'),op=await tx.get(opRef);
  if(!op.exists())throw Error('An administrator must initialize the service before staff can make changes.');
  const current={...state,...op.data(),offlineActions:state.offlineActions,role:state.role} as AppState;
  if(command==='reconcile')for(const pending of state.offlineActions){if(!current.audit.some(e=>e.id===pending.id)){current.audit.unshift({id:pending.id,action:'manualRecord',detail:pending.action,at:pending.at,role:state.role});tx.set(doc(database,'audit',pending.id),{id:pending.id,action:'manualRecord',detail:pending.action,at:pending.at,role:state.role});}}
  const next=applyCommand(current,command,fields,new Date().toISOString(),eventId);
  const operations={queue:next.queue,audit:next.audit.slice(0,100),broadcasts:next.broadcasts,offlineActions:next.offlineActions,incidentVerified:next.incidentVerified,nowServing:next.nowServing,serviceStatus:next.serviceStatus,updatedAt:next.updatedAt};
  tx.set(opRef,operations);
  const event=next.audit.find(e=>e.id===eventId);if(event&&!current.audit.some(e=>e.id===eventId))tx.set(doc(database,'audit',eventId),event);
  for(const q of next.queue){if(q.accountLinked)tx.set(doc(database,'tickets',q.patientId),{token:q.token,patientName:q.patientName,patientsAhead:next.queue.filter(p=>['called','waiting'].includes(p.status)&&Number(p.token.slice(1))<Number(q.token.slice(1))).length},{merge:true});}
  tx.set(doc(database,'services','general-opd'),{nowServing:next.nowServing,serviceStatus:next.serviceStatus,updatedAt:next.updatedAt,broadcasts:next.broadcasts});
  if(command==='approveRecovery'){const patientId=fields['Patient ID']||state.recoveryRequests?.find(r=>r.status==='pending')?.patientId;if(!patientId)throw Error('Select the verified recovery request first.');tx.update(doc(database,'recoveryRequests',patientId),{status:'approved'});tx.update(doc(database,'tickets',patientId),{recovery:'approved'});}
 });
}

export async function initializeService(){if(!db)throw Error('Database unavailable.');await runTransaction(db,async tx=>{const ref=doc(db!,'operations','current');const existing=await tx.get(ref);if(existing.exists())return;const data={queue:[],audit:[],broadcasts:[],offlineActions:[],incidentVerified:false,nowServing:'—',serviceStatus:'open',updatedAt:new Date().toISOString()};tx.set(ref,data);tx.set(doc(db!,'services','general-opd'),{nowServing:'—',serviceStatus:'open',updatedAt:data.updatedAt,broadcasts:[]});});}
export async function linkTicket(uid:string,token:string){if(!db)throw Error('Database unavailable.');await runTransaction(db,async tx=>{const opRef=doc(db!,'operations','current'),op=await tx.get(opRef);const queue=op.data()?.queue as AppState['queue']||[];const record=queue.find(q=>q.token===token.toUpperCase().trim());if(!record)throw Error('Register this patient before linking a token.');if(!uid.trim()||uid.includes('/'))throw Error('Enter the patient account ID.');record.patientId=uid.trim();record.accountLinked=true;tx.update(opRef,{queue});tx.set(doc(db!,'tickets',uid.trim()),{token:record.token,patientName:record.patientName,recovery:'none',patientsAhead:queue.filter(q=>['called','waiting'].includes(q.status)&&Number(q.token.slice(1))<Number(record.token.slice(1))).length});});}
