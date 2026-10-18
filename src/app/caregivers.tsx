import {useState} from 'react';
import {WorkspacePage,Card,Body,AccountField,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
import {patientFormErrors,type FieldErrors} from '../services/patient-validation';
export default function Caregivers(){
 const {state,execute,user,isLive}=useStore(),a=useAction();
 const [errors,setErrors]=useState<FieldErrors>({});
 const [nameDraft,setName]=useState<string|null>(null),[phoneDraft,setPhone]=useState<string|null>(null),[uidDraft,setUid]=useState<string|null>(null);
 const name=nameDraft??state.caregiver?.name??'',phone=phoneDraft??state.caregiver?.phone??'',uid=uidDraft??state.caregiver?.accountId??'';
 function save(){
  const fields={'Caregiver name':name,'Phone number':phone,'Caregiver account ID':uid};
  const invalid=patientFormErrors('caregiver',fields,isLive?user?.uid:undefined);setErrors(invalid);
  if(Object.keys(invalid).length)return;
  a.confirm(`Save your consent to share queue updates with ${name.trim()}?`,()=>execute('caregiver',fields));
 }
 return <WorkspacePage title="Caregiver sharing" subtitle="Choose who can follow your visit." busy={a.busy}>{a.feedback}
  <Card title={state.caregiver?'Saved caregiver consent':'Add caregiver consent'}><Body>{state.caregiver?`${state.caregiver.name} · ${state.caregiver.phone}`:'No saved caregiver.'} A linked caregiver account sees your token, visit status and position. Share your name or medical details directly if needed.</Body>
   <AccountField label="Caregiver name" value={name} onChangeText={value=>{setName(value);setErrors(e=>({...e,'Caregiver name':undefined}));}} error={errors['Caregiver name']} editable={!a.busy} maxLength={80} autoComplete="name"/>
   <AccountField label="Caregiver phone" value={phone} onChangeText={value=>{setPhone(value);setErrors(e=>({...e,'Phone number':undefined}));}} error={errors['Phone number']} helper="0771234567 or +94771234567. Spaces and hyphens are accepted." keyboardType="phone-pad" maxLength={24} editable={!a.busy}/>
   <AccountField label="Caregiver account ID (optional)" value={uid} onChangeText={value=>{setUid(value);setErrors(e=>({...e,'Caregiver account ID':undefined}));}} error={errors['Caregiver account ID']} helper="Copy this from the caregiver’s Account page. Do not enter an email address." autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!a.busy}/><Body>Confirm sharing for each new visit. Without an account ID, this saves your consent and contact preference only; SMS delivery is not connected.</Body>
   <ActionButton label={state.caregiver?'Update caregiver consent':'Create caregiver consent'} disabled={a.busy} onPress={save}/>
   {state.caregiver?<ActionButton label="Delete consent and revoke sharing" secondary disabled={a.busy} onPress={()=>a.confirm('Remove the saved contact and revoke their CareQueue access to this visit.',async()=>{await execute('revokeCaregiver');setName(null);setPhone(null);setUid(null);setErrors({});})}/>:null}
  </Card>
  {state.sharedVisits?.map(v=><Card key={v.id} title={`Shared with me · ${v.token}`}><Body>{v.status} · {v.patientsAhead} patients ahead</Body></Card>)}
 </WorkspacePage>;
}
