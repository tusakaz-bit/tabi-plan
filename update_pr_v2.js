const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'pickup/index.html',
  'pickup/template.html',
  'scripts/themes/city_template.html',
  'scripts/themes/niche_template.html'
];

const oldPR = '<div style="position: absolute; top: 4px; right: 12px; font-size: 0.65rem; color: #94a3b8;">※当サイトはアフィリエイト広告を利用しています</div>';
const newPR = '<div class="pr-notation">PR：本ページはプロモーションが含まれています</div>';

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');

  // Remove old
  if (c.includes(oldPR)) {
    c = c.replace(oldPR + '\n    ', '');
    c = c.replace(oldPR + '\n', '');
    c = c.replace(oldPR, '');
  }
  
  if (c.includes(newPR)) {
      console.log('Already updated:', f);
      return;
  }

  // Insert new PR
  if (f === 'index.html') {
    c = c.replace('</h2>', '</h2>\n                    ' + newPR);
  } else if (f === 'scripts/themes/city_template.html') {
    c = c.replace('</h2>', '</h2>\n                    ' + newPR);
  } else if (f === 'scripts/themes/niche_template.html') {
    c = c.replace('</h1>', '</h1>\n                    ' + newPR);
  } else if (f === 'pickup/template.html') {
    c = c.replace('</h1>', '</h1>\n            ' + newPR);
  } else if (f === 'pickup/index.html') {
    c = c.replace('</h1>', '</h1>\n        ' + newPR);
  }

  fs.writeFileSync(p, c);
  console.log('Updated:', f);
});
