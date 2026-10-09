import {useState} from 'react';
import {Redirect,useRouter} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice} from '../components/AccountUI';
import {accountError,validateAccount,type AccountErrors} from '../services/authentication';
import {configured} from '../services/firebase';
import {useStore} from '../services/store';

export default function AdminLogin(){
 const router=useRouter(),{signIn,isLive,user,ready,state,adminSession,error,setError}=useStore();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[errors,setErrors]=useState<AccountErrors>({});
 if(isLive&&user&&ready&&state.role==='admin'&&adminSession&&!busy)return <Redirect href="/"/>;
 async function submit(){
  if(busy)return;const invalid=validateAccount({name:'',email,password,confirmPassword:'',accountType:''},false);setErrors(invalid);setMessage('');if(Object.keys(invalid).length)return;
  setBusy(true);try{await signIn(email,password,'admin');setPassword('');router.replace('/');}catch(e){setMessage(accountError(e));}finally{setBusy(false);}
 }
 return <MobileAccountShell title="Administrator sign in" subtitle="Sign in with your authorized administrator account." onBack={()=>{setError('');router.replace('/login');}} backDisabled={busy}>
  <Notice message={message||error}/>
  <AccountField label="Administrator email" value={email} onChangeText={setEmail} placeholder="admin@example.com" error={errors.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy}/>
  <AccountField label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" error={errors.password} password autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!busy} returnKeyType="go" onSubmitEditing={submit}/>
  <ActionButton label={busy?'Checking administrator access…':'Sign in as administrator'} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="Forgot password?" disabled={busy} onPress={()=>router.push('/forgot-password')}/>
  <TextLink label="Patient or staff sign in" disabled={busy} onPress={()=>{setError('');router.replace('/login');}}/>
 </MobileAccountShell>;
}
