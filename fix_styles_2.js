const fs = require('fs');
const path = 'style.css';
let css = fs.readFileSync(path, 'utf8');

css = css.replace(
    /background:\s*linear-gradient\(135deg,\s*rgba\(10,\s*10,\s*11,\s*0\.85\)\s*0%,\s*rgba\(10,\s*10,\s*11,\s*0\.45\)\s*55%,\s*rgba\(10,\s*10,\s*11,\s*0\.15\)\s*100%\),/g,
    "background: linear-gradient(135deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.15) 50%, rgba(0, 0, 0, 0) 100%),"
);
css = css.replace(
    /background:\s*linear-gradient\(to\s*top,\s*var\(--bg-dark\),\s*transparent\);/g,
    "background: linear-gradient(to top, var(--bg-color), transparent);"
);
css = css.replace(
    /background:\s*rgba\(0,\s*0,\s*0,\s*0\.2\);(\s*\/\*.*?\*\/)?/g,
    "background: rgba(0, 0, 0, 0.1);"
);
css = css.replace(
    /(\.hero-content\s*\.title,[\s\S]*?\.niche-hero\s*p\s*\{\s*color:\s*#FFFFFF\s*!important;)\s*\}/,
    "$1\n  text-shadow: 0 2px 10px rgba(0,0,0,0.5) !important;\n}"
);

fs.writeFileSync(path, css);

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/style\.css\?v=[0-9\-]+/g, 'style.css?v=20260824-2');
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
    }
}
replaceInFile('index.html');
replaceInFile('scripts/themes/city_template.html');
replaceInFile('scripts/themes/niche_template.html');

console.log('done.');
