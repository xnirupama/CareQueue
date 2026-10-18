import {useState} from 'react';
import {Redirect} from 'expo-router';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
export default function StaffNotes(){
 const {state,execute}=useStore(),a=useAction(),[id,setId]=useState(''),[note,setNote]=useState('');
 if(state.role==='patient')return <Redirect href="/"/>;
 return <WorkspacePage title="Continuity notes" subtitle="Keep pending notes on this device during an outage." busy={a.busy}>{a.feedback}
  <Body>Use the numbered paper register during outages. Verify every note against the current queue before reconciliation. Reconciliation archives notes; queue corrections require a separate staff action.</Body>
  <Card title={id?'Edit pending note':'New manual note'}><AccountField label="Token, action and time" value={note} onChangeText={setNote} multiline maxLength={1000} editable={!a.busy}/><ActionButton label={id?'Save note changes':'Create device-local note'} busy={a.busy} onPress={()=>a.run(async()=>{await execute(id?'editManualRecord':'manualRecord',{'Note ID':id,'Manual action':note});setId('');setNote('');})}/>{id?<ActionButton label="Cancel editing" secondary disabled={a.busy} onPress={()=>{setId('');setNote('');}}/>:null}</Card>
  {state.offlineActions.map(n=><Card key={n.id} title={new Date(n.at).toLocaleString()}><Body>{n.action}</Body><ActionButton label="Edit note" secondary disabled={a.busy} onPress={()=>{setId(n.id);setNote(n.action);}}/><ActionButton label="Delete pending note" secondary disabled={a.busy} onPress={()=>a.confirm('Delete this pending device note before reconciliation?',async()=>{await execute('deleteManualRecord',{'Note ID':n.id});if(id===n.id){setId('');setNote('');}})}/></Card>)}
  {state.offlineActions.length?<ActionButton label="Review and reconcile notes" disabled={a.busy} onPress={()=>a.confirm('I have checked these notes against the current queue for duplicates and conflicts. Archive them in the audit and clear this device’s pending list.',()=>execute('reconcile'))}/>:<Body>No pending notes. Reconciled audit records remain read-only.</Body>}
 </WorkspacePage>;
}
