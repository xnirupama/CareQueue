import {useEffect,useState} from 'react';
import {Text} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {MobileAccountShell,ActionButton,TextLink,Notice,styles} from '../components/AccountUI';
import {accountError,logout,db} from '../services/firebase';
import {doc,onSnapshot} from 'firebase/firestore';
import {useStore} from '../services/store';
import {navigateBack} from '../services/back-navigation';

export default function StaffPending(){
 const router=useRouter(),{user,state,accountProfile,refreshAccount}=useStore();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [accessStatus,setAccessStatus]=useState('pending');
 useEffect(()=>{if(!db||!user)return;return onSnapshot(doc(db,'staffAccess',user.uid),snapshot=>setAccessStatus(snapshot.data()?.status||'pending'),e=>setMessage(accountError(e)));},[user]);
 if(!user)return <Redirect href="/login"/>;
 if(state.role!=='patient'||accountProfile?.accountType!=='staff')return <Redirect href="/"/>;
 async function check(){if(busy)return;setBusy(true);setMessage('');try{await refreshAccount();setMessage('If your access is still pending, contact your administrator and provide the account ID below.');}catch(e){setMessage(accountError(e));}finally{setBusy(false);}}
 return <MobileAccountShell title={accessStatus==='suspended'?'Staff access suspended':accessStatus==='revoked'?'Staff access revoked':'Staff approval pending'} subtitle="Your staff registration is saved. Contact your hospital administrator to confirm access to queue operations." onBack={()=>navigateBack(router,'/account')} backDisabled={busy}>
  <Notice message={message}/><Text style={styles.label}>{accountProfile.fullName}</Text><Text selectable style={styles.subtitle}>{user.email}</Text><Text style={styles.label}>Your account ID</Text><Text selectable style={styles.helper}>{user.uid}</Text>
  <ActionButton label={busy?'Checking access…':'Check approval status'} busy={busy} onPress={check}/>
  <TextLink label="Account and email verification" disabled={busy} onPress={()=>router.push('/account')}/>
  <TextLink label="Sign out" disabled={busy} onPress={()=>{logout().catch(e=>setMessage(accountError(e)));}}/>
 </MobileAccountShell>;
}
