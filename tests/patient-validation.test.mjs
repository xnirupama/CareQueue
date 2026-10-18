import test from 'node:test';
import assert from 'node:assert/strict';
import {personNameError,normalizePersonName,emailAddressError,phoneNumberError,normalizePhoneNumber,caregiverAccountError,patientFormErrors,recoveryReasonError,supportMessageError,queueTokenError,linkedTokenError} from '../src/services/patient-validation.ts';
import {validateAccount,validateNewPassword,renameAccount} from '../src/services/authentication.ts';
import {ensureUserProfile} from '../src/services/user-profile.ts';
import {requestEmailResetCode} from '../src/services/password-reset.ts';
import {applyCommand,preferenceData} from '../src/services/domain.ts';
import {runPatientCommand,savePatientSettings} from '../src/services/patient-records.ts';
import {supportFields,createSupport,editSupport} from '../src/services/support.ts';
import {parseQueueCode} from '../src/services/scan.ts';
import {initialState} from '../src/data/seed.ts';

test('patient names support native scripts, initials and single names while rejecting invalid characters and length',()=>{
 for(const name of ['Nirupama','A. Perera',"Mary O'Connor",'Anne-Marie','සිංහල නම','தமிழ் பெயர்','José Álvarez','  Kamala   Perera  '])assert.equal(personNameError(name),undefined,name);
 for(const name of ['', ' ', 'A', '12345', 'Patient99','<Patient>','Name\nOther','a'.repeat(81)])assert.ok(personNameError(name),name);
 assert.equal(personNameError('a'.repeat(80)),undefined);
 assert.equal(normalizePersonName('  Kamala\u00a0  Perera '),'Kamala Perera');
});

test('email validation catches malformed domains, repeated dots, controls and oversized addresses',()=>{
 for(const email of [' patient@example.com ','person+care@example.co.uk','a.b@example.com'])assert.equal(emailAddressError(email),undefined);
 for(const email of ['person','a@@example.com','a..b@example.com','a@example..com','a@-example.com','a@example.com-','a\0@example.com',`${'a'.repeat(250)}@example.com`])assert.ok(emailAddressError(email),email);
});

test('new patient passwords cannot be all spaces, while existing sign-in credentials remain compatible',()=>{
 const fields={accountType:'patient',name:'Patient Name',email:'patient@example.com',password:'        ',confirmPassword:'        '};
 assert.ok(validateAccount(fields).password);
 assert.deepEqual(validateAccount(fields,false),{});
 assert.equal(validateAccount({...fields,password:'long pass 1',confirmPassword:'long pass 1'}).password,undefined);
});

test('phone checks require the exact local or international digit count and normalize allowed separators',()=>{
 for(const phone of ['0771234567','0112345678','+94771234567','+94 77 123 4567','077-123-4567'])assert.equal(phoneNumberError(phone),undefined,phone);
 for(const phone of ['', '077123456','07712345678','+9477123456','+940771234567','0001234567','07712abc67','++94771234567','0771234567 ext 2'])assert.ok(phoneNumberError(phone),phone);
 assert.equal(phoneNumberError('',false),undefined);
 assert.equal(normalizePhoneNumber(' +94 77-123-4567 '),'+94771234567');
});

test('caregiver IDs reject self-sharing, paths, controls and oversized values without requiring an optional ID',()=>{
 assert.equal(caregiverAccountError(''),undefined);
 assert.equal(caregiverAccountError(' another-user ','patient-one'),undefined);
 for(const uid of ['patient-one','someone/id','someone id','person@example.com','x'.repeat(129),'someone\0'])assert.ok(caregiverAccountError(uid,'patient-one'),uid);
 const errors=patientFormErrors('caregiver',{'Caregiver name':'123','Phone number':'077123456','Caregiver account ID':'patient-one'},'patient-one');
 assert.deepEqual(Object.keys(errors),['Caregiver name','Phone number','Caregiver account ID']);
});

test('recovery and support descriptions reject blank, punctuation-only, control and oversized messages',()=>{
 for(const check of [recoveryReasonError,supportMessageError]){
  for(const value of ['', '  \n ', '!!!', '🙂', 'Need help\0'])assert.ok(check(value),value);
  for(const value of ['Missed my call.','Need help\nRoom 04?','කරුණාකර උදව් කරන්න','தயவுசெய்து உதவுங்கள்'])assert.equal(check(value),undefined,value);
 }
 assert.equal(recoveryReasonError('a'.repeat(500)),undefined);assert.ok(recoveryReasonError('a'.repeat(501)));
 assert.equal(supportMessageError('a'.repeat(1000)),undefined);assert.ok(supportMessageError('a'.repeat(1001)));
 assert.throws(()=>supportFields('Unknown','Need help'),/category/);
 assert.deepEqual(supportFields('Directions','  Where is Room 04?  '),{category:'Directions',message:'Where is Room 04?'});
});

