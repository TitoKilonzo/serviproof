const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:4000/api';
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, '');
const API_URL = import.meta.env.MODE === 'development'
  ? normalizedApiUrl.endsWith('/api')
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api`
  : '/api';
export class ApiError extends Error { status:number; constructor(message:string,status:number){super(message);this.name='ApiError';this.status=status;} }
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
  const isForm=options.body instanceof FormData;
  const response=await fetch(`${API_URL}${path}`,{...options,credentials:'include',headers:{...(isForm?{}:{'Content-Type':'application/json'}),...(options.headers??{})}});
  const contentType=response.headers.get('content-type')??'';
  const payload=contentType.includes('application/json')?await response.json():await response.text();
  if(!response.ok)throw new ApiError(typeof payload==='object'&&payload?.error?payload.error:'Request failed. Please try again.',response.status);
  return payload as T;
}
export const json=(body:unknown)=>JSON.stringify(body);
export const money=(amount:number|string,currency='KES')=>new Intl.NumberFormat('en-KE',{style:'currency',currency,maximumFractionDigits:0}).format(Number(amount||0));
export const dateTime=(value:string)=>new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export const dateOnly=(value:string)=>new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeZone:'Africa/Nairobi'}).format(new Date(value));
