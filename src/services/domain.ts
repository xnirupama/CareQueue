import type {AppState,Role,QueueRecord} from '../data/types';
export type Command='preferences'|'caregiver'|'revokeCaregiver'|'requestRecovery'|'register'|'callNext'|'recall'|'priority'|'approveRecovery'|'rejectRecovery'|'broadcast'|'removeBroadcast'|'serviceStatus'|'editPatient'|'markMissed'|'complete'|'cancel'|'offline'|'manualRecord'|'reconcile'|'verifyIncident';
const patientCommands=new Set<Command>(['preferences','caregiver','revokeCaregiver','requestRecovery']);
export function validate(command:Command,fields:Record<string,string>,role:Role){
 if(!patientCommands.has(command)&&role==='patient')throw Error('This action requires an authorized staff account.');
 if(['verifyIncident','serviceStatus','removeBroadcast'].includes(command)&&role!=='admin')throw Error('An administrator must confirm this action.');
 if(command==='register'&&fields['Service']&&fields['Service']!=='General OPD')throw Error('This counter is configured for General OPD.');
 const name=fields['Full name']||fields['Patient name']||fields['Caregiver name'];
 if(['register','editPatient','caregiver'].includes(command)&&(!name||name.trim().length<2))throw Error('Enter the full name.');
 if(['register','editPatient','caregiver'].includes(command)){const phone=fields['Phone number']||fields['Contact number']||'';if((command==='caregiver'||phone)&&!/^(?:\+94|0)\s*[1-9][0-9\s-]{8,12}$/.test(phone))throw Error('Enter a valid Sri Lankan phone number.');}
 if(command==='priority'&&!(fields['Clinical reason']||fields['Reason category']||fields['Reason']||'').trim())throw Error('Enter the clinical reason before applying priority.');
 if(command==='serviceStatus'&&!['open','delay','unavailable'].includes(fields['Status']))throw Error('Select a valid service status.');
}
/** The currently called patient precedes waiting patients. Clinical priority is
 * applied to waiting patients only; stable array order preserves registration order. */
