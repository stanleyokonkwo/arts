import * as THREE from "three";
import { OrbitControls } from "OrbitControls";

class ThreeJSApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 3); // Default to 3D view position

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setClearColor(0x000000, 0.2); // Slightly opaque for depth
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        document.body.style.backgroundColor = "#0f0f1a"; // Match CSS background

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 10;
        this.controls.enablePan = false;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 1.0;

        this.images = [];
        this.radius = 5;
        this.sessionId = localStorage.getItem('sessionId');
        this.textureLoader = new THREE.TextureLoader();
        this.recording = {
            mediaRecorder: null,
            chunks: [],
            isRecording: false,
            blob: null,
            url: null
        };
        this.isRemoveActive = false;
        this.is360View = false; // Track view mode: false = 3D, true = 360

        this.addLighting(); // Add lighting for beauty
        this.addBackgroundSphere(); // Add glowing background sphere
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00d4ff, 1, 10);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
    }

    addBackgroundSphere() {
        const geometry = new THREE.SphereGeometry(this.radius * 1.2, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a3d,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
            wireframe: true
        });
        const sphere = new THREE.Mesh(geometry, material);
        this.scene.add(sphere);
        this.backgroundSphere = sphere;
    }

    init() {
        console.log("🚀 Three.js script loaded");
        this.setupEventListeners();
        if (this.sessionId) {
            this.loadImages(this.sessionId);
        }
        this.animate();
        this.setupRaycaster();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls.autoRotate) {
            this.controls.update();
        } else if (!this.is360View && this.autoRotate) {
            this.scene.rotation.y += 0.002; // Manual rotation for 3D view
        }
        this.controls.update();

        if (this.backgroundSphere) {
            this.backgroundSphere.rotation.y += 0.001;
            this.backgroundSphere.rotation.x += 0.0005;
        }

        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        document.getElementById("downloadBtn").addEventListener("click", () => this.handleDownload());
        document.getElementById("zoomSlider").addEventListener("input", () => this.handleZoom());
        document.getElementById("radiusSlider").addEventListener("input", () => this.handleRadius());
        document.getElementById("screenshotForm").addEventListener("submit", (e) => this.handleScreenshotSubmit(e));
        document.getElementById("uploadForm").addEventListener("submit", (e) => this.handleUploadSubmit(e));
        document.getElementById("startRecordingBtn").addEventListener("click", () => this.startRecording());
        document.getElementById("stopRecordingBtn").addEventListener("click", () => this.stopRecording());
        document.getElementById("toggleRotateBtn").addEventListener("click", () => this.toggleRotate());
        document.getElementById("shuffleBtn").addEventListener("click", () => this.shuffleImages());
        document.getElementById("prevPage").addEventListener("click", () => this.rotateScene(-Math.PI / 8));
        document.getElementById("nextPage").addEventListener("click", () => this.rotateScene(Math.PI / 8));
        document.getElementById("toggleViewBtn").addEventListener("click", () => this.toggleViewMode()); // New toggle view button

        this.renderer.domElement.addEventListener("click", (event) => this.onCanvasClick(event));

        document.getElementById("toggleRemoveBtn").addEventListener("click", () => this.toggleRemove());
        document.getElementById("removeBtn").addEventListener("click", () => this.removeSelectedImage());
        document.getElementById("removeAllBtn").addEventListener("click", () => this.removeAllImages());
    }

    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedMesh = null;
    }

    onCanvasClick(event) {
        if (!this.isRemoveActive) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            if (intersectedObject.userData.onClick) {
                this.selectedMesh = intersectedObject;
                this.showRemoveButton(intersectedObject);
            }
        }
    }

    toggleRemove() {
        this.isRemoveActive = !this.isRemoveActive;
        const removeControls = document.getElementById("removeControls");
        removeControls.classList.toggle("hidden", !this.isRemoveActive);

        if (!this.isRemoveActive) {
            this.hideAllRemoveButtons();
            this.selectedMesh = null;
        }
    }

    hideAllRemoveButtons() {
        const removeButtons = document.querySelectorAll("button[style*='Remove']");
        removeButtons.forEach(btn => btn.remove());
        this.images.forEach(img => {
            img.mesh.userData.buttonCreated = false;
        });
    }

    removeSelectedImage() {
        if (this.selectedMesh) {
            this.removeImage(this.selectedMesh);
            this.hideAllRemoveButtons();
            this.selectedMesh = null;
        } else {
            console.warn("No image selected for removal.");
        }
    }

    removeAllImages() {
        while (this.scene.children.length > 2) { // Preserve lights and background sphere
            const child = this.scene.children[2];
            this.scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
        this.images = [];
        console.log("🗑️ All images removed");
    }

    toggleViewMode() {
        this.is360View = !this.is360View;
        console.log(this.is360View ? "🔄 Switched to 360-degree view" : "🔄 Switched to 3D view");

        // Adjust camera position and controls based on view mode
        if (this.is360View) {
            this.camera.position.set(0, 0, 0); // Center for 360 view
            this.controls.maxDistance = 10; // Wider range for 360
            this.controls.minDistance = 0.1;
            this.controls.enablePan = false;
        } else {
            this.camera.position.set(0, 0, 3); // Offset for 3D view
            this.controls.maxDistance = 5; // Original 3D range
            this.controls.minDistance = 2;
            this.controls.enablePan = false;
        }
        this.camera.updateProjectionMatrix();
        this.updateImagePositions(); // Re-arrange images based on mode
    }

    async loadImages(sessionId) {
        this.clearScene();
        
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data.screenshots?.length) {
                console.warn("⚠ No screenshots found for session:", sessionId);
                return;
            }

            data.screenshots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            this.imagesToLoad = data.screenshots; // Store images for loading
            this.updateImagePositions(); // Load and position based on current mode
        } catch (error) {
            console.error("❌ Error fetching images:", error);
        }
    }

    clearScene() {
        while (this.scene.children.length > 2) { // Preserve lights and background sphere
            const child = this.scene.children[2];
            this.scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
        this.images = [];
        console.log("🗑️ Scene cleared");
    }

    async addImage(filename, theta, phiOrIndex) {
        try {
            const texture = await this.loadTexture(filename);
            const aspectRatio = texture.image.width / texture.image.height;
            const planeHeight = this.is360View ? 1.5 : window.innerHeight / 300; // Larger for 360, smaller for 3D
            const planeWidth = planeHeight * aspectRatio;

            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
            const mesh = new THREE.Mesh(geometry, material);

            if (this.is360View) {
                // 360-degree view: Spherical coordinates
                const x = this.radius * Math.sin(phiOrIndex) * Math.cos(theta);
                const y = this.radius * Math.cos(phiOrIndex);
                const z = this.radius * Math.sin(phiOrIndex) * Math.sin(theta);
                mesh.position.set(x, y, z);
            } else {
                // 3D view: Circular XZ plane
                const angle = theta;
                const x = this.radius * Math.cos(angle);
                const z = this.radius * Math.sin(angle);
                mesh.position.set(x, 0, z);
            }
            mesh.lookAt(0, 0, 0);
            mesh.userData = { filename, buttonCreated: false };
            mesh.userData.onClick = () => this.showRemoveButton(mesh);

            this.scene.add(mesh);
            this.images.push({ mesh, filename });
            
            console.log(`🛠 Layer added: ${filename} at position (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
        } catch (error) {
            console.warn(`⚠ Skipping texture: ${filename}`, error);
        }
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                    resolve(texture);
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    updateImagePositions() {
        this.clearScene(); // Clear existing images

        if (!this.imagesToLoad || this.imagesToLoad.length === 0) return;

        const totalImages = this.imagesToLoad.length;
        const goldenRatio = (Math.sqrt(5) + 1) / 2;

        if (this.is360View) {
            // 360-degree view: Spherical arrangement
            for (let index = 0; index < totalImages; index++) {
                const y = 1 - (index / (totalImages - 1)) * 2;
                const radiusAtY = Math.sqrt(1 - y * y);
                const theta = goldenRatio * index * Math.PI * 2;
                const phi = Math.acos(y);
                this.addImage(this.imagesToLoad[index], theta, phi);
            }
        } else {
            // 3D view: Circular arrangement in XZ plane
            const angleIncrement = (2 * Math.PI) / totalImages;
            for (let index = 0; index < totalImages; index++) {
                const angle = index * angleIncrement;
                this.addImage(this.imagesToLoad[index], angle, angleIncrement); // phiOrIndex is angleIncrement here
            }
        }
    }

    removeImage(mesh) {
        this.scene.remove(mesh);
        this.images = this.images.filter(img => img.mesh !== mesh);
        this.imagesToLoad = this.images.map(img => img.mesh.userData.filename); // Update imagesToLoad
        console.log(`🗑️ Removed image: ${mesh.userData.filename}`);
        this.updateImagePositions(); // Re-arrange based on current mode
    }

    showRemoveButton(mesh) {
        if (!this.isRemoveActive || mesh.userData.buttonCreated) return;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.style.cssText = `
            position: absolute;
            z-index: 1000;
            padding: 8px 12px;
            background: rgba(220, 53, 69, 0.8);
            color: #fff;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 0.8rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(removeBtn);

        const updateButtonPosition = () => {
            const screenPos = new THREE.Vector3();
            mesh.getWorldPosition(screenPos);
            screenPos.project(this.camera);

            const xPos = (screenPos.x + 1) / 2 * window.innerWidth;
            const yPos = (1 - screenPos.y) / 2 * window.innerHeight;

            removeBtn.style.left = `${xPos}px`;
            removeBtn.style.top = `${yPos - 30}px`;
            removeBtn.style.display = "block";
        };

        updateButtonPosition();

        const updateLoop = () => {
            if (this.isRemoveActive) {
                updateButtonPosition();
            } else {
                removeBtn.remove();
                mesh.userData.buttonCreated = false;
                return;
            }
            requestAnimationFrame(updateLoop);
        };
        updateLoop();

        removeBtn.addEventListener("click", () => {
            this.removeImage(mesh);
            removeBtn.remove();
            mesh.userData.buttonCreated = false;
        });

        removeBtn.addEventListener("mouseover", () => {
            removeBtn.style.opacity = "0.8";
            removeBtn.style.transform = "scale(1.05)";
        });
        removeBtn.addEventListener("mouseout", () => {
            removeBtn.style.opacity = "1";
            removeBtn.style.transform = "scale(1)";
        });

        mesh.userData.buttonCreated = true;
    }

    handleDownload() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const highResWidth = Math.max(screenWidth * 2, 1920);
        const highResHeight = Math.max(screenHeight * 2, 1080);

        const originalSize = { width: this.renderer.domElement.width, height: this.renderer.domElement.height };
        this.renderer.setSize(highResWidth, highResHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.render(this.scene, this.camera);

        const imgData = this.renderer.domElement.toDataURL("image/png", 1.0);

        this.renderer.setSize(originalSize.width, originalSize.height, false);
        this.renderer.render(this.scene, this.camera);

        this.downloadFile(imgData, "rendered_high_res_image.png");
        console.log("📸 High-resolution image captured and ready for download with transparent background");
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        this.controls.maxDistance = zoomLevel;
        this.controls.update();
        if (!this.is360View) {
            this.camera.position.z = zoomLevel; // Adjust position for 3D view
            this.camera.updateProjectionMatrix();
        }
        console.log(`🔍 Zoom level updated: ${zoomLevel}`);
    }

    handleRadius() {
        const radiusSlider = document.getElementById("radiusSlider");
        const radiusValue = document.getElementById("radiusValue");
        this.radius = parseFloat(radiusSlider.value);
        radiusValue.textContent = this.radius.toFixed(1);
        this.updateImagePositions();
    }

    async handleScreenshotSubmit(event) {
        event.preventDefault();
        const url = document.getElementById("url").value;
        if (!url) return alert("Please enter a valid URL.");

        try {
            const response = await fetch("http://localhost:3000/api/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });
            
            const result = await response.json();
            if (result.sessionId) {
                this.sessionId = result.sessionId;
                localStorage.setItem('sessionId', this.sessionId);
                alert(result.message);
                this.loadImages(this.sessionId);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to capture screenshot.");
        }
    }

    async handleUploadSubmit(event) {
        event.preventDefault();
        const sessionId = this.sessionId || null;
        const fileInput = document.getElementById("images");
        if (!fileInput.files?.length) return alert("Please select at least one image to upload.");

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append("images", file);
        }

        try {
            const response = await fetch(`http://localhost:3000/api/upload${sessionId ? `/${sessionId}` : ''}`, {
                method: "POST",
                body: formData
            });
            
            const result = await response.json();
            if (result.success) {
                this.sessionId = result.sessionId;
                localStorage.setItem('sessionId', this.sessionId);
                alert(result.message);
                this.loadImages(this.sessionId);
            } else {
                console.error("Upload failed:", result);
                alert("Upload failed: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error uploading files:", error);
            alert("Failed to upload images.");
        }
    }

    startRecording() {
        if (this.recording.isRecording) return;

        this.recording.chunks = [];
        this.renderer.setSize(1920, 1080);
        const stream = this.renderer.domElement.captureStream(30);

        try {
            this.recording.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/mp4" });
            this.setupRecorder("mp4", "360-video.mp4");
        } catch (e) {
            console.error("MP4 recording failed, switching to WebM.", e);
            this.recording.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
            this.setupRecorder("webm", "360-video.webm");
        }
    }

    setupRecorder(type, filename) {
        this.recording.mediaRecorder.ondataavailable = (event) => {
            this.recording.chunks.push(event.data);
        };

        this.recording.mediaRecorder.onstop = () => {
            this.recording.blob = new Blob(this.recording.chunks, { type: `video/${type}` });
            this.recording.url = URL.createObjectURL(this.recording.blob);
            this.downloadFile(this.recording.url, filename);
        };

        this.recording.mediaRecorder.start();
        setTimeout(() => this.stopRecording(), 120000);
        this.recording.isRecording = true;
        console.log(`Recording started in ${type} format...`);
    }

    stopRecording() {
        if (!this.recording.isRecording) return;

        this.recording.mediaRecorder.stop();
        this.recording.isRecording = false;
        console.log("Recording stopped...");
    }

    toggleRotate() {
        this.controls.autoRotate = !this.controls.autoRotate;
        console.log(this.controls.autoRotate ? "🔄 Auto-rotate enabled" : "🛑 Auto-rotate disabled");
    }

    rotateScene(angle) {
        this.scene.rotation.y += angle;
    }

    shuffleImages() {
        this.images = this.images.sort(() => Math.random() - 0.5);
        this.updateImagePositions();
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        console.log("🔄 Window resized");
    }

    downloadFile(data, filename) {
        const link = document.createElement("a");
        link.href = data;
        link.download = filename;
        link.click();
    }
}

const app = new ThreeJSApp();
app.init();