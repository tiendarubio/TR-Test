(() => {
  'use strict';

  const DATA = window.HISTORICAL_DATA || { categories: [], movements: [], summaryByMonth: {}, importIssues: [] };
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const PAGE_SIZE = 25;
  const categoryByName = new Map(DATA.categories.map(c => [c.name, c]));
  let dashboardChart = null;
  let compareChart = null;
  let movementPage = 1;
  let compareMode = 'quick';

  const $ = id => document.getElementById(id);
  const qsa = sel => [...document.querySelectorAll(sel)];
  const money = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  const integer = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 0 });
  const number2 = new Intl.NumberFormat('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const normalize = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
  const monthKey = (year, month) => `${year}-${String(month).padStart(2,'0')}`;
  const getMonthFromIso = iso => Number(String(iso).slice(5,7));
  const getDayFromIso = iso => Number(String(iso).slice(8,10));
  const periodParts = period => { const [year,month]=String(period||'').split('-').map(Number); return {year,month}; };
  const monthLabel = period => { const {year,month}=periodParts(period); return year&&month?`${MONTHS[month-1]} ${year}`:String(period||'—'); };
  const categoryLabel = name => categoryByName.get(name)?.label || name;
  const groupLabel = group => group === 'gasto_fijo' ? 'Gasto fijo' : group === 'imprevisto' ? 'Imprevisto' : 'General';

  function localMovements() {
    return window.TRData?.getNewMovements?.() || [];
  }

  function allMovements() {
    return window.TRData?.getMovements?.(DATA.movements) || DATA.movements;
  }

  function movementPeriodKey(m) {
    if (m.sourcePeriodYear && m.sourcePeriodMonth) return monthKey(Number(m.sourcePeriodYear),Number(m.sourcePeriodMonth));
    if (m.sourceYear && m.sourceMonth) return monthKey(Number(m.sourceYear),Number(m.sourceMonth));
    if (m.sourceMonth && !m.sourceYear && !m.sourcePeriodYear && !m.id) return monthKey(2026,Number(m.sourceMonth));
    if (m.date && /^\d{4}-\d{2}/.test(m.date)) return String(m.date).slice(0,7);
    if (m.sourceMonth) return monthKey(2026,Number(m.sourceMonth));
    return null;
  }

  function availablePeriods() {
    const set = new Set(allMovements().map(m=>movementPeriodKey(m)).filter(Boolean));
    if(!set.size) set.add(new Date().toISOString().slice(0,7));
    return [...set].sort();
  }

  function fillMonthSelect(select, selected) {
    const periods=availablePeriods(); const chosen=periods.includes(selected)?selected:periods.at(-1);
    select.innerHTML = periods.map(p => `<option value="${p}" ${p===chosen?'selected':''}>${monthLabel(p)}</option>`).join('');
  }


  function refreshPeriodSelectors() {
    ['dashboardMonth','reportMonth','compareMonthA','compareMonthB'].forEach(id=>{const el=$(id);if(el)fillMonthSelect(el,el.value);});
  }

  function fillCategorySelect(select, includeAll=false) {
    const first = includeAll ? '<option value="">Todas</option>' : '<option value="" disabled selected>Selecciona...</option>';
    select.innerHTML = first + DATA.categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.label)}</option>`).join('');
  }

  function switchView(view) {
    qsa('.app-view').forEach(el => el.classList.add('d-none'));
    $(`view-${view}`)?.classList.remove('d-none');
    qsa('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    if (view === 'dashboard') renderDashboard();
    if (view === 'movements') renderMovements();
    if (view === 'compare') renderCompare();
    if (view === 'reports') renderReports();
    if (view === 'import') { window.TRImporter?.render?.(); window.TRImporter?.loadHistory?.(); }
    if (view === 'settings') renderSettings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function currentMonthMovements(period) {
    return allMovements().filter(m => movementPeriodKey(m) === String(period));
  }

  function latestDateInMonth(period) {
    const dates = currentMonthMovements(period).map(m => m.date).filter(Boolean).filter(d => String(d).slice(0,7)===String(period)).sort();
    return dates.at(-1) || null;
  }

  function workbookTotal(period) {
    return currentMonthMovements(period).reduce((sum,m)=>sum+Number(m.value||0),0);
  }

  function groupTotalFromSummary(period, group) {
    return currentMonthMovements(period).filter(m=>categoryByName.get(m.category)?.group===group).reduce((sum,m)=>sum+Number(m.value||0),0);
  }

  function kpiCard(label, value, icon, foot='') {
    return `<div class="col-sm-6 col-xl-3"><div class="card border-0 shadow-sm kpi-card h-100"><div class="card-body d-flex justify-content-between gap-3"><div><div class="kpi-label">${escapeHtml(label)}</div><div class="kpi-value mt-1">${value}</div><div class="kpi-foot mt-1">${escapeHtml(foot)}</div></div><div class="kpi-icon"><i class="${icon}"></i></div></div></div></div>`;
  }

  function renderDashboard() {
    const month = $('dashboardMonth').value || availablePeriods().at(-1);
    const movements = currentMonthMovements(month);
    const total = workbookTotal(month);
    const fixed = groupTotalFromSummary(month, 'gasto_fijo');
    const unforeseen = groupTotalFromSummary(month, 'imprevisto');
    const cutoff = latestDateInMonth(month);
    $('dataCutoffBanner').innerHTML = cutoff
      ? `<span class="badge text-bg-dark"><i class="fa-regular fa-calendar me-1"></i>Datos hasta ${formatDate(cutoff)}</span><span>El sistema distingue entre periodo cargado y mes calendario.</span>`
      : `<span class="badge text-bg-secondary">Sin movimientos fechados</span>`;

    $('dashboardKpis').innerHTML = [
      kpiCard('Movimiento total', money.format(total), 'fa-solid fa-money-bill-transfer', 'Suma de categorías del resumen'),
      kpiCard('Registros', integer.format(movements.length), 'fa-solid fa-receipt', 'Movimientos con fecha válida'),
      kpiCard('Gastos fijos', money.format(fixed), 'fa-solid fa-repeat', 'Según clasificación actual'),
      kpiCard('Imprevistos', money.format(unforeseen), 'fa-solid fa-triangle-exclamation', 'Bonificaciones + imprevistos + otros')
    ].join('');

    const rows = dashboardCategoryRows(month);
    $('dashboardCategoryTable').innerHTML = rows.map(r => `<tr>
      <td class="fw-semibold">${escapeHtml(r.label)}</td>
      <td><span class="badge rounded-pill group-badge group-${r.group}">${escapeHtml(groupLabel(r.group))}</span></td>
      <td class="text-end fw-semibold">${money.format(r.total)}</td>
      <td class="text-end">${integer.format(r.count)}</td>
      <td class="text-end table-action"><button class="btn btn-sm btn-outline-secondary" data-open-category="${escapeHtml(r.name)}">Ver</button></td>
    </tr>`).join('');

    renderDashboardChart(rows);
    renderDashboardInsights(month);
  }

  function dashboardCategoryRows(month) {
    const movements = currentMonthMovements(month);
    return DATA.categories.map(c => {
      const rows=movements.filter(m=>m.category===c.name);
      return { name:c.name, label:c.label, group:c.group, total:rows.reduce((s,m)=>s+Number(m.value||0),0), count:rows.length };
    }).filter(r => r.total !== 0 || r.count !== 0).sort((a,b)=>b.total-a.total);
  }

  function renderDashboardChart(rows) {
    const top = rows.slice(0, 10);
    dashboardChart?.destroy();
    dashboardChart = new Chart($('dashboardChart'), {
      type:'bar',
      data:{ labels:top.map(r=>r.label), datasets:[{ label:'Valor', data:top.map(r=>r.total), backgroundColor:'#343a40', borderRadius:6 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>money.format(ctx.raw)}}}, scales:{x:{ticks:{callback:v=>'$'+Intl.NumberFormat('en',{notation:'compact'}).format(v)},grid:{color:'#eef0f2'}},y:{grid:{display:false}}} }
    });
  }

  function daysInPeriod(period){ const {year,month}=periodParts(period); return new Date(year,month,0).getDate(); }
  function previousPeriod(period){ const {year,month}=periodParts(period); const d=new Date(year,month-2,1); return monthKey(d.getFullYear(),d.getMonth()+1); }
  function sameCutoffRanges(monthA, monthB) {
    const latestA = latestDateInMonth(monthA);
    const latestB = latestDateInMonth(monthB);
    const dayA = latestA ? getDayFromIso(latestA) : daysInPeriod(monthA);
    const dayB = latestB ? getDayFromIso(latestB) : daysInPeriod(monthB);
    const day = Math.min(dayA, dayB);
    return {day,aStart:`${monthA}-01`,aEnd:`${monthA}-${String(day).padStart(2,'0')}`,bStart:`${monthB}-01`,bEnd:`${monthB}-${String(day).padStart(2,'0')}`};
  }

  function periodMovements(start, end) {
    return allMovements().filter(m => m.date && m.date >= start && m.date <= end);
  }

  function sumAmount(rows) { return rows.reduce((s,m)=>s+Number(m.value||0),0); }

  function renderDashboardInsights(month) {
    const previous = previousPeriod(month);
    if (!availablePeriods().includes(previous)) { $('dashboardInsights').innerHTML = '<div class="empty-state">No existe un mes anterior disponible.</div>'; return; }
    const ranges = sameCutoffRanges(month, previous);
    const a = periodMovements(ranges.aStart, ranges.aEnd);
    const b = periodMovements(ranges.bStart, ranges.bEnd);
    const totalA = sumAmount(a), totalB = sumAmount(b);
    const delta = totalA-totalB;
    const pct = totalB ? delta/totalB*100 : null;
    const comp = compareAggregates(a,b,'category','amount').sort((x,y)=>Math.abs(y.diff)-Math.abs(x.diff));
    const top = comp.slice(0,4);
    $('dashboardInsights').innerHTML = `
      <div class="insight-item pt-0"><div class="small text-secondary">Mismo corte: días 1–${ranges.day}</div><div class="d-flex align-items-end justify-content-between gap-2 mt-1"><div class="h4 mb-0">${money.format(totalA)}</div><div class="${deltaClass(delta)} fw-semibold">${formatDeltaPct(pct)}</div></div><div class="small text-secondary mt-1">vs. ${money.format(totalB)} en ${monthLabel(previous)}</div></div>
      ${top.map(r=>`<div class="insight-item"><div class="d-flex justify-content-between gap-3"><div class="insight-title">${escapeHtml(r.label)}</div><div class="${deltaClass(r.diff)} fw-semibold">${signedMoney(r.diff)}</div></div><div class="small text-secondary">${formatVariance(r.base,r.diff)}</div></div>`).join('')}
    `;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function deltaClass(v) { return v > 0 ? 'delta-up' : v < 0 ? 'delta-down' : 'delta-neutral'; }
  function signedMoney(v) { return `${v>0?'+':''}${money.format(v)}`; }
  function formatDeltaPct(pct) { return pct == null ? 'Nuevo' : `${pct>0?'+':''}${number2.format(pct)}%`; }
  function formatVariance(base,diff) { return base === 0 ? (diff === 0 ? 'Sin cambio' : 'Sin base comparable') : `${diff/base*100>0?'+':''}${number2.format(diff/base*100)}% vs. periodo base`; }

  function renderMovements() {
    const all = filteredMovements();
    const totalPages = Math.max(1, Math.ceil(all.length/PAGE_SIZE));
    movementPage = Math.min(movementPage,totalPages);
    const start = (movementPage-1)*PAGE_SIZE;
    const page = all.slice(start,start+PAGE_SIZE);
    $('movementsTable').innerHTML = page.length ? page.map(m=>`<tr>
      <td class="text-nowrap">${formatDate(m.date)}</td>
      <td><span class="fw-semibold">${escapeHtml(categoryLabel(m.category))}</span></td>
      <td>${escapeHtml(m.provider || '—')}</td>
      <td>${escapeHtml(m.document || '—')}</td>
      <td class="text-end fw-semibold">${money.format(Number(m.value||0))}</td>
      <td class="text-secondary">${escapeHtml(m.detail || '')}</td>
    </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state">No hay movimientos que coincidan con los filtros.</div></td></tr>`;
    const amount = sumAmount(all);
    $('movementFilterSummary').textContent = `${integer.format(all.length)} movimientos · ${money.format(amount)}`;
    $('movementPaginationText').textContent = `Página ${movementPage} de ${totalPages}`;
    $('movPrev').disabled = movementPage <= 1;
    $('movNext').disabled = movementPage >= totalPages;
  }

  function filteredMovements() {
    const start = $('movStart').value;
    const end = $('movEnd').value;
    const cat = $('movCategory').value;
    const search = normalize($('movSearch').value);
    return allMovements().filter(m => {
      if (start && (!m.date || m.date < start)) return false;
      if (end && (!m.date || m.date > end)) return false;
      if (cat && m.category !== cat) return false;
      if (search && !normalize(`${m.provider} ${m.document} ${m.detail}`).includes(search)) return false;
      return true;
    }).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || Number(b.value||0)-Number(a.value||0));
  }

  function openCategory(name) {
    switchView('movements');
    $('movCategory').value = name;
    const month = $('dashboardMonth').value;
    $('movStart').value = `${month}-01`;
    const cutoff = latestDateInMonth(month) || `${month}-${String(daysInPeriod(month)).padStart(2,'0')}`;
    $('movEnd').value = cutoff;
    movementPage = 1;
    renderMovements();
  }

  function compareAggregates(aRows, bRows, groupBy, metric) {
    const keyFor = m => {
      if (groupBy === 'provider') return m.provider || 'Sin proveedor';
      if (groupBy === 'group') return groupLabel(categoryByName.get(m.category)?.group || 'general');
      return m.category;
    };
    const aggregate = rows => {
      const map = new Map();
      rows.forEach(m => {
        const key = keyFor(m);
        if (!map.has(key)) map.set(key,{ amount:0,count:0,discount:0 });
        const v = map.get(key); v.amount += Number(m.value||0); v.count += 1; v.discount += Number(m.discount||0);
      });
      return map;
    };
    const A = aggregate(aRows), B = aggregate(bRows), keys = new Set([...A.keys(),...B.keys()]);
    const metricVal = obj => metric === 'count' ? obj.count : metric === 'average' ? (obj.count ? obj.amount/obj.count : 0) : metric === 'discount' ? obj.discount : obj.amount;
    return [...keys].map(key => {
      const a = A.get(key)||{amount:0,count:0,discount:0}; const b = B.get(key)||{amount:0,count:0,discount:0};
      const current = metricVal(a), base = metricVal(b), diff = current-base;
      return { key, label:groupBy==='category'?categoryLabel(key):key, current, base, diff, pct:base===0?null:diff/base*100, currentCount:a.count, baseCount:b.count };
    });
  }

  function comparisonContext() {
    let aRows=[], bRows=[], labelA='', labelB='', groupBy='', metric='';
    if (compareMode === 'quick') {
      const monthA=$('compareMonthA').value, monthB=$('compareMonthB').value;
      groupBy=$('compareGroupBy').value; metric=$('compareMetric').value;
      if ($('compareSameCutoff').checked) {
        const r=sameCutoffRanges(monthA,monthB);
        aRows=periodMovements(r.aStart,r.aEnd); bRows=periodMovements(r.bStart,r.bEnd);
        labelA=`${monthLabel(monthA)} · 1–${r.day}`; labelB=`${monthLabel(monthB)} · 1–${r.day}`;
        $('cutoffHelp').textContent=`Se comparan exactamente los días 1 al ${r.day} en ambos periodos.`;
      } else {
        aRows=currentMonthMovements(monthA); bRows=currentMonthMovements(monthB);
        labelA=monthLabel(monthA); labelB=monthLabel(monthB);
        $('cutoffHelp').textContent='Se compara todo lo cargado en cada libro mensual, aunque un mes esté incompleto.';
      }
    } else {
      const aStart=$('customAStart').value,aEnd=$('customAEnd').value,bStart=$('customBStart').value,bEnd=$('customBEnd').value;
      groupBy=$('customGroupBy').value; metric=$('customMetric').value;
      aRows=periodMovements(aStart,aEnd); bRows=periodMovements(bStart,bEnd);
      labelA=`${formatDate(aStart)}–${formatDate(aEnd)}`; labelB=`${formatDate(bStart)}–${formatDate(bEnd)}`;
    }
    return {aRows,bRows,labelA,labelB,groupBy,metric};
  }

  function metricFormatter(metric, value) {
    return metric === 'count' ? integer.format(value) : money.format(value);
  }

  function metricLabel(metric) {
    return metric === 'count' ? 'Movimientos' : metric === 'average' ? 'Promedio' : metric === 'discount' ? 'Descuentos' : 'Valor';
  }

  function renderCompare() {
    const ctx = comparisonContext();
    const rows = compareAggregates(ctx.aRows,ctx.bRows,ctx.groupBy,ctx.metric).sort((a,b)=>Math.max(Math.abs(b.current),Math.abs(b.base))-Math.max(Math.abs(a.current),Math.abs(a.base)));
    const totalA = ctx.metric === 'count' ? ctx.aRows.length : ctx.metric === 'average' ? (ctx.aRows.length?sumAmount(ctx.aRows)/ctx.aRows.length:0) : ctx.metric === 'discount' ? ctx.aRows.reduce((s,m)=>s+Number(m.discount||0),0) : sumAmount(ctx.aRows);
    const totalB = ctx.metric === 'count' ? ctx.bRows.length : ctx.metric === 'average' ? (ctx.bRows.length?sumAmount(ctx.bRows)/ctx.bRows.length:0) : ctx.metric === 'discount' ? ctx.bRows.reduce((s,m)=>s+Number(m.discount||0),0) : sumAmount(ctx.bRows);
    const diff=totalA-totalB,pct=totalB===0?null:diff/totalB*100;
    const countDiff=ctx.aRows.length-ctx.bRows.length;

    $('compareKpis').innerHTML=[
      kpiCard('Periodo actual', metricFormatter(ctx.metric,totalA), 'fa-solid fa-arrow-trend-up', ctx.labelA),
      kpiCard('Periodo base', metricFormatter(ctx.metric,totalB), 'fa-solid fa-clock-rotate-left', ctx.labelB),
      kpiCard('Diferencia', (diff>0?'+':'')+metricFormatter(ctx.metric,diff), 'fa-solid fa-right-left', formatDeltaPct(pct)),
      kpiCard('Movimientos', integer.format(ctx.aRows.length), 'fa-solid fa-receipt', `${countDiff>0?'+':''}${countDiff} vs. base`)
    ].join('');

    $('periodAHeader').textContent=ctx.labelA;
    $('periodBHeader').textContent=ctx.labelB;
    $('compareEntityHeader').textContent=ctx.groupBy==='provider'?'Proveedor':ctx.groupBy==='group'?'Grupo':'Categoría';
    $('compareChartSubtitle').textContent=`${metricLabel(ctx.metric)} · ${ctx.labelA} vs. ${ctx.labelB}`;

    $('compareTable').innerHTML = rows.length ? rows.map(r=>`<tr>
      <td class="fw-semibold">${escapeHtml(r.label)}</td>
      <td class="text-end">${metricFormatter(ctx.metric,r.base)}</td>
      <td class="text-end">${metricFormatter(ctx.metric,r.current)}</td>
      <td class="text-end ${deltaClass(r.diff)} fw-semibold">${r.diff>0?'+':''}${metricFormatter(ctx.metric,r.diff)}</td>
      <td class="text-end">${r.base===0?(r.current===0?'—':'<span class="badge text-bg-secondary">Nuevo</span>'):`<span class="${deltaClass(r.diff)}">${formatDeltaPct(r.pct)}</span>`}</td>
      <td class="text-end">${ctx.groupBy==='category'?`<button class="btn btn-sm btn-outline-secondary" data-compare-open="${escapeHtml(r.key)}">Ver</button>`:''}</td>
    </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state">No hay datos para los rangos seleccionados.</div></td></tr>`;

    renderCompareChart(rows,ctx);
    renderCompareInsights(rows,ctx);
  }

  function renderCompareChart(rows,ctx) {
    const top=rows.slice(0,12);
    compareChart?.destroy();
    compareChart=new Chart($('compareChart'),{
      type:'bar',
      data:{labels:top.map(r=>r.label),datasets:[
        {label:ctx.labelB,data:top.map(r=>r.base),backgroundColor:'#adb5bd',borderRadius:5},
        {label:ctx.labelA,data:top.map(r=>r.current),backgroundColor:'#212529',borderRadius:5}
      ]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${metricFormatter(ctx.metric,c.raw)}`}}},scales:{x:{ticks:{callback:v=>ctx.metric==='count'?v:'$'+Intl.NumberFormat('en',{notation:'compact'}).format(v)},grid:{color:'#eef0f2'}},y:{grid:{display:false}}}}
    });
  }

  function renderCompareInsights(rows,ctx) {
    const impactful=[...rows].filter(r=>r.diff!==0).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,5);
    $('compareInsights').innerHTML = impactful.length ? impactful.map(r=>`<div class="insight-item ${r===impactful[0]?'pt-0':''}">
      <div class="d-flex justify-content-between gap-2"><div class="insight-title">${escapeHtml(r.label)}</div><div class="${deltaClass(r.diff)} fw-semibold">${r.diff>0?'+':''}${metricFormatter(ctx.metric,r.diff)}</div></div>
      <div class="small text-secondary mt-1">${r.base===0?'Aparece sin base comparable':`${formatDeltaPct(r.pct)} respecto al periodo base`}</div>
    </div>`).join('') : '<div class="empty-state">No hay variaciones entre los periodos.</div>';
  }

  function setCompareMode(mode) {
    compareMode=mode;
    const quick=mode==='quick';
    $('quickCompareControls').classList.toggle('d-none',!quick);
    $('customCompareControls').classList.toggle('d-none',quick);
    $('compareQuickBtn').className=`btn ${quick?'btn-dark':'btn-outline-dark'} btn-sm`;
    $('compareCustomBtn').className=`btn ${quick?'btn-outline-dark':'btn-dark'} btn-sm`;
    renderCompare();
  }

  function renderReports() {
    const issues=DATA.importIssues||[];
    $('importIssuesTable').innerHTML=issues.map(i=>`<tr><td>${escapeHtml(i.workbook)}</td><td>${escapeHtml(i.sheet)}</td><td>${i.row}</td><td>${escapeHtml(i.rawDate ?? 'Vacía')}</td><td>${escapeHtml(i.provider)}</td><td class="text-end fw-semibold">${money.format(i.value)}</td></tr>`).join('') || '<tr><td colspan="6" class="text-center text-secondary py-4">Sin incidencias.</td></tr>';
  }


  function renderSettings() {
    const mode=window.TRData?.state?.mode==='firebase'?'Producción · Firestore':'Demostración · navegador';
    const role=window.TRAuth?.state?.mode==='demo'?'Demo':({admin:'Administrador',contabilidad:'Contabilidad',consulta:'Consulta'}[window.TRAuth?.state?.role]||'Sin acceso');
    if($('settingsDataMode')) $('settingsDataMode').textContent=mode;
    if($('settingsRole')) $('settingsRole').textContent=role;
    if($('settingsCategories')) $('settingsCategories').innerHTML=DATA.categories.map(c=>`<tr><td class="fw-semibold">${escapeHtml(c.label)}</td><td><span class="badge rounded-pill group-badge group-${c.group}">${escapeHtml(groupLabel(c.group))}</span></td><td>${c.supportsDiscount?'Sí':'No'}</td></tr>`).join('');
  }

  function csvEscape(v) { const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
  function downloadCsv(filename, rows) {
    const csv='\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
  }

  function downloadSummary() {
    const month=$('reportMonth').value; const rows=dashboardCategoryRows(month);
    downloadCsv(`resumen_flujo_${month.replace('-','_')}.csv`, [['Categoría','Grupo','Total','Registros'],...rows.map(r=>[r.label,groupLabel(r.group),r.total,r.count])]);
  }

  function downloadMovements() {
    const rows=allMovements().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    downloadCsv('movimientos_flujo.csv',[['Fecha','Categoría','Proveedor','Documento','Valor','Descuento','Detalle'],...rows.map(m=>[m.date,categoryLabel(m.category),m.provider,m.document,m.value,m.discount||0,m.detail])]);
  }

  function downloadSummaryXlsx() {
    const month=$('reportMonth').value; const rows=dashboardCategoryRows(month);
    if(!window.XLSX){showToast('No se pudo cargar el generador de Excel.');return;}
    const wb=XLSX.utils.book_new();
    const summaryData=[['Categoría','Grupo','Total','Registros'],...rows.map(r=>[r.label,groupLabel(r.group),r.total,r.count])];
    const ws=XLSX.utils.aoa_to_sheet(summaryData); ws['!cols']=[{wch:28},{wch:18},{wch:16},{wch:12}]; XLSX.utils.book_append_sheet(wb,ws,'Resumen');
    const detail=currentMonthMovements(month).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const wd=XLSX.utils.aoa_to_sheet([['Fecha','Categoría','Proveedor','Documento','Valor','Descuento','Detalle'],...detail.map(m=>[m.date,categoryLabel(m.category),m.provider,m.document,m.value,m.discount||0,m.detail])]);
    wd['!cols']=[{wch:12},{wch:26},{wch:38},{wch:18},{wch:14},{wch:14},{wch:45}]; XLSX.utils.book_append_sheet(wb,wd,'Movimientos');
    XLSX.writeFile(wb,`flujo_efectivo_${month.replace('-','_')}.xlsx`);
  }

  function downloadSummaryPdf() {
    const month=$('reportMonth').value; const rows=dashboardCategoryRows(month);
    if(!window.jspdf?.jsPDF){showToast('No se pudo cargar el generador de PDF.');return;}
    const doc=new window.jspdf.jsPDF(); const total=rows.reduce((s,r)=>s+r.total,0);
    doc.setFontSize(16);doc.text('Resumen de Flujo de Efectivo',14,18);doc.setFontSize(10);doc.text(monthLabel(month),14,25);doc.text(`Total: ${money.format(total)}`,14,31);
    doc.autoTable({startY:38,head:[['Categoría','Grupo','Total','Registros']],body:rows.map(r=>[r.label,groupLabel(r.group),money.format(r.total),String(r.count)]),styles:{fontSize:8},headStyles:{fillColor:[33,37,41]}});
    doc.save(`resumen_flujo_${month.replace('-','_')}.pdf`);
  }

  function openMovementModal() {
    const today=new Date().toLocaleDateString('en-CA'); $('newDate').value=today; $('newCategory').value=''; $('newProvider').value=''; $('newDocument').value=''; $('newValue').value=''; $('newDiscount').value='0'; $('newDetail').value=''; $('discountField').classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance($('movementModal')).show();
  }

  async function saveDemoMovement(event) {
    event.preventDefault();
    if(window.TRAuth && !window.TRAuth.canWrite()){ showToast('Tu rol es solo de consulta.'); return; }
    const category=$('newCategory').value;
    const rec={sourceMonth:getMonthFromIso($('newDate').value),sourceYear:Number($('newDate').value.slice(0,4)),date:$('newDate').value,category,provider:$('newProvider').value.trim(),document:$('newDocument').value.trim(),value:Number($('newValue').value||0),discount:Number($('newDiscount').value||0),detail:$('newDetail').value.trim()};
    try{
      await window.TRData.createMovement(rec);
      bootstrap.Modal.getInstance($('movementModal'))?.hide();
      showToast(window.TRData.state.mode==='firebase'?'Movimiento guardado en Firestore.':'Movimiento guardado en modo demostración.');
      refreshPeriodSelectors(); renderDashboard(); renderMovements(); renderCompare();
    }catch(error){ showToast(error.message||'No se pudo guardar el movimiento.'); }
  }

  function showToast(text) { $('toastText').textContent=text; bootstrap.Toast.getOrCreateInstance($('appToast'),{delay:2800}).show(); }

  async function setup() {
    await window.TRAuth.init();
    await window.TRData.boot();
    const prod=window.TRData.state.mode==='firebase';
    const notice=$('prototypeNotice');
    if(notice){notice.className=`alert ${prod?'alert-success-subtle':'alert-warning-subtle'} border alert-dismissible fade show mb-4`;notice.querySelector('div > div').innerHTML=prod?'<strong>Producción:</strong> conectado a Firebase/Firestore. Los movimientos se guardan con usuario y trazabilidad.':'<strong>Modo demostración:</strong> Firebase no está configurado; los movimientos nuevos se guardan solo en este navegador.';}
    if($('btnLogout')) $('btnLogout').classList.toggle('d-none',window.TRAuth.state.mode!=='firebase');
    if(!window.TRAuth.canWrite()) qsa('[data-new-movement]').forEach(btn=>{btn.disabled=true;btn.title='Tu rol es solo de consulta';});
    qsa('[data-admin-only]').forEach(el=>el.classList.toggle('d-none',!window.TRAuth.canImport()));
    const periods=availablePeriods(); const last=periods.at(-1); const prev=periods.includes(previousPeriod(last))?previousPeriod(last):(periods.at(-2)||last);
    fillMonthSelect($('dashboardMonth'),last); fillMonthSelect($('reportMonth'),last); fillMonthSelect($('compareMonthA'),last); fillMonthSelect($('compareMonthB'),prev);
    fillCategorySelect($('movCategory'),true); fillCategorySelect($('newCategory'),false);

    const latest=latestDateInMonth(last) || `${last}-${String(daysInPeriod(last)).padStart(2,'0')}`;
    $('movStart').value=`${last}-01`; $('movEnd').value=latest;
    $('customAStart').value=`${last}-01`; $('customAEnd').value=latest;
    const prevLatest=latestDateInMonth(prev)||`${prev}-${String(daysInPeriod(prev)).padStart(2,'0')}`;
    $('customBStart').value=`${prev}-01`; $('customBEnd').value=prevLatest;

    qsa('[data-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
    qsa('[data-view-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();switchView(a.dataset.viewLink)}));
    qsa('[data-new-movement]').forEach(btn=>btn.addEventListener('click',openMovementModal));
    qsa('[data-go-compare]').forEach(btn=>btn.addEventListener('click',()=>switchView('compare')));

    $('dashboardMonth').addEventListener('change',renderDashboard);
    $('movStart').addEventListener('change',()=>{movementPage=1;renderMovements()}); $('movEnd').addEventListener('change',()=>{movementPage=1;renderMovements()}); $('movCategory').addEventListener('change',()=>{movementPage=1;renderMovements()}); $('movSearch').addEventListener('input',()=>{movementPage=1;renderMovements()});
    $('resetMovementFilters').addEventListener('click',()=>{$('movStart').value='';$('movEnd').value='';$('movCategory').value='';$('movSearch').value='';movementPage=1;renderMovements()});
    $('movPrev').addEventListener('click',()=>{movementPage=Math.max(1,movementPage-1);renderMovements()}); $('movNext').addEventListener('click',()=>{movementPage++;renderMovements()});

    ['compareMonthA','compareMonthB','compareGroupBy','compareMetric','compareSameCutoff','customAStart','customAEnd','customBStart','customBEnd','customGroupBy','customMetric'].forEach(id=>$(id).addEventListener('change',renderCompare));
    $('compareQuickBtn').addEventListener('click',()=>setCompareMode('quick')); $('compareCustomBtn').addEventListener('click',()=>setCompareMode('custom'));

    $('newCategory').addEventListener('change',()=>{$('discountField').classList.toggle('d-none',!categoryByName.get($('newCategory').value)?.supportsDiscount)});
    $('movementForm').addEventListener('submit',saveDemoMovement);
    $('downloadSummaryCsv').addEventListener('click',downloadSummary); $('downloadMovementsCsv').addEventListener('click',downloadMovements);
    $('downloadSummaryXlsx').addEventListener('click',downloadSummaryXlsx); $('downloadSummaryPdf').addEventListener('click',downloadSummaryPdf);

    document.addEventListener('click',e=>{
      const cat=e.target.closest('[data-open-category]'); if(cat) openCategory(cat.dataset.openCategory);
      const ccat=e.target.closest('[data-compare-open]'); if(ccat){ switchView('movements'); $('movCategory').value=ccat.dataset.compareOpen; movementPage=1; renderMovements(); }
    });

    await window.TRImporter?.init?.();
    document.addEventListener('tr:data-updated',()=>{refreshPeriodSelectors();renderDashboard();renderMovements();renderCompare();renderReports();renderSettings();});
    renderDashboard(); renderMovements(); renderCompare(); renderReports(); renderSettings();
  }

  document.addEventListener('DOMContentLoaded',()=>setup().catch(error=>{console.error(error);alert('No se pudo iniciar la aplicación: '+(error.message||error));}));
})();
