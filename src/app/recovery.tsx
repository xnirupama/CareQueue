import {useState} from 'react';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
export default function Recovery(){
 const {state,execute,isLive,update}=useStore(),a=useAction(),[reasonDraft,setReason]=useState<string|null>(null);
 const reason=reasonDraft??state.ownRecovery?.reason??'';
 const staff=state.role!=='patient',status=state.ticketStatus||state.queue.find(q=>q.token===state.myToken)?.status;
 return <WorkspacePage title={staff?'Recovery desk':'Missed-turn recovery'} subtitle={staff?'Review requests before restoring a visit.':'Ask staff to review a missed turn. Your place changes only after staff approval.'} busy={a.busy}>{a.feedback}
  {!staff?<>
   <Card title={`My visit · ${state.myToken}`}><Body>Visit status: {status||'No linked visit'}. Recovery: {state.recovery}.</Body>
    {state.ownRecovery?<Body>Your reason: {state.ownRecovery.reason||'No reason supplied'}</Body>:null}
    {status==='missed'&&(state.recovery!=='approved'||state.ownRecovery?.token!==state.myToken)?<><AccountField label="Why did you miss your turn?" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!a.busy}/><ActionButton label={state.recovery==='pending'?'Save request changes':'Create recovery request'} busy={a.busy} onPress={()=>a.run(()=>execute(state.recovery==='pending'?'editRecovery':'requestRecovery',{'Reason':reason}),'Your request is waiting for staff review.')}/></>:null}
    {state.recovery==='pending'?<ActionButton label="Withdraw and delete request" secondary disabled={a.busy} onPress={()=>a.confirm('Delete your pending request. Your visit stays missed; you can request another review.',()=>execute('cancelRecovery'))}/>:null}
    {status!=='missed'?<Body>Recovery becomes available when staff mark your visit as a missed turn. For other queue problems, open Patient support.</Body>:null}
   </Card>
   {!isLive&&status!=='missed'?<ActionButton label="Try a missed-turn example" secondary disabled={a.busy} onPress={()=>update({ticketStatus:'missed',queue:state.queue.map(q=>q.token===state.myToken?{...q,status:'missed'}:q)})}/>:null}
  </>:<>
   {!(state.recoveryRequests||[]).length?<Body>No recovery requests yet.</Body>:null}
   {(state.recoveryRequests||[]).map(r=><Card key={r.patientId} title={`${r.token} · ${r.status}`}><Body>{r.reason||'No reason supplied. Verify with the patient at the counter.'}</Body>
    {r.status==='pending'?<><ActionButton label={`Approve ${r.token}`} disabled={a.busy} onPress={()=>a.confirm(`Confirm this patient's identity and return ${r.token} to waiting. Clinical priority still applies.`,()=>execute('approveRecovery',{'Patient ID':r.patientId,'Token':r.token}))}/><ActionButton label={`Reject ${r.token}`} secondary disabled={a.busy} onPress={()=>a.confirm(`Reject this recovery request for ${r.token}. The visit stays missed.`,()=>execute('rejectRecovery',{'Patient ID':r.patientId,'Token':r.token}))}/></>:<ActionButton label="Delete resolved request" secondary disabled={a.busy} onPress={()=>a.confirm(`Delete the resolved request for ${r.token}. Its decision remains in the audit history.`,()=>execute('deleteRecovery',{'Patient ID':r.patientId}))}/>}
   </Card>)}
  </>}
 </WorkspacePage>;
}
