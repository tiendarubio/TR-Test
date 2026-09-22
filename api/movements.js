import { admin, getAdminApp, requireUser } from './_firebase-admin.js';

const ALLOWED_CATEGORIES = new Set([
  'REMESA','CORRESPONSAL','COMPRAS AL CONTADO','C X P','TRANSFERENCIAS ENTRE BANCO','COMPRA ATM','ABONOS A TARJETAS','CHEQUES','COMPENSACIONES','PRESTAMOS','PLANILLA','BONIFICACIONES','ISSS','AFPS','DGII','ARRENDAMIENTOS','SISTEMA OPERATIVO','ENERGIA','TELEFONIA','COMBUSTIBLES','SERVICIOS BASICOS','IMPREVISTOS','OTROS'
]);
function cleanText(v,max=500){return String(v??'').trim().slice(0,max)}
function validate(body){
  const date=cleanText(body.date,10); const category=cleanText(body.category,80); const provider=cleanText(body.provider,180);
  const value=Number(body.value); const discount=Number(body.discount||0);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T00:00:00').getTime())) throw new Error('Fecha inválida.');
  if(!ALLOWED_CATEGORIES.has(category)) throw new Error('Categoría inválida.');
  if(!provider) throw new Error('Proveedor requerido.');
  if(!Number.isFinite(value)||value<0) throw new Error('Valor inválido.');
  if(!Number.isFinite(discount)||discount<0) throw new Error('Descuento inválido.');
  return {date,sourceMonth:Number(date.slice(5,7)),category,provider,document:cleanText(body.document,120),value,discount,detail:cleanText(body.detail,1000)};
}
function publicMovement(id,d){return {id,...d,createdAt:d.createdAt?.toDate?.()?.toISOString?.()||d.createdAt||null,updatedAt:d.updatedAt?.toDate?.()?.toISOString?.()||d.updatedAt||null}}

export default async function handler(req,res){
  try{
    getAdminApp();
    if(req.method==='POST'){
      const user=await requireUser(req,['admin','contabilidad']); const record=validate(req.body||{}); const db=admin.firestore(); const ref=db.collection('movements').doc(); const logRef=db.collection('activity_log').doc();
      const payload={...record,source:'app',createdByUid:user.uid,createdByEmail:user.email||'',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      const batch=db.batch(); batch.set(ref,payload); batch.set(logRef,{action:'create',entityType:'movement',entityId:ref.id,actorUid:user.uid,actorEmail:user.email||'',before:null,after:record,createdAt:admin.firestore.FieldValue.serverTimestamp()}); await batch.commit();
      return res.status(201).json({ok:true,movement:publicMovement(ref.id,{...record,source:'app',createdByUid:user.uid,createdByEmail:user.email||''})});
    }
    if(req.method==='PATCH'){
      const user=await requireUser(req,['admin','contabilidad']); const id=cleanText(req.body?.id,120); if(!id) return res.status(400).json({ok:false,error:'ID requerido.'});
      const db=admin.firestore(); const ref=db.collection('movements').doc(id); const snap=await ref.get(); if(!snap.exists)return res.status(404).json({ok:false,error:'Movimiento no encontrado.'});
      const before=snap.data(); const merged=validate({...before,...(req.body?.changes||{})}); const logRef=db.collection('activity_log').doc(); const patch={...merged,updatedByUid:user.uid,updatedByEmail:user.email||'',updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      const batch=db.batch();batch.update(ref,patch);batch.set(logRef,{action:'update',entityType:'movement',entityId:id,actorUid:user.uid,actorEmail:user.email||'',before:{date:before.date,category:before.category,provider:before.provider,document:before.document||'',value:Number(before.value||0),discount:Number(before.discount||0),detail:before.detail||''},after:merged,createdAt:admin.firestore.FieldValue.serverTimestamp()});await batch.commit();
      return res.status(200).json({ok:true,movement:publicMovement(id,{...before,...patch})});
    }
    if(req.method==='DELETE'){
      const user=await requireUser(req,['admin']); const id=cleanText(req.body?.id,120); if(!id)return res.status(400).json({ok:false,error:'ID requerido.'}); const db=admin.firestore();const ref=db.collection('movements').doc(id);const snap=await ref.get();if(!snap.exists)return res.status(404).json({ok:false,error:'Movimiento no encontrado.'});const before=snap.data();const logRef=db.collection('activity_log').doc();const batch=db.batch();batch.delete(ref);batch.set(logRef,{action:'delete',entityType:'movement',entityId:id,actorUid:user.uid,actorEmail:user.email||'',before,after:null,createdAt:admin.firestore.FieldValue.serverTimestamp()});await batch.commit();return res.status(200).json({ok:true});
    }
    res.setHeader('Allow','POST, PATCH, DELETE');return res.status(405).json({ok:false,error:'Método no permitido.'});
  }catch(error){console.error('movements api',error);return res.status(error.statusCode||400).json({ok:false,error:String(error?.message||error)});}
}
