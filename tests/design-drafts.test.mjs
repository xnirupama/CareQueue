import test from 'node:test';
import assert from 'node:assert/strict';
import {readDesignDrafts,writeDesignDraft,clearDesignDrafts} from '../src/services/design-drafts.ts';

test('clearing an account session removes patient, staff and admin form data before another sign-in',()=>{
 clearDesignDrafts();
 writeDesignDraft('patient','Caregiver name','Private caregiver');
 writeDesignDraft('staff','Patient name','Private patient');
 writeDesignDraft('admin','Message','Private unpublished message');
 assert.equal(readDesignDrafts('staff',{})['Patient name'],'Private patient');
 clearDesignDrafts();
 for(const role of ['patient','staff','admin'])assert.deepEqual(readDesignDrafts(role,{}),{});
});
test('drafts survive screen changes within a role and cannot be mutated through a read snapshot',()=>{
 clearDesignDrafts();const defaults={'Patient name':'Example','Service':'General OPD'};
 writeDesignDraft('staff','Patient name','Entered patient');
 const review=readDesignDrafts('staff',defaults);assert.equal(review.Service,'General OPD');assert.equal(review['Patient name'],'Entered patient');
 review['Patient name']='Uncommitted change';assert.equal(readDesignDrafts('staff',defaults)['Patient name'],'Entered patient');
 assert.deepEqual(readDesignDrafts('patient',{}),{});clearDesignDrafts();
});
