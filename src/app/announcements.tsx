import {useState} from 'react';
import {Redirect} from 'expo-router';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
export default function Announcements(){
 const {state,execute}=useStore(),a=useAction(),[id,setId]=useState(''),[message,setMessage]=useState('');
 if(state.role!=='admin')return <Redirect href="/"/>;
 return <WorkspacePage title="Service announcements" subtitle="Publish verified service updates for patients and staff." busy={a.busy}>{a.feedback}
  {!state.incidentVerified?<Card title="Confirm incident details"><Body>Check the information with hospital staff before publishing or editing a message.</Body><ActionButton label="I have verified the incident" disabled={a.busy} onPress={()=>a.run(()=>execute('verifyIncident'))}/></Card>:null}
  <Card title={id?'Edit announcement':'New announcement'}><AccountField label="Service message" value={message} onChangeText={setMessage} multiline maxLength={500} editable={!a.busy}/><ActionButton label={id?'Save announcement changes':'Create announcement'} busy={a.busy} disabled={!state.incidentVerified} onPress={()=>a.run(async()=>{await execute(id?'editBroadcast':'broadcast',{'Broadcast ID':id,'Message':message});setId('');setMessage('');})}/>{id?<ActionButton label="Cancel editing" secondary disabled={a.busy} onPress={()=>{setId('');setMessage('');}}/>:null}</Card>
  {state.broadcasts.map(b=><Card key={b.id} title={new Date(b.at).toLocaleString()}><Body>{b.message}</Body>{b.updatedAt?<Body>Edited {new Date(b.updatedAt).toLocaleString()}</Body>:null}<ActionButton label="Edit announcement" secondary disabled={a.busy} onPress={()=>{setId(b.id);setMessage(b.message);}}/><ActionButton label="Delete announcement" secondary disabled={a.busy} onPress={()=>a.confirm('Remove this announcement from the service feed. Its publication and changes remain in the audit.',async()=>{await execute('removeBroadcast',{'Broadcast ID':b.id});if(id===b.id){setId('');setMessage('');}})}/></Card>)}
  {!state.broadcasts.length?<Body>No published announcements.</Body>:null}
 </WorkspacePage>;
}
