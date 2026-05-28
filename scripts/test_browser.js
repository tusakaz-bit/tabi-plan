const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('--- Starting Browser Test ---');
    
    // プロジェクトのルートディレクトリからの絶対パスを構築
    const targetUrl = 'file:///' + path.join(__dirname, '../tokyo/index.html').replace(/\\/g, '/');
    console.log('Target Local File:', targetUrl);

    // システムのEdgeを利用
    const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });
    const page = await browser.newPage();
    let consoleErrors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            console.log('[Browser Console Error]', msg.text());
        } else {
            // console.log('[Browser Console]', msg.text());
        }
    });

    page.on('pageerror', err => {
        consoleErrors.push(err.toString());
        console.log('[Browser Page Error]', err.toString());
    });

    // ネットワークリクエストのキャプチャ
    await page.setRequestInterception(true);
    let navigatedToRakuten = false;

    page.on('request', request => {
        const url = request.url();
        if (url.includes('travel.rakuten.co.jp')) {
            navigatedToRakuten = true;
            console.log('SUCCESS: Navigation or Request to Rakuten Travel detected ->', url);
        }
        if (url.includes('hb.afl.rakuten.co.jp')) {
            console.log('SUCCESS: Passed through Affiliate link ->', url);
        }
        request.continue();
    });

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });
        console.log('Page loaded successfully.');

        // ホテルの「詳細・予約を見る」ボタンを取得
        const btn = await page.$('.booking-button');
        if (!btn) {
            console.log('ERROR: No booking button found on the page.');
            await browser.close();
            return;
        }

        const href = await page.evaluate(el => el.href, btn);
        console.log('\n--- Link Analysis ---');
        console.log('Button href:', href);

        const expectedAffiliateId = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
        if (href.includes(expectedAffiliateId)) {
            console.log('CHECK PASSED: Affiliate ID is present in the URL.');
        } else {
            console.log('CHECK FAILED: Affiliate ID is MISSING in the URL.');
        }

        console.log('\n--- Clicking the button ---');
        // Aタグが_blankで開く可能性があるので現在のページで遷移させる
        await page.evaluate((el) => {
            el.target = '_self';
            el.click();
        }, btn);

        // 遷移を待機
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(e => console.log('Navigation timeout or already resolved.'));

        console.log('\n--- Final Results ---');
        if (navigatedToRakuten) {
            console.log('CHECK PASSED: Successfully reached Rakuten Travel.');
        } else {
            console.log('CHECK FAILED: Did not reach Rakuten Travel within the timeout.');
        }

        if (consoleErrors.length === 0) {
            console.log('CHECK PASSED: No console errors detected.');
        } else {
            console.log('CHECK FAILED: There were ' + consoleErrors.length + ' console errors.');
        }

    } catch (e) {
        console.log('Test Error:', e.message);
    }

    await browser.close();
    console.log('--- Test Completed ---');
})();
