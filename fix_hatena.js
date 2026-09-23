const fs = require('fs');
let js = fs.readFileSync('scripts/generate_hatena_html.js', 'utf8');
js = js.replace(/sort:\s*'\+roomCharge'/g, "sort: 'standard'");
fs.writeFileSync('scripts/generate_hatena_html.js', js, 'utf8');
console.log('Fixed hatena script');
