import { api, json } from './api';
type QueueItem={id:string;kind:'complete';workOrderId:string;body:Record<string,unknown>;createdAt:string};
const key=(scope:string)=>`serviproof-offline-queue-v1:${scope}`;
function read(scope:string):QueueItem[]{try{return JSON.parse(localStorage.getItem(key(scope))||'[]') as QueueItem[]}catch{return []}}
function write(scope:string,items:QueueItem[]){localStorage.setItem(key(scope),JSON.stringify(items));window.dispatchEvent(new CustomEvent('serviproof-queue-change',{detail:{scope,count:items.length}}));}
export function queuedCount(scope:string){return read(scope).length;}
export function enqueueCompletion(scope:string,workOrderId:string,body:Record<string,unknown>){const items=read(scope);items.push({id:crypto.randomUUID(),kind:'complete',workOrderId,body,createdAt:new Date().toISOString()});write(scope,items);}
export async function syncQueue(scope:string){if(!navigator.onLine)return;const items=read(scope);const remaining:QueueItem[]=[];for(const item of items){try{await api(`/work-orders/${item.workOrderId}/complete`,{method:'POST',body:json(item.body)});}catch{remaining.push(item);}}write(scope,remaining);return {synced:items.length-remaining.length,pending:remaining.length};}
