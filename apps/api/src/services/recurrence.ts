/** Advance a recurring contract date without overflowing short months (e.g. Jan 31 -> Feb 28). */
export function nextDate(dateText:string,frequency:string,intervalDays:number|null):string {
  const [y,m,d]=dateText.slice(0,10).split('-').map(Number);
  const base=new Date(Date.UTC(y!,m!-1,d!));
  if(frequency==='weekly'||frequency==='fortnightly'||frequency==='custom'){
    base.setUTCDate(base.getUTCDate()+(intervalDays??(frequency==='weekly'?7:14)));
  } else {
    const months=frequency==='monthly'?1:frequency==='quarterly'?3:frequency==='biannual'?6:12;
    const first=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+months,1));
    const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
    first.setUTCDate(Math.min(d!,lastDay));
    return first.toISOString().slice(0,10);
  }
  return base.toISOString().slice(0,10);
}
