import crypto from 'node:crypto';
import { admin, getAdminApp, requireUser } from './_firebase-admin.js';

const ALLOWED_CATEGORIES=new Set(['REMESA','CORRESPONSAL','COMPRAS AL CONTADO','C X P','TRANSFERENCIAS ENTRE BANCO','COMPRA ATM','ABONOS A TARJETAS','CHEQUES','COMPENSACIONES','PRESTAMOS','PLANILLA','BONIFICACIONES','ISSS','AFPS','DGII','ARRENDAMIENTOS','SISTEMA OPERATIVO','ENERGIA','TELEFONIA','COMBUSTIBLES','SERVICIOS BASICOS','IMPREVISTOS','OTROS']);
function clean(v,max=1000){return String(v??'').trim().slice(0,max)}
function norm(v){return clean(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function signature(r){return [r.date||'',r.category||'',norm(r.provider),norm(r.document),Number(r.value||0).toFixed(2),Number(r.discount||0).toFixed(2),norm(r.detail)].join('|')}
function hash(v){return crypto.createHash('sha1').update(String(v)).digest('hex')}
function validateRecord(input){
  const date=clean(input.date,10),category=clean(input.category,80),provider=clean(input.provider,180),value=Number(input.value),discount=Number(input.discount||0);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T00:00:00').getTime()))throw new Error('Fecha inválida.');
  if(!ALLOWED_CATEGORIES.has(category))throw new Error('Categoría inválida.');
  if(!provider)throw new Error('Proveedor requerido.');
  if(!Number.isFinite(value)||value<=0)throw new Error('Valor inválido.');
  if(!Number.isFinite(discount)||discount<0)throw new Error('Descuento inválido.');
  const occurrence=Math.max(1,Number.parseInt(input.occurrence||1,10)||1);
  const record={date,sourceMonth:Number(date.slice(5,7)),sourceYear:Number(date.slice(0,4)),category,provider,document:clean(input.document,120),value,discount,detail:clean(input.detail,1000),
    sourceFile:clean(input.sourceFile,220),sourceSheet:clean(input.sourceSheet,120),sourceRow:Number(input.sourceRow||0)||null,sourcePeriodMonth:Number(input.sourcePeriodMonth||0)||null,sourcePeriodYear:Number(input.sourcePeriodYear||0)||null,legacyNumber:input.legacyNumber??null,occurrence};
  record.signature=signature(record);return record;
}
function ts(v){return v?.toDate?.()?.toISOString?.()||v||null}
function batchPublic(doc){const d=doc.data();return {id:doc.id,...d,startedAt:ts(d.startedAt),completedAt:ts(d.completedAt),revertedAt:ts(d.revertedAt)}}

async function preview(db,inputs){
  if(!Array.isArray(inputs)||inputs.length>250)throw new Error('La vista previa admite hasta 250 registros por bloque.');
  const parsed=inputs.map(input=>{try{return {record:validateRecord(input),error:null};}catch(e){return {record:null,error:e.message};}});
  const refs=parsed.filter(x=>x.record).map(x=>db.collection('movements').doc('imp_'+hash(x.record.signature+'|'+x.record.occurrence).slice(0,28)));
  const snaps=refs.length?await db.getAll(...refs):[]; let cursor=0;
  return parsed.map(x=>x.record?{duplicate:!!snaps[cursor++]?.exists}:{duplicate:false,error:x.error});
}

export default async function handler(req,res){
  try{
    getAdminApp(); const db=admin.firestore();
    if(req.method==='GET'){
      await requireUser(req,['admin']);
      const snap=await db.collection('import_batches').orderBy('startedAt','desc').limit(50).get();
      return res.status(200).json({ok:true,batches:snap.docs.map(batchPublic)});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Método no permitido.'});}
    const user=await requireUser(req,['admin']); const action=clean(req.body?.action,30);

    if(action==='preview'){
      const results=await preview(db,req.body?.records||[]);return res.status(200).json({ok:true,results});
    }
    if(action==='start'){
      const meta=req.body?.meta||{}; const ref=db.collection('import_batches').doc();
      await ref.set({status:'processing',fileNames:Array.isArray(meta.fileNames)?meta.fileNames.map(v=>clean(v,220)).slice(0,100):[],parsedCount:Number(meta.parsedCount||0),readyCount:Number(meta.readyCount||0),issueCount:Number(meta.issueCount||0),warningCount:Number(meta.warningCount||0),inserted:0,skipped:0,actorUid:user.uid,actorEmail:user.email||'',startedAt:admin.firestore.FieldValue.serverTimestamp()});
      return res.status(201).json({ok:true,batchId:ref.id});
    }
    if(action==='commit'){
      const batchId=clean(req.body?.batchId,120),inputs=req.body?.records||[]; if(!batchId)throw new Error('Lote requerido.'); if(!Array.isArray(inputs)||inputs.length>200)throw new Error('Cada bloque admite hasta 200 registros.');
      const batchRef=db.collection('import_batches').doc(batchId); const batchSnap=await batchRef.get(); if(!batchSnap.exists)throw new Error('El lote de importación no existe.'); if(batchSnap.data().status!=='processing')throw new Error('El lote ya no está en proceso.');
      const records=inputs.map(validateRecord); const refs=records.map(r=>db.collection('movements').doc('imp_'+hash(r.signature+'|'+r.occurrence).slice(0,28))); const existing=refs.length?await db.getAll(...refs):[];
      const write=db.batch(); let inserted=0,skipped=0;
      records.forEach((r,i)=>{
        if(existing[i]?.exists){skipped++;return;} inserted++;
        write.set(refs[i],{date:r.date,sourceMonth:r.sourceMonth,sourceYear:r.sourceYear,category:r.category,provider:r.provider,document:r.document,value:r.value,discount:r.discount,detail:r.detail,source:'excel_import',sourceFile:r.sourceFile,sourceSheet:r.sourceSheet,sourceRow:r.sourceRow,sourcePeriodMonth:r.sourcePeriodMonth,sourcePeriodYear:r.sourcePeriodYear,legacyNumber:r.legacyNumber,canonicalKey:hash(r.signature),canonicalOccurrence:r.occurrence,importBatchId:batchId,importedByUid:user.uid,importedByEmail:user.email||'',importedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
      });
      write.update(batchRef,{inserted:admin.firestore.FieldValue.increment(inserted),skipped:admin.firestore.FieldValue.increment(skipped)});
      const log=db.collection('activity_log').doc();write.set(log,{action:'import_chunk',entityType:'import_batch',entityId:batchId,actorUid:user.uid,actorEmail:user.email||'',inserted,skipped,createdAt:admin.firestore.FieldValue.serverTimestamp()});await write.commit();
      return res.status(200).json({ok:true,inserted,skipped});
    }
    if(action==='finish'){
      const batchId=clean(req.body?.batchId,120);if(!batchId)throw new Error('Lote requerido.');const ref=db.collection('import_batches').doc(batchId);const snap=await ref.get();if(!snap.exists)throw new Error('Lote no encontrado.');
      await ref.update({status:'completed',completedAt:admin.firestore.FieldValue.serverTimestamp(),reportedInserted:Number(req.body?.inserted||0),reportedSkipped:Number(req.body?.skipped||0)});
      await db.collection('activity_log').add({action:'import_complete',entityType:'import_batch',entityId:batchId,actorUid:user.uid,actorEmail:user.email||'',inserted:Number(req.body?.inserted||0),skipped:Number(req.body?.skipped||0),createdAt:admin.firestore.FieldValue.serverTimestamp()});
      return res.status(200).json({ok:true});
    }
    if(action==='revert'){
      const batchId=clean(req.body?.batchId,120);if(!batchId)throw new Error('Lote requerido.');const ref=db.collection('import_batches').doc(batchId);const snap=await ref.get();if(!snap.exists)throw new Error('Lote no encontrado.');if(snap.data().status!=='completed')throw new Error('Solo se pueden revertir lotes completados.');
      const movements=await db.collection('movements').where('importBatchId','==',batchId).get();let deleted=0;
      for(let i=0;i<movements.docs.length;i+=400){const b=db.batch();movements.docs.slice(i,i+400).forEach(d=>{b.delete(d.ref);deleted++;});await b.commit();}
      const b=db.batch();b.update(ref,{status:'reverted',revertedAt:admin.firestore.FieldValue.serverTimestamp(),revertedByUid:user.uid,revertedByEmail:user.email||'',revertedCount:deleted});b.set(db.collection('activity_log').doc(),{action:'import_revert',entityType:'import_batch',entityId:batchId,actorUid:user.uid,actorEmail:user.email||'',deleted,createdAt:admin.firestore.FieldValue.serverTimestamp()});await b.commit();
      return res.status(200).json({ok:true,deleted});
    }
    return res.status(400).json({ok:false,error:'Acción de importación no reconocida.'});
  }catch(error){console.error('imports api',error);return res.status(error.statusCode||400).json({ok:false,error:String(error?.message||error)});}
}
