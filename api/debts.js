import crypto from 'crypto';
import { admin, getAdminApp, requireUser } from './_firebase-admin.js';

const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const norm=v=>clean(v,500).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const round2=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
const hash=v=>crypto.createHash('sha1').update(String(v)).digest('hex');
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+'T00:00:00').getTime())}
function identity(r){return [norm(r.provider),norm(r.ccf),norm(r.quedan),r.date,round2(r.value).toFixed(2)].join('|')}
function snapshot(r){return [Number(r.days||0),r.dueDate||'',round2(r.paidValue).toFixed(2),round2(r.balance).toFixed(2),norm(r.monthLabel)].join('|')}
function movementNaturalKey(r){return [r.date,'C X P',norm(r.provider),norm(r.ccf||r.quedan),round2(r.value).toFixed(2)].join('|')}
function validate(input){
  const date=clean(input.date,10),provider=clean(input.provider,180),ccf=clean(input.ccf,120),quedan=clean(input.quedan,120),value=Number(input.value),days=Number(input.days||0),dueDate=clean(input.dueDate,10),paidValue=Number(input.paidValue||0),balance=Number(input.balance||0),sourceYear=Number(input.sourceYear||0)||null;
  if(!validDate(date))throw new Error('Fecha inválida.');if(!provider)throw new Error('Proveedor requerido.');if(!Number.isFinite(value)||value<=0)throw new Error('Valor inválido.');if(!Number.isFinite(paidValue)||paidValue<0)throw new Error('Valor pagado inválido.');if(!Number.isFinite(balance)||balance<-.02)throw new Error('Saldo inválido.');if(dueDate&&!validDate(dueDate))throw new Error('Vencimiento inválido.');if(sourceYear&&Number(date.slice(0,4))>sourceYear)throw new Error(`Fecha posterior al consolidado ${sourceYear}.`);
  const r={date,provider,ccf,quedan,value:round2(value),days:Number.isFinite(days)?days:0,dueDate,paidValue:round2(paidValue),balance:round2(balance),monthLabel:clean(input.monthLabel,40),sourceFile:clean(input.sourceFile,220),sourceSheet:clean(input.sourceSheet,120),sourceRow:Number(input.sourceRow||0)||null,sourceYear};r.identity=identity(r);r.snapshot=snapshot(r);return r;
}
function pub(doc){const d=doc.data();return {id:doc.id,...d,createdAt:d.createdAt?.toDate?.()?.toISOString?.()||d.createdAt||null,updatedAt:d.updatedAt?.toDate?.()?.toISOString?.()||d.updatedAt||null}}
async function findExisting(db,records){
  const ids=[...new Set(records.map(r=>'debt_'+hash(r.identity).slice(0,32)))];const map=new Map();
  for(let i=0;i<ids.length;i+=30){const chunk=ids.slice(i,i+30);const snap=await db.collection('debts').where(admin.firestore.FieldPath.documentId(),'in',chunk).get();snap.docs.forEach(d=>map.set(d.id,d.data()));}
  return map;
}
async function classify(db,records){const existing=await findExisting(db,records);return records.map(r=>{const id='debt_'+hash(r.identity).slice(0,32),old=existing.get(id);if(!old)return {state:'new',note:''};return snapshot(old)===r.snapshot?{state:'unchanged',note:'La obligación ya existe sin cambios.'}:{state:'update',note:'La obligación ya existe y cambió pago, saldo, días o vencimiento.'};});}
async function existingMovementKeys(db,records){
  const keys=new Set();const docs=[...new Set(records.map(r=>clean(r.ccf||r.quedan,120)).filter(Boolean))];const dates=[...new Set(records.map(r=>r.date).filter(Boolean))];const found=new Map();
  const collect=s=>s.docs.forEach(d=>found.set(d.id,d.data()));
  for(let i=0;i<docs.length;i+=30)collect(await db.collection('movements').where('document','in',docs.slice(i,i+30)).get());
  for(let i=0;i<dates.length;i+=30)collect(await db.collection('movements').where('date','in',dates.slice(i,i+30)).get());
  found.forEach(m=>{if(m.category==='C X P')keys.add([m.date,'C X P',norm(m.provider),norm(m.document),round2(m.value).toFixed(2)].join('|'));});return keys;
}
export default async function handler(req,res){
  try{
    getAdminApp();const db=admin.firestore();
    if(req.method==='GET'){
      await requireUser(req,['admin','contabilidad','consulta']);const snap=await db.collection('debts').limit(3000).get();return res.status(200).json({ok:true,records:snap.docs.map(pub)});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Método no permitido.'});}
    const user=await requireUser(req,['admin']);const action=clean(req.body?.action,30);const inputs=req.body?.records||[];if(!Array.isArray(inputs)||inputs.length>250)throw new Error('Máximo 250 registros por bloque.');const parsed=inputs.map(validate);
    if(action==='create_manual'){
      await requireUser(req,['admin','contabilidad']);
      const input=req.body?.record||{};
      const date=clean(input.date,10),days=Number(input.days||0);
      const dueDate=clean(input.dueDate,10);
      if(!Number.isInteger(days)||days<0||days>3650)throw new Error('Días de crédito inválidos.');
      const r=validate({...input,days,dueDate,paidValue:0,balance:Number(input.value),sourceFile:'',sourceSheet:'',sourceYear:null});
      if(!r.ccf&&!r.quedan)throw new Error('Es necesario indicar CCF/factura o QUEDAN.');
      const id='debt_'+hash(r.identity).slice(0,32),ref=db.collection('debts').doc(id);
      const result=await db.runTransaction(async tx=>{
        const old=await tx.get(ref);if(old.exists)throw new Error('Ya existe esta obligación.');
        const mref=db.collection('movements').doc('debtmov_'+hash(r.identity).slice(0,28));
        const existingMove=await tx.get(mref);
        const payload={...r,canonicalIdentity:hash(r.identity),source:'manual',createdByUid:user.uid,createdByEmail:user.email||'',updatedByUid:user.uid,updatedByEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
        delete payload.identity;delete payload.snapshot;
        tx.create(ref,payload);
        if(!existingMove.exists)tx.create(mref,{date:r.date,sourceMonth:Number(r.date.slice(5,7)),sourceYear:Number(r.date.slice(0,4)),category:'C X P',provider:r.provider,document:r.ccf||r.quedan,value:r.value,discount:0,detail:`Cuenta por pagar${r.quedan?` · QUEDAN ${r.quedan}`:''}${r.ccf?` · CCF ${r.ccf}`:''}`,source:'debt_manual',debtId:id,createdByUid:user.uid,createdByEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        tx.create(db.collection('activity_log').doc(),{action:'debt_manual_create',entityType:'debt',entityId:id,actorUid:user.uid,actorEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp()});
        return {id,financeInserted:!existingMove.exists};
      });return res.status(200).json({ok:true,...result});
    }
    if(action==='edit_manual'){
      await requireUser(req,['admin','contabilidad']);
      const id=clean(req.body?.id,100),days=Number(req.body?.days),dueDate=clean(req.body?.dueDate,10),quedan=clean(req.body?.quedan,120);
      if(!id||!Number.isInteger(days)||days<0||days>3650||dueDate&&!validDate(dueDate))throw new Error('Datos de edición inválidos.');
      const ref=db.collection('debts').doc(id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new Error('Obligación no encontrada.');
        const old=snap.data();if(old.quedan!==quedan)throw new Error('El número de QUEDAN identifica la obligación y no se puede cambiar.');
        tx.update(ref,{days,dueDate,updatedByUid:user.uid,updatedByEmail:user.email||'',updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        tx.create(db.collection('activity_log').doc(),{action:'debt_manual_edit',entityType:'debt',entityId:id,before:{days:old.days,dueDate:old.dueDate},after:{days,dueDate},actorUid:user.uid,actorEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp()});
      });return res.status(200).json({ok:true});
    }
    if(action==='register_payment'){
      await requireUser(req,['admin','contabilidad']);
      const id=clean(req.body?.id,100),amount=Number(req.body?.amount),date=clean(req.body?.paymentDate,10),note=clean(req.body?.note,300);
      if(!id||!validDate(date)||!Number.isFinite(amount)||amount<=0||round2(amount)!==amount)throw new Error('Pago o fecha inválidos.');
      const ref=db.collection('debts').doc(id),paymentRef=db.collection('debt_payments').doc();
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new Error('Obligación no encontrada.');
        const old=snap.data(),balance=round2(old.balance),paid=round2(old.paidValue);
        if(amount>balance+.001)throw new Error('El pago excede el saldo pendiente.');
        tx.update(ref,{paidValue:round2(paid+amount),balance:round2(balance-amount),manualPaymentCount:admin.firestore.FieldValue.increment(1),updatedByUid:user.uid,updatedByEmail:user.email||'',updatedAt:admin.firestore.FieldValue.serverTimestamp()});
        tx.create(paymentRef,{debtId:id,date,amount,note,actorUid:user.uid,actorEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp()});
        tx.create(db.collection('activity_log').doc(),{action:'debt_payment',entityType:'debt',entityId:id,paymentId:paymentRef.id,amount,date,actorUid:user.uid,actorEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp()});
      });return res.status(200).json({ok:true,paymentId:paymentRef.id});
    }
    if(action==='preview'){const results=await classify(db,parsed);return res.status(200).json({ok:true,results});}
    if(action==='commit'){
      if(parsed.length>120)throw new Error('Máximo 120 registros por bloque de guardado.');const statuses=await classify(db,parsed);const protectedExisting=await findExisting(db,parsed);parsed.forEach((r,i)=>{const old=protectedExisting.get('debt_'+hash(r.identity).slice(0,32));if(old?.source==='manual'||old?.manualPaymentCount>0){if(statuses[i].state==='update')throw new Error('La importación intenta sobrescribir una obligación gestionada manualmente. Revisa el documento '+(r.ccf||r.quedan));}});const newRecords=parsed.filter((r,i)=>statuses[i].state==='new');const movementKeys=await existingMovementKeys(db,newRecords);const batch=db.batch();let newCount=0,updatedCount=0,unchangedCount=0,financeInserted=0,financeSkipped=0;
      parsed.forEach((r,i)=>{
        const debtId='debt_'+hash(r.identity).slice(0,32),ref=db.collection('debts').doc(debtId),st=statuses[i].state;
        if(st==='unchanged'){unchangedCount++;return;}
        const payload={date:r.date,quedan:r.quedan,provider:r.provider,ccf:r.ccf,value:r.value,days:r.days,dueDate:r.dueDate,paidValue:r.paidValue,balance:r.balance,monthLabel:r.monthLabel,sourceFile:r.sourceFile,sourceSheet:r.sourceSheet,sourceRow:r.sourceRow,sourceYear:r.sourceYear,canonicalIdentity:hash(r.identity),updatedByUid:user.uid,updatedByEmail:user.email||'',updatedAt:admin.firestore.FieldValue.serverTimestamp()};
        if(st==='new'){newCount++;payload.createdByUid=user.uid;payload.createdByEmail=user.email||'';payload.createdAt=admin.firestore.FieldValue.serverTimestamp();batch.set(ref,payload);
          const mKey=movementNaturalKey(r);if(movementKeys.has(mKey)){financeSkipped++;}else{financeInserted++;movementKeys.add(mKey);const mref=db.collection('movements').doc('debtmov_'+hash(r.identity).slice(0,28));batch.set(mref,{date:r.date,sourceMonth:Number(r.date.slice(5,7)),sourceYear:Number(r.date.slice(0,4)),category:'C X P',provider:r.provider,document:r.ccf||r.quedan,value:r.value,discount:0,detail:`Cuenta por pagar${r.quedan?` · QUEDAN ${r.quedan}`:''}${r.ccf?` · CCF ${r.ccf}`:''}${r.days?` · ${r.days} días`:''}`,source:'debt_import',debtId,createdByUid:user.uid,createdByEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});}}
        else{updatedCount++;batch.set(ref,payload,{merge:true});}
      });
      batch.set(db.collection('activity_log').doc(),{action:'debt_import',entityType:'debt_batch',actorUid:user.uid,actorEmail:user.email||'',newCount,updatedCount,unchangedCount,financeInserted,financeSkipped,createdAt:admin.firestore.FieldValue.serverTimestamp()});await batch.commit();
      return res.status(200).json({ok:true,newCount,updatedCount,unchangedCount,financeInserted,financeSkipped});
    }
    return res.status(400).json({ok:false,error:'Acción no reconocida.'});
  }catch(error){console.error('debts api',error);return res.status(error.statusCode||400).json({ok:false,error:String(error?.message||error)});}
}
