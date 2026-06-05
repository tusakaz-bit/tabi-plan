// 重複・類似記事チェックスクリプト
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../pickup');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'template.html');

const articles = [];
files.forEach(f => {
    const c = fs.readFileSync(path.join(dir, f), 'utf8');
    const titleMatch = c.match(/<h1 class="hotel-title">(.*?)<\/h1>/);
    const descStart = c.indexOf('<section class="description">');
    const descEnd = c.indexOf('</section>', descStart);
    const desc = descStart >= 0 ? c.substring(descStart, descEnd).replace(/<[^>]+>/g, '').trim() : '';
    
    const hasFallback = desc.includes('旅の疲れを癒やす心地よい空間') || desc.includes('詳しい情報は予約ページをご確認ください');
    
    articles.push({
        file: f,
        title: titleMatch ? titleMatch[1] : 'N/A',
        descLength: desc.length,
        hasFallback: hasFallback,
        descPreview: desc.substring(0, 60)
    });
});

// 重複ホテル名チェック
const titleCount = {};
articles.forEach(a => {
    titleCount[a.title] = (titleCount[a.title] || 0) + 1;
});

console.log('=== 全記事一覧 ===');
articles.forEach(a => {
    const dup = titleCount[a.title] > 1 ? ' ⚠️重複' : '';
    const fb = a.hasFallback ? ' ❌定型文' : ' ✅AI文章';
    const short = a.descLength < 200 ? ' ⚠️短い' : '';
    console.log(`${a.file} | ${a.title}${dup}${fb}${short} | ${a.descLength}文字`);
});

console.log('\n=== 問題サマリ ===');
const duplicates = Object.entries(titleCount).filter(([k, v]) => v > 1);
console.log(`重複ホテル: ${duplicates.length > 0 ? duplicates.map(([k,v]) => k + '(' + v + '件)').join(', ') : 'なし'}`);
console.log(`定型フォールバック文の記事: ${articles.filter(a => a.hasFallback).length}件`);
console.log(`説明文200文字未満: ${articles.filter(a => a.descLength < 200).length}件`);
console.log(`総記事数: ${articles.length}件`);
