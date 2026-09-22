import fs from 'node:fs';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

function env(name) {
  const v=String(process.env[name]||'').trim();
  if(!v) throw new Error(`Falta ${name}`);
  return v;
}
function key(v){ return String(v||'').replace(/^"(.*)"$/s,'$1').replace(/\\n/g,'\n').trim(); }
if(!admin.apps.length) admin.initializeApp({credential:admin.credential.cert({
  projectId:env('FIREBASE_PROJECT_ID'),clientEmail:env('FIREBASE_ADMIN_CLIENT_EMAIL'),privateKey:key(env('FIREBASE_ADMIN_PRIVATE_KEY'))
})});
const db=admin.firestore();
const data=JSON.parse(fs.readFileSync(new URL('../data/historico-2026.json',import.meta.url),'utf8'));

function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function movementId(m,index){
  const basis=JSON.stringify([m.sourceMonth,m.category,m.date,m.provider,m.document,m.value,m.discount,m.detail,m.number,index]);
  return 'hist26_'+crypto.createHash('sha1').update(basis).digest('hex').slice(0,24);
}

async function commitChunks(items, writer){
  for(let i=0;i<items.length;i+=400){
    const batch=db.batch();
    items.slice(i,i+400).forEach((item,j)=>writer(batch,item,i+j));
    await batch.commit();
    console.log(`Procesados ${Math.min(i+400,items.length)}/${items.length}`);
  }
}

await commitChunks(data.categories,(batch,c)=>{
  batch.set(db.collection('categories').doc(slug(c.name)),{...c,active:true,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
});
await commitChunks(data.movements,(batch,m,index)=>{
  const id=movementId(m,index);
  batch.set(db.collection('movements').doc(id),{
    date:m.date||null,sourceMonth:Number(m.sourceMonth||0),category:m.category||'',provider:m.provider||'',document:m.document||'',
    value:Number(m.value||0),discount:Number(m.discount||0),detail:m.detail||'',source:'historico_excel_2026',legacyNumber:m.number??null,
    importedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()
  },{merge:true});
});
await db.collection('system').doc('historical_import_2026').set({
  count:data.movements.length,issues:data.importIssues||[],completedAt:admin.firestore.FieldValue.serverTimestamp()
},{merge:true});
console.log(`Migración lista: ${data.movements.length} movimientos y ${data.categories.length} categorías.`);
