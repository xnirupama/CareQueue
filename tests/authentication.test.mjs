import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAccount,accountError,normalizeEmail} from '../src/services/authentication.ts';
import {claimRole,validatePortal} from '../src/services/account-access.ts';

test('account validation accepts existing sign-in passwords while requiring stronger matching registration passwords',()=>{
 assert.deepEqual(validateAccount({name:'',email:'  person@example.com  ',password:'older6',confirmPassword:'',accountType:'patient'},false),{});
 const invalid=validateAccount({name:' ',email:'person',password:'short',confirmPassword:'other',accountType:'patient'});
 assert.deepEqual(Object.keys(invalid).sort(),['confirmPassword','email','name','password']);
 assert.deepEqual(validateAccount({name:'A Person',email:'person@example.com',password:'Long pass 12!',confirmPassword:'Long pass 12!',accountType:'patient'}),{});
 assert.ok(validateAccount({name:'x'.repeat(81),email:'person@example.com',password:'Long pass 12!',confirmPassword:'Long pass 12!',accountType:'patient'}).name);
 assert.equal(normalizeEmail(' person@example.com '),'person@example.com');
});
test('unknown users and wrong passwords receive the same sign-in message',()=>{
 assert.equal(accountError({code:'auth/user-not-found'}),accountError({code:'auth/wrong-password'}));
 assert.equal(accountError({code:'auth/invalid-credential'}),accountError({code:'auth/wrong-password'}));
 assert.match(accountError({code:'auth/network-request-failed'}),/internet connection/);
 assert.doesNotMatch(accountError({code:'auth/internal-error',message:'internal secret'}),/internal secret/);
});
test('registration requires Patient or Staff and cannot request administrator access',()=>{
 const fields={name:'Test User',email:'test@example.com',password:'Long pass 12!',confirmPassword:'Long pass 12!'};
 assert.ok(validateAccount({...fields,accountType:''}).accountType);
 assert.ok(validateAccount({...fields,accountType:'admin'}).accountType);
 assert.deepEqual(validateAccount({...fields,accountType:'patient'}),{});
 assert.deepEqual(validateAccount({...fields,accountType:'staff'}),{});
});
test('administrator portal rejects ordinary roles and standard portal directs administrators to their own login',()=>{
 for(const role of ['patient','staff'])assert.throws(()=>validatePortal(role,'admin'),/administrator account/);
 assert.throws(()=>validatePortal('admin','standard'),/Administrator sign in/);
 assert.doesNotThrow(()=>validatePortal('admin','admin'));
 assert.equal(claimRole({accountType:'admin',role:'unexpected'}),'patient');
});
