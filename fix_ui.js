const fs = require('fs');

let js = fs.readFileSync('scripts/generate_city_pages.js', 'utf8');
js = js.replace(/sort:\s*'\+roomCharge'/g, "sort: 'standard'");
fs.writeFileSync('scripts/generate_city_pages.js', js, 'utf8');
console.log('Fixed generate_city_pages.js');

let html = fs.readFileSync('scripts/themes/city_template.html', 'utf8');
html = html.replace(/最安値プラン/g, '高コスパ厳選');
fs.writeFileSync('scripts/themes/city_template.html', html, 'utf8');
console.log('Fixed themes/city_template.html');
