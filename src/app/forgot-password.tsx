import {useEffect,useRef,useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice,styles} from '../components/AccountUI';
import {requestResetCode,verifyResetCode,completePasswordReset,configured} from '../services/firebase';
import {passwordResetError,type ResetChallenge} from '../services/password-reset';
import {navigateBack} from '../services/back-navigation';
import {portalPath} from '../services/account-access';

export default function ForgotPassword(){
 const router=useRouter(),params=useLocalSearchParams<{portal?:string;email?:string}>();
 const [email,setEmail]=useState(params.email||''),[step,setStep]=useState<'email'|'code'|'password'|'done'>('email');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[code,setCode]=useState(''),[challenge,setChallenge]=useState<ResetChallenge|null>(null),[cooldown,setCooldown]=useState(0);
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const resetToken=useRef<string|null>(null);
 const fallback=params.portal==='patient'||params.portal==='staff'||params.portal==='admin'?portalPath(params.portal):'/login';
 useEffect(()=>()=>{resetToken.current=null;},[]);
 useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(value=>value-1),1000);return()=>clearTimeout(timer);},[cooldown]);
 function clear(){resetToken.current=null;setCode('');setPassword('');setConfirmation('');setMessage('');}
 function back(){clear();navigateBack(router,fallback);}
 async function send(){
  if(busy)return;setBusy(true);setMessage('');
  try{const result=await requestResetCode(email);clear();setChallenge(result);setCooldown(result.retryAfterSeconds);setStep('code');}
  catch(error){setMessage(passwordResetError(error));}finally{setBusy(false);}
 }
 async function verify(){
  if(busy||!challenge)return;setBusy(true);setMessage('');
  try{resetToken.current=await verifyResetCode(challenge.challengeId,code);setCode('');setStep('password');}
  catch(error){setMessage(passwordResetError(error));}finally{setBusy(false);}
 }
 async function save(){
  if(busy||!resetToken.current)return;setBusy(true);setMessage('');
  try{await completePasswordReset(resetToken.current,password,confirmation);clear();setStep('done');}
  catch(error){setMessage(passwordResetError(error));if(['auth/expired-action-code','auth/invalid-action-code'].includes((error as {code?:string}).code||'')){resetToken.current=null;setPassword('');setConfirmation('');setStep('email');}}
  finally{setBusy(false);}
 }
 const currentStep=step==='email'?0:step==='code'?1:2;
 return <MobileAccountShell appearance="auth" title={step==='done'?'Password updated.':'Reset your password.'} subtitle={step==='email'?'We’ll email a verification code to your registered address.':step==='code'?'Enter the six-digit code from your email.':step==='password'?'Choose a new password for your CareQueue account.':'Your new password is ready. You can sign in now.'} onBack={back} backDisabled={busy}>
  {step!=='done'?<View style={s.steps}>{['Email','Code','Password'].map((label,index)=><View key={label} style={s.step}><View style={[s.number,index<=currentStep&&s.numberActive]}><Text style={[s.numberText,index<=currentStep&&s.numberTextActive]}>{index+1}</Text></View><Text style={[s.stepText,index===currentStep&&s.stepActive]}>{label}</Text></View>)}</View>:null}
  <Notice message={message}/>
  {step==='email'?<>
   <AccountField label="Email address" placeholder="you@example.com" value={email} onChangeText={value=>{setEmail(value);setMessage('');}} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy} returnKeyType="send" onSubmitEditing={send}/>
   <ActionButton label={busy?'Requesting code…':'Send verification code'} busy={busy} disabled={!configured} onPress={send}/>
  </>:step==='code'?<>
   <View style={s.delivery}><Text style={styles.helper}>If an account exists for <Text style={s.email}>{email.trim()}</Text>, a code will arrive shortly. Check your inbox and spam folder. The code expires in ten minutes.</Text></View>
   <AccountField key="verification-code" label="Verification code" placeholder="000000" value={code} onChangeText={value=>{setCode(value.replace(/\D/g,'').slice(0,6));setMessage('');}} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" autoCapitalize="none" autoCorrect={false} maxLength={6} editable={!busy} returnKeyType="done" onSubmitEditing={verify} style={s.code}/>
   <ActionButton label={busy?'Checking code…':'Verify code'} busy={busy} disabled={code.length!==6} onPress={verify}/>
   <TextLink label={cooldown?`Resend code in ${cooldown}s`:'Resend code'} disabled={busy||cooldown>0} onPress={send}/>
   <TextLink label="Use a different email" disabled={busy} onPress={()=>{clear();setChallenge(null);setStep('email');}}/>
  </>:step==='password'?<>
   <Notice success message="Email code verified. Set your new password below."/>
   <AccountField key="new-password" label="New password" value={password} onChangeText={setPassword} password helper="Use at least 8 characters." autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy}/>
   <AccountField label="Confirm new password" value={confirmation} onChangeText={setConfirmation} password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy} returnKeyType="done" onSubmitEditing={save}/>
   <ActionButton label={busy?'Updating password…':'Update password'} busy={busy} onPress={save}/>
  </>:<><Notice success message="Your password was changed successfully."/><ActionButton label="Return to sign in" onPress={()=>router.replace({pathname:fallback,params:{email:email.trim()}})}/></>}
  {step!=='done'?<TextLink label="Back to sign in" disabled={busy} onPress={back}/>:null}
 </MobileAccountShell>;
}
const s=StyleSheet.create({steps:{flexDirection:'row',gap:12,paddingBottom:4},step:{flex:1,alignItems:'center',gap:6},number:{height:30,width:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#e8edeb'},numberActive:{backgroundColor:'#d7ede1'},numberText:{fontFamily:'Inter_700Bold',fontSize:12,color:'#647b70'},numberTextActive:{color:'#295c47'},stepText:{fontFamily:'Inter_400Regular',fontSize:11,color:'#647b70'},stepActive:{fontFamily:'Inter_700Bold',color:'#09386b'},delivery:{padding:14,borderRadius:16,backgroundColor:'#edf6f0'},email:{fontFamily:'Inter_600SemiBold',color:'#09386b'},code:{fontSize:24,letterSpacing:8,textAlign:'center'}});
