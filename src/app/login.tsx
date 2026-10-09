import {useState} from 'react';
import {View,Text} from 'react-native';
import {Redirect,useRouter,useLocalSearchParams} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice,styles} from '../components/AccountUI';
import {accountError,validateAccount,type AccountErrors} from '../services/authentication';
import {configured} from '../services/firebase';
import {useStore} from '../services/store';

export default function Login(){
 const router=useRouter(),{signIn,isLive,user,ready,setDataMode,setError,error}=useStore();
 const params=useLocalSearchParams<{registered?:string;email?:string;accountType?:string}>();
 const [email,setEmail]=useState(params.email||''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[errors,setErrors]=useState<AccountErrors>({});
 if(isLive&&user&&ready&&!busy)return <Redirect href="/"/>;
 async function submit(){
  if(busy)return;
  const invalid=validateAccount({name:'',email,password,confirmPassword:'',accountType:''},false);setErrors(invalid);setMessage('');
  if(Object.keys(invalid).length)return;
  setBusy(true);
  try{await signIn(email,password);setPassword('');router.replace('/');}
  catch(error){setMessage(accountError(error));}
  finally{setBusy(false);}
 }
 return <MobileAccountShell title="Sign in" subtitle="Patient and staff access to CareQueue.">
  {params.registered==='1'&&!message&&!error?<Notice message={params.accountType==='staff'?'Staff registration saved. Sign in to check your administrator approval.':'Account created successfully. Sign in with your email and password.'} success/>:null}
  <Notice message={message||error}/>{!configured?<Notice message="Account sign-in is unavailable. You can still explore the demo."/>:null}
  <AccountField label="Email address" placeholder="you@example.com" value={email} onChangeText={v=>{setEmail(v);setErrors(e=>({...e,email:undefined}));}} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy}/>
  <AccountField label="Password" placeholder="Enter your password" value={password} onChangeText={v=>{setPassword(v);setErrors(e=>({...e,password:undefined}));}} error={errors.password} password autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!busy} returnKeyType="go" onSubmitEditing={submit}/>
  <View style={{alignItems:'flex-end'}}><TextLink label="Forgot password?" disabled={busy} onPress={()=>router.push('/forgot-password')}/></View>
  <ActionButton label={busy?'Signing in…':'Sign in'} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="New to CareQueue? Create an account" disabled={busy} onPress={()=>router.push('/register')}/>
  <TextLink label="Administrator sign in" disabled={busy} onPress={()=>{setError('');router.push('/admin-login');}}/>
  <View style={styles.divider}/><ActionButton label="Explore the demo" secondary disabled={busy} onPress={()=>{setError('');setDataMode(false);router.replace('/');}}/>
  <Text style={styles.helper}>Sign in to follow your own visit, or try the app with sample visits.</Text>
 </MobileAccountShell>;
}
