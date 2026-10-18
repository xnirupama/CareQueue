import {useState} from 'react';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice} from '../components/AccountUI';
import {resetPassword,configured,accountError} from '../services/firebase';
import {navigateBack} from '../services/back-navigation';
import {portalPath} from '../services/account-access';

export default function ForgotPassword(){
 const router=useRouter(),params=useLocalSearchParams<{portal?:string;email?:string}>(),[email,setEmail]=useState(params.email||''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState(false);
 const fallback=params.portal==='patient'||params.portal==='staff'||params.portal==='admin'?portalPath(params.portal):'/login';
 async function submit(){if(busy)return;setBusy(true);setMessage('');setSent(false);try{await resetPassword(email);setSent(true);setMessage('If an account exists for this email, a reset link will arrive shortly. Check your inbox and spam folder.');}catch(error){setMessage(accountError(error));}finally{setBusy(false);}}
 return <MobileAccountShell appearance="auth" title="Reset password" subtitle="Enter your email to receive a reset link." onBack={()=>navigateBack(router,fallback)} backDisabled={busy}>
  <Notice message={message} success={sent}/>
  <AccountField label="Email address" placeholder="you@example.com" value={email} onChangeText={v=>{setEmail(v);setMessage('');setSent(false);}} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy} returnKeyType="send" onSubmitEditing={submit}/>
  <ActionButton label={busy?'Sending link…':sent?'Send another reset link':'Send reset link'} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="Back to sign in" disabled={busy} onPress={()=>navigateBack(router,fallback)}/>
 </MobileAccountShell>;
}
