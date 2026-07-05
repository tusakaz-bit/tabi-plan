const fs = require('fs');
const path = require('path');

const cityTemplatePath = path.join(__dirname, 'themes/city_template.html');
let content = fs.readFileSync(cityTemplatePath, 'utf8');

const faqStartMarker = '    <!-- FAQ Section (Rakuten Card Promotion) -->';
const faqEndMarker = '    </section>';

const startIndex = content.indexOf(faqStartMarker);
if (startIndex !== -1) {
    const endIndex = content.indexOf(faqEndMarker, startIndex) + faqEndMarker.length;
    const faqSection = content.substring(startIndex, endIndex);

    // Remove FAQ from old position
    content = content.substring(0, startIndex) + content.substring(endIndex);

    // Insert FAQ before {{CITY_GUIDE_SECTION}}
    const target = '        {{CITY_GUIDE_SECTION}}';
    content = content.replace(target, faqSection + '\n\n' + target);

    fs.writeFileSync(cityTemplatePath, content);
    console.log('Successfully moved FAQ in city_template.html');
} else {
    console.log('FAQ section not found.');
}
