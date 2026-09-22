(function(global){
  'use strict';

  const MONTH_NAMES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const LOCAL_BATCH_KEY='trFlujoDemoImportBatches';
  const state={records:[],files:[],selectedFiles:[],analyzed:false,previewed:false,busy:false};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
  const money=new Intl.NumberFormat('es-SV',{style:'currency',currency:'USD'});
  const integer=new Intl.NumberFormat('es-SV',{maximumFractionDigits:0});

  function norm(v){return String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
  function normHeader(v){return norm(v).replace(/[.:#]/g,'').replace(/\s+/g,' ')}
  function text(v){return String(v??'').trim()}
  function num(v){
    if(typeof v==='number'&&Number.isFinite(v))return v;
    if(v==null||v==='')return NaN;
    const s=String(v).trim().replace(/[$,]/g,'');
    const n=Number(s); return Number.isFinite(n)?n:NaN;
  }
  function isoDate(y,m,d){
    const dt=new Date(Date.UTC(y,m-1,d));
    if(dt.getUTCFullYear()!==y||dt.getUTCMonth()+1!==m||dt.getUTCDate()!==d)return null;
    return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  function parseDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime())) { const y=v.getFullYear(); return y>=2000&&y<=2100?isoDate(y,v.getMonth()+1,v.getDate()):null; }
    if(typeof v==='number'&&Number.isFinite(v)){
      const p=global.XLSX?.SSF?.parse_date_code?.(v);
      if(p&&p.y>=2000&&p.y<=2100)return isoDate(p.y,p.m,p.d);
      return null;
    }
    const s=text(v); if(!s)return null;
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/); if(m){const y=+m[1];return y>=2000&&y<=2100?isoDate(y,+m[2],+m[3]):null;}
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/); if(m){const y=+m[3];return y>=2000&&y<=2100?isoDate(y,+m[2],+m[1]):null;}
    return null;
  }
  function periodFromName(name){
    const n=String(name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    let month=null; for(const [k,v] of Object.entries(MONTH_NAMES)){if(n.includes(k)){month=v;break;}}
    if(!month){const p=n.match(/(?:^|\D)(1[0-2]|0?[1-9])(?:\D|$)/); if(p)month=Number(p[1]);}
    const y=n.match(/\b(20\d{2})\b/); return {month,year:y?Number(y[1]):null};
  }
  function categoryMap(){
    const cats=global.HISTORICAL_DATA?.categories||[]; const map=new Map();
    cats.forEach(c=>{map.set(norm(c.name),c.name);map.set(norm(c.label),c.name)});
    const aliases={
      'REMESAS':'REMESA','TRANSFERENCIA ENTRE BANCOS':'TRANSFERENCIAS ENTRE BANCO','TRANSFERENCIAS ENTRE BANCOS':'TRANSFERENCIAS ENTRE BANCO',
      'CUENTAS POR PAGAR':'C X P','CXP':'C X P','AFP':'AFPS','SERVICIOS BASICO':'SERVICIOS BASICOS','COMPRA AL CONTADO':'COMPRAS AL CONTADO'
    };
    Object.entries(aliases).forEach(([a,b])=>map.set(norm(a),b)); return map;
  }
  const CATMAP=categoryMap();
  function resolveCategory(v){return CATMAP.get(norm(v))||null}
  function canonicalSignature(r){
    return [r.date||'',r.category||'',norm(r.provider),norm(r.document),Number(r.value||0).toFixed(2),Number(r.discount||0).toFixed(2),norm(r.detail)].join('|');
  }
  function recalcOccurrences(records){
    const seen=new Map(); records.forEach(r=>{const sig=canonicalSignature(r); const occ=(seen.get(sig)||0)+1;seen.set(sig,occ);r.signature=sig;r.occurrence=occ;});
  }
  function existingCounts(){
    const map=new Map(); (global.TRData?.getMovements?.(global.HISTORICAL_DATA?.movements||[])||[]).forEach(r=>{const s=canonicalSignature(r);map.set(s,(map.get(s)||0)+1)}); return map;
  }
  function validateRecord(r,period){
    const errors=[],warnings=[];
    if(!r.date)errors.push('Fecha inválida o ausente');
    if(!r.category)errors.push('Categoría no reconocida');
    if(!text(r.provider))errors.push('Proveedor requerido');
    if(!Number.isFinite(Number(r.value))||Number(r.value)<=0)errors.push('Valor inválido');
    if(!Number.isFinite(Number(r.discount||0))||Number(r.discount||0)<0)errors.push('Descuento inválido');
    if(r.date&&period?.year&&Number(r.date.slice(0,4))!==period.year)warnings.push(`Año distinto al archivo (${period.year})`);
    if(r.date&&period?.month&&Number(r.date.slice(5,7))!==period.month)warnings.push(`Fecha fuera del mes detectado (${period.month})`);
    r.errors=errors;r.warnings=warnings;r.valid=errors.length===0;return r;
  }
  function detectHeader(rows){
    for(let i=0;i<Math.min(rows.length,25);i++){
      const h=rows[i].map(normHeader); const hasDate=h.includes('FECHA'),hasValue=h.includes('VALOR');
      const hasProvider=h.includes('PROVEEDOR'),hasCategory=h.includes('CATEGORIA');
      if(hasDate&&hasValue&&(hasProvider||hasCategory))return i;
    }
    return -1;
  }
  function columnMap(headers){
    const m={}; headers.forEach((h,i)=>{const k=normHeader(h);
      if(['N','NO','NUMERO'].includes(k))m.number=i;
      else if(k==='FECHA')m.date=i;
      else if(k==='PROVEEDOR')m.provider=i;
      else if(['DOC','DOCUMENTO','NO DOCUMENTO','N DOCUMENTO'].includes(k))m.document=i;
      else if(k==='VALOR')m.value=i;
      else if(['DESCUENTO','DESCUENTOS'].includes(k))m.discount=i;
      else if(k==='DETALLE')m.detail=i;
      else if(k==='CATEGORIA')m.category=i;
    }); return m;
  }
  function parseWorkbook(fileName,arrayBuffer){
    const workbook=global.XLSX.read(arrayBuffer,{type:'array',cellDates:true,cellNF:false,cellText:false});
    const period=periodFromName(fileName); const records=[]; const sheetStats=[]; const fileIssues=[];
    workbook.SheetNames.forEach(sheetName=>{
      const rows=global.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,defval:'',raw:true});
      const hrow=detectHeader(rows); if(hrow<0)return;
      const cols=columnMap(rows[hrow]); let fixedCategory=resolveCategory(sheetName); const generic=cols.category!=null;
      if(!fixedCategory&&!generic){fileIssues.push(`Hoja “${sheetName}”: categoría no reconocida.`);return;}
      let count=0;
      for(let i=hrow+1;i<rows.length;i++){
        const row=rows[i]||[]; const rawValue=row[cols.value];
        if(rawValue===''||rawValue==null)continue;
        const value=num(rawValue); const provider=text(row[cols.provider]);
        const category=generic?resolveCategory(row[cols.category]):fixedCategory; const rawDate=row[cols.date];
        // Ignora renglones de sumas/totales. Si falta proveedor pero sí existe fecha, se conserva para validación.
        if(norm(provider).includes('SUMAS')||norm(provider)==='TOTAL'||norm(String(row[0]||'')).includes('SUMAS'))continue;
        if(!provider&&(rawDate===''||rawDate==null))continue;
        if(!provider&&!Number.isFinite(value))continue;
        const rec={
          sourceFile:fileName,sourceSheet:String(sheetName).trim(),sourceRow:i+1,sourcePeriodMonth:period.month,sourcePeriodYear:period.year,
          legacyNumber:cols.number!=null?row[cols.number]:null,rawDate:rawDate instanceof Date?rawDate.toISOString():rawDate,
          date:parseDate(rawDate),category,provider,document:cols.document!=null?text(row[cols.document]):'',
          value,discount:cols.discount!=null?(Number.isFinite(num(row[cols.discount]))?num(row[cols.discount]):0):0,
          detail:cols.detail!=null?text(row[cols.detail]):''
        };
        validateRecord(rec,period);records.push(rec);count++;
      }
      sheetStats.push({sheet:sheetName.trim(),category:fixedCategory||'Desde columna Categoría',count});
    });
    if(!records.length)fileIssues.push('No se encontraron movimientos en una estructura reconocible.');
    return {fileName,period,records,sheetStats,fileIssues};
  }
  async function expandSelectedFiles(files){
    const out=[];
    for(const file of files){
      const lower=file.name.toLowerCase();
      if(lower.endsWith('.zip')){
        const zip=await global.JSZip.loadAsync(await file.arrayBuffer());
        const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&!n.includes('__MACOSX')&&!n.split('/').pop().startsWith('~$')&&/\.(xlsx|xls)$/i.test(n));
        for(const name of names){out.push({name:name.split('/').pop(),buffer:await zip.files[name].async('arraybuffer'),container:file.name});}
      }else if(/\.(xlsx|xls)$/i.test(lower))out.push({name:file.name,buffer:await file.arrayBuffer(),container:null});
    }
    return out;
  }
  function setBusy(on,msg='Procesando...'){
    state.busy=on; const b=$('importAnalyzeBtn'),c=$('importCommitBtn'); if(b)b.disabled=on;if(c)c.disabled=on||!state.previewed;
    const s=$('importStatus'); if(s)s.innerHTML=on?`<span class="spinner-border spinner-border-sm me-2"></span>${esc(msg)}`:'';
  }
  function summary(){
    const valid=state.records.filter(r=>r.valid); const duplicates=valid.filter(r=>r.duplicate); const warnings=state.records.filter(r=>r.warnings?.length); const invalid=state.records.filter(r=>!r.valid);
    return {total:state.records.length,valid:valid.length,duplicates:duplicates.length,warnings:warnings.length,invalid:invalid.length,ready:valid.filter(r=>!r.duplicate).length};
  }
  function render(){
    const s=summary();
    $('importKpis').innerHTML=[
      ['Archivos',state.files.length,'fa-solid fa-file-excel'],['Movimientos',s.total,'fa-solid fa-receipt'],['Listos para importar',s.ready,'fa-solid fa-circle-check'],['Requieren revisión',s.invalid+s.warnings,'fa-solid fa-triangle-exclamation']
    ].map(([l,v,i])=>`<div class="col-sm-6 col-xl-3"><div class="card border-0 shadow-sm h-100"><div class="card-body d-flex justify-content-between"><div><div class="kpi-label">${l}</div><div class="kpi-value mt-1">${integer.format(v)}</div></div><div class="kpi-icon"><i class="${i}"></i></div></div></div></div>`).join('');
    $('importFileTable').innerHTML=state.files.length?state.files.map(f=>`<tr><td class="fw-semibold">${esc(f.fileName)}</td><td>${f.period.month&&f.period.year?`${String(f.period.month).padStart(2,'0')}/${f.period.year}`:'No detectado'}</td><td class="text-end">${integer.format(f.records.length)}</td><td>${f.fileIssues.length?`<span class="badge text-bg-warning">${f.fileIssues.length} aviso(s)</span>`:'<span class="badge text-bg-success">Reconocido</span>'}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-state">Selecciona archivos para analizarlos.</td></tr>';
    const problemRows=state.records.map((r,i)=>({r,i})).filter(x=>!x.r.valid||x.r.warnings?.length||x.r.duplicate);
    $('importIssueTable').innerHTML=problemRows.length?problemRows.slice(0,250).map(({r,i})=>{
      const status=!r.valid?'<span class="badge text-bg-danger">Error</span>':r.duplicate?'<span class="badge text-bg-secondary">Duplicado</span>':'<span class="badge text-bg-warning">Aviso</span>';
      const messages=[...(r.errors||[]),...(r.warnings||[]),...(r.duplicate?['Ya existe en el historial']:[])].join(' · ');
      return `<tr><td>${status}</td><td>${esc(r.sourceFile)}</td><td>${esc(r.sourceSheet)} · fila ${r.sourceRow}</td><td>${r.date?esc(r.date):`<input type="date" class="form-control form-control-sm import-date-fix" data-record-index="${i}" style="min-width:145px">`}</td><td>${esc(r.provider)}</td><td class="text-end">${Number.isFinite(Number(r.value))?money.format(r.value):'—'}</td><td class="small">${esc(messages)}</td></tr>`;
    }).join(''):'<tr><td colspan="7" class="empty-state">No hay incidencias.</td></tr>';
    $('importPreviewSummary').innerHTML=state.analyzed?`<strong>${integer.format(s.ready)}</strong> registros listos · ${integer.format(s.duplicates)} duplicados · ${integer.format(s.invalid)} con error · ${integer.format(s.warnings)} con avisos.`:'Analiza uno o varios archivos antes de importar.';
    $('importCommitBtn').disabled=state.busy||!state.previewed||s.ready===0||!(global.TRAuth?.canImport?.());
    if($('importAdminNote')) $('importAdminNote').classList.toggle('d-none',global.TRAuth?.canImport?.());
    if($('importModeNote')) $('importModeNote').innerHTML=global.TRData?.state?.mode==='firebase'?'<i class="fa-solid fa-database me-2"></i><strong>Producción:</strong> la vista previa consulta Firestore y solo habilita registros que aún no existen.':'<i class="fa-solid fa-flask me-2"></i><strong>Modo demo:</strong> el histórico 2026 ya viene precargado; al analizar esos mismos Excel aparecerán como duplicados. Esto permite probar la detección antes de conectar Firestore.';
  }
  function applyDemoDuplicates(){
    const counts=existingCounts(); state.records.forEach(r=>{r.duplicate=r.valid&&((counts.get(r.signature)||0)>=r.occurrence)}); state.previewed=true;
  }
  async function api(action,payload={}){
    const token=await global.TRAuth.token(); const res=await fetch('/api/imports',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,...payload})});
    const data=await res.json().catch(()=>({})); if(!res.ok||!data.ok)throw new Error(data.error||'No se pudo completar la importación.'); return data;
  }
  async function applyProductionDuplicates(){
    const valid=state.records.map((r,i)=>({r,i})).filter(x=>x.r.valid); valid.forEach(x=>x.r.duplicate=false);
    for(let p=0;p<valid.length;p+=200){
      const part=valid.slice(p,p+200); const data=await api('preview',{records:part.map(x=>serialize(x.r))});
      data.results.forEach((result,j)=>{part[j].r.duplicate=!!result.duplicate;});
    }
    state.previewed=true;
  }
  function serialize(r){return {date:r.date,category:r.category,provider:r.provider,document:r.document,value:Number(r.value),discount:Number(r.discount||0),detail:r.detail||'',sourceFile:r.sourceFile,sourceSheet:r.sourceSheet,sourceRow:r.sourceRow,sourcePeriodMonth:r.sourcePeriodMonth||null,sourcePeriodYear:r.sourcePeriodYear||null,legacyNumber:r.legacyNumber??null,signature:r.signature,occurrence:r.occurrence};}
  async function analyze(){
    const input=$('importFiles'); const selected=state.selectedFiles.length?[...state.selectedFiles]:[...(input?.files||[])]; if(!selected.length){alert('Selecciona al menos un archivo Excel o ZIP.');return;}
    if(!global.XLSX||!global.JSZip){alert('No se cargaron las librerías necesarias para leer Excel/ZIP.');return;}
    setBusy(true,'Analizando archivos...');
    try{
      const expanded=await expandSelectedFiles(selected); const parsed=[]; const records=[];
      for(const item of expanded){const r=parseWorkbook(item.name,item.buffer);r.container=item.container;parsed.push(r);records.push(...r.records);}
      state.files=parsed;state.records=records;state.analyzed=true;state.previewed=false;recalcOccurrences(state.records);
      if(global.TRData?.state?.mode==='firebase')await applyProductionDuplicates();else applyDemoDuplicates();
      render();
    }catch(e){console.error(e);alert('No se pudieron analizar los archivos: '+(e.message||e));}
    finally{setBusy(false);render();}
  }
  function revalidateRecord(index,newDate){
    const r=state.records[index]; if(!r)return; r.date=newDate||null;validateRecord(r,{month:r.sourcePeriodMonth,year:r.sourcePeriodYear});recalcOccurrences(state.records);state.previewed=false;
    setBusy(true,'Revalidando duplicados...');
    Promise.resolve(global.TRData?.state?.mode==='firebase'?applyProductionDuplicates():applyDemoDuplicates()).then(render).catch(e=>alert(e.message||e)).finally(()=>{setBusy(false);render();});
  }
  function localBatches(){try{return JSON.parse(localStorage.getItem(LOCAL_BATCH_KEY)||'[]')}catch{return []}}
  function saveLocalBatches(v){localStorage.setItem(LOCAL_BATCH_KEY,JSON.stringify(v))}
  async function commit(){
    if(!global.TRAuth?.canImport?.()){alert('Solo un Administrador puede importar histórico.');return;}
    const ready=state.records.filter(r=>r.valid&&!r.duplicate); if(!ready.length){alert('No hay registros nuevos listos para importar.');return;}
    const warnings=ready.filter(r=>r.warnings?.length).length;
    const ok=confirm(`Se importarán ${ready.length} movimientos${warnings?` (${warnings} con avisos revisables)`:''}. ¿Deseas continuar?`); if(!ok)return;
    setBusy(true,'Importando movimientos...');
    try{
      if(global.TRData.state.mode!=='firebase'){
        const batchId='demoimp_'+Date.now(); const meta={id:batchId,status:'completed',startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),recordCount:ready.length,fileNames:[...new Set(ready.map(r=>r.sourceFile))]};
        await global.TRData.importDemoRecords(ready.map(serialize),meta); const bs=localBatches();bs.unshift(meta);saveLocalBatches(bs.slice(0,50));
      }else{
        const start=await api('start',{meta:{fileNames:[...new Set(ready.map(r=>r.sourceFile))],parsedCount:state.records.length,readyCount:ready.length,issueCount:state.records.filter(r=>!r.valid).length,warningCount:warnings}}); const batchId=start.batchId;
        let inserted=0,skipped=0;
        for(let i=0;i<ready.length;i+=200){const d=await api('commit',{batchId,records:ready.slice(i,i+200).map(serialize)});inserted+=d.inserted;skipped+=d.skipped; $('importStatus').textContent=`Importando ${Math.min(i+200,ready.length)}/${ready.length}…`;}
        await api('finish',{batchId,inserted,skipped}); await global.TRData.refresh();
      }
      state.records=[];state.files=[];state.selectedFiles=[];state.analyzed=false;state.previewed=false;$('importFiles').value='';render();await loadHistory();document.dispatchEvent(new CustomEvent('tr:data-updated'));alert('Importación completada correctamente.');
    }catch(e){console.error(e);alert('La importación no pudo completarse: '+(e.message||e));}
    finally{setBusy(false);render();}
  }
  async function loadHistory(){
    const tbody=$('importHistoryTable'); if(!tbody)return; tbody.innerHTML='<tr><td colspan="6" class="text-center py-4 text-secondary">Cargando...</td></tr>';
    try{
      let rows=[];
      if(global.TRData?.state?.mode==='firebase'){
        const token=await global.TRAuth.token(); const res=await fetch('/api/imports',{headers:{Authorization:'Bearer '+token}}); const d=await res.json(); if(!res.ok||!d.ok)throw new Error(d.error||'No se pudo consultar el historial.');rows=d.batches||[];
      }else rows=localBatches();
      tbody.innerHTML=rows.length?rows.map(b=>`<tr><td>${esc(formatDateTime(b.startedAt))}</td><td>${esc((b.fileNames||[]).join(', ')||'—')}</td><td class="text-end">${integer.format(b.inserted??b.recordCount??0)}</td><td>${statusBadge(b.status)}</td><td>${esc(b.actorEmail||'Demo')}</td><td class="text-end">${b.status==='completed'&&global.TRAuth?.canImport?.()?`<button class="btn btn-outline-danger btn-sm" data-revert-import="${esc(b.id)}">Revertir</button>`:''}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-state">Aún no hay importaciones realizadas desde este módulo.</td></tr>';
    }catch(e){tbody.innerHTML=`<tr><td colspan="6" class="text-danger p-3">${esc(e.message||e)}</td></tr>`;}
  }
  function statusBadge(s){const map={completed:'success',processing:'warning',reverted:'secondary',failed:'danger'};return `<span class="badge text-bg-${map[s]||'secondary'}">${esc(s||'—')}</span>`}
  function formatDateTime(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('es-SV',{dateStyle:'short',timeStyle:'short'})}
  async function revert(batchId){
    if(!confirm('Se eliminarán únicamente los movimientos creados por este lote de importación. Esta acción quedará registrada en auditoría. ¿Continuar?'))return;
    setBusy(true,'Revirtiendo importación...');
    try{
      if(global.TRData.state.mode!=='firebase'){
        await global.TRData.revertDemoImport(batchId); const bs=localBatches().map(b=>b.id===batchId?{...b,status:'reverted',revertedAt:new Date().toISOString()}:b);saveLocalBatches(bs);
      }else{await api('revert',{batchId});await global.TRData.refresh();}
      await loadHistory();document.dispatchEvent(new CustomEvent('tr:data-updated'));alert('Importación revertida.');
    }catch(e){alert(e.message||e)}finally{setBusy(false);render();}
  }
  async function init(){
    if(!$('importFiles'))return;
    $('importAnalyzeBtn')?.addEventListener('click',analyze); $('importCommitBtn')?.addEventListener('click',commit); $('importFiles')?.addEventListener('change',e=>{state.selectedFiles=[...(e.target.files||[])];});
    $('importIssueTable')?.addEventListener('change',e=>{const input=e.target.closest('.import-date-fix');if(input)revalidateRecord(Number(input.dataset.recordIndex),input.value);});
    $('importHistoryTable')?.addEventListener('click',e=>{const b=e.target.closest('[data-revert-import]');if(b)revert(b.dataset.revertImport);});
    const dz=$('importDropzone'); if(dz){['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('dragover')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('dragover')}));dz.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){state.selectedFiles=[...e.dataTransfer.files];$('importStatus').textContent=`${state.selectedFiles.length} archivo(s) seleccionado(s) para analizar.`;}});}
    render(); await loadHistory();
  }

  global.TRImporter={init,render,loadHistory};
})(window);
