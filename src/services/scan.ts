import {queueTokenError} from './patient-validation';
export function parseQueueCode(data:string):string {
 if(typeof data!=='string'||data.length>2048)throw Error('This QR code is too large or invalid. Scan your CareQueue slip or enter its token.');
 let token:string;
 try{const parsed:unknown=JSON.parse(data);token=parsed!==null&&typeof parsed==='object'&&!Array.isArray(parsed)&&'token' in parsed&&typeof parsed.token==='string'?parsed.token.trim():'';}catch{token=data.trim().match(/(?:^|[-/:])([A-Z]\d{3,6})(?:$|[?\s])/i)?.[1]||data.trim();}
 if(queueTokenError(token))throw Error('This is not a CareQueue token. Enter the token printed on your slip.');
 return token.trim().toUpperCase();
}
