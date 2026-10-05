import type {DesignNode,DesignScreen} from '../data/types';

// Some Figma instances inherit the component master's ID. Match those instances
// to the exact prototype action using their supplied visible labels.
const aliases:Record<string,string[]>={
 'SMS updates':['SMS preference'],
 'App notifications':['App preference'],
 'Caregiver updates':['Caregiver preference'],
 'Allow queue updates':['Authorize caregiver'],
 'Review sharing access':['Manage access'],
 'Show directions':['Approaching directions','Called directions'],
 'I’m near the room':['Ready nearby'],
 'Keep me notified':['Keep notified'],
 'View my queue':['View delayed queue','Directions queue','Back to queue'],
 'Request missed-turn recovery':['Request recovery'],
 'I need assistance':['Directions support','Called assistance'],
 'I cannot hear announcements':['Hearing support'],
 'I need mobility assistance':['Mobility support'],
 'I need registration help':['Registration support'],
 'I do not have a smartphone':['No smartphone'],
 'Language & text size':['Language and text'],
 'Talk to OPD staff':['Speak to staff'],
 'Scan printed token':['Scan token'],
 'Need a token first?':['Registration help'],
 'View request status':['Recovery status'],
 'Find the assistance desk':['Recovery support','Find assistance'],
 'Find support':['Unavailable help'],
 'Go to the assistance desk':['Unavailable directions'],
 'Get help':['Recovery help'],
 'Sunil Perera':['Priority patient'],
 'Missed-turn requests':['Recovery requests'],
 'M002 · walk-in registration':['Action two'],
 'Reconciliation':['Sync'],
 'Comfortable text':['Text size'],
};
export function resolveDesignEdge(node:DesignNode,screen:DesignScreen){
 const direct=screen.edges.find(e=>e.id===node.id);if(direct)return direct;
 if(!['CareQueueButton','CareQueueRow'].includes(node.component||''))return;
 if(node.component==='CareQueueRow'&&node.props?.title==='English'&&['16:7','158:1140','158:1207'].includes(screen.id))return screen.edges.find(e=>e.name==='English language')||{id:node.id||'english',name:'English language',to:'16:7'};
 const labels=[node.actionLabel,node.props?.label,node.props?.title,node.props?.detail==='Tamil'?'Tamil':undefined].filter(Boolean) as string[];
 for(const label of labels){const named=aliases[label]?.map(name=>screen.edges.find(e=>e.name===name)).find(Boolean);if(named)return named;}
 for(const label of labels){const lower=label.toLowerCase();const match=screen.edges.find(e=>e.name.toLowerCase()===lower)||screen.edges.find(e=>e.name.toLowerCase().includes(lower))||screen.edges.find(e=>lower.includes(e.name.toLowerCase())&&e.name.length>4&&!['Home','Queue','Visit','Alerts','Patients','Requests','More'].includes(e.name));if(match)return match;}
}
