import {useState} from 'react';
import {Text} from 'react-native';
import {Redirect,useLocalSearchParams,useRouter} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice,styles} from './AccountUI';
import {accountError,validateAccount,type AccountErrors} from '../services/authentication';
import {configured} from '../services/firebase';
import type {LoginPortal} from '../services/account-access';
import {navigateBack} from '../services/back-navigation';
import {useStore} from '../services/store';
import {RoleIdentityCard} from './RoleIdentity';

const copy={
 patient:{title:'Patient sign in',subtitle:'Follow your visit, queue and caregiver updates.'},
 staff:{title:'Staff sign in',subtitle:'Manage registrations, queue calls and recovery requests.'},
 admin:{title:'Administrator sign in',subtitle:'Oversee staff access, service updates and operations.'},
} as const;
export default function RoleLogin({portal}:{portal:LoginPortal}){
 const router=useRouter(),{signIn,isLive,user,ready,error,setError}=useStore();
 const params=useLocalSearchParams<{registered?:string;email?:string}>(),content=copy[portal];
 const [email,setEmail]=useState(params.email||''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[errors,setErrors]=useState<AccountErrors>({});
 if(isLive&&user&&ready&&!busy)return <Redirect href="/"/>;
 async function submit(){
  if(busy)return;setMessage('');setError('');
  const invalid=validateAccount({name:'',email,password,confirmPassword:'',accountType:''},false);setErrors(invalid);if(Object.keys(invalid).length)return;
  setBusy(true);try{await signIn(email,password,portal);setPassword('');router.replace('/');}catch(e){setMessage(accountError(e));}finally{setBusy(false);}
 }
 return <MobileAccountShell appearance="auth" title={content.title} subtitle={content.subtitle} onBack={()=>{setError('');navigateBack(router,'/login');}} backDisabled={busy}>
  <RoleIdentityCard role={portal}/>
  {params.registered==='1'&&!message&&!error?<Notice success message={portal==='staff'?'Staff registration saved. Sign in to check your administrator approval.':'Account created. Sign in with your registered email and password.'}/>:null}
  <Notice message={message||error}/>{!configured?<Notice message="Sign-in is unavailable until Firebase is configured."/>:null}
  <AccountField label="Email address" placeholder="you@example.com" value={email} onChangeText={v=>{setEmail(v);setErrors(e=>({...e,email:undefined}));}} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy}/>
  <AccountField label="Password" placeholder="Enter your password" value={password} onChangeText={v=>{setPassword(v);setErrors(e=>({...e,password:undefined}));}} error={errors.password} password autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!busy} returnKeyType="go" onSubmitEditing={submit}/>
  <ActionButton label={busy?'Signing in…':`Sign in as ${portal==='admin'?'administrator':portal}`} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="Forgot password?" disabled={busy} onPress={()=>router.push({pathname:'/forgot-password',params:{portal,email:email.trim()}})}/>
  {portal!=='admin'?<TextLink label={portal==='staff'?'Register as hospital staff':'Create a patient account'} disabled={busy} onPress={()=>router.push({pathname:'/register',params:{accountType:portal}})}/>:<Text style={styles.helper}>Administrator access is assigned by the project owner. There is no public administrator registration.</Text>}
  <TextLink label="Choose a different sign-in" disabled={busy} onPress={()=>{setError('');router.replace('/login');}}/>
 </MobileAccountShell>;
}
