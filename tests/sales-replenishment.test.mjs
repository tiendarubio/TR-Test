import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSalesRows, parseQuantity, normalizeCode, parseDay, elSalvadorDay, calculateReplenishment} from '../api/_sales-engine.js';

const header = ['', 'Código', 'Descripción', 'Presentación', 'Contiene', 'Marca', 'Cantidad', 'Unidad', 'Costo', 'Venta'];
const sale = (code, name, qty, amount = '0') => ['', code, name,'','','',qty,'','',amount];

test('formato real B/C/G conserva códigos con ceros y ventas', () => {
  const parsed = parseSalesRows([header,sale('01744','PRODUCTO', '4.00','4.96'), sale('04112','AGUA', '1.00','0.62')], '2026-10-22');
  assert.equal(parsed.items.length,2);
  assert.equal(parsed.items.find(x=>x.code==='01744').quantity,4);
  assert.equal(parsed.items.find(x=>x.code==='01744').codeKey,'1744');
  assert.equal(parsed.items.find(x=>x.code==='01744').salesAmount,4.96);
});
test('agrupa productos repetidos y no permite cantidades negativas',()=>{
  const parsed=parseSalesRows([header,sale('01744','A','2'),sale('1744','A','3'),sale('0002','B','-1')],'2026-10-22');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].quantity,5);
  assert.equal(parsed.discarded,1);
});
test('invalida encabezados distintos y hojas sin registros',()=>{
  assert.throws(()=>parseSalesRows([['Otros datos']], '2026-10-22'),/formato incompatible/i);
  assert.throws(()=>parseSalesRows([header], '2026-10-22'),/hoja no contiene/i);
});
test('fecha A1 opcional prevalece y valida calendario',()=>{
  const data=parseSalesRows([['FECHA: 2026-10-21',...header.slice(1)],sale('01234','Producto','2')],'2026-10-22');
  assert.equal(data.day,'2026-10-21');
  assert.equal(parseDay('31/02/2026'),'');
  assert.equal(parseDay('21/10/2026'),'2026-10-21');
  assert.equal(elSalvadorDay(-1,new Date('2026-10-23T18:00:00Z')),'2026-10-22');
});
test('decimales, miles y códigos de producto',()=>{
  assert.equal(parseQuantity('1,000.50'),1000.5);
  assert.equal(parseQuantity('2,5'),2.5);
  assert.equal(parseQuantity('2 unidades'),null);
  assert.equal(normalizeCode('00015'),'15');
});
test('solo usa solicitudes de la sucursal y excluye fusionadas o canceladas',()=>{
  const snapshots=[{day:'2026-10-22',items:[{code:'01744',name:'A',quantity:4}]}];
  const mkReq=(store,status,day,qty)=>({storeKey:store,status,requestDate:day,items:[{codigo_inventario:'01744',nombre:'A',cantidad:String(qty)}]});
  const result=calculateReplenishment({storeKey:'lista_sexta_calle',snapshots,today:'2026-10-23',requests:[
    mkReq('lista_sexta_calle','enviado','2026-10-16',10),
    mkReq('lista_sexta_calle','recibido','2026-10-19',12),
    mkReq('lista_sexta_calle','cancelado','2026-10-21',10000),
    mkReq('lista_avenida_morazan','enviado','2026-10-21',90000),
    mkReq('lista_sexta_calle','fusionado','2026-10-20',5000)
  ]});
  assert.equal(result.results.length,1);
  assert.equal(result.results[0].requestCount,2);
  assert.equal(result.results[0].averageRequested,11);
  assert.equal(result.results[0].suggestedQty,11);
  assert.equal(result.results[0].confidence,'Baja');
  assert.equal(result.results[0].hasVerifiedStock,false);
});
test('reciente solicitud evita sumar un pedido nuevo prematuramente',()=>{
  const requests=[
    {storeKey:'lista_sexta_calle',status:'enviado',requestDate:'2026-10-14',items:[{codigo_inventario:'001',nombre:'A',cantidad:'8'}]},
    {storeKey:'lista_sexta_calle',status:'enviado',requestDate:'2026-10-18',items:[{codigo_inventario:'001',nombre:'A',cantidad:'8'}]},
    {storeKey:'lista_sexta_calle',status:'enviado',requestDate:'2026-10-22',items:[{codigo_inventario:'001',nombre:'A',cantidad:'8'}]}
  ];
  const result=calculateReplenishment({storeKey:'lista_sexta_calle',today:'2026-10-23',requests});
  assert.equal(result.results.length,0); // las solicitudes aún no vencidas no se presentan como sugeridos
});
test('una única hoja sin solicitudes no genera sugeridos apresurados',()=>{
  const result=calculateReplenishment({storeKey:'lista_sexta_calle',today:'2026-10-23',
    snapshots:[{day:'2026-10-22',items:[{code:'010',name:'A',quantity:50}]}],requests:[]});
  assert.equal(result.results.length,0);
});
test('con cuatro días de ventas estima pedido pero no finge conocer inventario',()=>{
  const snapshots=['2026-10-19','2026-10-20','2026-10-21','2026-10-22']
    .map(day=>({day,items:[{code:'010',name:'A',quantity:4}]}));
  const result=calculateReplenishment({storeKey:'lista_sexta_calle',today:'2026-10-23',snapshots,requests:[]});
  assert.equal(result.results.length,1);
  assert.ok(result.results[0].suggestedQty>0);
  assert.equal(result.results[0].stockEstimate,null);
  assert.equal(result.results[0].hasVerifiedStock,false);
});
