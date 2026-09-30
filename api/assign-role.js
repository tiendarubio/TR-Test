import { admin, getAdminApp } from './_firebase-admin.js';

function list(name) {
  return String(process.env[name] || '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
}
function resolveRole(email) {
  const e=String(email||'').trim().toLowerCase();
  if (list('ROLE_ADMIN_EMAILS').includes(e)) return 'admin';
  if (list('ROLE_ACCOUNTING_EMAILS').includes(e)) return 'contabilidad';
  if (list('ROLE_VIEWER_EMAILS').includes(e)) return 'consulta';
  return 'sin_acceso';
}

export default async function handler(req,res) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ok:false,error:'Método no permitido.'}); }
  try {
    getAdminApp();
    const header=String(req.headers.authorization||'');
    const token=header.startsWith('Bearer ')?header.slice(7).trim():'';
    if(!token) return res.status(401).json({ok:false,error:'Token no enviado.'});
    const decoded=await admin.auth().verifyIdToken(token);
    const user=await admin.auth().getUser(decoded.uid);
    const email=String(user.email||'').trim().toLowerCase();
    const role=resolveRole(email);
    const current=user.customClaims||{};
    if(current.role!==role) await admin.auth().setCustomUserClaims(user.uid,{...current,role});
    await admin.firestore().collection('users').doc(user.uid).set({
      uid:user.uid,email,role,active:role!=='sin_acceso',updatedAt:admin.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    return res.status(200).json({ok:true,uid:user.uid,email,role});
  } catch(error) {
    console.error('assign-role',error);
    return res.status(500).json({ok:false,error:String(error?.message||error)});
  }
}
