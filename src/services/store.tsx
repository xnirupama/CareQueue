import React, {createContext, useContext, useEffect, useRef, useState, useCallback} from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {User} from 'firebase/auth';
import {initialState} from '../data/seed';
import type {AppState, Role} from '../data/types';
import {applyCommand, type Command} from './domain';
import {liveMode, configured, auth, watchAuth, accountRole, subscribeLive, liveCommand, login, register, reloadAccount,loadUserProfile,logout,watchOwnStaffAccess} from './firebase';
import type {RegistrationFields} from './authentication';
import type {UserProfile} from './user-profile';
import {accountPortal,validatePortal,type LoginPortal} from './account-access';
const storageKey = 'carequeue.demo.v1';
const modeKey = 'carequeue.mode.v1';
const welcomeKey = 'carequeue.welcome.v1';
const portalKey='carequeue.portal.v1';
const offlineKey = (uid: string) => `carequeue.offline.${uid}`;
function emptyState(): AppState {
 return {...initialState(), queue: [], nowServing: '—', myToken: '—', updatedAt: '', audit: [], broadcasts: [], offlineActions: [], patientName: 'Patient'};
}
interface Store {
 isLive: boolean; setDataMode: (live: boolean,demoRole?:'patient'|'staff') => void;
 booted: boolean; onboardingComplete: boolean; completeOnboarding: () => Promise<void>;
 authPending: boolean; adminSession:boolean; signIn: (email: string, password: string,portal?:LoginPortal) => Promise<void>;
 signUp: (fields: RegistrationFields) => Promise<void>; refreshAccount: () => Promise<void>;
 accountProfile: UserProfile | null;
 connected: boolean; state: AppState; ready: boolean; user: User | null;
 error: string; setError: (message: string) => void;
 update: (patch: Partial<AppState>) => void;
 execute: (command: Command, fields?: Record<string, string>) => Promise<void>;
 setRole: (role: Role) => void; reset: () => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({children}: {children: React.ReactNode}) {
 const [connected,setConnected]=useState(true);
 useEffect(()=>NetInfo.addEventListener(n=>setConnected(n.isConnected!==false&&n.isInternetReachable!==false)),[]);
 const [isLive, setIsLive] = useState(liveMode);
 const [booted,setBooted] = useState(false);
 const [onboardingComplete,setOnboardingComplete] = useState(false);
 const [authPending,setAuthPending] = useState(false);
 const [adminSession,setAdminSession]=useState(false);
 const portalRef=useRef<LoginPortal|null>(null);
 const [state, setState] = useState(() => liveMode ? emptyState() : initialState());
 const [ready, setReady] = useState(false);
 const [user, setUser] = useState<User | null>(null);
 const [accountProfile,setAccountProfile]=useState<UserProfile|null>(null);
 const [error, setError] = useState('');
 const current = useRef(state);
 const accountUid = useRef<string|null>(null);
 const requestedDemoRole=useRef<'patient'|'staff'|null>(null);
 const sessionEpoch=useRef(0),authAction=useRef(false);
 const invalidateSession=useCallback(()=>{++sessionEpoch.current;},[]);
 const chain = useRef(Promise.resolve());
 const replaceState = useCallback((next: AppState) => {current.current = next; setState(next);}, []);
 const update = useCallback((patch: Partial<AppState>) => replaceState({...current.current, ...patch}), [replaceState]);
 const hydrateAccount=useCallback(async(account:User)=>{
  const version=++sessionEpoch.current;accountUid.current=account.uid;
  const [role,profile,saved]=await Promise.all([accountRole(account),loadUserProfile(account,portalRef.current||undefined),AsyncStorage.getItem(offlineKey(account.uid))]);
  const portal=portalRef.current||accountPortal(role,profile);validatePortal(role,portal,profile);
  if(version!==sessionEpoch.current||auth?.currentUser?.uid!==account.uid)return;
  portalRef.current=portal;setAdminSession(portal==='admin');
  await AsyncStorage.setItem(portalKey,portal);
  if(version!==sessionEpoch.current||auth?.currentUser?.uid!==account.uid)return;
  let pending=[];
  try{pending=saved?JSON.parse(saved):[];}catch{setError('Saved offline notes could not be read. They were kept on this device for recovery.');}
  update({role,patientName:profile.fullName,offlineActions:Array.isArray(pending)?pending:[]});
  setAccountProfile(profile);setUser(account);setReady(true);
 },[update]);
 useEffect(() => {
  let active = true;
  AsyncStorage.multiGet([modeKey,welcomeKey,portalKey]).then(values => {
   if (!active) return;
   const savedMode = values[0][1];
   const enabled = savedMode ? savedMode === 'firebase' && configured : liveMode;
   setIsLive(enabled); replaceState(enabled ? emptyState() : initialState());
   setOnboardingComplete(values[1][1] === 'complete');
   const savedPortal=values[2][1];portalRef.current=savedPortal==='patient'||savedPortal==='staff'||savedPortal==='admin'?savedPortal:null;setAdminSession(portalRef.current==='admin');
  }).catch(() => {if(active)setError('Your saved welcome settings could not be read.');})
   .finally(() => {if(active)setBooted(true);});
  return () => {active=false;};
 },[replaceState]);
 const completeOnboarding = useCallback(async () => {
  await AsyncStorage.setItem(welcomeKey,'complete'); setOnboardingComplete(true);
 },[]);
 useEffect(() => {
  if (!booted) return;
  let active = true;
  if (isLive) {
   const stop = watchAuth(async account => {
    if (!active) return;
    ++sessionEpoch.current;accountUid.current = account?.uid || null;
    setUser(null);setAccountProfile(null);replaceState(emptyState());setReady(!account);
    if(!account&&!authAction.current){portalRef.current=null;setAdminSession(false);AsyncStorage.removeItem(portalKey).catch(()=>{});}
    if (account&&!authAction.current) {
     try {
      await hydrateAccount(account);
     } catch(e) {if (active&&accountUid.current===account.uid) {await logout();setError(e instanceof Error?e.message:'Your account profile could not be loaded. Check your connection and sign in again.');setReady(true);}}
    }
   });
   return () => {active = false;invalidateSession();stop();};
  }
  AsyncStorage.getItem(storageKey).then(raw => {
   if (!active) return;
   if (raw) {const data = JSON.parse(raw); if (data.version === 1) replaceState({...data,role:requestedDemoRole.current||(data.role==='staff'?'staff':'patient')});}
  }).catch(() => setError('Saved sample data could not be read.')).finally(() => {if (active) {requestedDemoRole.current=null;setReady(true);}});
  return () => {active = false;};
 }, [booted, isLive, replaceState, hydrateAccount,invalidateSession]);
 useEffect(() => {
  if (isLive && user) return subscribeLive(user, state.role, patch => {
   // Unreconciled notes belong to this device, not the server's current snapshot.
   if(accountUid.current!==user.uid)return;
   const {offlineActions: _serverPending, ...data} = patch;
   update({...data, role: current.current.role});
  }, setError);
 }, [user, state.role, isLive, update]);
 useEffect(() => {
  if (ready && !isLive) AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => setError('Your device could not save the changes.'));
 }, [state, ready, isLive]);
 const execute = useCallback(async (command: Command, fields: Record<string, string> = {}) => {
  const task = async () => {
   const snapshot = current.current;
   if (isLive) {
    if (!user || accountUid.current !== user.uid) throw Error('Sign in to continue.');
    if (['offline','manualRecord','editManualRecord','deleteManualRecord'].includes(command)) {
     const next = applyCommand(snapshot, command, fields);
     await AsyncStorage.setItem(offlineKey(user.uid), JSON.stringify(next.offlineActions));
     if(accountUid.current!==user.uid)return;
     replaceState(next); return;
    }
    await liveCommand(user, snapshot, command, fields, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if(accountUid.current!==user.uid)return;
    if (command === 'reconcile') {
     await AsyncStorage.setItem(offlineKey(user.uid), '[]'); update({offlineActions: []});
    }

   } else replaceState(applyCommand(snapshot, command, fields));
  };
  const result = chain.current.then(task); chain.current = result.catch(() => {}); await result;
 }, [user, isLive, replaceState, update]);
 const setRole = useCallback((role: Role) => {if (!isLive&&role!=='admin')update({role});}, [isLive, update]);
 const reset = useCallback(async () => {if (!isLive) {await AsyncStorage.removeItem(storageKey); replaceState(initialState());}}, [isLive, replaceState]);
 const setDataMode = useCallback((enabled: boolean,demoRole?:'patient'|'staff') => {
  if(enabled&&!configured){setError('Firebase configuration is missing. Copy the app configuration before starting the app.');return;}
  if(enabled===isLive){if(!enabled&&demoRole)update({role:demoRole});return;}
  requestedDemoRole.current=enabled?null:demoRole||null;
  ++sessionEpoch.current;accountUid.current=null;setIsLive(enabled);setReady(false);setUser(null);setAccountProfile(null);setError('');replaceState(enabled?emptyState():{...initialState(),role:demoRole||'patient'});
  AsyncStorage.setItem(modeKey,enabled?'firebase':'demo').catch(()=>setError('Your account mode could not be saved on this device.'));
 },[isLive,replaceState,update]);
 const refreshAccount = useCallback(async () => {
  const account=auth?.currentUser;
  if(!account)throw Error('Sign in to continue.');
  await reloadAccount(account);await account.getIdTokenResult(true);const [role,profile]=await Promise.all([accountRole(account),loadUserProfile(account,portalRef.current||undefined)]);
  validatePortal(role,portalRef.current||accountPortal(role,profile),profile);
  if(accountUid.current!==account.uid)return;
  setAccountProfile(profile);setUser(account);update({role,...(current.current.myToken==='—'?{patientName:profile.fullName}:{})});
 },[update]);
 useEffect(()=>{
  if(!isLive||!user)return;
  return watchOwnStaffAccess(user,()=>{refreshAccount().catch(e=>setError(e instanceof Error?e.message:'Access could not be refreshed.'));});
 },[isLive,user,refreshAccount]);
 const signIn=useCallback(async(email:string,password:string,portal:LoginPortal='patient')=>{
  if(authAction.current)throw Error('Please wait for the current account action to finish.');
  authAction.current=true;setAuthPending(true);setError('');setDataMode(true);
  portalRef.current=portal;setAdminSession(portal==='admin');
  try{const result=await login(email,password,portal);await hydrateAccount(result.user);await AsyncStorage.setItem(portalKey,portal);}
  catch(e){await logout();portalRef.current=null;setAdminSession(false);setReady(true);throw e;}
  finally{authAction.current=false;setAuthPending(false);}
 },[hydrateAccount,setDataMode]);
 const signUp=useCallback(async(fields:RegistrationFields)=>{
  if(authAction.current)throw Error('Please wait for the current account action to finish.');
  authAction.current=true;setAuthPending(true);setError('');setDataMode(true);
  portalRef.current=fields.accountType==='staff'?'staff':'patient';setAdminSession(false);
  try{await register(fields);await logout();}
  catch(e){await logout();setReady(true);throw e;}
  finally{authAction.current=false;setAuthPending(false);}
 },[setDataMode]);
 return <Context.Provider value={{connected,isLive,setDataMode,booted,onboardingComplete,completeOnboarding,authPending,adminSession,accountProfile,signIn,signUp,refreshAccount,state,ready,user,error,setError,update,execute,setRole,reset}}>{children}</Context.Provider>;
}
export function useStore() {const store = useContext(Context); if (!store) throw Error('StoreProvider is missing'); return store;}
