const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log("Navigating to register page...");
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });

    // Add dummy data and click
    console.log("Filling form...");
    await page.fill('input[placeholder="Team Name"]', 'Test Team');
    await page.fill('input[placeholder="Leader Name"]', 'Leader');
    await page.fill('input[placeholder="9876543210"]', '9876543210');
    await page.fill('input[placeholder="leader@gmail.com"]', 'leader@gmail.com');
    await page.fill('input[placeholder="ab1234@srmist.edu.in"]', 'ab1234@srmist.edu.in');
    await page.fill('input[placeholder="RA2XXXXXXXXX"]', 'RA211111111111');

    // member 2
    await page.fill('input[placeholder="Member 2 Name"]', 'Mem 2');
    await page.locator('input[placeholder="9876543210"]').nth(1).fill('9999999999');
    await page.locator('input[type="email"]').nth(2).fill('mem2@user.com'); // personal email
    await page.locator('input[type="email"]').nth(3).fill('mem2college@srmist.edu.in'); // col email
    await page.locator('input[placeholder="RA2XXXXXXXXX"]').nth(1).fill('RA211111111112');

    console.log("Clicking proceed...");
    await page.click('button:has-text("Proceed to Payment")');

    await page.waitForTimeout(3000);

    const hasRazorpay = await page.evaluate(() => typeof window.Razorpay !== 'undefined');
    console.log("Has window.Razorpay:", hasRazorpay);

    await browser.close();
})();
