import { getAdminApp } from './_firebase-admin.js';
import { requireAppUser, requireAllowedStore, apiError } from './_sales-auth.js';
import { SALES_STORES, calculateReplenishment, elSalvadorDay, daysBetween } from './_sales-engine.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Método no permitido'});
  try {
    const user=await requireAppUser(req);
    const storeKey=String(req.query?.storeKey || '');
    if (!Object.hasOwn(SALES_STORES,storeKey)) return res.status(400).json({error:'Sucursal inválida'});
    requireAllowedStore(user,storeKey);
    const db=getAdminApp().firestore();
    const [salesSnap,requestsSnap,sourceSnap]=await Promise.all([
      db.collection('sales_daily').where('storeKey','==',storeKey).limit(90).get(),
      db.collection('requests').where('storeKey','==',storeKey).limit(600).get(),
      db.collection('sales_sources').doc(storeKey).get()
    ]);
    const today=elSalvadorDay();
    const sales=salesSnap.docs.map(d=>d.data()).filter(x=>daysBetween(x.day,today)>=0 && daysBetween(x.day,today)<=35);
    const requests=requestsSnap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(x=>daysBetween(String(x.requestDate || x.submittedAt || x.createdAt || '').slice(0,10),today)>=0
        && daysBetween(String(x.requestDate || x.submittedAt || x.createdAt || '').slice(0,10),today)<=120);
    const result=calculateReplenishment({storeKey,snapshots:sales,requests,today});
    return res.status(200).json({ok:true,...result,source:sourceSnap.data() || null,requestRecords:requests.length,
      warning:!result.snapshotCount ? 'No hay ventas diarias archivadas para esta sucursal. Los sugeridos se basan solamente en las solicitudes.' : (daysBetween(result.latestDay,today)>2 ? 'Ventas diarias desactualizadas. Revisa la carga y sincronización.' : null)});
  } catch(error) { return apiError(res,error); }
}
