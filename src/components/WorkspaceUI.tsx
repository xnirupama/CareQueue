import {useState,type ReactNode} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {useRouter,type Href} from 'expo-router';
import {MobileAccountShell,ActionButton,Notice,AccountField,styles} from './AccountUI';
import {navigateBack} from '../services/back-navigation';
import {useStore} from '../services/store';
import {accountError} from '../services/authentication';
export {ActionButton,AccountField};
export function Card({title,children}:{title:string;children:ReactNode}){return <View style={ws.card}><Text accessibilityRole="header" style={ws.title}>{title}</Text>{children}</View>;}
export function Body({children}:{children:ReactNode}){const {state}=useStore();return <Text style={[styles.subtitle,state.largeText&&{fontSize:19,lineHeight:29}]}>{children}</Text>;}
export function useAction(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[success,setSuccess]=useState(false);
 const [confirmation,setConfirmation]=useState<{description:string;action:()=>Promise<unknown>}|null>(null);
 async function run(action:()=>Promise<unknown>,saved='Changes saved.'){
  if(busy)return;setBusy(true);setMessage('');setSuccess(false);
  try{await action();setSuccess(true);setMessage(saved);setConfirmation(null);}catch(e){setMessage(accountError(e));}finally{setBusy(false);}
 }
 const feedback=<><Notice message={message} success={success}/>{confirmation?<Card title="Confirm action"><Body>{confirmation.description}</Body><ActionButton label="Confirm" busy={busy} onPress={()=>run(confirmation.action)}/><ActionButton label="Keep record" secondary disabled={busy} onPress={()=>setConfirmation(null)}/></Card>:null}</>;
 return {busy,run,feedback,confirm:(description:string,action:()=>Promise<unknown>)=>{setMessage('');setConfirmation({description,action});}};
}
export function WorkspacePage({title,subtitle,busy,children}:{title:string;subtitle:string;busy?:boolean;children:ReactNode}){
 const router=useRouter(),{isLive,state}=useStore();
 return <MobileAccountShell title={title} subtitle={subtitle} onBack={()=>navigateBack(router,'/manage')} backDisabled={busy}><Text style={styles.helper}>{isLive?'Connected account':'Sample data on this device'} · {state.role}</Text>{children}</MobileAccountShell>;
}
export function WorkspaceLinks(){
 const {state,isLive}=useStore(),router=useRouter();
 const links:{label:string;detail:string;href:Href}[]=state.role==='patient'?[
  {label:'My visit',detail:'Token and live queue status',href:'/manage'},
  {label:'Missed-turn recovery',detail:'Request, edit or withdraw a review',href:'/recovery'},
  {label:'Caregiver sharing',detail:'Manage consent and shared visit access',href:'/caregivers'},
  {label:'Accessibility settings',detail:'Text size, language and alert preferences',href:'/preferences'},
  {label:'Patient support',detail:'Ask for queue, directions or accessibility help',href:'/support'},
 ]:[
  {label:'Queue operations',detail:'Call, recall and complete visits',href:'/manage'},
  {label:'Patient registrations',detail:'Register, find, edit or delete closed visits',href:'/patient-records'},
  {label:'Recovery desk',detail:'Review missed turns and manage requests',href:'/recovery'},
  {label:'Continuity notes',detail:'Create, edit and reconcile outage notes',href:'/staff-notes'},
  {label:'Support desk',detail:'Read patient requests and send replies',href:'/support'},
  ...(state.role==='admin'&&isLive?[
   {label:'Announcements',detail:'Create, edit and delete service messages',href:'/announcements' as Href},
   {label:'Staff access',detail:'Approve, suspend or revoke access',href:'/staff-approvals' as Href},
  ]:[]),
 ];
 return <View style={{gap:10}}>{links.map(l=><Pressable key={l.href.toString()} accessibilityRole="button" onPress={()=>router.push(l.href)} style={({pressed})=>[ws.link,pressed&&{opacity:.7}]}><View style={{flex:1,gap:4}}><Text style={ws.title}>{l.label}</Text><Text style={styles.helper}>{l.detail}</Text></View><Text style={ws.arrow}>›</Text></Pressable>)}</View>;
}
export const ws=StyleSheet.create({card:{padding:18,borderRadius:18,borderWidth:1,borderColor:'#d3e1eb',backgroundColor:'white',gap:14},title:{fontFamily:'Inter_700Bold',fontSize:17,color:'#09386b'},link:{flexDirection:'row',alignItems:'center',gap:12,padding:16,minHeight:74,borderWidth:1,borderColor:'#d3e1eb',borderRadius:16,backgroundColor:'white'},arrow:{fontSize:26,color:'#09386b'}});
