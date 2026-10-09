import {useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {AccountShell,AccountField,ActionButton,TextLink,Notice,styles,colors} from '../components/AccountUI';
import {accountError,logout,renameAccount,verifyAccountEmail,changePassword,initializeService,linkTicket} from '../services/firebase';
import {useStore} from '../services/store';

export default function Account(){
 const router=useRouter(),{isLive,state,user,accountProfile,setDataMode,setRole,reset,refreshAccount,error,setError}=useStore();
 const [name,setName]=useState(accountProfile?.fullName||user?.displayName||''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[success,setSuccess]=useState(false),[cooldown,setCooldown]=useState(0);
 const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[showPassword,setShowPassword]=useState(false);
 const [patientId,setPatientId]=useState(''),[token,setToken]=useState('');
 useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(c=>c-1),1000);return()=>clearTimeout(timer);},[cooldown]);
 if(isLive&&!user)return <Redirect href="/login"/>;
 async function run(action:()=>Promise<unknown>,message:string){if(busy)return;setBusy(true);setFeedback('');setSuccess(false);setError('');try{await action();setFeedback(message);setSuccess(true);}catch(e){setFeedback(accountError(e));}finally{setBusy(false);}}
 return <AccountShell title={isLive?'Your account.':'Explore CareQueue.'} subtitle={isLive?'Manage your details and stay connected to your visit.':'Try the patient, staff and administrator experiences with sample visits.'} eyebrow={isLive?'A space that’s yours.':'Sample data · saved on this device.'}>
  <Notice message={feedback} success={success}/><Notice message={error}/>
  <ActionButton label={state.role==='patient'?'My visit and settings':'Queue operations'} disabled={busy} onPress={()=>router.push('/manage')}/>
  <TextLink label="Return to queue" disabled={busy} onPress={()=>router.replace('/')}/>
  {isLive&&user?<>
   <View style={styles.divider}/><View style={styles.row}><Text style={styles.label}>Account access</Text><Text style={[styles.label,{color:'#397460',textTransform:'capitalize'}]}>{state.role}</Text></View>
   <Text selectable style={styles.subtitle}>{user.email}</Text><Text style={styles.label}>Account ID</Text><Text selectable style={[styles.helper,{color:colors.navy}]}>{user.uid}</Text><Text style={styles.helper}>Copy this ID to link your issued token or share a visit with a caregiver.</Text>
   <AccountField label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoComplete="name" textContentType="name" maxLength={80} editable={!busy}/>
   <ActionButton label="Save name" secondary disabled={busy} onPress={()=>run(async()=>{await renameAccount(user,name);await refreshAccount();},'Your account name was saved.')}/>
   <View style={styles.divider}/><Text style={styles.label}>{user.emailVerified?'Email verified':'Verify your email'}</Text><Text style={styles.helper}>{user.emailVerified?'Your email address has been verified.':'Send a verification link, open it from your inbox, then check your status here.'}</Text>
   {!user.emailVerified?<><ActionButton label={cooldown?`Send again in ${cooldown}s`:'Send verification email'} secondary disabled={busy||cooldown>0} onPress={()=>run(async()=>{await verifyAccountEmail(user);setCooldown(60);},'Verification email sent. Check your inbox and spam folder.')}/><TextLink label="I’ve verified my email — check status" disabled={busy} onPress={()=>run(async()=>{await refreshAccount();if(!user.emailVerified)throw Error('Your email is not verified yet. Open the link in your inbox, then try again.');},'Your email is verified.')}/></>:null}
   <View style={styles.divider}/><TextLink label={showPassword?'Close password settings':'Change password'} disabled={busy} onPress={()=>{setShowPassword(v=>!v);setCurrent('');setPassword('');setConfirm('');}}/>
   {showPassword?<>
    <AccountField label="Current password" value={current} onChangeText={setCurrent} password autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!busy}/>
    <AccountField label="New password" value={password} onChangeText={setPassword} helper="Use at least 8 characters." password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy}/>
    <AccountField label="Confirm new password" value={confirm} onChangeText={setConfirm} password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy}/>
    <ActionButton label="Update password" disabled={busy} onPress={()=>run(async()=>{await changePassword(user,current,password,confirm);setCurrent('');setPassword('');setConfirm('');setShowPassword(false);},'Your password was changed.')}/>
   </>:null}
   {state.role!=='patient'?<>
    <View style={styles.divider}/><Text style={styles.label}>Link an issued patient token</Text><Text style={styles.helper}>Register the visit first, then link its token to the patient’s account ID.</Text>
    <AccountField label="Patient account ID" value={patientId} onChangeText={setPatientId} autoCapitalize="none" autoCorrect={false} editable={!busy}/>
    <AccountField label="Issued token" value={token} onChangeText={setToken} placeholder="A001" autoCapitalize="characters" autoCorrect={false} editable={!busy}/>
    <ActionButton label="Link issued token" secondary disabled={busy} onPress={()=>run(async()=>{await linkTicket(patientId,token);setPatientId('');setToken('');},'Patient token linked.')}/>
    {state.role==='admin'?<ActionButton label="Initialize General OPD" secondary disabled={busy} onPress={()=>run(()=>initializeService(),'General OPD is initialized. Any existing queue was preserved.')}/>:null}
   </>:null}
   <View style={styles.divider}/><ActionButton label="Sign out" secondary disabled={busy} onPress={()=>run(()=>logout(),'Signed out.')}/>
   <TextLink label="Explore with sample data" disabled={busy} onPress={()=>{setDataMode(false);router.replace('/account');}}/>
  </>:<>
   {(['patient','staff','admin'] as const).map(role=><ActionButton key={role} label={`Open ${role} demo`} secondary disabled={busy} onPress={()=>{setRole(role);router.replace('/');}}/>)}
   <ActionButton label="Sign in to my account" disabled={busy} onPress={()=>{setDataMode(true);router.replace('/login');}}/>
   <TextLink label="Reset sample visits" disabled={busy} onPress={()=>run(()=>reset(),'Sample visits were reset.')}/>
  </>}
  <TextLink label="View the three welcome screens" disabled={busy} onPress={()=>router.push('/onboarding')}/>
 </AccountShell>;
}
