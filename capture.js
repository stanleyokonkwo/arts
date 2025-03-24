import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

puppeteer.use(StealthPlugin());

class ScreenshotServer {
    constructor() {
        this.__filename = fileURLToPath(import.meta.url);
        this.__dirname = path.dirname(this.__filename);
        this.app = express();
        this.PORT = 3000;
        this.outputDir = path.join(this.__dirname, 'screenshots');
        this.upload = this.configureMulter();
        this.cleanupInterval = 80 * 80 * 1000; // Cleanup every hour (in milliseconds)
    }

    async init() {
        try {
            await fs.ensureDir(this.outputDir);
            console.log('🗂 Base screenshot directory ensured:', this.outputDir);

            const testFile = path.join(this.outputDir, 'test.txt');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            console.log('✅ Write permissions confirmed for outputDir');

            // Perform initial cleanup on startup
            await this.cleanupOldSessions();
        } catch (error) {
            console.error('❌ No write permissions for outputDir:', error);
            process.exit(1);
        }

        this.setupMiddleware();
        this.setupRoutes();
        this.startServer();

        // Schedule periodic cleanup
        setInterval(() => this.cleanupOldSessions(), this.cleanupInterval);
        console.log(`🧹 Scheduled session cleanup every ${this.cleanupInterval / 60000} minutes`);
    }