export function orderedQueue(queue:QueueRecord[]){return [...queue.filter(q=>q.status==='called'),...queue.filter(q=>q.status==='waiting'&&q.priority==='clinical'),...queue.filter(q=>q.status==='waiting'&&q.priority!=='clinical')];}
export function aheadOf(queue:QueueRecord[],token:string){const index=orderedQueue(queue).findIndex(q=>q.token===token);return Math.max(0,index);}
export function nextToken(state:AppState){const numbers=[state.nowServing,...state.queue.map(q=>q.token)].map(token=>/^A\d+$/.test(token)?Number(token.slice(1)):0);return `A${String(Math.max(0,...numbers)+1).padStart(3,'0')}`;}
export function applyCommand(state:AppState,command:Command,fields:Record<string,string>={},at=new Date().toISOString(),eventId=`${Date.now()}-${Math.random().toString(36).slice(2)}`):AppState{
 validate(command,fields,state.role);if(state.audit.some(e=>e.id===eventId))return state;
 const s=structuredClone(state);const event={id:eventId,action:command,at,role:s.role,detail:''};s.audit.unshift(event);
 const selected=()=>{const q=s.queue.find(q=>q.token===(fields['Token']||s.selectedToken));if(!q)throw Error('Select a valid token.');return q;};
 switch(command){
 case 'preferences':break;
 case 'caregiver':s.caregiver={name:fields['Caregiver name'].trim(),phone:fields['Phone number']||fields['Contact number'],...(fields['Caregiver account ID']?.trim()?{accountId:fields['Caregiver account ID'].trim()}: {})};break;
 case 'revokeCaregiver':delete s.caregiver;break;
 case 'requestRecovery':if(s.myToken==='—')throw Error('Retrieve your hospital-issued token first.');s.recovery='pending';break;
 case 'register':s.queue.push({token:nextToken(s),patientName:(fields['Full name']||fields['Patient name']).trim(),patientId:eventId,phone:fields['Phone number']||fields['Contact number']||'',status:'waiting',createdAt:at});break;
 case 'callNext':{if(s.serviceStatus!=='open')throw Error('The service must be open before calling the next patient.');const next=orderedQueue(s.queue).find(q=>q.status==='waiting');if(!next)throw Error('No waiting patients.');s.queue.filter(q=>q.status==='called').forEach(q=>{q.status='completed';q.completedAt=at;});next.status='called';next.calledAt=at;s.nowServing=next.token;event.detail=next.token;break;}
 case 'recall':if(!s.queue.some(q=>q.token===s.nowServing&&q.status==='called'))throw Error('No patient is currently called.');event.detail=s.nowServing;break;
 case 'editPatient':{const q=selected();q.patientName=(fields['Full name']||fields['Patient name']).trim();q.phone=fields['Phone number']||fields['Contact number']||'';event.detail=q.token;break;}
 case 'markMissed':case 'complete':case 'cancel':{const q=selected();if(command==='cancel'&&!['waiting','missed'].includes(q.status))throw Error('Only a waiting or missed visit can be cancelled.');if(command!=='cancel'&&q.status!=='called')throw Error('Only a called patient can be marked missed or completed.');q.status=command==='markMissed'?'missed':command==='complete'?'completed':'cancelled';if(command==='complete')q.completedAt=at;if(s.nowServing===q.token)s.nowServing='—';event.detail=q.token;break;}
 case 'priority':{const q=selected();if(q.status!=='waiting')throw Error('Only a waiting patient can receive clinical priority.');q.priority='clinical';q.reason=fields['Clinical reason']||fields['Reason category']||fields['Reason'];event.detail=q.token+' · clinician-reviewed priority';break;}
 case 'approveRecovery':case 'rejectRecovery':{const request=s.recoveryRequests?.find(r=>r.status==='pending'&&(fields['Patient ID']?r.patientId===fields['Patient ID']:true));const token=fields['Token']||request?.token||s.myToken;const q=s.queue.find(q=>q.token===token);if(!q)throw Error('Recovery token not found.');if(command==='approveRecovery'){if(q.status==='completed'||q.status==='cancelled')throw Error('A completed or cancelled visit cannot rejoin the queue.');q.status='waiting';delete q.calledAt;if(s.nowServing===q.token)s.nowServing='—';}s.recovery=command==='approveRecovery'?'approved':'rejected';if(request)request.status=s.recovery;event.detail=q.token+' · '+s.recovery;break;}
 case 'broadcast':{if(s.role==='admin'&&!s.incidentVerified)throw Error('Verify the incident before publishing.');const message=(fields['Message']||fields['Service update']||'General OPD delayed. Please remain near Room 04; queue updates will continue.').trim();if(!message)throw Error('Enter a service message.');s.broadcasts.unshift({id:eventId,message,at});s.serviceStatus='delay';event.detail='Verified General OPD message';break;}
 case 'removeBroadcast':{const index=s.broadcasts.findIndex(b=>b.id===fields['Broadcast ID']);if(index<0)throw Error('Message not found.');s.broadcasts.splice(index,1);event.detail='Withdrawn service message';break;}
 case 'serviceStatus':s.serviceStatus=fields['Status'] as AppState['serviceStatus'];event.detail=s.serviceStatus;break;
 case 'offline':s.serviceStatus='offline';break;
 case 'manualRecord':if(!(fields['Manual action']||'').trim())throw Error('Describe the manual action before saving.');s.offlineActions.push({id:eventId,action:fields['Manual action'].trim(),at});break;
 case 'reconcile':s.offlineActions=[];s.serviceStatus='open';break;
 case 'verifyIncident':s.incidentVerified=true;break;
 }
 s.updatedAt=['manualRecord','offline','preferences','caregiver','revokeCaregiver','requestRecovery'].includes(command)?state.updatedAt:at;return s;
}
export function patientsAhead(state:AppState){return state.patientsAhead??aheadOf(state.queue,state.myToken);}
export function waitEstimate(state:AppState){if(state.serviceStatus!=='open'||state.myToken==='—')return 'Estimate unavailable';const status=state.ticketStatus||state.queue.find(q=>q.token===state.myToken)?.status;if(status==='called'||state.nowServing===state.myToken)return 'Your turn';if(status==='completed')return 'Completed';if(status==='cancelled')return 'Cancelled';if(status==='missed')return 'Ask staff for help';const n=patientsAhead(state);return n?`${n*3}–${n*5} min`:'Await staff call';}
export function operationalMetrics(state:AppState){const waits=state.queue.filter(q=>q.calledAt).map(q=>(Date.parse(q.calledAt!)-Date.parse(q.createdAt))/60000).filter(n=>Number.isFinite(n)&&n>=0);return {registered:state.queue.length,waiting:state.queue.filter(q=>q.status==='waiting').length,completed:state.queue.filter(q=>q.status==='completed').length,missed:state.queue.filter(q=>q.status==='missed').length,cancelled:state.queue.filter(q=>q.status==='cancelled').length,delayUpdates:state.audit.filter(e=>e.action==='broadcast'||e.action==='serviceStatus'&&e.detail==='delay').length,meanWaitMinutes:waits.length?Math.round(waits.reduce((a,b)=>a+b,0)/waits.length):null,measuredCalls:waits.length};}

/** Project only the permitted profile fields; a TypeScript Pick does not remove
 * extra runtime keys from an AppState supplied by the caller. */
export function preferenceData(state:Pick<AppState,'sms'|'appAlerts'|'language'|'largeText'>){const {sms,appAlerts,language,largeText}=state;return {sms,appAlerts,language,largeText};}
