import fs from 'node:fs';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

function env(name){const v=String(process.env[name]||'').trim();if(!v)throw new Error(`Falta ${name}`);return v;}
function key(v){return String(v||'').replace(/^"(.*)"$/s,'$1').replace(/\\n/g,'\n').trim();}
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert({projectId:env('FIREBASE_PROJECT_ID'),clientEmail:env('FIREBASE_ADMIN_CLIENT_EMAIL'),privateKey:key(env('FIREBASE_ADMIN_PRIVATE_KEY'))})});
const db=admin.firestore();
const data=JSON.parse(fs.readFileSync(new URL('../data/historico-2026.json',import.meta.url),'utf8'));

function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function norm(v){return String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function signature(m){return [m.date||'',m.category||'',norm(m.provider),norm(m.document),Number(m.value||0).toFixed(2),Number(m.discount||0).toFixed(2),norm(m.detail)].join('|');}
function hash(v){return crypto.createHash('sha1').update(String(v)).digest('hex');}
const occurrences=new Map();
const normalized=data.movements.map(m=>{const sig=signature(m);const occurrence=(occurrences.get(sig)||0)+1;occurrences.set(sig,occurrence);return {...m,signature:sig,occurrence};});

async function commitChunks(items,writer){for(let i=0;i<items.length;i+=400){const batch=db.batch();items.slice(i,i+400).forEach((item,j)=>writer(batch,item,i+j));await batch.commit();console.log(`Procesados ${Math.min(i+400,items.length)}/${items.length}`);}}

await commitChunks(data.categories,(batch,c)=>{batch.set(db.collection('categories').doc(slug(c.name)),{...c,active:true,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});});
await commitChunks(normalized,(batch,m)=>{
  const id='imp_'+hash(m.signature+'|'+m.occurrence).slice(0,28);
  batch.set(db.collection('movements').doc(id),{date:m.date||null,sourceMonth:Number(m.sourceMonth||0),sourceYear:Number(String(m.date||'').slice(0,4)||2026),category:m.category||'',provider:m.provider||'',document:m.document||'',value:Number(m.value||0),discount:Number(m.discount||0),detail:m.detail||'',source:'historico_excel_2026_script',legacyNumber:m.number??null,canonicalKey:hash(m.signature),canonicalOccurrence:m.occurrence,importBatchId:'historical-script-2026',importedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
});
await db.collection('system').doc('historical_import_2026').set({count:data.movements.length,issues:data.importIssues||[],completedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
console.log(`Migración lista: ${data.movements.length} movimientos y ${data.categories.length} categorías.`);
