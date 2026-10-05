import React, {createContext, useContext, useEffect, useRef, useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {User} from 'firebase/auth';
import {initialState} from '../data/seed';
import type {AppState, Role} from '../data/types';
import {applyCommand, type Command} from './domain';
import {liveMode, configured, watchAuth, accountRole, subscribeLive, liveCommand} from './firebase';
const storageKey = 'carequeue.demo.v1';
const offlineKey = (uid: string) => `carequeue.offline.${uid}`;
function emptyState(): AppState {
 return {...initialState(), queue: [], nowServing: '—', myToken: '—', updatedAt: '', audit: [], broadcasts: [], offlineActions: [], patientName: 'Patient'};
}
interface Store {
 isLive: boolean; setDataMode: (live: boolean) => void;
 state: AppState; ready: boolean; user: User | null;
 error: string; setError: (message: string) => void;
 update: (patch: Partial<AppState>) => void;
 execute: (command: Command, fields?: Record<string, string>) => Promise<void>;
 setRole: (role: Role) => void; reset: () => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({children}: {children: React.ReactNode}) {
 const [isLive, setIsLive] = useState(liveMode);
 const [state, setState] = useState(() => liveMode ? emptyState() : initialState());
 const [ready, setReady] = useState(false);
 const [user, setUser] = useState<User | null>(null);
 const [error, setError] = useState('');
 const current = useRef(state);
 const chain = useRef(Promise.resolve());
 const replaceState = useCallback((next: AppState) => {current.current = next; setState(next);}, []);
 const update = useCallback((patch: Partial<AppState>) => replaceState({...current.current, ...patch}), [replaceState]);
 useEffect(() => {
  let active = true;
  if (isLive) {
   const stop = watchAuth(async account => {
    if (!active) return;
    setUser(account); replaceState(emptyState()); setReady(true);
    if (account) {
     try {
      const role = await accountRole(account);
      const saved = await AsyncStorage.getItem(offlineKey(account.uid));
      if (!active) return;
      const pending = saved ? JSON.parse(saved) : [];
      update({role, patientName: account.displayName || 'Patient', offlineActions: Array.isArray(pending) ? pending : []});
     } catch (e) {if (active) setError(String(e));}
    }
   });
   return () => {active = false; stop();};
  }
  AsyncStorage.getItem(storageKey).then(raw => {
   if (!active) return;
   if (raw) {const data = JSON.parse(raw); if (data.version === 1) replaceState(data);}
  }).catch(() => setError('Saved sample data could not be read.')).finally(() => {if (active) setReady(true);});
  return () => {active = false;};
 }, [isLive, replaceState, update]);
 useEffect(() => {
  if (isLive && user) return subscribeLive(user, state.role, patch => {
   // Unreconciled notes belong to this device, not the server's current snapshot.
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
    if (!user) throw Error('Sign in to continue.');
    if (command === 'offline' || command === 'manualRecord') {
     const next = applyCommand(snapshot, command, fields);
     await AsyncStorage.setItem(offlineKey(user.uid), JSON.stringify(next.offlineActions));
     replaceState(next); return;
    }
    await liveCommand(user, snapshot, command, fields, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (command === 'reconcile') {
     await AsyncStorage.setItem(offlineKey(user.uid), '[]'); update({offlineActions: []});
    }
    if (['caregiver', 'revokeCaregiver', 'requestRecovery', 'preferences'].includes(command)) replaceState(applyCommand(current.current, command, fields));
   } else replaceState(applyCommand(snapshot, command, fields));
  };
  const result = chain.current.then(task); chain.current = result.catch(() => {}); await result;
 }, [user, isLive, replaceState, update]);
 const setRole = useCallback((role: Role) => {if (!isLive) update({role});}, [isLive, update]);
 const reset = useCallback(async () => {if (!isLive) {await AsyncStorage.removeItem(storageKey); replaceState(initialState());}}, [isLive, replaceState]);
 const setDataMode = useCallback((enabled: boolean) => {if(enabled&&!configured){setError('Firebase configuration is missing. Copy the app configuration before starting the app.');return;}setIsLive(enabled); setReady(false); setUser(null); setError(''); replaceState(enabled ? emptyState() : initialState());}, [replaceState]);
 return <Context.Provider value={{isLive, setDataMode, state, ready, user, error, setError, update, execute, setRole, reset}}>{children}</Context.Provider>;
}
export function useStore() {const store = useContext(Context); if (!store) throw Error('StoreProvider is missing'); return store;}
