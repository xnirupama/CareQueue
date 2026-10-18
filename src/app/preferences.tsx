import {WorkspacePage,Card,Body,ActionButton,useAction} from '../components/WorkspaceUI';
import {useStore} from '../services/store';
export default function Preferences(){
 const {state,update,execute}=useStore(),a=useAction();
 return <WorkspacePage title="Accessibility settings" subtitle="Make CareQueue easier to follow." busy={a.busy}>{a.feedback}
  <Card title="Text and language"><ActionButton label={`Large text: ${state.largeText?'On':'Off'}`} secondary disabled={a.busy} onPress={()=>update({largeText:!state.largeText})}/>{(['en','si','ta'] as const).map((language,i)=><ActionButton key={language} label={`${state.language===language?'Selected: ':''}${['English','සිංහල','தமிழ்'][i]}`} secondary disabled={a.busy} onPress={()=>update({language})}/>)}</Card>
  <Card title="Queue alerts"><ActionButton label={`In-app alerts: ${state.appAlerts?'On':'Off'}`} secondary disabled={a.busy} onPress={()=>update({appAlerts:!state.appAlerts})}/><ActionButton label={`SMS preference: ${state.sms?'On':'Off'}`} secondary disabled={a.busy} onPress={()=>update({sms:!state.sms})}/><Body>Queue messages appear while the app is connected. SMS and background push delivery are not connected. Language applies to the available translated queue labels; account and support forms are currently in English.</Body></Card>
  <ActionButton label={state.preferencesSaved?'Update saved preferences':'Save preferences'} busy={a.busy} onPress={()=>a.run(()=>execute('preferences'))}/><ActionButton label="Delete saved preferences and reset" secondary disabled={a.busy} onPress={()=>a.confirm('Delete saved text, language and alert preferences and restore the defaults. Caregiver consent is kept.',()=>execute('resetPreferences'))}/>
 </WorkspacePage>;
}
