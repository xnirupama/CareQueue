import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAccount,accountError,normalizeEmail} from '../src/services/authentication.ts';

test('account validation accepts existing sign-in passwords while requiring stronger matching registration passwords',()=>{
 assert.deepEqual(validateAccount({name:'',email:'  person@example.com  ',password:'older6',confirmPassword:''},false),{});
 const invalid=validateAccount({name:' ',email:'person',password:'short',confirmPassword:'other'});
 assert.deepEqual(Object.keys(invalid).sort(),['confirmPassword','email','name','password']);
 assert.deepEqual(validateAccount({name:'A Person',email:'person@example.com',password:'Long pass 12!',confirmPassword:'Long pass 12!'}),{});
 assert.ok(validateAccount({name:'x'.repeat(81),email:'person@example.com',password:'Long pass 12!',confirmPassword:'Long pass 12!'}).name);
 assert.equal(normalizeEmail(' person@example.com '),'person@example.com');
});
test('unknown users and wrong passwords receive the same sign-in message',()=>{
 assert.equal(accountError({code:'auth/user-not-found'}),accountError({code:'auth/wrong-password'}));
 assert.equal(accountError({code:'auth/invalid-credential'}),accountError({code:'auth/wrong-password'}));
 assert.match(accountError({code:'auth/network-request-failed'}),/internet connection/);
 assert.doesNotMatch(accountError({code:'auth/internal-error',message:'internal secret'}),/internal secret/);
});
