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
    }

    async init() {
        try {
            await fs.ensureDir(this.outputDir);
            console.log('🗂 Base screenshot directory ensured:', this.outputDir);

            // Verify write permissions
            const testFile = path.join(this.outputDir, 'test.txt');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            console.log('✅ Write permissions confirmed for outputDir');
        } catch (error) {
            console.error('❌ No write permissions for outputDir:', error);
            process.exit(1);
        }

        this.setupMiddleware();
        this.setupRoutes();
        this.startServer();
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
            console.log(`📸 Found ${imageFiles.length} images in session ${sessionId}:`, screenshotUrls);
            res.json({ screenshots: screenshotUrls });
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
            res.status(500).json({ error: 'Failed to capture screenshot' });
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

            console.log(`📤 Received ${req.files.length} files:`, req.files.map(f => ({
                originalname: f.originalname,
                mimetype: f.mimetype,
                size: f.size
            })));

            const filePaths = [];
            for (const file of req.files) {
                const filename = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
                const filePath = path.join(sessionDir, filename);
                await fs.writeFile(filePath, file.buffer);
                console.log(`✅ Saved: ${filePath}`);
                filePaths.push(`/screenshots/${sessionId}/${filename}`);
            }

            const filesAfterUpload = await fs.readdir(sessionDir);
            console.log(`📂 Files in directory: ${filesAfterUpload.length}`, filesAfterUpload);

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

        await new Promise(resolve => setTimeout(resolve, 4000));
        const totalHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = await page.viewport().height;
        let currentPosition = 0;
        let index = 0;

        while (currentPosition < totalHeight) {
            const screenshotPath = path.join(sessionDir, `section_${index}.png`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            await page.screenshot({ path: screenshotPath, fullPage: false });
            console.log(`✅ Screenshot captured: ${screenshotPath}`);
            currentPosition += viewportHeight;
            await page.evaluate((scrollAmount) => window.scrollBy(0, scrollAmount), viewportHeight);
            await new Promise(resolve => setTimeout(resolve, 500));
            index++;
        }

        await browser.close();
        console.log('📸 Screenshot capture completed.');
    }
}

const server = new ScreenshotServer();
server.init();