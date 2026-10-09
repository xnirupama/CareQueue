import {useState} from 'react';
import {useRouter} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice} from '../components/AccountUI';
import {resetPassword,configured,accountError} from '../services/firebase';

export default function ForgotPassword(){
 const router=useRouter(),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState(false);
 async function submit(){if(busy)return;setBusy(true);setMessage('');setSent(false);try{await resetPassword(email);setSent(true);setMessage('If an account exists for this email, a reset link will arrive shortly. Check your inbox and spam folder.');}catch(error){setMessage(accountError(error));}finally{setBusy(false);}}
 return <MobileAccountShell title="Reset password" subtitle="Enter your email to receive a reset link." onBack={()=>router.replace('/login')} backDisabled={busy}>
  <Notice message={message} success={sent}/>
  <AccountField label="Email address" placeholder="you@example.com" value={email} onChangeText={v=>{setEmail(v);setMessage('');setSent(false);}} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy} returnKeyType="send" onSubmitEditing={submit}/>
  <ActionButton label={busy?'Sending link…':sent?'Send another reset link':'Send reset link'} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="Back to sign in" disabled={busy} onPress={()=>router.replace('/login')}/>
 </MobileAccountShell>;
}
