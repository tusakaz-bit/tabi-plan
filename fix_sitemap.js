const fs = require('fs');
let sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const today = new Date().toISOString().split('T')[0];
sitemap = sitemap.replace(/<lastmod>.*?<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
fs.writeFileSync('sitemap.xml', sitemap);
console.log('sitemap.xml updated to ' + today);
