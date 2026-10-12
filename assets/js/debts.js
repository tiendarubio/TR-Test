(function(global){
  'use strict';

  const LOCAL_KEY='trDebtRecordsV1';
  const state={records:[],preview:[],files:[],busy:false,loaded:false};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
  const money=new Intl.NumberFormat('es-SV',{style:'currency',currency:'USD'});
  const integer=new Intl.NumberFormat('es-SV',{maximumFractionDigits:0});
  const norm=v=>String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const normHeader=v=>norm(v).replace(/[.:#]/g,'').replace(/\s+/g,' ');
  const text=v=>String(v??'').trim();
  const num=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;if(v==null||v==='')return NaN;const n=Number(String(v).trim().replace(/[$,]/g,''));return Number.isFinite(n)?n:NaN};
  const round2=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;

  function parseDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&Number.isFinite(v)){
      const p=global.XLSX?.SSF?.parse_date_code?.(v);if(p)return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
    }
    const s=text(v);if(!s)return '';
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return '';
  }
  function yearFromName(name,rows=[]){
    const m=String(name||'').match(/\b(20\d{2})\b/);if(m)return Number(m[1]);
    for(const row of rows.slice(0,4)){for(const cell of row){const x=String(cell||'').match(/\b(20\d{2})\b/);if(x)return Number(x[1]);}}
    return null;
  }
  function detectHeader(rows){
    for(let i=0;i<Math.min(rows.length,20);i++){
      const h=rows[i].map(normHeader);
      const required=['FECHA','PROVEEDOR','CCF','VALOR','DIAS'];
      const hasQuedan=h.some(x=>['QUEDANS','QUEDAN','QUEDANES'].includes(x));
      const hasPago=h.some(x=>['VALOR PAGO','VALOR PAGADO'].includes(x));
      const hasDiff=h.some(x=>['DIFERENCIA','SALDO'].includes(x));
      if(required.every(x=>h.includes(x))&&hasQuedan&&hasPago&&hasDiff)return i;
    }
    return -1;
  }
  function columnMap(headers){
    const c={};headers.forEach((h,i)=>{const k=normHeader(h);
      if(k==='FECHA')c.date=i;
      else if(['QUEDANS','QUEDAN','QUEDANES'].includes(k))c.quedan=i;
      else if(k==='PROVEEDOR')c.provider=i;
      else if(k==='CCF')c.ccf=i;
      else if(k==='VALOR')c.value=i;
      else if(k==='DIAS')c.days=i;
      else if(['FECHA PAGO','VENCIMIENTO','FECHA VENCIMIENTO'].includes(k))c.dueDate=i;
      else if(['VALOR PAGO','VALOR PAGADO'].includes(k))c.paidValue=i;
      else if(['DIFERENCIA','SALDO'].includes(k))c.balance=i;
      else if(['DEUDA TOTAL','MES'].includes(k))c.monthLabel=i;
    });return c;
  }
  function identity(r){
    const provider=norm(r.provider),ccf=norm(r.ccf),quedan=norm(r.quedan),date=r.date||'',value=round2(r.value).toFixed(2);
    return [provider,ccf,quedan,date,value].join('|');
  }
  function mutableSnapshot(r){return [Number(r.days||0),r.dueDate||'',round2(r.paidValue).toFixed(2),round2(r.balance).toFixed(2),norm(r.monthLabel)].join('|')}
  function statusOf(r){
    const bal=round2(r.balance);if(bal<=0.004)return 'paid';
    const today=new Date();const iso=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if(r.dueDate&&r.dueDate<iso)return 'overdue';
    if(Number(r.paidValue||0)>0)return 'partial';
    return 'pending';
  }
  function validate(r,sourceYear){
    const errors=[],warnings=[];
    if(!r.date)errors.push('Fecha inválida');
    if(!r.provider)errors.push('Proveedor requerido');
    if(!Number.isFinite(r.value)||r.value<=0)errors.push('Valor inválido');
    if(!Number.isFinite(r.days)||r.days<0)warnings.push('Días no válidos');
    if(sourceYear&&r.date&&Number(r.date.slice(0,4))>sourceYear)errors.push(`Fecha posterior al consolidado ${sourceYear}`);
    if(r.dueDate&&r.date&&r.dueDate<r.date)warnings.push('Vencimiento anterior a la fecha');
    const computed=round2(r.value-r.paidValue);if(Number.isFinite(r.balance)&&Math.abs(round2(r.balance)-computed)>.02)warnings.push('Saldo no coincide con Valor - Pagado');
    r.errors=errors;r.warnings=warnings;r.valid=!errors.length;r.identity=identity(r);r.snapshot=mutableSnapshot(r);r.status=statusOf(r);return r;
  }
  function workbookToRecords(fileName,arrayBuffer){
    const workbook=global.XLSX.read(arrayBuffer,{type:'array',cellDates:true,cellNF:false,cellText:false});
    const all=[];const issues=[];let recognized=false;
    workbook.SheetNames.forEach(sheetName=>{
      const rows=global.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,defval:'',raw:true});
      const hrow=detectHeader(rows);if(hrow<0)return;recognized=true;
      const cols=columnMap(rows[hrow]);const sourceYear=yearFromName(fileName,rows);
      for(let i=hrow+1;i<rows.length;i++){
        const row=rows[i]||[];const rawValue=row[cols.value];if(rawValue===''||rawValue==null)continue;
        const provider=text(row[cols.provider]);if(!provider)continue;
        const value=num(rawValue);if(!Number.isFinite(value))continue;
        const paidRaw=num(row[cols.paidValue]);const balanceRaw=num(row[cols.balance]);
        const rec={sourceFile:fileName,sourceSheet:sheetName,sourceRow:i+1,sourceYear,
          date:parseDate(row[cols.date]),quedan:text(row[cols.quedan]),provider,ccf:text(row[cols.ccf]),value:round2(value),
          days:Number.isFinite(num(row[cols.days]))?Number(num(row[cols.days])):0,dueDate:parseDate(row[cols.dueDate]),
          paidValue:Number.isFinite(paidRaw)?round2(paidRaw):0,balance:Number.isFinite(balanceRaw)?round2(balanceRaw):round2(value-(Number.isFinite(paidRaw)?paidRaw:0)),
          monthLabel:cols.monthLabel!=null?text(row[cols.monthLabel]):''};
        validate(rec,sourceYear);all.push(rec);
      }
    });
    if(!recognized)issues.push('No corresponde a la estructura de DEUDA CONSOLIDADO.');
    if(recognized&&!all.length)issues.push('Se reconoció la estructura, pero no se encontraron registros.');
    return {fileName,recognized,records:all,issues};
  }
  function isDebtWorkbook(arrayBuffer){
    try{const w=global.XLSX.read(arrayBuffer,{type:'array',sheetRows:20,cellDates:true});return w.SheetNames.some(n=>detectHeader(global.XLSX.utils.sheet_to_json(w.Sheets[n],{header:1,defval:'',raw:true}))>=0)}catch{return false}
  }
  function serialize(r){return {date:r.date,quedan:r.quedan,provider:r.provider,ccf:r.ccf,value:Number(r.value),days:Number(r.days||0),dueDate:r.dueDate||'',paidValue:Number(r.paidValue||0),balance:Number(r.balance||0),monthLabel:r.monthLabel||'',sourceFile:r.sourceFile,sourceSheet:r.sourceSheet,sourceRow:r.sourceRow,sourceYear:r.sourceYear||null};}
  function localRecords(){try{const raw=localStorage.getItem(LOCAL_KEY);return raw?JSON.parse(raw):[...(global.INITIAL_DEBT_DATA||[])];}catch{return [...(global.INITIAL_DEBT_DATA||[])]}}
  function saveLocal(records){localStorage.setItem(LOCAL_KEY,JSON.stringify(records))}
  async function api(action,payload={},method='POST'){
    const token=await global.TRAuth.token();
    const opts={method,headers:{Authorization:'Bearer '+token}};
    if(method!=='GET'){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify({action,...payload});}
    const res=await fetch('/api/debts',opts);const d=await res.json().catch(()=>({}));if(!res.ok||!d.ok)throw new Error(d.error||'No se pudo completar la operación de cuentas por pagar.');return d;
  }
  async function load(){
    if(global.TRData?.state?.mode==='firebase'){const d=await api('',{},'GET');state.records=d.records||[];}else state.records=localRecords();
    state.loaded=true;render();
  }
  function incomingFlags(records){
    const groups=new Map();records.forEach((r,i)=>{if(!r.valid)return;const arr=groups.get(r.identity)||[];arr.push({r,i});groups.set(r.identity,arr);});
    groups.forEach(arr=>{
      if(arr.length<2)return;const snaps=new Set(arr.map(x=>x.r.snapshot));
      if(snaps.size>1)arr.forEach(x=>{x.r.importState='conflict';x.r.importNote='La misma obligación aparece más de una vez con datos diferentes en el archivo.';});
      else arr.slice(1).forEach(x=>{x.r.importState='duplicate_file';x.r.importNote='Registro repetido dentro del mismo archivo.';});
    });
  }
  async function classify(records){
    records.forEach(r=>{r.importState=r.valid?'pending':'error';r.importNote=r.errors?.join('; ')||'';});incomingFlags(records);
    const candidates=records.filter(r=>r.valid&&r.importState==='pending');
    if(global.TRData?.state?.mode==='firebase'){
      for(let i=0;i<candidates.length;i+=200){const part=candidates.slice(i,i+200);const d=await api('preview',{records:part.map(serialize)});d.results.forEach((x,j)=>{part[j].importState=x.state;part[j].importNote=x.note||'';});}
    }else{
      const existing=new Map(state.records.map(r=>[identity(r),r]));
      candidates.forEach(r=>{const old=existing.get(r.identity);if(!old){r.importState='new';return;}r.importState=mutableSnapshot(old)===r.snapshot?'unchanged':'update';});
    }
  }
  function summary(){
    const s={total:state.preview.length,new:0,update:0,unchanged:0,conflict:0,error:0,duplicate_file:0};state.preview.forEach(r=>{if(s[r.importState]!=null)s[r.importState]++;});return s;
  }
  function setBusy(b,msg=''){state.busy=b;if($('debtAnalyzeBtn'))$('debtAnalyzeBtn').disabled=b;if($('debtCommitBtn'))$('debtCommitBtn').disabled=b||!(summary().new+summary().update);if($('debtImportStatus'))$('debtImportStatus').textContent=msg;}
  async function analyzeBuffers(items){
    setBusy(true,'Analizando consolidado...');
    try{
      const parsed=[];const records=[];
      for(const item of items){const p=workbookToRecords(item.name,item.buffer);parsed.push(p);records.push(...p.records);}
      if(!parsed.some(p=>p.recognized))throw new Error('El archivo no tiene la estructura esperada de DEUDA CONSOLIDADO.');
      state.files=parsed;state.preview=records;await classify(records);render();
      const s=summary();$('debtImportStatus').textContent=`${s.new} nuevas · ${s.update} actualizaciones · ${s.unchanged+s.duplicate_file} sin cambios/repetidas · ${s.conflict} conflictos · ${s.error} errores.`;
    }finally{setBusy(false);render();}
  }
  async function analyzeSelected(){
    const files=[...($('debtFiles')?.files||[])];if(!files.length){alert('Selecciona el Excel de deuda consolidada.');return;}
    if(!global.XLSX){alert('No se cargó la librería para leer Excel.');return;}
    const items=[];for(const f of files){if(!/\.(xlsx|xls)$/i.test(f.name))continue;items.push({name:f.name,buffer:await f.arrayBuffer()});}
    try{await analyzeBuffers(items);}catch(e){alert(e.message||e);setBusy(false);}
  }
  async function analyzeExternalFiles(items){
    try{await analyzeBuffers(items);document.dispatchEvent(new CustomEvent('tr:navigate',{detail:{view:'debts'}}));}catch(e){alert('No se pudo procesar el consolidado de deuda: '+(e.message||e));}
  }
  async function commit(){
    if(!global.TRAuth?.canImport?.()){alert('Solo un Administrador puede importar el consolidado.');return;}
    const ready=state.preview.filter(r=>['new','update'].includes(r.importState));if(!ready.length){alert('No hay registros nuevos ni actualizaciones para aplicar.');return;}
    const s=summary();if(!confirm(`Se agregarán ${s.new} obligaciones nuevas y se actualizarán ${s.update}. Solo las obligaciones nuevas se enviarán a TR-Finanzas. ¿Continuar?`))return;
    setBusy(true,'Guardando cuentas por pagar...');
    try{
      let result={newCount:0,updatedCount:0,financeInserted:0,financeSkipped:0};
      if(global.TRData?.state?.mode==='firebase'){
        for(let i=0;i<ready.length;i+=120){const d=await api('commit',{records:ready.slice(i,i+120).map(serialize)});for(const k of Object.keys(result))result[k]+=Number(d[k]||0);}
        await Promise.all([load(),global.TRData.refresh()]);
      }else{
        const current=new Map(state.records.map(r=>[identity(r),r]));const newFinance=[];
        ready.forEach(r=>{const old=current.get(r.identity);if(!old){result.newCount++;newFinance.push({date:r.date,sourceMonth:Number(r.date.slice(5,7)),sourceYear:Number(r.date.slice(0,4)),category:'C X P',provider:r.provider,document:r.ccf||r.quedan||'',value:r.value,discount:0,detail:`Cuenta por pagar${r.quedan?` · QUEDAN ${r.quedan}`:''}${r.ccf?` · CCF ${r.ccf}`:''}${r.days?` · ${r.days} días`:''}`,debtIdentity:r.identity});}else result.updatedCount++;current.set(r.identity,{...old,...serialize(r),identity:r.identity,snapshot:r.snapshot,status:statusOf(r),updatedAt:new Date().toISOString()});});
        state.records=[...current.values()];saveLocal(state.records);
        if(newFinance.length){await global.TRData.importDemoRecords(newFinance,{id:'debtimp_'+Date.now()});result.financeInserted=newFinance.length;}
        render();
      }
      state.preview=[];state.files=[];if($('debtFiles'))$('debtFiles').value='';render();document.dispatchEvent(new CustomEvent('tr:data-updated'));
      alert(`Carga completada. Nuevas: ${result.newCount}. Actualizadas: ${result.updatedCount}. Añadidas a TR-Finanzas: ${result.financeInserted}. Ya existentes en TR-Finanzas: ${result.financeSkipped}.`);
    }catch(e){alert(e.message||e);}finally{setBusy(false);render();}
  }
  function badge(status){const m={paid:['success','Pagada'],partial:['warning','Parcial'],overdue:['danger','Vencida'],pending:['primary','Pendiente']};const x=m[status]||['secondary',status||'—'];return `<span class="badge text-bg-${x[0]}">${x[1]}</span>`}
  function importBadge(st){const m={new:['success','Nueva'],update:['warning','Actualizar'],unchanged:['secondary','Sin cambios'],duplicate_file:['secondary','Repetida'],conflict:['danger','Conflicto'],error:['danger','Error'],pending:['secondary','Revisando']};const x=m[st]||['secondary',st];return `<span class="badge text-bg-${x[0]}">${x[1]}</span>`}
  function filteredRecords(){
    const q=norm($('debtSearch')?.value),st=$('debtStatus')?.value||'';return state.records.filter(r=>(!st||statusOf(r)===st)&&(!q||[r.provider,r.ccf,r.quedan].some(v=>norm(v).includes(q))));
  }
  function render(){
    if(!$('debtKpis'))return;
    const records=state.records.map(r=>({...r,balance:round2(r.balance),status:statusOf(r)}));const outstanding=records.filter(r=>r.balance>0.004);const overdue=outstanding.filter(r=>r.status==='overdue');
    const today=new Date();const d7=new Date(today);d7.setDate(d7.getDate()+7);const iso7=`${d7.getFullYear()}-${String(d7.getMonth()+1).padStart(2,'0')}-${String(d7.getDate()).padStart(2,'0')}`;const isoToday=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;const due7=outstanding.filter(r=>r.dueDate&&r.dueDate>=isoToday&&r.dueDate<=iso7);
    $('debtKpis').innerHTML=[['Saldo pendiente',money.format(outstanding.reduce((a,r)=>a+r.balance,0)),'fa-wallet'],['Deuda vencida',money.format(overdue.reduce((a,r)=>a+r.balance,0)),'fa-triangle-exclamation'],['Vence en 7 días',money.format(due7.reduce((a,r)=>a+r.balance,0)),'fa-calendar-day'],['Obligaciones abiertas',integer.format(outstanding.length),'fa-file-invoice-dollar']].map(x=>`<div class="col-sm-6 col-xl-3"><div class="card border-0 shadow-sm kpi-card h-100"><div class="card-body d-flex justify-content-between gap-3"><div><div class="kpi-label">${x[0]}</div><div class="kpi-value mt-1">${x[1]}</div></div><div class="kpi-icon"><i class="fa-solid ${x[2]}"></i></div></div></div></div>`).join('');
    const rows=filteredRecords().sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
    $('debtTable').innerHTML=rows.length?rows.slice(0,500).map(r=>`<tr><td>${esc(formatDate(r.date))}</td><td>${esc(r.quedan||'—')}</td><td>${esc(r.provider)}</td><td>${esc(r.ccf||'—')}</td><td class="text-end">${money.format(Number(r.value||0))}</td><td class="text-center">${esc(r.days||0)}</td><td>${esc(formatDate(r.dueDate))}</td><td class="text-end">${money.format(Number(r.paidValue||0))}</td><td class="text-end fw-semibold">${money.format(Number(r.balance||0))}</td><td>${badge(statusOf(r))}</td></tr>`).join(''):'<tr><td colspan="10" class="empty-state">Aún no hay cuentas por pagar cargadas.</td></tr>';
    const s=summary();
    if($('debtPreviewSummary'))$('debtPreviewSummary').textContent=state.preview.length?`${s.total} filas · ${s.new} nuevas · ${s.update} actualizaciones · ${s.unchanged+s.duplicate_file} sin cambios/repetidas · ${s.conflict} conflictos · ${s.error} errores.`:'Carga un consolidado para comparar sus filas con lo que ya existe.';
    if($('debtPreviewTable'))$('debtPreviewTable').innerHTML=state.preview.length?state.preview.slice(0,800).map(r=>`<tr><td>${importBadge(r.importState)}</td><td>${esc(r.sourceRow)}</td><td>${esc(formatDate(r.date))}</td><td>${esc(r.provider)}</td><td>${esc(r.ccf||'—')}</td><td class="text-end">${money.format(r.value)}</td><td class="text-end">${money.format(r.paidValue)}</td><td class="text-end">${money.format(r.balance)}</td><td>${esc(r.importNote||r.warnings?.join('; ')||'')}</td></tr>`).join(''):'<tr><td colspan="9" class="empty-state">Sin vista previa.</td></tr>';
    if($('debtCommitBtn'))$('debtCommitBtn').disabled=state.busy||!(s.new+s.update);
    if($('debtImportAdminNote'))$('debtImportAdminNote').classList.toggle('d-none',!!global.TRAuth?.canImport?.());
    if($('debtImportCard'))$('debtImportCard').classList.toggle('d-none',!global.TRAuth?.canImport?.());
  }
  function formatDate(v){if(!v)return '—';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(v)}
  async function init(){
    if(!$('view-debts'))return;
    $('debtAnalyzeBtn')?.addEventListener('click',analyzeSelected);$('debtCommitBtn')?.addEventListener('click',commit);$('debtSearch')?.addEventListener('input',render);$('debtStatus')?.addEventListener('change',render);$('debtRefresh')?.addEventListener('click',load);
    await load();
  }

  global.TRDebts={state,init,load,render,isDebtWorkbook,analyzeExternalFiles,workbookToRecords};
})(window);
