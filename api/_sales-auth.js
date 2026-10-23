import { getAdminApp } from './_firebase-admin.js';

export async function requireAppUser(req, { adminOnly = false } = {}) {
  const header = String(req.headers.authorization || '');
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) { const e = new Error('Se requiere sesión activa.'); e.status = 401; throw e; }
  const decoded = await getAdminApp().auth().verifyIdToken(token);
  const role = String(decoded.role || '').toLowerCase();
  if (!['admin','supervisor','operador'].includes(role) || (adminOnly && role !== 'admin')) {
    const e = new Error('No tienes permisos para esta operación.'); e.status = 403; throw e;
  }
  return { uid:decoded.uid, role, storeKey:String(decoded.storeKey || '') };
}
export function requireAllowedStore(user, storeKey) {
  if (user.role === 'operador' && user.storeKey !== storeKey) {
    const e = new Error('Esta sucursal no está asignada a tu usuario.'); e.status=403; throw e;
  }
}
export function apiError(res, error) {
  console.error('[ventas-diarias]',error);
  return res.status(error.status || 500).json({ ok:false, error:error.status ? error.message : 'Error consultando ventas y sugeridos.', detail: error.status ? undefined : error.message });
}
