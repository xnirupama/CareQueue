import {useEffect,useState} from 'react';
import {Pressable,Text} from 'react-native';
import {Redirect} from 'expo-router';
import {collection,onSnapshot} from 'firebase/firestore';
import {WorkspacePage,Card,Body,ActionButton,useAction} from '../components/WorkspaceUI';
import {watchStaffApplicants,approveStaffAccount,changeStaffAccess,type StaffApplicant} from '../services/account-access';
import {db} from '../services/firebase';
import {useStore} from '../services/store';
export default function StaffApprovals(){
 const {isLive,user,state,adminSession}=useStore(),a=useAction();
 const allowed=Boolean(isLive&&user&&state.role==='admin'&&adminSession);
 const [applicants,setApplicants]=useState<StaffApplicant[]>([]),[access,setAccess]=useState<Record<string,{approved:boolean;status?:string}>>({});
 const [selected,setSelected]=useState<StaffApplicant|null>(null),[verified,setVerified]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 useEffect(()=>{
  if(!allowed||!db)return;
  const stopProfiles=watchStaffApplicants(db,rows=>{setApplicants(rows);setLoaded(true);},m=>{setError(m);setLoaded(true);});
  const stopAccess=onSnapshot(collection(db,'staffAccess'),snap=>setAccess(Object.fromEntries(snap.docs.map(d=>[d.id,{approved:d.data().approved===true,status:d.data().status}]))),e=>setError(e.message));
  return()=>{stopProfiles();stopAccess();};
 },[allowed]);
 if(!allowed)return <Redirect href="/admin-login"/>;
 return <WorkspacePage title="Staff access" subtitle="Verify hospital staff before granting queue access." busy={a.busy}>{a.feedback}{error?<Body>{error}</Body>:null}
  {selected?<Card title="Review staff identity"><Body>{selected.fullName} · {selected.email}</Body><Pressable accessibilityRole="checkbox" accessibilityState={{checked:verified,disabled:a.busy}} disabled={a.busy} onPress={()=>setVerified(v=>!v)} style={{minHeight:52,justifyContent:'center'}}><Text style={{fontSize:16,color:'#09386b'}}>{verified?'☑':'☐'} I verified this person is hospital staff</Text></Pressable><ActionButton label="Approve staff access" disabled={!verified} busy={a.busy} onPress={()=>a.run(async()=>{if(!db||!user)throw Error('Administrator sign-in required.');await approveStaffAccount(db,user,selected.id);setSelected(null);setVerified(false);})}/><ActionButton label="Cancel review" secondary disabled={a.busy} onPress={()=>setSelected(null)}/></Card>:null}
  {!loaded?<Body>Loading staff registrations…</Body>:!applicants.length?<Body>No staff registrations yet.</Body>:null}
  {applicants.filter(p=>p.id!==user?.uid).map(p=><Card key={p.id} title={p.fullName}><Body>{p.email}</Body><Text selectable style={{color:'#52697a'}}>Account ID: {p.id}</Text><Body>Status: {access[p.id]?.status||(access[p.id]?.approved?'active':'awaiting approval')}</Body>
   {access[p.id]?.approved?<><ActionButton label="Suspend access" secondary disabled={a.busy} onPress={()=>a.confirm(`Suspend queue access for ${p.fullName}? You can approve this account again later.`,async()=>{if(!db||!user)throw Error('Administrator sign-in required.');await changeStaffAccess(db,user,p.id,'suspended');})}/><ActionButton label="Revoke staff access" secondary disabled={a.busy} onPress={()=>a.confirm(`Remove ${p.fullName}'s staff access. Their login remains available for viewing their access status.`,async()=>{if(!db||!user)throw Error('Administrator sign-in required.');await changeStaffAccess(db,user,p.id,'revoked');})}/></>:<ActionButton label="Review and approve access" secondary disabled={a.busy} onPress={()=>{setSelected(p);setVerified(false);}}/>}
  </Card>)}
 </WorkspacePage>;
}
