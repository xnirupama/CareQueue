import {initializeApp,getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {defineSecret,defineString} from 'firebase-functions/params';
import {error as logError} from 'firebase-functions/logger';
import {createResetService,ResetError} from './reset-service.mjs';
import {createResendMailer} from './resend-mailer.mjs';

if(!getApps().length)initializeApp();
const resendKey=defineSecret('RESET_RESEND_API_KEY');
const codeSecret=defineSecret('RESET_CODE_SECRET');
const sender=defineString('RESET_EMAIL_FROM',{description:'Verified Resend sender, e.g. CareQueue <security@your-domain.example>'});
const options={region:'asia-south1',timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:20};
function service(sendCode){return createResetService({db:getFirestore(),auth:getAuth(),secret:codeSecret.value(),sendCode,onDeliveryFailure:()=>logError('Password reset email delivery failed. Check sender/service configuration.')});}
function safeError(error){if(error instanceof ResetError)return new HttpsError(error.code,error.message);logError('Password reset service operation failed.');return new HttpsError('unavailable','Password reset is temporarily unavailable. Please try again later.');}

export const requestPasswordResetCode=onCall({...options,secrets:[codeSecret]},async request=>{
 try{
  return await service().request(request.data?.email,request.rawRequest.ip||'unknown');
 }catch(error){throw safeError(error);}
});
export const deliverPasswordResetCode=onDocumentCreated({...options,document:'_passwordResetChallenges/{challengeId}',secrets:[resendKey,codeSecret],retry:true},async event=>{
 try{
  const sendCode=createResendMailer({apiKey:resendKey.value(),from:sender.value()});
  await service(sendCode).deliver(event.params.challengeId);
 }catch(error){
  if(error instanceof ResetError&&error.code==='failed-precondition'){
   await getFirestore().doc(`_passwordResetChallenges/${event.params.challengeId}`).update({status:'unavailable',encryptedRequest:null,codeHash:null});
   logError('Password reset sender configuration is unavailable.');return;
  }
  throw error;
 }
});
export const verifyPasswordResetCode=onCall({...options,secrets:[codeSecret]},async request=>{
 try{return await service().verify(request.data?.challengeId,request.data?.code);}catch(error){throw safeError(error);}
});
