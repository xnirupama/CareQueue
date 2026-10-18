import type {Role} from '../data/types';

const drafts=new Map<Role,Record<string,string>>();
export function readDesignDrafts(role:Role,defaults:Record<string,string>):Record<string,string>{return {...defaults,...drafts.get(role)};}
export function writeDesignDraft(role:Role,label:string,value:string){drafts.set(role,{...drafts.get(role),[label]:value});}
export function clearDesignDrafts(){drafts.clear();}