test('manual token validation rejects blank, zero and mismatched visits and accepts normalized own tokens',()=>{
 for(const token of ['', 'A000', 'A000000', 'A12', 'A1234567', 'B001', '—'])assert.ok(queueTokenError(token),token);
 for(const token of ['A001','a125',' A999999 '])assert.equal(queueTokenError(token),undefined,token);
 assert.equal(linkedTokenError(' a125 ','A125'),undefined);
 assert.match(linkedTokenError('A126','A125'),/does not match/);
 assert.ok(linkedTokenError('','A125'));
 assert.ok(linkedTokenError('A001','—'));
});

test('scanning accepts token payloads and rejects oversized or incorrectly typed QR data',()=>{
 for(const payload of [' a125 ','carequeue://token/A125','OPD-GMP-180926-A125','{"token":" a125 "}'])assert.equal(parseQueueCode(payload),'A125');
 for(const payload of ['A000','{"token":125}','{"token":["A125"]}','null','["A125"]','{"token":"A000"}','x'.repeat(2049),null])assert.throws(()=>parseQueueCode(payload));
});

test('service validation rejects invalid patient records before attempting any database access',async()=>{
 const state=initialState();
 await assert.rejects(()=>runPatientCommand(null,'patient-one',state,'caregiver',{'Caregiver name':'Good Name','Phone number':'0771234567','Caregiver account ID':'patient-one'}),/rather than your own/);
 await assert.rejects(()=>savePatientSettings(null,'patient-one',{...state,language:'fr'}),/language/);
 await assert.rejects(()=>createSupport(null,'patient-one','Patient','Other','!!!'),/few words/);
 await assert.rejects(()=>editSupport(null,'request-one','Other',''),/support message/);
 await assert.rejects(()=>requestEmailResetCode(null,'a..b@example.com'),/valid email/);
 await assert.rejects(()=>validateNewPassword(null,'        ','        '),/other than a space/);
 await assert.rejects(()=>renameAccount(null,'12345'),/letters/);
 await assert.rejects(()=>ensureUserProfile(null,{uid:'patient-one',email:'patient@example.com'},'12345'),/letters/);
});

test('invalid settings are rejected in both the domain and persistence projection',()=>{
 const state=initialState();
 for(const change of [{language:'de'},{sms:'true'},{appAlerts:1},{largeText:null}]){
  assert.throws(()=>preferenceData({...state,...change}));
  assert.throws(()=>applyCommand({...state,...change},'preferences'));
 }
 for(const language of ['en','si','ta'])assert.equal(preferenceData({...state,language}).language,language);
});

test('invalid caregiver commands leave state unchanged and sharing requires an active linked visit',()=>{
 const state=initialState(),before=structuredClone(state);
 assert.throws(()=>applyCommand(state,'caregiver',{'Caregiver name':'Good Name','Phone number':'07712345678'}),/phone/);
 assert.deepEqual(state,before);
 const fields={'Caregiver name':'  Good   Name  ','Phone number':'+94 77-123-4567','Caregiver account ID':'caregiver-one'};
 for(const status of ['completed','cancelled'])assert.throws(()=>applyCommand({...state,ticketStatus:status},'caregiver',fields),/active issued token/);
 const saved=applyCommand(state,'caregiver',fields);
 assert.deepEqual(saved.caregiver,{name:'Good Name',phone:'+94771234567',accountId:'caregiver-one'});
});

test('a stale recovery form cannot edit or withdraw a request for another visit',()=>{
 const state={...initialState(),ticketStatus:'missed',recovery:'pending',ownRecovery:{patientId:'patient-one',token:'A999',status:'pending',reason:'Missed call'}};
 assert.throws(()=>applyCommand(state,'editRecovery',{Reason:'Updated reason'}),/different visit/);
 assert.throws(()=>applyCommand(state,'cancelRecovery'),/different visit/);
 assert.equal(state.ownRecovery.reason,'Missed call');
});
