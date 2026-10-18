import {initializeApp,getApps} from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {getAuth,initializeAuth,signOut,onAuthStateChanged,type User,type Persistence} from 'firebase/auth';
import {resetAccountPassword,changeAccountPassword,type RegistrationFields} from './authentication';
import {registerWithProfile,signInWithProfile,ensureUserProfile,saveUserProfileName} from './user-profile';
import {resolveAccountRole,type LoginPortal} from './account-access';
import {getFirestore,doc,onSnapshot,runTransaction,collection,query,where} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import type {AppState,Role,RecoveryRequest} from '../data/types';
import {aheadOf,validate,personalCommands,type Command} from './domain';
import {runPatientCommand,savePatientSettings} from './patient-records';
import {runOperationalCommand} from './queue-operations';
export {deletePatientAccount} from './user-profile';
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
export const login=(email:string,password:string,portal:LoginPortal='patient')=>signInWithProfile(requireAccountAuth(),requireDatabase(),email,password,portal);
export const register=(fields:RegistrationFields)=>registerWithProfile(requireAccountAuth(),requireDatabase(),fields);
export const loadUserProfile=(user:User,portal?:LoginPortal)=>ensureUserProfile(requireDatabase(),user,undefined,portal==='staff'?'staff':undefined);
export const renameAccount=(user:User,name:string)=>saveUserProfileName(requireDatabase(),user,name);
export const resetPassword=(email:string)=>resetAccountPassword(requireAccountAuth(),email);
export const changePassword=(user:User,current:string,password:string,confirm:string)=>changeAccountPassword(requireAccountAuth(),user,current,password,confirm);
export async function logout(){if(auth)await signOut(auth);}
export async function accountRole(user:User):Promise<Role>{return resolveAccountRole(requireDatabase(),user);}
export function subscribeLive(user:User,role:Role,callback:(data:Partial<AppState>)=>void,error:(message:string)=>void){
 if(!db)return ()=>{};const unsubs:(()=>void)[]=[];
 unsubs.push(onSnapshot(doc(db,'services','general-opd'),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'patients',user.uid),s=>{const data=s.data()||{};callback({sms:data.sms??true,appAlerts:data.appAlerts??true,language:data.language||'en',largeText:data.largeText??false,caregiver:data.caregiver||undefined,preferencesSaved:['sms','appAlerts','language','largeText'].some(k=>k in data)});},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'recoveryRequests',user.uid),s=>{const item=s.exists()?s.data() as RecoveryRequest:undefined;callback({ownRecovery:item,recovery:item?.status||'none'});},e=>error(e.message)));
 unsubs.push(onSnapshot(doc(db,'tickets',user.uid),s=>{if(s.exists())callback({myToken:s.data().token,patientsAhead:s.data().patientsAhead,patientName:s.data().patientName,ticketStatus:s.data().status});else callback({myToken:'?',patientsAhead:0,ticketStatus:undefined});},e=>error(e.message)));
 unsubs.push(onSnapshot(query(collection(db,'caregiverShares'),where('caregiverId','==',user.uid)),s=>callback({sharedVisits:s.docs.map(d=>({id:d.id,token:d.data().token,status:d.data().status,patientsAhead:d.data().patientsAhead}))}),e=>error(e.message)));
 if(role!=='patient'){unsubs.push(onSnapshot(collection(db,'recoveryRequests'),s=>callback({recoveryRequests:s.docs.map(d=>({...d.data(),patientId:d.id}))} as Partial<AppState>),e=>error(e.message)));}
 if(role!=='patient')unsubs.push(onSnapshot(doc(db,'operations','current'),s=>{if(s.exists())callback(s.data() as Partial<AppState>);},e=>error(e.message)));
 return ()=>unsubs.forEach(u=>u());
}
export async function savePreferences(user:User,data:AppState){await savePatientSettings(requireDatabase(),user.uid,data);}
export async function liveCommand(user:User,state:AppState,command:Command,fields:Record<string,string>,eventId:string):Promise<void>{
 const database=requireDatabase();validate(command,fields,state.role);
 if(personalCommands.has(command))return runPatientCommand(database,user.uid,state,command,fields);
 return runOperationalCommand(database,state,command,fields,eventId);
}
export function watchOwnStaffAccess(user:User,callback:()=>void){if(!db)return()=>{};return onSnapshot(doc(db,'staffAccess',user.uid),callback);}

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
