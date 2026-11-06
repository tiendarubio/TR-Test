const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/checklist.js'), 'utf8');
function extractedFunction(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `Missing ${name}`);
  const bracket = script.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = bracket; i < script.length; i++) {
    if (script[i] === '{') depth++;
    if (script[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  assert.ok(end > bracket, `Invalid ${name}`);
  return script.slice(start, end);
}
const context = vm.createContext({});
vm.runInContext([extractedFunction('parseQuantityExpression'), extractedFunction('parseExcelQuantityValue')].join('\n'), context);
const qty = v => vm.runInContext(`parseQuantityExpression(${JSON.stringify(v)})`, context);
const excel = v => vm.runInContext(`parseExcelQuantityValue(${JSON.stringify(v)})`, context);
test('cantidad admite números, coma y multiplicadores x × *', () => {
  for (const [input, expected] of [['24',24],['2,5',2.5],['12×4',48],['12x4',48],['12*4',48],['2,5 × 4',10],['0',0]]) assert.equal(qty(input), expected);
});
test('rechaza expresiones inválidas, cadenas parciales y números no finitos', () => {
  for (const invalid of ['12×','x4','12+4','foo','', '-1', '1e999']) assert.equal(qty(invalid), null);
});
test('exportación histórica respeta la multiplicación y decimales', () => {
  for (const [input, expected] of [['12×4',48],['3,5*2',7],['12',12],['',0],['invalid',0]]) assert.equal(excel(input), expected);
});
test('renderizado masivo no renumera por fila; refresh móvil usa frame', () => {
  assert.match(script, /if \(!isBulkRenderingRows\) renumber\(\)/);
  assert.match(script, /mobileChecklistCards\.replaceChildren\(fragment\)/);
  assert.match(script, /mobileRefreshFrame = requestAnimationFrame/);
});
