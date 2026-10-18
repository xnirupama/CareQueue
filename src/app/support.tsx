import {useEffect,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Notice} from '../components/AccountUI';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
import {db} from '../services/firebase';
import {createSupport,editSupport,answerSupport,deleteSupport,watchSupport,supportCategories,supportFields,type SupportRequest} from '../services/support';
const demoKey='carequeue.support.demo.v1';
export default function Support(){const {isLive,user,state}=useStore();return <SupportContent key={`${isLive}-${user?.uid||'demo'}-${state.role}`}/>;}
function SupportContent(){
 const {state,isLive,user,accountProfile}=useStore(),a=useAction(),staff=state.role!=='patient';
 const [rows,setRows]=useState<SupportRequest[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const [id,setId]=useState(''),[category,setCategory]=useState<string>('Queue help'),[message,setMessage]=useState(''),[response,setResponse]=useState('');
 useEffect(()=>{
  let active=true;
  if(isLive&&db&&user)return watchSupport(db,user.uid,state.role,r=>{setRows(r);setLoaded(true);},m=>{setError(m);setLoaded(true);});
  AsyncStorage.getItem(demoKey).then(raw=>{if(active){setRows(raw?JSON.parse(raw):[]);setLoaded(true);}}).catch(()=>{if(active){setError('Saved support examples could not be loaded.');setLoaded(true);}});
  return()=>{active=false;};
 },[isLive,user,state.role]);
 const selected=rows.find(r=>r.id===id);
 async function saveDemo(next:SupportRequest[]){await AsyncStorage.setItem(demoKey,JSON.stringify(next));setRows(next);}
 function clear(){setId('');setCategory('Queue help');setMessage('');setResponse('');}
 async function save(){
  const fields=supportFields(category,message);
  if(isLive){if(!db||!user)throw Error('Sign in to continue.');if(id)await editSupport(db,id,category,message);else await createSupport(db,user.uid,accountProfile?.fullName||'Patient',category,message);}
  else if(id)await saveDemo(rows.map(r=>r.id===id?{...r,...fields}:r));
  else await saveDemo([{id:Date.now().toString(),ownerId:'demo-patient',ownerName:'Demo patient',...fields,status:'open',response:''},...rows]);
  clear();
 }
 async function reply(status:'open'|'resolved'){
  if(!response.trim()||response.trim().length>1000)throw Error('Enter a reply between 1 and 1,000 characters.');
  if(isLive){if(!db)throw Error('Database unavailable.');await answerSupport(db,id,response,status);}else await saveDemo(rows.map(r=>r.id===id?{...r,response:response.trim(),status}:r));
  clear();
 }
 return <WorkspacePage title={staff?'Patient support desk':'Patient support'} subtitle={staff?'Reply to queue, directions and accessibility requests.':'Send a request to the hospital support desk.'} busy={a.busy}><Notice message={error}/>{a.feedback}
  <Body>For urgent care, speak directly to hospital staff. Support replies appear here when the app is connected.</Body>
  {!staff?<Card title={id?'Edit my request':'New support request'}>{supportCategories.map(c=><ActionButton key={c} label={`${category===c?'Selected: ':''}${c}`} secondary disabled={a.busy} onPress={()=>setCategory(c)}/>)}<AccountField label="How can staff help?" value={message} onChangeText={setMessage} multiline maxLength={1000} editable={!a.busy}/><ActionButton label={id?'Save request changes':'Create support request'} busy={a.busy} disabled={Boolean(id&&selected?.status!=='open')} onPress={()=>a.run(save)}/>{id?<ActionButton label="Cancel editing" secondary disabled={a.busy} onPress={clear}/>:null}</Card>:selected?<Card title={`Reply · ${selected.category}`}><Body>{selected.message}</Body><AccountField label="Reply to patient" value={response} onChangeText={setResponse} multiline maxLength={1000} editable={!a.busy}/><ActionButton label="Reply and resolve request" busy={a.busy} onPress={()=>a.run(()=>reply('resolved'))}/><ActionButton label="Save reply and keep open" secondary disabled={a.busy} onPress={()=>a.run(()=>reply('open'))}/><ActionButton label="Cancel reply" secondary disabled={a.busy} onPress={clear}/></Card>:null}
  {!loaded?<Body>Loading support requests…</Body>:!rows.length?<Body>No support requests yet.</Body>:null}
  {rows.map(r=><Card key={r.id} title={`${r.category} · ${r.status}`}>
   {staff?<Body>{r.ownerName}</Body>:null}<Body>{r.message}</Body><Body>{r.response?`Staff reply: ${r.response}`:'Waiting for a staff reply.'}</Body>
   {staff?<ActionButton label={r.response?'Edit reply':'Reply to request'} secondary disabled={a.busy} onPress={()=>{setId(r.id);setResponse(r.response);}}/>:r.status==='open'?<ActionButton label="Edit request" secondary disabled={a.busy} onPress={()=>{setId(r.id);setCategory(r.category);setMessage(r.message);}}/>:null}
   {!staff||state.role==='admin'?<ActionButton label="Delete support request" secondary disabled={a.busy} onPress={()=>a.confirm('Delete this support request and its reply?',async()=>{if(isLive){if(!db)throw Error('Database unavailable.');await deleteSupport(db,r.id);}else await saveDemo(rows.filter(row=>row.id!==r.id));if(id===r.id)clear();})}/>:null}
  </Card>)}
 </WorkspacePage>;
}
