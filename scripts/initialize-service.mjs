// Trusted owner setup. Default is read-only; --apply creates only missing records.
import {createRequire} from 'node:module';
const flags=process.argv.slice(2);
if(flags.some(f=>f!=='--apply'))throw Error('Usage: node scripts/initialize-service.mjs [--apply]');
const require=createRequire(import.meta.url),ownerAuth=require('firebase-tools/lib/auth');
const account=ownerAuth.getProjectDefaultAccount(process.cwd());
if(!account)throw Error('Sign in with firebase login before initializing the service.');
const token=await ownerAuth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const root='https://firestore.googleapis.com/v1/projects/carequeue-db90e/databases/(default)',base=`${root}/documents`;
const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};
const paths=['operations/current','services/general-opd'],exists=[];
for(const path of paths){const response=await fetch(`${base}/${path}`,{headers});if(![200,404].includes(response.status))throw Error(`Service check failed: HTTP ${response.status}`);exists.push(response.ok);}
if(exists.every(Boolean)){console.log('General OPD is already initialized. Existing records were preserved.');process.exit(0);}
if(exists.some(Boolean))throw Error('Only one service document exists. No documents changed; review initialization from the administrator Account page.');
if(!flags.includes('--apply')){console.log('General OPD is not initialized. Use --apply to create its empty service records.');process.exit(0);}
const summary={nowServing:'—',serviceStatus:'open',updatedAt:new Date().toISOString(),broadcasts:[]};
const operation={...summary,lastIssuedNumber:0,queue:[],audit:[],offlineActions:[],incidentVerified:false};
function value(v){if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return {integerValue:String(v)};if(typeof v==='string')return {stringValue:v};return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};}
const writes=[operation,summary].map((data,index)=>({update:{name:`projects/carequeue-db90e/databases/(default)/documents/${paths[index]}`,fields:value(data).mapValue.fields},currentDocument:{exists:false}}));
const response=await fetch(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes})});
if(!response.ok)throw Error(`Initialization failed: HTTP ${response.status}. Existing documents cannot be overwritten by this command.`);
for(const path of paths){const verified=await fetch(`${base}/${path}`,{headers});if(!verified.ok)throw Error('Initialization was committed, but verification failed. Check Firebase before retrying.');}
console.log('Initialized and verified empty General OPD service records. The first registration will issue A001. No demo patients were inserted.');
