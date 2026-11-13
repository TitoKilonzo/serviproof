import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
const DEMO_PASSWORD=process.env.DEMO_PASSWORD??'ServiProof#2026';
async function main(){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const co=await client.query(`INSERT INTO companies(name,slug,phone,email,address,currency,timezone) VALUES('GreenLeaf Pest Solutions','greenleaf-pest','+254 700 123 456','hello@greenleafpest.com','Westlands, Nairobi, Kenya','KES','Africa/Nairobi') ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`);
  const cid=co.rows[0].id;const hash=await bcrypt.hash(DEMO_PASSWORD,12);
  const customersData=[
   ['Westlands Towers Ltd','Mercy Wanjiku','facilities.westlands@example.com','+254 711 222 333','Westlands, Nairobi'],
   ['Green Valley Hotel','Daniel Otieno','operations.greenvalley@example.com','+254 722 333 444','Kilimani, Nairobi'],
   ['Nexus Distribution Centre','Amina Hassan','admin.nexusdc@example.com','+254 733 444 555','Industrial Area, Nairobi'],
   ['Riverside Academy','Peter Mwangi','office.riverside@example.com','+254 744 555 666','Riverside, Nairobi'],
   ['Parkview Apartments','Lydia Njeri','manager.parkview@example.com','+254 755 666 777','Kileleshwa, Nairobi']
  ];
  const customers:any[]=[];
  for(const c of customersData){const found=await client.query('SELECT id FROM customers WHERE company_id=$1 AND name=$2',[cid,c[0]]);if(found.rowCount){customers.push(found.rows[0].id);await client.query('UPDATE customers SET contact_name=$3,email=$4,phone=$5,billing_address=$6 WHERE id=$1 AND company_id=$2',[found.rows[0].id,cid,c[1],c[2],c[3],c[4]]);}else{const r=await client.query('INSERT INTO customers(company_id,name,contact_name,email,phone,billing_address) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[cid,...c]);customers.push(r.rows[0].id);}}
  await client.query(`UPDATE users SET email='customer.westlands@example.com' WHERE company_id=$1 AND email='customer@westlandstowers.example' AND NOT EXISTS (SELECT 1 FROM users WHERE company_id=$1 AND email='customer.westlands@example.com')`,[cid]);
  const users:any={};
  const userData=[['admin@greenleafpest.com','ServiProof Demo Admin','owner',null,'+254 700 123 456'],['dispatcher@greenleafpest.com','Sarah Dispatcher','dispatcher',null,'+254 700 123 457'],['technician@greenleafpest.com','James Technician','technician',null,'+254 700 123 458'],['customer.westlands@example.com','Mercy Wanjiku','customer',customers[0],'+254 711 222 333']];
  for(const [email,name,role,customerId,phone] of userData){const r=await client.query(`INSERT INTO users(company_id,customer_id,full_name,email,password_hash,role,phone,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT(company_id,email) DO UPDATE SET full_name=EXCLUDED.full_name,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,customer_id=EXCLUDED.customer_id,is_active=true RETURNING id`,[cid,customerId,name,email,hash,role,phone]);users[email as string]=r.rows[0].id;}
  const sites:any[]=[];const siteData=[['Westlands Tower - Block A','WL-A','Westlands Towers','Westlands'],['Green Valley - Main Hotel','GV-MAIN','Green Valley Hotel','Kilimani'],['Nexus Warehouse 01','NEX-01','Nexus Distribution Centre','Industrial Area'],['Riverside Academy Campus','RA-01','Riverside Academy','Riverside'],['Parkview - Residence','PV-01','Parkview Apartments','Kileleshwa']];
  for(let i=0;i<siteData.length;i++){const s=siteData[i]!;const customerId=customers[i]!;const old=await client.query('SELECT id FROM sites WHERE company_id=$1 AND site_code=$2',[cid,s[1]]);if(old.rowCount)sites.push(old.rows[0].id);else{const r=await client.query('INSERT INTO sites(company_id,customer_id,name,site_code,address,county,contact_name,contact_phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[cid,customerId,s[0],s[1],`${s[3]}, Nairobi, Kenya`,'Nairobi',customersData[i]![1],customersData[i]![3]]);sites.push(r.rows[0].id);}}
  const next=new Date();next.setDate(next.getDate()+12);const nextDate=next.toISOString().slice(0,10);
  const contractIds:any[]=[];
  for(let i=0;i<3;i++){const title=['Monthly Integrated Pest Management','Hospitality Pest Prevention','Warehouse Pest Monitoring'][i]!;const q=await client.query('SELECT id FROM contracts WHERE company_id=$1 AND title=$2',[cid,title]);if(q.rowCount)contractIds.push(q.rows[0].id);else{const r=await client.query(`INSERT INTO contracts(company_id,customer_id,site_id,title,service_type,frequency,start_date,next_service_date,amount,status,terms) VALUES($1,$2,$3,$4,'Pest control',$5,CURRENT_DATE,$6,$7,'active',$8) RETURNING id`,[cid,customers[i],sites[i],title,i===2?'quarterly':'monthly',nextDate,[8500,12000,17500][i], 'Service delivery, inspection, treatment and digital proof of service.']);contractIds.push(r.rows[0].id);}}
  const today=new Date();const at=(days:number,hour:number)=>{const d=new Date(today);d.setDate(d.getDate()+days);d.setHours(hour,0,0,0);return d.toISOString();};
  const jobs=[
   ['SP-DEMO-1001',customers[0],sites[0],contractIds[0],users['technician@greenleafpest.com'],'Quarterly perimeter treatment','Pest control',at(0,9),'in_progress','high'],
   ['SP-DEMO-1002',customers[1],sites[1],contractIds[1],users['technician@greenleafpest.com'],'Kitchen and storage inspection','Pest control',at(0,13),'assigned','normal'],
   ['SP-DEMO-1003',customers[2],sites[2],contractIds[2],null,'Warehouse rodent monitoring','Rodent control',at(1,10),'scheduled','urgent'],
   ['SP-DEMO-1004',customers[3],sites[3],null,users['technician@greenleafpest.com'],'Classroom preventive treatment','Pest control',at(-1,10),'completed','normal'],
   ['SP-DEMO-1005',customers[4],sites[4],null,null,'Common area inspection','Inspection',at(2,14),'scheduled','low'],
   ['SP-DEMO-1006',customers[0],sites[0],contractIds[0],users['technician@greenleafpest.com'],'Follow-up monitoring visit','Pest control',at(-3,11),'completed','normal']
  ];
  const jobIds:any={};
  for(const j of jobs){let found=await client.query('SELECT id FROM work_orders WHERE company_id=$1 AND order_number=$2',[cid,j[0]]);if(found.rowCount){jobIds[j[0] as string]=found.rows[0].id;continue;}const r=await client.query(`INSERT INTO work_orders(company_id,order_number,customer_id,site_id,contract_id,assigned_to,title,service_type,scheduled_at,status,priority,started_at,completed_at,technician_notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CASE WHEN $10='in_progress' THEN now()-interval '25 minutes' WHEN $10='completed' THEN now()-interval '2 days' ELSE NULL END,CASE WHEN $10='completed' THEN now()-interval '2 days' ELSE NULL END,CASE WHEN $10='completed' THEN 'Treatment completed. All inspection points checked and site left secure.' ELSE NULL END,$12) RETURNING id`,[cid,j[0],j[1],j[2],j[3],j[4],j[5],j[6],j[7],j[8],j[9],users['admin@greenleafpest.com']]);jobIds[j[0] as string]=r.rows[0].id;}
  const invTitle='INV-DEMO-2026-001';const oldInvoice=await client.query('SELECT id FROM invoices WHERE company_id=$1 AND invoice_number=$2',[cid,invTitle]);
  if(!oldInvoice.rowCount){const inv=await client.query(`INSERT INTO invoices(company_id,invoice_number,customer_id,work_order_id,issue_date,due_date,subtotal,tax_rate,tax_amount,total,amount_paid,currency,status,notes) VALUES($1,$2,$3,$4,CURRENT_DATE,CURRENT_DATE+14,12000,0,0,12000,5000,'KES','partially_paid','Monthly service agreement') RETURNING id`,[cid,invTitle,customers[0],jobIds['SP-DEMO-1006']]);await client.query(`INSERT INTO invoice_items(company_id,invoice_id,description,quantity,unit_price,line_total) VALUES($1,$2,'Integrated pest management service',1,12000,12000)`,[cid,inv.rows[0].id]);await client.query(`INSERT INTO payments(company_id,invoice_id,amount,method,reference,received_by) VALUES($1,$2,5000,'mpesa','QAB12CD34E',$3)`,[cid,inv.rows[0].id,users['admin@greenleafpest.com']]);}
  const auditExists=await client.query('SELECT 1 FROM audit_logs WHERE company_id=$1 LIMIT 1',[cid]);if(!auditExists.rowCount)await client.query(`INSERT INTO audit_logs(company_id,user_id,action,entity_type,metadata) VALUES($1,$2,'completed','work_order','{"source":"demo-seed"}')`,[cid,users['admin@greenleafpest.com']]);
  await client.query('COMMIT');console.log('ServiProof demo data seeded.');console.log('Workspace: greenleaf-pest');console.log('Admin: admin@greenleafpest.com');console.log('Dispatcher: dispatcher@greenleafpest.com');console.log('Technician: technician@greenleafpest.com');console.log('Customer: customer.westlands@example.com');console.log(`Demo password: ${DEMO_PASSWORD}`);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error(e);process.exit(1);});
