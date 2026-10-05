export function parseQueueCode(data:string):string {
 let token:string;
 try{const parsed=JSON.parse(data);token=String(parsed.token||'');}catch{token=data.trim().match(/(?:^|[-/:])([A-Z]\d{3,6})(?:$|[?\s])/i)?.[1]||data.trim();}
 if(!/^A\d{3,6}$/i.test(token))throw Error('This is not a CareQueue token. Enter the token printed on your slip.');
 return token.toUpperCase();
}