    async cleanupOldSessions() {
        try {
            const dirs = await fs.readdir(this.outputDir, { withFileTypes: true });
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            for (const dir of dirs) {
                if (!dir.isDirectory()) continue; // Skip non-directories

                const dirPath = path.join(this.outputDir, dir.name);
                const stats = await fs.stat(dirPath);

                // Check if the directory is older than maxAge based on modification time
                if (now - stats.mtimeMs > maxAge) {
                    await fs.remove(dirPath);
                    console.log(`🗑️ Removed old session directory: ${dir.name}`);
                }
            }
            console.log('✅ Old session cleanup completed');
        } catch (error) {
            console.error('❌ Error during session cleanup:', error);
        }
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(this.__dirname, 'public')));
        this.app.use('/screenshots', express.static(this.outputDir));
    }

    configureMulter() {
        return multer({ storage: multer.memoryStorage() });
    }

    setupRoutes() {
        this.app.get('/api/screenshots/:sessionId', async (req, res) => this.handleGetScreenshots(req, res));
        this.app.post('/api/capture', async (req, res) => this.handleCapture(req, res));
        this.app.post('/api/upload/:sessionId?', this.upload.array('images'), (req, res) => this.handleUpload(req, res));

        this.app.get('/:page?', (req, res) => {
            const page = req.params.page || 'index';
            const filePath = path.join(this.__dirname, 'public', `${page}.html`);

            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    return res.status(404).send('Page not found');
                }
                res.sendFile(filePath);
            });
        });
    }

    startServer() {
        this.app.listen(this.PORT, () => {
            console.log(`🚀 Server running at http://localhost:${this.PORT}`);
        });
    }

    async handleGetScreenshots(req, res) {
        const { sessionId } = req.params;
        const sessionDir = path.join(this.outputDir, sessionId);
    
        try {
            if (!fs.existsSync(sessionDir)) {
                return res.status(404).json({ error: 'Session not found' });
            }
    
            const files = await fs.readdir(sessionDir);
            const imageFiles = files.filter(file => file.match(/\.(png|jpg|jpeg)$/i));
            const screenshotUrls = imageFiles.map(file => `/screenshots/${sessionId}/${file}`);
    
            const metadataPath = path.join(sessionDir, 'metadata.json');
            let metadata = [];
            if (fs.existsSync(metadataPath)) {
                metadata = await fs.readJson(metadataPath);
            }
    
            res.json({ screenshots: screenshotUrls, metadata });
        } catch (error) {
            console.error('❌ Error fetching screenshots:', error);
            res.status(500).json({ error: 'Failed to retrieve screenshots' });
        }
    }

    async handleCapture(req, res) {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const sessionId = uuidv4();
        const sessionDir = path.join(this.outputDir, sessionId);

        await fs.ensureDir(sessionDir);
        console.log(`🌐 Capturing new screenshots for: ${url} in session: ${sessionId}`);

        try {
            await this.captureMockup(url, sessionDir);
            res.json({ success: true, message: `Screenshots captured for ${url}`, sessionId });
        } catch (error) {
            console.error('❌ Screenshot capture failed:', error);
            res.status(500).json({ error: 'Failed to capture screenshot', details: error.message });
        }
    }

    async handleUpload(req, res) {
        const sessionId = req.params.sessionId || uuidv4();
        const sessionDir = path.join(this.outputDir, sessionId);
    
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
    
        try {
            await fs.ensureDir(sessionDir);
            if (req.params.sessionId && fs.existsSync(sessionDir)) {
                await fs.emptyDir(sessionDir);
                console.log(`🗑️ Cleared existing files in session: ${sessionId}`);
            }
    
            const filePaths = [];
            const metadata = [];
    
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const filename = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
                const filePath = path.join(sessionDir, filename);
                await fs.writeFile(filePath, file.buffer);
                console.log(`✅ Saved: ${filePath}`);
                filePaths.push(`/screenshots/${sessionId}/${filename}`);
    
                const title = req.body.title[i] || 'Untitled';
                const description = req.body.description[i] || '';
                const artist = req.body.artist[i] || 'Unknown';
                metadata.push({ filename, title, description, artist });
            }
    
            const metadataPath = path.join(sessionDir, 'metadata.json');
            await fs.writeJson(metadataPath, metadata, { spaces: 2 });
            console.log(`📝 Metadata saved: ${metadataPath}`);
    
            res.json({
                success: true,
                message: `Uploaded ${req.files.length} images successfully`,
                sessionId,
                filePaths
            });
        } catch (error) {
            console.error('❌ Error handling upload:', error);
            res.status(500).json({ error: 'Failed to upload images', details: error.message });
        }
    }

    async captureMockup(url, sessionDir) {
        console.log(`🌐 Navigating to: ${url}`);
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--window-size=1440,900',
                ],
            });
            console.log(`✅ Browser launched`);

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                window.navigator.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            });
            await page.setViewport({ width: 1440, height: 900 });
            console.log(`✅ Page setup complete`);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log(`✅ Initial navigation complete`);

            try {
                await page.waitForSelector('button', { timeout: 5000 });
                const accepted = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const acceptButton = buttons.find(btn => /accept|consent/i.test(btn.innerText));
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

            await this.waitForDynamicContent(page, 10000);
            await this.autoScroll(page);

            await page.evaluate(() => window.scrollTo(0, 0));
            console.log(`⬆️ Scrolled back to top`);

            let totalHeight = await page.evaluate(() => document.body.scrollHeight);
            const viewportHeight = page.viewport().height;
            let currentPosition = 0;
            let index = 0;

            console.log(`📏 Total height: ${totalHeight}, Viewport height: ${viewportHeight}`);

            while (currentPosition < totalHeight) {
                const screenshotPath = path.join(sessionDir, `section_${index}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: false });
                console.log(`✅ Screenshot captured: ${screenshotPath} at position ${currentPosition}`);
                currentPosition += viewportHeight;
                await page.evaluate((scrollAmount) => window.scrollBy(0, scrollAmount), viewportHeight);
                await new Promise(resolve => setTimeout(resolve, 1000));

                totalHeight = await page.evaluate(() => document.body.scrollHeight);
                console.log(`📏 Updated total height: ${totalHeight}, Current position: ${currentPosition}`);
                index++;
            }

            const fullPagePath = path.join(sessionDir, 'full_page.png');
            await page.screenshot({ path: fullPagePath, fullPage: true });
            console.log(`✅ Full page screenshot captured: ${fullPagePath}`);

            await browser.close();
            console.log('📸 Screenshot capture completed.');
        } catch (error) {
            console.error('❌ Screenshot capture failed:', error);
            if (browser) await browser.close();
            throw error;
        }
    }

    async waitForDynamicContent(page, maxWaitMs) {
        console.log(`⏳ Waiting for dynamic content to load (max ${maxWaitMs}ms)`);
        let previousHeight = 0;
        let stableCount = 0;
        const checkInterval = 1000;
        const maxStableChecks = 3;

        for (let i = 0; i < maxWaitMs / checkInterval; i++) {
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            console.log(`📏 Current scroll height: ${currentHeight}`);
            if (currentHeight === previousHeight) {
                stableCount++;
                if (stableCount >= maxStableChecks) {
                    console.log(`✅ Content stable after ${i * checkInterval}ms`);
                    break;
                }
            } else {
                stableCount = 0;
            }
            previousHeight = currentHeight;
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }

    async autoScroll(page) {
        console.log(`🖱️ Auto-scrolling to load dynamic content`);
        let previousHeight = 0;
        let currentHeight = await page.evaluate(() => document.body.scrollHeight);

        while (previousHeight !== currentHeight) {
            previousHeight = currentHeight;
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(resolve => setTimeout(resolve, 2000));
            currentHeight = await page.evaluate(() => document.body.scrollHeight);
            console.log(`📏 Scrolled to height: ${currentHeight}`);
        }
        console.log(`✅ Auto-scroll complete`);
    }
}

const server = new ScreenshotServer();
server.init();