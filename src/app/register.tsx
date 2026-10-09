import {useState} from 'react';
import {Text,View,Pressable} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {MobileAccountShell,AccountField,ActionButton,TextLink,Notice,styles} from '../components/AccountUI';
import {accountError,validateAccount,type AccountErrors,type RegistrationFields} from '../services/authentication';
import {configured} from '../services/firebase';
import {useStore} from '../services/store';

export default function Register(){
 const router=useRouter(),{signUp,isLive,user,ready}=useStore();
 const [fields,setFields]=useState<RegistrationFields>({name:'',email:'',password:'',confirmPassword:'',accountType:''}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[errors,setErrors]=useState<AccountErrors>({});
 const change=(key:keyof RegistrationFields)=>(value:string)=>{setFields(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:undefined}));};
 if(isLive&&user&&ready&&!busy)return <Redirect href="/"/>;
 async function submit(){
  if(busy)return;
  const invalid=validateAccount(fields);setErrors(invalid);setMessage('');if(Object.keys(invalid).length)return;
  setBusy(true);try{await signUp(fields);setFields(f=>({...f,password:'',confirmPassword:''}));router.replace({pathname:'/login',params:{registered:'1',email:fields.email.trim(),accountType:fields.accountType}});}catch(error){setMessage(accountError(error));}finally{setBusy(false);}
 }
 return <MobileAccountShell title="Create account" subtitle="Choose your account type and register." onBack={()=>router.replace('/login')} backDisabled={busy}>
  <Notice message={message}/>{!configured?<Notice message="Account registration is unavailable until Firebase is configured."/>:null}
  <View style={styles.field}><Text style={styles.label}>Register as</Text><View style={{flexDirection:'row',gap:12}}>{(['patient','staff'] as const).map(type=><Pressable key={type} accessibilityRole="radio" accessibilityLabel={`Register as ${type}`} accessibilityState={{checked:fields.accountType===type,disabled:busy}} disabled={busy} onPress={()=>{setFields(f=>({...f,accountType:type}));setErrors(e=>({...e,accountType:undefined}));}} style={{flex:1,minHeight:60,padding:16,borderRadius:16,borderWidth:fields.accountType===type?2:1,borderColor:fields.accountType===type?'#09386b':'#d3e1eb',backgroundColor:fields.accountType===type?'#edf5ff':'white'}}><Text style={{fontFamily:'Inter_700Bold',fontSize:14,color:'#09386b',textTransform:'capitalize'}}>{fields.accountType===type?'● ':'○ '}{type}</Text></Pressable>)}</View>{errors.accountType?<Text accessibilityRole="alert" style={styles.errorText}>{errors.accountType}</Text>:null}<Text style={styles.helper}>{fields.accountType==='staff'?'Staff access requires administrator approval before queue operations become available.':'Choose Patient to follow your visit, or Staff to request hospital staff access.'}</Text></View>
  <AccountField label="Full name" placeholder="Your full name" value={fields.name} onChangeText={change('name')} error={errors.name} autoComplete="name" textContentType="name" maxLength={80} editable={!busy}/>
  <AccountField label="Email address" placeholder="you@example.com" value={fields.email} onChangeText={change('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy}/>
  <AccountField label="Password" placeholder="Create a password" value={fields.password} onChangeText={change('password')} error={errors.password} helper="Use at least 8 characters." password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy}/>
  <AccountField label="Confirm password" placeholder="Enter your password again" value={fields.confirmPassword} onChangeText={change('confirmPassword')} error={errors.confirmPassword} password autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!busy} returnKeyType="go" onSubmitEditing={submit}/>
  <Text style={styles.helper}>{fields.accountType==='staff'?'Your staff registration will be saved for administrator review.':'The registration counter will link your hospital-issued token to this account.'}</Text>
  <ActionButton label={busy?'Creating your account…':'Create account'} busy={busy} disabled={!configured} onPress={submit}/>
  <TextLink label="Already have an account? Sign in" disabled={busy} onPress={()=>router.replace('/login')}/>
 </MobileAccountShell>;
}
