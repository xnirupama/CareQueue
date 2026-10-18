import {useState} from 'react';
import {Redirect} from 'expo-router';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
import {linkTicket} from '../services/firebase';
export default function PatientRecords(){
 const {state,execute,isLive}=useStore(),a=useAction();
 const [search,setSearch]=useState(''),[selected,setSelected]=useState(''),[name,setName]=useState(''),[phone,setPhone]=useState(''),[uid,setUid]=useState('');
 if(state.role==='patient')return <Redirect href="/"/>;
 const row=state.queue.find(q=>q.token===selected);
 function clear(){setSelected('');setName('');setPhone('');setUid('');}
 return <WorkspacePage title="Patient registrations" subtitle="Register a visit and manage its details." busy={a.busy}>{a.feedback}
  <Card title={row?`Edit ${row.token}`:'New visit'}><AccountField label="Patient name" value={name} onChangeText={setName} maxLength={80} editable={!a.busy}/><AccountField label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!a.busy}/>
   <ActionButton label={row?'Save patient changes':'Create registration'} busy={a.busy} onPress={()=>a.run(async()=>{await execute(row?'editPatient':'register',{'Token':selected,'Patient name':name,'Phone number':phone});clear();})}/>
   {row?<><Body>Status: {row.status}. The issued token stays the same when details change.</Body>
    {isLive?<><AccountField label="Patient account ID" value={uid} onChangeText={setUid} autoCapitalize="none" editable={!a.busy}/><ActionButton label="Link issued token" secondary disabled={a.busy} onPress={()=>a.run(()=>linkTicket(uid,row.token))}/></>:null}
    {['completed','cancelled'].includes(row.status)?<ActionButton label="Delete closed registration" secondary disabled={a.busy} onPress={()=>a.confirm(`Delete ${row.token} and its linked closed ticket and resolved recovery request. The audit history remains.`,async()=>{await execute('deletePatient',{'Token':row.token});clear();})}/>:<Body>Complete or cancel this visit from Queue operations before deleting it.</Body>}
    <ActionButton label="Start a new registration" secondary disabled={a.busy} onPress={clear}/></>:null}
  </Card>
  <AccountField label="Find by token, name or phone" value={search} onChangeText={setSearch}/>
  {state.queue.filter(q=>`${q.token} ${q.patientName} ${q.phone}`.toLowerCase().includes(search.toLowerCase())).map(q=><Card key={q.token} title={`${q.token} · ${q.patientName}`}><Body>{q.status} · {q.phone||'No phone saved'}{q.accountLinked?' · Account linked':''}</Body><ActionButton label={`Edit ${q.token}`} secondary disabled={a.busy} onPress={()=>{setSelected(q.token);setName(q.patientName);setPhone(q.phone);setUid(q.accountLinked?q.patientId:'');}}/></Card>)}
  {!state.queue.length?<Body>No registrations yet. Create the first visit above.</Body>:null}
 </WorkspacePage>;
}
