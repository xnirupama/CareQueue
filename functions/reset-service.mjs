import {createHmac,createCipheriv,createDecipheriv,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';

export const CODE_LIFETIME_MS=10*60*1000;
export const RESEND_COOLDOWN_MS=60*1000;
export const MAX_ATTEMPTS=5;
export class ResetError extends Error{constructor(code,message){super(message);this.code=code;}}
const invalidCode=()=>new ResetError('permission-denied','This code is invalid or has expired. Request a new code if needed.');
const hmac=(secret,value)=>createHmac('sha256',secret).update(value).digest('hex');
function seal(secret,token){const iv=randomBytes(12),key=createHmac('sha256',secret).update('carequeue/reset/encryption/v1').digest(),cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(part=>part.toString('base64')).join('.');}
function open(secret,sealed){const [iv,tag,value]=sealed.split('.').map(part=>Buffer.from(part,'base64'));const key=createHmac('sha256',secret).update('carequeue/reset/encryption/v1').digest(),decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(value),decipher.final()]).toString('utf8');}
function sameHash(left,right){return typeof left==='string'&&left.length===right.length&&timingSafeEqual(Buffer.from(left),Buffer.from(right));}
function cleanEmail(value){if(typeof value!=='string'||value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))throw new ResetError('invalid-argument','Enter a valid email address.');return value.trim().toLowerCase();}

// All records are server-only. The service never emails a URL or stores a
// plaintext code, recipient address, IP address, or Firebase reset token.
export function createResetService({db,auth,secret,sendCode,now=Date.now,makeCode=()=>String(randomInt(0,1_000_000)).padStart(6,'0'),makeId=()=>randomBytes(24).toString('hex'),onDeliveryFailure=()=>{}}){
 if(typeof secret!=='string'||secret.length<32)throw new ResetError('failed-precondition','Password reset is temporarily unavailable.');
 return {
  async request(emailInput,ip='unknown'){
   const email=cleanEmail(emailInput),started=now(),challengeId=makeId(),code=makeCode();
   const emailKey=hmac(secret,`recipient:${email}`),ipKey=hmac(secret,`ip:${ip}`);
   const recipientRef=db.doc(`_passwordResetRecipients/${emailKey}`),ipRef=db.doc(`_passwordResetRateLimits/${ipKey}`),challengeRef=db.doc(`_passwordResetChallenges/${challengeId}`);
   const expiresAt=started+CODE_LIFETIME_MS,deleteAfter=new Date(started+24*60*60*1000);
   await db.runTransaction(async tx=>{
    const [recipientSnapshot,ipSnapshot]=await Promise.all([tx.get(recipientRef),tx.get(ipRef)]);
    const recipient=recipientSnapshot.data()||{},address=ipSnapshot.data()||{};
    if(recipient.lastIssuedAt!==undefined&&started-recipient.lastIssuedAt<RESEND_COOLDOWN_MS)throw new ResetError('resource-exhausted','Please wait one minute before requesting another code.');
    const emailCount=started-(recipient.windowStart||0)<60*60*1000?recipient.count||0:0;
    const ipCount=started-(address.windowStart||0)<10*60*1000?address.count||0:0;
    if(emailCount>=5||ipCount>=30)throw new ResetError('resource-exhausted','Too many requests. Wait a little before trying again.');
    tx.set(recipientRef,{lastIssuedAt:started,currentChallengeId:challengeId,windowStart:emailCount?recipient.windowStart:started,count:emailCount+1,deleteAfter});
    tx.set(ipRef,{windowStart:ipCount?address.windowStart:started,count:ipCount+1,deleteAfter});
    tx.set(challengeRef,{emailKey,codeHash:hmac(secret,`code:${challengeId}:${code}`),attempts:0,status:'pending',encryptedRequest:seal(secret,JSON.stringify({email,code})),encryptedToken:null,expiresAt,deleteAfter});
   });
   // Account lookup and mail delivery happen in the private background worker,
   // so the public request's work and response do not depend on account existence.
   return {challengeId,expiresAt,retryAfterSeconds:RESEND_COOLDOWN_MS/1000};
  },
  async deliver(challengeId){
   const challengeRef=db.doc(`_passwordResetChallenges/${challengeId}`),snapshot=await challengeRef.get(),challenge=snapshot.data();
   if(!challenge||challenge.status!=='pending')return;
   const recipient=await db.doc(`_passwordResetRecipients/${challenge.emailKey}`).get();
   if(challenge.expiresAt<=now()||recipient.data()?.currentChallengeId!==challengeId){await challengeRef.update({status:'expired',encryptedRequest:null,codeHash:null});return;}
   const {email,code}=JSON.parse(open(secret,challenge.encryptedRequest));
   let encryptedToken=null,deliveryFailed=false;
   try{
    const account=await auth.getUserByEmail(email);
    if(!account.disabled){
     // Firebase creates the underlying one-time action internally. Its URL is
     // never delivered to the user; only the six-digit code is emailed.
     const internalLink=await auth.generatePasswordResetLink(email);
     const resetToken=new URL(internalLink).searchParams.get('oobCode');
     if(!resetToken)throw Error('Missing internal reset token');
     encryptedToken=seal(secret,resetToken);
     await sendCode({to:email,code,challengeId});
    }
   }catch(error){
    if(error?.code!=='auth/user-not-found'){deliveryFailed=true;onDeliveryFailure();}
    encryptedToken=null;
   }
   await challengeRef.update({encryptedRequest:null,encryptedToken,status:deliveryFailed?'unavailable':'active'});
  },
  async verify(challengeId,code){
   if(typeof challengeId!=='string'||!/^[a-f0-9]{48}$/.test(challengeId)||typeof code!=='string'||!/^\d{6}$/.test(code))throw invalidCode();
   const encryptedToken=await db.runTransaction(async tx=>{
    const ref=db.doc(`_passwordResetChallenges/${challengeId}`),snapshot=await tx.get(ref),challenge=snapshot.data();
    if(!challenge||challenge.status!=='active'||challenge.expiresAt<=now()||challenge.attempts>=MAX_ATTEMPTS)return null;
    const recipient=await tx.get(db.doc(`_passwordResetRecipients/${challenge.emailKey}`));
    if(recipient.data()?.currentChallengeId!==challengeId)return null;
    const attempts=challenge.attempts+1;
    if(!sameHash(challenge.codeHash,hmac(secret,`code:${challengeId}:${code}`))||!challenge.encryptedToken){
     tx.update(ref,{attempts,...(attempts>=MAX_ATTEMPTS?{status:'locked',codeHash:null,encryptedToken:null}:{})});return null;
    }
    tx.update(ref,{attempts,status:'used',codeHash:null,encryptedToken:null});
    return challenge.encryptedToken;
   });
   if(!encryptedToken)throw invalidCode();
   return {resetToken:open(secret,encryptedToken)};
  },
 };
}
