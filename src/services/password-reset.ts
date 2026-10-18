import {confirmPasswordReset,type Auth} from 'firebase/auth';
import {httpsCallable,type Functions} from 'firebase/functions';
import {validateNewPassword,accountError,normalizeEmail} from './authentication';
import {emailAddressError} from './patient-validation';

export interface ResetChallenge{challengeId:string;expiresAt:number;retryAfterSeconds:number;}
export async function requestEmailResetCode(functions:Functions,email:string):Promise<ResetChallenge>{
 const normalized=normalizeEmail(email);
 const error=emailAddressError(normalized);if(error)throw Error(error);
 const request=httpsCallable<{email:string},ResetChallenge>(functions,'requestPasswordResetCode',{timeout:15_000});
 return (await request({email:normalized})).data;
}
export async function verifyEmailResetCode(functions:Functions,challengeId:string,code:string):Promise<string>{
 if(!/^\d{6}$/.test(code))throw Error('Enter the six-digit code from your email.');
 const verify=httpsCallable<{challengeId:string;code:string},{resetToken:string}>(functions,'verifyPasswordResetCode',{timeout:15_000});
 const result=await verify({challengeId,code});return result.data.resetToken;
}
export async function finishEmailPasswordReset(auth:Auth,resetToken:string,password:string,confirmation:string){
 await validateNewPassword(auth,password,confirmation);
 await confirmPasswordReset(auth,resetToken,password);
}
export function passwordResetError(error:unknown):string{
 const code=(error as {code?:string})?.code;
 const messages:Record<string,string>={
  'functions/permission-denied':'This code is invalid or has expired. Request a new code if needed.',
  'functions/resource-exhausted':'Too many attempts. Wait a little before trying again.',
  'functions/not-found':'Email password reset is temporarily unavailable. Please contact support.',
  'functions/failed-precondition':'Email password reset is temporarily unavailable. Please contact support.',
  'functions/unavailable':'Could not connect to password reset. Check your connection and try again.',
  'functions/internal':'Email password reset is temporarily unavailable. Please try again later.',
  'functions/deadline-exceeded':'The request took too long. Check your connection and try again.',
  'auth/expired-action-code':'Your password reset has expired. Request a new email code.',
  'auth/invalid-action-code':'Your password reset has expired or was already completed. Request a new email code.',
 };
 return code&&messages[code]||accountError(error);
}
