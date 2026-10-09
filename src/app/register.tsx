import {useState} from 'react';
import {Text} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice,styles} from '../components/AccountUI';
import {accountError,validateAccount,type AccountErrors,type RegistrationFields} from '../services/authentication';
import {configured} from '../services/firebase';
import {useStore} from '../services/store';

export default function Register(){
 const router=useRouter(),{signUp,isLive,user,ready}=useStore();
 const [fields,setFields]=useState<RegistrationFields>({name:'',email:'',password:'',confirmPassword:''}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[errors,setErrors]=useState<AccountErrors>({});
 const change=(key:keyof RegistrationFields)=>(value:string)=>{setFields(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:undefined}));};
 if(isLive&&user&&ready&&!busy)return <Redirect href="/"/>;
 async function submit(){
  if(busy)return;
  const invalid=validateAccount(fields);setErrors(invalid);setMessage('');if(Object.keys(invalid).length)return;
  setBusy(true);try{await signUp(fields);setFields(f=>({...f,password:'',confirmPassword:''}));router.replace({pathname:'/login',params:{registered:'1',email:fields.email.trim()}});}catch(error){setMessage(accountError(error));}finally{setBusy(false);}
 }
 return <MobileAccountShell title="Create account" subtitle="Register to follow your hospital visit." onBack={()=>router.replace('/login')} backDisabled={busy}>
  <Notice message={message}/>{!configured?<Notice message="Account registration is unavailable until Firebase is configured."/>:null}
  <AccountField label="Full name" placeholder="Your full name" value={fields.name} onChangeText={change('name')} error={errors.name} autoComplete="name" textContentType="name" maxLength={80} editable={!busy}/>
  <AccountField label="Email address" placeholder="you@example.com" value={fields.email} onChangeText={change('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy}/>
  <AccountField label="Password" placeholder="Create a password" value={fields.password} onChangeText={change('password')} error={errors.password} helper="Use at least 8 characters." password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy}/>
  <AccountField label="Confirm password" placeholder="Enter your password again" value={fields.confirmPassword} onChangeText={change('confirmPassword')} error={errors.confirmPassword} password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy} returnKeyType="go" onSubmitEditing={submit}/>
  <Text style={styles.helper}>The registration counter will link your hospital-issued token to this account.</Text>
  <ActionButton label={busy?'Creating your account…':'Create account'} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="Already have an account? Sign in" disabled={busy} onPress={()=>router.replace('/login')}/>
 </MobileAccountShell>;
}
