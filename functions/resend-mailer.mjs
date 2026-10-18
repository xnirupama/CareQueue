import {ResetError} from './reset-service.mjs';

export function createResendMailer({apiKey,from,fetcher=fetch}){
 if(!apiKey||!from||/[\r\n]/.test(from)||!from.includes('@'))throw new ResetError('failed-precondition','Password reset is temporarily unavailable.');
 return async({to,code,challengeId})=>{
  if(!/^\d{6}$/.test(code))throw Error('Invalid generated code');
  const response=await fetcher('https://api.resend.com/emails',{
   method:'POST',signal:AbortSignal.timeout(10_000),
   headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`carequeue-reset-${challengeId}`},
   body:JSON.stringify({from,to:[to],subject:'Your CareQueue password reset code',
    text:`CareQueue\n\nYour password reset code is: ${code}\n\nEnter this code in the CareQueue app. It expires 10 minutes after your request and can only be used once.\n\nIf you did not request this, ignore this email. Never share your code.`,
    html:`<div style="background:#edf6f0;padding:32px 16px;font-family:Arial,sans-serif;color:#09386b"><div style="max-width:440px;margin:auto;background:white;border-radius:20px;padding:32px"><h2 style="margin:0 0 24px">CareQueue.</h2><h1 style="font-size:23px">Reset your password</h1><p style="color:#52697a;line-height:1.6">Enter this verification code in the CareQueue app:</p><div style="background:#edf6f0;border-radius:14px;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px">${code}</div><p style="color:#52697a;line-height:1.6">This code expires 10 minutes after your request and can only be used once.</p><p style="color:#52697a;font-size:13px;line-height:1.6">If you did not request this, ignore this email. Never share your code.</p></div></div>`}),
  });
  if(!response.ok)throw Error('Email delivery failed');
 };
}
