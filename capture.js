import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const outputDir = path.join(__dirname, 'screenshots');

await fs.ensureDir(outputDir);
console.log('🗂 Screenshot directory ensured:', outputDir);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/screenshots', express.static(outputDir, {
    setHeaders: (res, filePath) => {
        console.log(`📸 Serving screenshot: ${filePath}`);
    }
}));

app.get('/api/screenshots', async (req, res) => {
    try {
        const files = await fs.readdir(outputDir);
        const imageFiles = files.filter(file => file.endsWith('.png'));
        res.json({ screenshots: imageFiles });
    } catch (error) {
        console.error('❌ Error fetching screenshots:', error);
        res.status(500).json({ error: 'Failed to retrieve screenshots' });
    }
});

const captureMockup = async () => {
    const url = 'https://birdnestlife.com/home';
    console.log(`🌐 Navigating to: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

  
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });

    
    await page.goto(url, { waitUntil: 'networkidle2' });

    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.viewport().height;
    let currentPosition = 0;
    let index = 0;

    while (currentPosition < totalHeight) {
        const screenshotPath = path.join(outputDir, `section_${index}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        console.log(`✅ Screenshot captured: ${screenshotPath}`);

        currentPosition += viewportHeight;
        await page.evaluate((scrollAmount) => window.scrollBy(0, scrollAmount), viewportHeight);

        await new Promise(resolve => setTimeout(resolve, 500));

        index++;
    }

    await browser.close();
    console.log('📸 Screenshot capture completed.');
};

app.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    await captureMockup();
});
