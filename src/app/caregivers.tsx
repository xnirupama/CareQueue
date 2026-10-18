import {useState} from 'react';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
export default function Caregivers(){
 const {state,execute}=useStore(),a=useAction();
 const [nameDraft,setName]=useState<string|null>(null),[phoneDraft,setPhone]=useState<string|null>(null),[uidDraft,setUid]=useState<string|null>(null);
 const name=nameDraft??state.caregiver?.name??'',phone=phoneDraft??state.caregiver?.phone??'',uid=uidDraft??state.caregiver?.accountId??'';
 return <WorkspacePage title="Caregiver sharing" subtitle="Choose who can follow your visit." busy={a.busy}>{a.feedback}
  <Card title={state.caregiver?'Saved caregiver consent':'Add caregiver consent'}><Body>{state.caregiver?`${state.caregiver.name} · ${state.caregiver.phone}`:'No saved caregiver.'} A linked caregiver account sees your token, visit status and position. Share your name or medical details directly if needed.</Body>
   <AccountField label="Caregiver name" value={name} onChangeText={setName} editable={!a.busy} maxLength={80}/><AccountField label="Caregiver phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!a.busy}/><AccountField label="Caregiver account ID (optional)" value={uid} onChangeText={setUid} autoCapitalize="none" autoCorrect={false} editable={!a.busy}/><Body>Confirm sharing for each new visit. Without an account ID, this saves your consent and contact preference only; SMS delivery is not connected.</Body>
   <ActionButton label={state.caregiver?'Update caregiver consent':'Create caregiver consent'} disabled={a.busy} onPress={()=>a.confirm(`Save your consent to share queue updates with ${name||'this caregiver'}?`,()=>execute('caregiver',{'Caregiver name':name,'Phone number':phone,'Caregiver account ID':uid}))}/>
   {state.caregiver?<ActionButton label="Delete consent and revoke sharing" secondary disabled={a.busy} onPress={()=>a.confirm('Remove the saved contact and revoke their CareQueue access to this visit.',async()=>{await execute('revokeCaregiver');setName(null);setPhone(null);setUid(null);})}/>:null}
  </Card>
  {state.sharedVisits?.map(v=><Card key={v.id} title={`Shared with me · ${v.token}`}><Body>{v.status} · {v.patientsAhead} patients ahead</Body></Card>)}
 </WorkspacePage>;
}
