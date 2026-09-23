const fs = require('fs');

function fixGenerateNichePages() {
    let content = fs.readFileSync('scripts/generate_niche_pages.js', 'utf8');

    // 1. Add minPrice to filterHotels
    if (!content.includes('filterRules.minPrice && info.hotelMinCharge < filterRules.minPrice')) {
        content = content.replace(
            /(\/\/ 2\. 設定された価格上限\s*if \(filterRules\.maxPrice && info\.hotelMinCharge > filterRules\.maxPrice\) return false;)/,
            "$1\n        if (filterRules.minPrice && info.hotelMinCharge < filterRules.minPrice) return false;"
        );
    }

    // 2. Add minCharge/maxCharge to params
    if (!content.includes('params.minCharge = niche.filters.minPrice')) {
        const paramMatch = /keyword:\s*niche\.searchParams\.keyword\s*\r?\n\s*\};/;
        if (content.match(paramMatch)) {
            content = content.replace(
                paramMatch,
                "keyword: niche.searchParams.keyword\n        };\n        if (niche.filters.minPrice) params.minCharge = niche.filters.minPrice;\n        if (niche.filters.maxPrice) params.maxCharge = niche.filters.maxPrice;"
            );
        }
    }

    // 3. Fix HTML UI layout
    const oldUiRegex = /<div style="margin-top: auto;">[\s\S]*?<\/div>\s*<\/div>/;
    const newUi = `<div style="margin-top: auto; display: flex; flex-direction: column; gap: 4px;">
                              <div class="hotel-price" style="margin-top: 0; white-space: nowrap;"><span style="font-size: 0.85rem">参考価格:</span> <span class="price-amount" style="font-size: 1.05rem;">¥\${priceLabel}</span><span style="font-size: 0.85rem">〜/泊</span></div>
                              <div style="font-size: 0.7rem; color: #888; line-height: 1.2;">（※日程やプランにより変動します）</div>
                          </div>`;
    if (content.match(oldUiRegex)) {
        content = content.replace(oldUiRegex, newUi);
    }

    fs.writeFileSync('scripts/generate_niche_pages.js', content, 'utf8');
    console.log('Fixed generate_niche_pages.js');
}

function fixGenerateCityPages() {
    let content = fs.readFileSync('scripts/generate_city_pages.js', 'utf8');

    // 1. Add minCharge to ladiesData and coupleData
    if (!content.includes('minCharge: 3500')) {
        content = content.replace(
            /keyword:\s*'レディース'\s*\r?\n\s*\}/g,
            "keyword: 'レディース',\n            minCharge: 3500\n        }"
        );
    }
    if (!content.includes('minCharge: 5000')) {
        content = content.replace(
            /keyword:\s*`\$\{city\.name\} カップル`\s*\r?\n\s*\}/g,
            "keyword: `${city.name} カップル`,\n            minCharge: 5000\n        }"
        );
    }

    // 2. Fix HTML UI layout
    const oldUiRegex = /<div style="margin-top: auto;">[\s\S]*?<\/div>\s*<\/div>/;
    const newUi = `<div style="margin-top: auto; display: flex; flex-direction: column; gap: 4px;">
                              <div class="hotel-price" style="margin-top: 0; white-space: nowrap;"><span style="font-size: 0.85rem">参考価格:</span> <span class="price-amount" style="font-size: 1.05rem;">¥\${priceLabel}</span><span style="font-size: 0.85rem">〜/泊</span></div>
                              <div style="font-size: 0.7rem; color: #888; line-height: 1.2;">（※日程やプランにより変動します）</div>
                          </div>`;
    if (content.match(oldUiRegex)) {
        content = content.replace(oldUiRegex, newUi);
    }

    fs.writeFileSync('scripts/generate_city_pages.js', content, 'utf8');
    console.log('Fixed generate_city_pages.js');
}

function fixGenerateFeaturesPages() {
    let content = fs.readFileSync('scripts/generate_features_pages.js', 'utf8');

    // Fix HTML UI layout
    const oldUiRegex = /<div style="display: flex; flex-direction: column; gap: 4px;">[\s\S]*?<\/div>/;
    const newUi = `<div style="display: flex; flex-direction: column; gap: 4px; white-space: nowrap;">
                      <span style="font-size: 0.85rem; color: #e11d48; font-weight: bold;"><i class="fa-solid fa-yen-sign"></i> 参考価格: <span style="font-size: 1.05rem;">\${price}</span></span>
                      <span style="font-size: 0.7rem; color: #888; font-weight: normal; white-space: normal; line-height: 1.2;">（※日程やプランにより変動します）</span>
                  </div>`;
    if (content.match(oldUiRegex)) {
        content = content.replace(oldUiRegex, newUi);
    }

    fs.writeFileSync('scripts/generate_features_pages.js', content, 'utf8');
    console.log('Fixed generate_features_pages.js');
}

fixGenerateNichePages();
fixGenerateCityPages();
fixGenerateFeaturesPages();
