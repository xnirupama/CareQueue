import type {AppState,Role} from '../data/types';

export type FooterTab='home'|'queue'|'visit'|'alerts'|'patients'|'requests'|'incidents'|'more';
export const footerTabs:Record<Role,readonly {id:FooterTab;label:string}[]>={
 patient:[{id:'home',label:'Home'},{id:'queue',label:'My queue'},{id:'visit',label:'My visit'},{id:'alerts',label:'Alerts'},{id:'more',label:'More'}],
 staff:[{id:'home',label:'Home'},{id:'queue',label:'Queue'},{id:'patients',label:'Patients'},{id:'requests',label:'Requests'},{id:'more',label:'More'}],
 admin:[{id:'home',label:'Home'},{id:'queue',label:'Queue'},{id:'incidents',label:'Incidents'},{id:'more',label:'More'}],
};
const sections:Record<Role,Partial<Record<FooterTab,readonly string[]>>>={
 patient:{home:['16:7','16:28','158:1140','158:1207'],visit:['16:60','18:576','151:769','16:247','153:1207'],alerts:['16:122','16:154','151:835','153:847','153:919','159:1248','159:1314','159:1380','159:1446'],queue:['16:95','18:599','16:189','18:636','16:206','16:227','18:648','135:656','153:987','153:1049','153:1117','160:1464']},
 staff:{home:['138:4'],queue:['139:297','139:376','154:605','154:675','154:745','154:813','154:889'],patients:['139:223','154:453','154:528'],requests:['139:445','154:957','154:1025']},
 admin:{home:['35:168'],queue:['35:212','405:2123'],incidents:['35:332','156:921','156:3178']},
};
export function activeFooterTab(role:Role,pathname:string,screenId?:string):FooterTab{
 const id=(screenId||pathname.match(/^\/screen\/([^/]+)$/)?.[1]||'').replace('-',':');
 if(id){for(const [tab,ids] of Object.entries(sections[role]))if(ids?.includes(id))return tab as FooterTab;return 'more';}
 if(pathname==='/')return 'home';
 if(['/manage','/display'].includes(pathname))return 'queue';
 if(pathname==='/patient-records')return role==='staff'?'patients':'queue';
 if(pathname==='/recovery')return role==='staff'?'requests':'queue';
 if(role==='patient'&&['/caregivers','/preferences'].includes(pathname))return 'alerts';
 if(role==='patient'&&pathname==='/scan')return 'visit';
 return 'more';
}
export function footerDestination(role:Role,tab:FooterTab,state:Pick<AppState,'ticketStatus'|'recovery'|'incidentVerified'>):{screenId:string}|{path:'/account'}{
 const destinations:Record<Role,Partial<Record<FooterTab,string>>>={
  patient:{home:'16:28',queue:state.ticketStatus==='missed'?'16:227':state.ticketStatus==='called'?'18:636':state.recovery==='pending'?'160:1464':'16:95',visit:'16:60',alerts:'16:122'},
  staff:{home:'138:4',queue:'139:297',patients:'139:223',requests:'139:445',more:'140:1208'},
  admin:{home:'35:168',queue:'35:212',incidents:state.incidentVerified?'156:3178':'35:332',more:'405:2122'},
 };
 const screenId=destinations[role][tab];return screenId?{screenId}:{path:'/account'};
}
