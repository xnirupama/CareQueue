import {useState} from 'react';
import {Text} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {MobileAccountShell,ActionButton,TextLink,Notice,styles} from '../components/AccountUI';
import {accountError,logout} from '../services/firebase';
import {useStore} from '../services/store';

export default function StaffPending(){
 const router=useRouter(),{user,state,accountProfile,refreshAccount}=useStore();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!user)return <Redirect href="/login"/>;
 if(state.role!=='patient'||accountProfile?.accountType!=='staff')return <Redirect href="/"/>;
 async function check(){if(busy)return;setBusy(true);setMessage('');try{await refreshAccount();setMessage('If your access is still pending, contact your administrator and provide the account ID below.');}catch(e){setMessage(accountError(e));}finally{setBusy(false);}}
 return <MobileAccountShell title="Staff approval pending" subtitle="Your staff registration is saved. An administrator must approve access before you can manage queues.">
  <Notice message={message}/><Text style={styles.label}>{accountProfile.fullName}</Text><Text selectable style={styles.subtitle}>{user.email}</Text><Text style={styles.label}>Your account ID</Text><Text selectable style={styles.helper}>{user.uid}</Text>
  <ActionButton label={busy?'Checking access…':'Check approval status'} busy={busy} onPress={check}/>
  <TextLink label="Account and email verification" disabled={busy} onPress={()=>router.push('/account')}/>
  <TextLink label="Sign out" disabled={busy} onPress={()=>{logout().catch(e=>setMessage(accountError(e)));}}/>
 </MobileAccountShell>;
}
