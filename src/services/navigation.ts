import type {Command} from './domain';
// Confirmation boundaries from the original prototype. Merely returning to a
// success screen must never issue a second token or publish a second update.
export function commandForAction(source:string,label:string,to?:string):Command|undefined {
 const normalized=label.replace(/^Action \/ /,'').toLowerCase();
 if(/save preferences/.test(normalized)&&to==='151:835')return 'preferences';
 if(source==='16:154'&&/authorize caregiver/.test(normalized))return 'caregiver';
 if(/revoke caregiver/.test(normalized))return 'revokeCaregiver';
 if(/request recovery/.test(normalized))return 'requestRecovery';
 if(source==='154:453'&&/confirm and issue/.test(normalized))return 'register';
 if(source==='154:605'&&/confirm call/.test(normalized))return 'callNext';
 if(to==='154:745'&&['138:4','139:297'].includes(source))return 'recall';
 if(source==='154:813'&&/apply clinical/.test(normalized))return 'priority';
 if(source==='154:957'&&/confirm recovery/.test(normalized))return 'approveRecovery';
 if(source==='154:1087'&&/publish verified/.test(normalized))return 'broadcast';
 if(source==='140:1066'&&/manual fallback/.test(normalized))return 'manualRecord';
 if(source==='155:931'&&/confirm match/.test(normalized))return 'reconcile';
 if(source==='156:921'&&normalized==='verify incident')return 'verifyIncident';
 if(source==='156:3305'&&/confirm publication/.test(normalized)&&to==='156:3432')return 'broadcast';
}
