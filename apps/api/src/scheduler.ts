import cron from 'node-cron';
import { pool } from './db.js';
import { nextDate } from './services/recurrence.js';

export async function generateDueContracts(){
  const client=await pool.connect();let created=0;
  try{
    await client.query("UPDATE invoices SET status='overdue',updated_at=now() WHERE due_date<CURRENT_DATE AND status IN ('sent','partially_paid') AND total>amount_paid");
    const due=await client.query(`SELECT * FROM contracts WHERE status='active' AND next_service_date<=CURRENT_DATE AND site_id IS NOT NULL ORDER BY next_service_date LIMIT 250`);
    for(const contract of due.rows){
      await client.query('BEGIN');
      const locked=await client.query('SELECT * FROM contracts WHERE id=$1 AND company_id=$2 AND status=\'active\' AND next_service_date<=CURRENT_DATE FOR UPDATE SKIP LOCKED',[contract.id,contract.company_id]);
      if(!locked.rowCount){await client.query('ROLLBACK');continue;}
      const c=locked.rows[0];const dueDate=String(c.next_service_date).slice(0,10);const n=await client.query("SELECT nextval('work_order_number_seq') AS n");const order=`SP-${new Date().getFullYear()}-${String(n.rows[0].n).padStart(5,'0')}`;
      const inserted=await client.query(`INSERT INTO work_orders(company_id,order_number,customer_id,site_id,contract_id,title,service_type,description,scheduled_at,recurrence_date,priority,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$9::date,'normal','scheduled') ON CONFLICT(company_id,contract_id,recurrence_date) DO NOTHING RETURNING id`,[c.company_id,order,c.customer_id,c.site_id,c.id,c.title,c.service_type,`Automatically generated from recurring contract ${c.title}.`,dueDate]);
      const next=nextDate(dueDate,c.frequency,c.interval_days);
      const state=c.end_date&&next>String(c.end_date).slice(0,10)?'expired':'active';
      await client.query('UPDATE contracts SET next_service_date=$3,status=$4,updated_at=now() WHERE id=$1 AND company_id=$2',[c.id,c.company_id,next,state]);
      await client.query('COMMIT');if(inserted.rowCount)created++;
    }
  }catch(error){await client.query('ROLLBACK').catch(()=>{});console.error('Recurring service scheduler failed',error);}
  finally{client.release();}
  if(created)console.log(`ServiProof scheduler generated ${created} recurring work order(s).`);
  return created;
}
export function startScheduler(){
  // Run once on boot to catch up after downtime, then every day at 00:10 Nairobi time.
  void generateDueContracts();
  cron.schedule('10 0 * * *',()=>void generateDueContracts(),{timezone:'Africa/Nairobi'});
}
