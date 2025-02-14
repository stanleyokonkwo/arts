import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const outputDir = path.join(__dirname, 'screenshots');

await fs.ensureDir(outputDir);
console.log('🗂 Screenshot directory ensured:', outputDir);

// Middleware
app.use(cors()); // Allow requests from the frontend
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(outputDir));


// Endpoint to fetch available screenshots
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

// Endpoint to capture screenshot from a URL
app.post('/api/capture', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🗑️ Clearing old screenshots...`);
    try {
        const files = await fs.readdir(outputDir);
        for (const file of files) {
            if (file.endsWith('.png')) {
                await fs.unlink(path.join(outputDir, file));
            }
        }
        console.log(`✅ Cleared old screenshots.`);
    } catch (error) {
        console.error('❌ Error clearing old screenshots:', error);
    }

    console.log(`🌐 Capturing new screenshots for: ${url}`);

    try {
        await captureMockup(url);
        res.json({ success: true, message: `Screenshots captured for ${url}` });
    } catch (error) {
        console.error('❌ Screenshot capture failed:', error);
        res.status(500).json({ error: 'Failed to capture screenshot' });
    }
});


const captureMockup = async (url) => {
    console.log(`🌐 Navigating to: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });


    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        await page.waitForSelector('button', { timeout: 5000 });
        const accepted = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const acceptButton = buttons.find(btn => 
                /accept|consent/i.test(btn.innerText)
            );
            if (acceptButton) {
                acceptButton.click();
                console.log(`✅ Clicked cookie button: ${acceptButton.innerText}`);
                return true;
            }
            return false;
        });

        if (!accepted) console.log("⚠️ No consent button found.");
    } catch (error) {
        console.log("⚠️ No cookie popups detected.");
    }

    // Wait for cookies to be processed
    await new Promise(resolve => setTimeout(resolve, 4000));
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.viewport().height;
    let currentPosition = 0;
    let index = 0;

    while (currentPosition < totalHeight) {
        const screenshotPath = path.join(outputDir, `section_${index}.png`);
        
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        // Wait 5 seconds for animations/loaders
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

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
