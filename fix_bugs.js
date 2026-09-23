const fs = require('fs');

function fixCityAndNiche(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix API params (handling Windows CRLF or Linux LF)
    // Find the keyword: searchParams.keyword line
    const apiParamsRegex = /(keyword:\s*searchParams\.keyword\s*\r?\n\s*\};)/;
    if (content.match(apiParamsRegex) && !content.includes('params.minCharge')) {
        content = content.replace(
            apiParamsRegex,
            "keyword: searchParams.keyword\n    };\n    if (filters.minPrice) params.minCharge = filters.minPrice;\n    if (filters.maxPrice) params.maxCharge = filters.maxPrice;"
        );
    }

    // Fix UI
    // Old UI to look for:
    // <div class="hotel-price"><span style="font-size: 0.9rem">参考価格:</span> <span class="price-amount">¥${priceLabel}</span><span style="font-size: 0.9rem">~ /泊</span><span style="display: block; font-size: 0.7rem; color: #888; font-weight: normal; margin-top: 0.2rem; line-height: 1.2;">（※日程やプランにより変動します）</span></div>
    
    // We want to wrap it in a container and remove margin-top: auto from hotel-price if needed, or just let container have margin-top: auto.
    // Actually, we can just replace that whole block.
    const oldUiRegex = /<div class="hotel-price">.*?参考価格.*?<\/div>/;
    const newUi = `<div style="margin-top: auto;">
                              <div class="hotel-price" style="margin-top: 0;"><span style="font-size: 0.9rem">参考価格:</span> <span class="price-amount">¥\${priceLabel}</span><span style="font-size: 0.9rem">~ /泊</span></div>
                              <div style="font-size: 0.75rem; color: #888; margin-top: 4px; line-height: 1.2;">（※日程やプランにより変動します）</div>
                          </div>`;
                          
    if (content.match(oldUiRegex)) {
        content = content.replace(oldUiRegex, newUi);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${filePath} updated`);
}

function fixFeatures(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix API params
    const apiParamsRegex = /(keyword:\s*searchParams\.keyword\s*\r?\n\s*\};)/;
    if (content.match(apiParamsRegex) && !content.includes('params.minCharge')) {
        content = content.replace(
            apiParamsRegex,
            "keyword: searchParams.keyword\n    };\n    if (filters.minPrice) params.minCharge = filters.minPrice;\n    if (filters.maxPrice) params.maxCharge = filters.maxPrice;"
        );
    }

    // Fix UI
    // <span style="font-size: 0.85rem; color: #e11d48; font-weight: bold;"><i class="fa-solid fa-yen-sign"></i> 参考価格: ${price}<span style="display: block; font-size: 0.7rem; color: #888; font-weight: normal; margin-top: 0.2rem;">（※日程やプランにより変動します）</span></span>
    const oldUiRegex = /<span style="font-size: 0\.85rem; color: #e11d48; font-weight: bold;"><i class="fa-solid fa-yen-sign"><\/i> 参考価格.*?<\/span><\/span>/;
    const newUi = `<div style="display: flex; flex-direction: column; gap: 4px;">
                      <span style="font-size: 0.85rem; color: #e11d48; font-weight: bold;"><i class="fa-solid fa-yen-sign"></i> 参考価格: \${price}</span>
                      <span style="font-size: 0.75rem; color: #888; font-weight: normal;">（※日程やプランにより変動します）</span>
                  </div>`;
                  
    if (content.match(oldUiRegex)) {
        content = content.replace(oldUiRegex, newUi);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${filePath} updated`);
}

fixCityAndNiche('scripts/generate_city_pages.js');
fixCityAndNiche('scripts/generate_niche_pages.js');
fixFeatures('scripts/generate_features_pages.js');
