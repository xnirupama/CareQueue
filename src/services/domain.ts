import type {AppState,Role} from '../data/types';
export type Command='preferences'|'caregiver'|'revokeCaregiver'|'requestRecovery'|'register'|'callNext'|'recall'|'priority'|'approveRecovery'|'broadcast'|'offline'|'manualRecord'|'reconcile'|'verifyIncident';
const privileged=new Set<Command>(['register','callNext','recall','priority','approveRecovery','broadcast','offline','manualRecord','reconcile','verifyIncident']);
export function validate(command:Command,fields:Record<string,string>,role:Role){
 if(privileged.has(command)&&role==='patient')throw Error('This action requires an authorized staff account.');
 if(command==='verifyIncident'&&role!=='admin')throw Error('An administrator must verify the incident.');
 if(command==='register'&&fields['Service']&&fields['Service']!=='General OPD')throw Error('This counter is configured for General OPD.');
 const name=fields['Full name']||fields['Patient name']||fields['Caregiver name'];
 if((command==='register'||command==='caregiver')&&(!name||name.trim().length<2))throw Error('Enter the full name.');
 if(command==='register'||command==='caregiver'){const phone=fields['Phone number']||fields['Contact number']||'';if((command==='caregiver'||phone)&&!/^(?:\+94|0)\s*[1-9][0-9\s-]{8,12}$/.test(phone))throw Error('Enter a valid Sri Lankan phone number.');}
 if(command==='priority'&&!(fields['Clinical reason']||fields['Reason category']||fields['Reason']||'').trim())throw Error('Enter the clinical reason before applying priority.');
}
export function applyCommand(state:AppState,command:Command,fields:Record<string,string>={},at=new Date().toISOString(),eventId=`${Date.now()}-${Math.random().toString(36).slice(2)}`):AppState{
 validate(command,fields,state.role);if(state.audit.some(e=>e.id===eventId))return state;
 const s=structuredClone(state);s.audit.unshift({id:eventId,action:command,at,role:s.role});
 switch(command){
 case 'preferences':break;
 case 'caregiver':s.caregiver={name:fields['Caregiver name'],phone:fields['Phone number']||fields['Contact number']};break;
 case 'revokeCaregiver':delete s.caregiver;break;
 case 'requestRecovery':if(s.myToken==='—')throw Error('Retrieve your hospital-issued token first.');s.recovery='pending';break;
 case 'register':{const seq=Math.max(...s.queue.map(q=>Number(q.token.slice(1))),Number(s.nowServing.slice(1)))+1;s.queue.push({token:`A${String(seq).padStart(3,'0')}`,patientName:fields['Full name']||fields['Patient name'],patientId:eventId,phone:fields['Phone number']||fields['Contact number']||'',status:'waiting',createdAt:at});break;}
 case 'callNext':{const next=s.queue.find(q=>q.status==='waiting'&&q.priority==='clinical')||s.queue.find(q=>q.status==='waiting');if(!next)throw Error('No waiting patients.');s.queue.filter(q=>q.status==='called').forEach(q=>q.status='completed');next.status='called';s.nowServing=next.token;break;}
 case 'recall':break;
 case 'priority':{const token=fields['Token']||'A121';const q=s.queue.find(q=>q.token===token);if(!q)throw Error('Token not found.');q.priority='clinical';q.reason=fields['Clinical reason']||fields['Reason category']||fields['Reason'];break;}
 case 'approveRecovery':s.recovery='approved';{const q=s.queue.find(q=>q.token===(fields['Token']||s.recoveryRequests?.find(r=>r.status==='pending')?.token||s.myToken));if(q)q.status='waiting';}break;
 case 'broadcast':if(s.role==='admin'&&!s.incidentVerified)throw Error('Verify the incident before publishing.');s.broadcasts.unshift({id:eventId,message:fields['Message']||fields['Service update']||'General OPD delayed. Please remain near Room 04; queue updates will continue.',at});s.serviceStatus='delay';break;
 case 'offline':s.serviceStatus='offline';break;
 case 'manualRecord':s.offlineActions.push({id:eventId,action:fields['Manual action']||'Manual queue record awaiting reconciliation',at});break;
 case 'reconcile':s.offlineActions=[];s.serviceStatus='open';break;
 case 'verifyIncident':s.incidentVerified=true;break;
 }
 s.updatedAt=at;return s;
}
export function patientsAhead(state:AppState){return state.patientsAhead??state.queue.filter(q=>['waiting','called'].includes(q.status)&&Number(q.token.slice(1))<Number(state.myToken.slice(1))).length;}

export function nextToken(state:AppState){const numbers=[state.nowServing,...state.queue.map(q=>q.token)].map(token=>Number(token.slice(1))).filter(Number.isFinite);return `A${String(Math.max(0,...numbers)+1).padStart(3,'0')}`;}
