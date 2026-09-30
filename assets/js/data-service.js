(function(global){
  'use strict';
  const state={mode:'demo',movements:[],categories:[],loaded:false};
  const LOCAL_KEY='trFlujoDemoMovements';
  function local(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{return []}}
  function saveLocal(){localStorage.setItem(LOCAL_KEY,JSON.stringify(state.movements))}
  function normalizeDoc(doc){const d=doc.data();return {id:doc.id,...d,date:d.date||'',value:Number(d.value||0),discount:Number(d.discount||0)}}
  async function refresh(){
    if(state.mode!=='firebase'){state.movements=local();state.loaded=true;return state;}
    const db=firebase.firestore();
    const [mSnap,cSnap]=await Promise.all([db.collection('movements').get(),db.collection('categories').get()]);
    state.movements=mSnap.docs.map(normalizeDoc);state.categories=cSnap.docs.map(d=>({id:d.id,...d.data()}));state.loaded=true;return state;
  }
  async function boot(){await global.TRAuth.ready();state.mode=global.TRAuth.state.mode;return refresh()}
  function getMovements(historical=[]){return state.mode==='firebase'?state.movements:[...historical,...state.movements]}
  function getNewMovements(){return state.movements}
  async function apiRequest(method,body){
    const token=await global.TRAuth.token();
    const res=await fetch('/api/movements',{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
    const data=await res.json().catch(()=>({})); if(!res.ok||!data.ok)throw new Error(data.error||'No se pudo completar la operación.'); return data;
  }
  async function createMovement(input){
    const record={...input,value:Number(input.value||0),discount:Number(input.discount||0),source:'app',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(state.mode!=='firebase'){record.id='demo_'+Date.now();state.movements.push(record);saveLocal();return record;}
    if(!global.TRAuth.canWrite())throw new Error('Tu rol es solo de consulta.');
    const data=await apiRequest('POST',input);state.movements.push(data.movement);return data.movement;
  }
  async function updateMovement(id,patch){
    if(state.mode!=='firebase')throw new Error('Edición persistente disponible al conectar Firebase.');
    if(!global.TRAuth.canWrite())throw new Error('Tu rol es solo de consulta.');
    const data=await apiRequest('PATCH',{id,changes:patch});const idx=state.movements.findIndex(m=>m.id===id);if(idx>=0)state.movements[idx]=data.movement;return data.movement;
  }
  async function importDemoRecords(records,batchMeta){
    if(state.mode==='firebase')throw new Error('Esta función solo existe en modo demostración.');
    const now=new Date().toISOString();
    records.forEach((r,i)=>state.movements.push({...r,id:`${batchMeta.id}_${i+1}`,source:'excel_import_demo',importBatchId:batchMeta.id,createdAt:now,updatedAt:now}));
    saveLocal();return records.length;
  }
  async function revertDemoImport(batchId){
    if(state.mode==='firebase')throw new Error('Esta función solo existe en modo demostración.');
    state.movements=state.movements.filter(m=>m.importBatchId!==batchId);saveLocal();return true;
  }
  global.TRData={state,boot,refresh,getMovements,getNewMovements,createMovement,updateMovement,importDemoRecords,revertDemoImport};
})(window);
