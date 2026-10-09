import {useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useRouter} from 'expo-router';
import {collection,onSnapshot} from 'firebase/firestore';
import {ActionButton,TextLink,Notice,styles as shared} from '../components/AccountUI';
import {watchStaffApplicants,approveStaffAccount,type StaffApplicant} from '../services/account-access';
import {db,accountError} from '../services/firebase';
import {useStore} from '../services/store';

export default function StaffApprovals(){
 const {isLive,user,state,adminSession}=useStore(),router=useRouter();
 const allowed=Boolean(isLive&&user&&state.role==='admin'&&adminSession);
 const [applicants,setApplicants]=useState<StaffApplicant[]>([]),[approved,setApproved]=useState<Record<string,boolean>>({}),[selected,setSelected]=useState<StaffApplicant|null>(null),[verified,setVerified]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[success,setSuccess]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!allowed||!db)return;
  const stopProfiles=watchStaffApplicants(db,rows=>{setApplicants(rows);setLoading(false);},m=>{setMessage(m);setLoading(false);});
  const stopAccess=onSnapshot(collection(db,'staffAccess'),snap=>setApproved(Object.fromEntries(snap.docs.map(d=>[d.id,d.data().approved===true]))),e=>setMessage(accountError(e)));
  return()=>{stopProfiles();stopAccess();};
 },[allowed]);
 if(!allowed)return <Redirect href="/admin-login"/>;
 async function approve(){if(!selected||!verified||!db||!user||busy)return;setBusy(true);setMessage('');setSuccess(false);try{await approveStaffAccount(db,user,selected.id);setSelected(null);setVerified(false);setSuccess(true);setMessage('Staff access approved. The staff member can check approval status or sign in again.');}catch(e){setMessage(accountError(e));}finally{setBusy(false);}}
 return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content}><Text style={s.brand}>CareQueue</Text><Text accessibilityRole="header" style={s.title}>Staff registrations</Text><Text style={shared.subtitle}>Review the applicant’s identity before approving access to patient queue operations.</Text><TextLink label="Return to administrator view" onPress={()=>router.replace('/')} disabled={busy}/><Notice message={message} success={success}/>
  {selected?<View style={s.card}><Text style={s.heading}>Review staff access</Text><Text style={shared.subtitle}>{selected.fullName}</Text><Text selectable style={shared.helper}>{selected.email}</Text><Text selectable style={shared.helper}>{selected.id}</Text><Pressable accessibilityRole="checkbox" accessibilityState={{checked:verified,disabled:busy}} disabled={busy} onPress={()=>setVerified(v=>!v)} style={s.confirm}><Text style={shared.link}>{verified?'☑':'☐'} I have verified this person is hospital staff</Text></Pressable><ActionButton label={busy?'Approving…':'Approve staff access'} busy={busy} disabled={!verified} onPress={approve}/><TextLink label="Cancel review" disabled={busy} onPress={()=>{setSelected(null);setVerified(false);}}/></View>:null}
  {loading?<Text style={shared.helper}>Loading staff registrations…</Text>:!applicants.length?<Text style={shared.subtitle}>No staff registrations yet.</Text>:applicants.filter(a=>a.id!==user?.uid).map(a=><View key={a.id} style={s.card}><Text style={s.heading}>{a.fullName}</Text><Text selectable style={shared.helper}>{a.email}</Text><Text selectable style={shared.helper}>Account ID: {a.id}</Text><Text style={shared.label}>{approved[a.id]?'Approved':'Awaiting review'}</Text>{!approved[a.id]?<ActionButton label="Review staff registration" secondary disabled={busy} onPress={()=>{setSelected(a);setVerified(false);setMessage('');}}/>:null}</View>)}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f8fafc'},content:{padding:24,gap:18,width:'100%',maxWidth:600,alignSelf:'center'},brand:{fontFamily:'Inter_700Bold',fontSize:22,color:'#09386b'},title:{fontFamily:'Inter_700Bold',fontSize:26,color:'#141f2b'},heading:{fontFamily:'Inter_700Bold',fontSize:17,color:'#09386b'},card:{padding:18,borderRadius:16,borderWidth:1,borderColor:'#d3e1eb',backgroundColor:'white',gap:12},confirm:{minHeight:52,justifyContent:'center',padding:8}});
