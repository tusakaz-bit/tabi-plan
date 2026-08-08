const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    let ga4Fired = false;
    let logMessage = '';

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[GA4] Event sent: click_rakuten_affiliate')) {
            ga4Fired = true;
            logMessage = text;
        }
    });

    // Load local generated file (e.g. tokyo/index.html)
    const filePath = 'file://' + path.resolve(__dirname, 'tokyo/index.html');
    await page.goto(filePath);

    // Wait for the booking button to be attached
    await page.waitForSelector('.booking-button');

    // Click the first Rakuten affiliate link and prevent default navigation to stay on page
    await page.evaluate(() => {
        document.querySelector('.booking-button').addEventListener('click', (e) => e.preventDefault());
    });

    await page.click('.booking-button');
    
    // Wait a brief moment for the event to fire
    await page.waitForTimeout(500);

    if (ga4Fired) {
        console.log('✅ TEST PASSED: ' + logMessage);
    } else {
        console.log('❌ TEST FAILED: GA4 log not found.');
    }

    await browser.close();
})();
