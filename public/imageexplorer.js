import * as THREE from "three";
import { OrbitControls } from "OrbitControls";


class ThreeJSApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 3);


this.renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
});
this.renderer.setClearColor(0x000000, 0.2);
this.renderer.setPixelRatio(window.devicePixelRatio);
this.renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(this.renderer.domElement);
document.body.style.backgroundColor = "#0f0f1a";

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

// Audio setup
this.audioListener = new THREE.AudioListener();
this.camera.add(this.audioListener);
this.backgroundAudio = new THREE.Audio(this.audioListener);
this.clickSound = new THREE.Audio(this.audioListener);
this.shuffleSound = new THREE.Audio(this.audioListener);

this.recording = {
    mediaRecorder: null,
    chunks: [],
    isRecording: false,
    blob: null,
    url: null
};
this.isRemoveActive = false;
this.is360View = false;
this.controlsVisible = true;

this.raycaster = new THREE.Raycaster();
this.mouse = new THREE.Vector2();
this.selectedMesh = null;
this.focusedMesh = null;

this.addLighting();
this.addBackgroundEnvironment();
this.setupAudio();
}

addLighting() {
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
this.scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x00d4ff, 1, 10);
pointLight.position.set(0, 0, 0);
this.scene.add(pointLight);
}

addBackgroundEnvironment() {
// Default environment map
this.loadEnvironmentMap('https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg');
}

loadEnvironmentMap(url) {
this.textureLoader.load(
    url,
    (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.background = texture;
        console.log("🌌 Background environment map loaded from:", url);
    },
    undefined,
    (err) => console.error("❌ Error loading environment map:", err)
);
}

async setupAudio() {
    try {
        const backgroundBuffer = await this.loadAudio('sweet.mp3');
        this.backgroundAudio.setBuffer(backgroundBuffer);
        this.backgroundAudio.setLoop(true);
        this.backgroundAudio.setVolume(0.3);
        this.backgroundAudio.play();
        console.log("🎶 Background audio started");

        this.clickSound.setBuffer(await this.loadAudio('sweet.mp3'));
        this.clickSound.setVolume(0.5);

        this.shuffleSound.setBuffer(await this.loadAudio('sweet.mp3'));
        this.shuffleSound.setVolume(0.5);
    } catch (err) {
        console.error("❌ Error loading audio:", err);
    }
}

loadAudio(url) {
    return new Promise((resolve, reject) => {
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
            url,
            (audioBuffer) => resolve(audioBuffer),
            undefined,
            (err) => reject(err)
        );
    });
}

init() {
console.log("🚀 Three.js script loaded");
this.setupEventListeners();
if (this.sessionId) {
    this.loadImages(this.sessionId);
}
this.animate();
window.addEventListener("resize", () => this.handleResize());
}

animate() {
requestAnimationFrame(() => this.animate());
if (this.controls.autoRotate) {
    this.controls.update();
} else if (!this.is360View && this.autoRotate) {
    this.scene.rotation.y += 0.005;
}
this.controls.update();

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
document.getElementById("toggleViewBtn").addEventListener("click", () => this.toggleViewMode());
document.getElementById("toggleControlsBtn").addEventListener("click", () => this.toggleControls());

this.renderer.domElement.addEventListener("click", (event) => this.onCanvasClick(event));
this.renderer.domElement.addEventListener("dblclick", (event) => this.onDoubleClick(event));
this.renderer.domElement.addEventListener("mousemove", (event) => this.onMouseMove(event));
this.renderer.domElement.addEventListener("touchstart", (event) => this.onTouchStart(event));
this.renderer.domElement.addEventListener("touchmove", (event) => this.onTouchMove(event));

document.getElementById("toggleRemoveBtn").addEventListener("click", () => this.toggleRemove());
document.getElementById("removeBtn").addEventListener("click", () => this.removeSelectedImage());
document.getElementById("removeAllBtn").addEventListener("click", () => this.removeAllImages());

document.getElementById("images").addEventListener("change", (event) => this.showImagePreviews(event));

// Add listener for environment map upload
document.getElementById("envMapInput").addEventListener("change", (event) => this.handleEnvMapUpload(event));
}

handleEnvMapUpload(event) {
const file = event.target.files[0];
if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const url = e.target.result;
        this.loadEnvironmentMap(url);
        console.log("🌌 User uploaded new environment map");
    };
    reader.readAsDataURL(file);
} else {
    console.error("❌ Please upload a valid image file for the environment map");
    this.showMessage("toggleViewStatus", "Invalid file type. Please upload an image.", "error");
}
}

toggleControls() {
this.controlsVisible = !this.controlsVisible;
const controlPanels = document.querySelectorAll(".control-panel");
const toggleButton = document.getElementById("toggleControlsBtn");

controlPanels.forEach(panel => {
    panel.classList.toggle("hidden-panel", !this.controlsVisible);
});

toggleButton.textContent = this.controlsVisible ? "Hide Controls" : "Show Controls";
toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash";
console.log(this.controlsVisible ? "🖥️ Controls visible" : "🖥️ Controls hidden");
}

onMouseMove(event) {
this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

onTouchStart(event) {
const touch = event.touches[0];
this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
this.onCanvasClick(event);
}

onTouchMove(event) {
event.preventDefault();
const touch = event.touches[0];
this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
this.scene.rotation.y += (touch.clientX - this.lastTouchX) * 0.005;
this.lastTouchX = touch.clientX;
}

onDoubleClick(event) {
this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

this.raycaster.setFromCamera(this.mouse, this.camera);
const intersects = this.raycaster.intersectObjects(this.scene.children, true);

if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    if (intersectedObject.userData.filename) {
        if (this.focusedMesh === intersectedObject) {
            this.focusedMesh.scale.set(1, 1, 1);
            this.focusedMesh.material.uniforms.opacity.value = 1;
            this.focusedMesh = null;
            this.images.forEach(img => {
                img.mesh.material.uniforms.opacity.value = 1;
            });
            this.showMessage("toggleViewStatus", "View reset", "success");
        } else {
            if (this.focusedMesh) {
                this.focusedMesh.scale.set(1, 1, 1);
                this.focusedMesh.material.uniforms.opacity.value = 1;
            }

            this.focusedMesh = intersectedObject;
            this.focusedMesh.scale.set(2, 2, 2);
            this.focusedMesh.material.uniforms.opacity.value = 1;

            this.images.forEach(img => {
                if (img.mesh !== this.focusedMesh) {
                    img.mesh.material.uniforms.opacity.value = 0.3;
                }
            });
            this.showMessage("toggleViewStatus", "Image focused", "success");
        }
    }
} else if (this.focusedMesh) {
    this.focusedMesh.scale.set(1, 1, 1);
    this.focusedMesh.material.uniforms.opacity.value = 1;
    this.focusedMesh = null;
    this.images.forEach(img => {
        img.mesh.material.uniforms.opacity.value = 1;
    });
    this.showMessage("toggleViewStatus", "View reset", "success");
}
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
        if (!this.clickSound.isPlaying) {
            this.clickSound.play();
        }
    }
}
}

toggleRemove() {
this.showStatus("toggleRemoveStatus", true);
this.isRemoveActive = !this.isRemoveActive;
const removeControls = document.getElementById("removeControls");
setTimeout(() => {
    removeControls.classList.toggle("hidden", !this.isRemoveActive);
    this.showMessage("toggleRemoveStatus", this.isRemoveActive ? "Remove mode enabled" : "Remove mode disabled", "success");
    this.showStatus("toggleRemoveStatus", false);
}, 500);
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
    this.showStatus("removeSelectedStatus", true);
    this.removeImage(this.selectedMesh);
    this.hideAllRemoveButtons();
    this.selectedMesh = null;
    this.showMessage("removeSelectedStatus", "Image removed", "success");
    this.showStatus("removeSelectedStatus", false);
} else {
    this.showMessage("removeSelectedStatus", "No image selected for removal", "error");
}
}

removeAllImages() {
this.showStatus("removeAllStatus", true);
while (this.scene.children.length > 2) {
    const child = this.scene.children[2];
    this.scene.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
}
this.images = [];
console.log("🗑️ All images removed");
this.showMessage("removeAllStatus", "All images removed", "success");
this.showStatus("removeAllStatus", false);
}

toggleViewMode() {
this.showStatus("toggleViewStatus", true);
this.is360View = !this.is360View;
console.log(this.is360View ? "🔄 Switched to 360-degree view" : "🔄 Switched to 3D view");

if (this.is360View) {
    this.camera.position.set(0, 0, 0);
    this.controls.maxDistance = 10;
    this.controls.minDistance = 0.1;
    this.controls.enablePan = false;
} else {
    this.camera.position.set(0, 0, 3);
    this.controls.maxDistance = 5;
    this.controls.minDistance = 2;
    this.controls.enablePan = false;
}
this.camera.updateProjectionMatrix();
this.updateImagePositions();
this.showMessage("toggleViewStatus", this.is360View ? "Switched to 360 view" : "Switched to 3D view", "success");
this.showStatus("toggleViewStatus", false);
}

async loadImages(sessionId) {
    this.clearScene();

    try {
        this.showStatus("toggleViewStatus", true);
        const response = await fetch(`/api/screenshots/${sessionId}`); // Correct endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.screenshots?.length) {
            this.showMessage("toggleViewStatus", "No screenshots found", "error");
            return;
        }

        // Use only screenshots, ignore metadata
        this.imagesToLoad = data.screenshots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        this.updateImagePositions();
        this.showMessage("toggleViewStatus", "Images loaded successfully", "success");
    } catch (error) {
        console.error("❌ Error fetching images:", error);
        this.showMessage("toggleViewStatus", `Failed to load images: ${error.message}`, "error");
    } finally {
        this.showStatus("toggleViewStatus", false);
    }
}

clearScene() {
while (this.scene.children.length > 2) {
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
        const planeHeight = this.is360View ? 1.5 : window.innerHeight / 300;
        const planeWidth = planeHeight * aspectRatio;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: texture },
                opacity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                uniform float opacity;
                varying vec2 vUv;
                void main() {
                    vec4 tex = texture2D(map, vUv);
                    if (!gl_FrontFacing) {
                        tex = texture2D(map, vec2(1.0 - vUv.x, vUv.y));
                    }
                    gl_FragColor = vec4(tex.rgb, tex.a * opacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const mesh = new THREE.Mesh(geometry, material);

    if (this.is360View) {
        const x = this.radius * Math.sin(phiOrIndex) * Math.cos(theta);
        const y = this.radius * Math.cos(phiOrIndex);
        const z = this.radius * Math.sin(phiOrIndex) * Math.sin(theta);
        mesh.position.set(x, y, z);
    } else {
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
this.clearScene();

if (!this.imagesToLoad || this.imagesToLoad.length === 0) return;

const totalImages = this.imagesToLoad.length;
const goldenRatio = (Math.sqrt(5) + 1) / 2;

if (this.is360View) {
    for (let index = 0; index < totalImages; index++) {
        const y = 1 - (index / (totalImages - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenRatio * index * Math.PI * 2;
        const phi = Math.acos(y);
        this.addImage(this.imagesToLoad[index], theta, phi);
    }
} else {
    const angleIncrement = (2 * Math.PI) / totalImages;
    for (let index = 0; index < totalImages; index++) {
        const angle = index * angleIncrement;
        this.addImage(this.imagesToLoad[index], angle, angleIncrement);
    }
}
}

shuffleImages() {
if (this.images.length === 0) {
    this.showMessage("shuffleStatus", "No images to shuffle", "error");
    return;
}

this.showStatus("shuffleStatus", true);
this.images = this.images.sort(() => Math.random() - 0.5);
this.imagesToLoad = this.images.map(img => img.mesh.userData.filename);
this.updateImagePositions();
if (!this.shuffleSound.isPlaying) {
    this.shuffleSound.play();
}
this.showMessage("shuffleStatus", "Images shuffled successfully", "success");
this.showStatus("shuffleStatus", false);
}

removeImage(mesh) {
this.scene.remove(mesh);
this.images = this.images.filter(img => img.mesh !== mesh);
this.imagesToLoad = this.images.map(img => img.mesh.userData.filename);
console.log(`🗑️ Removed image: ${mesh.userData.filename}`);
this.updateImagePositions();
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
this.showStatus("downloadStatus", true);
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
this.showMessage("downloadStatus", "Image downloaded successfully", "success");
this.showStatus("downloadStatus", false);
}

handleZoom() {
const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");
const zoomLevel = parseFloat(zoomSlider.value);
zoomValue.textContent = zoomLevel.toFixed(1);
this.controls.maxDistance = zoomLevel;
this.controls.update();
if (!this.is360View) {
    this.camera.position.z = zoomLevel;
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
if (!url) {
    this.showMessage("screenshotStatus", "Please enter a valid URL", "error");
    return;
}
 
this.showStatus("screenshotStatus", true);

try {
    const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    });
    
    const result = await response.json();
    if (result.sessionId) {
        this.sessionId = result.sessionId;
        localStorage.setItem('sessionId', this.sessionId);
        this.showMessage("screenshotStatus", `Screenshots captured for ${url}`, "success");
        this.loadImages(this.sessionId);
    } else {
        this.showMessage("screenshotStatus", "Failed to capture screenshot", "error");
    }
} catch (error) {
    console.error("Error:", error);
    this.showMessage("screenshotStatus", `Failed to capture screenshot: ${error.message}`, "error");
} finally {
    this.showStatus("screenshotStatus", false);
}
}

async handleUploadSubmit(event) {
event.preventDefault();
const sessionId = this.sessionId || null;
const fileInput = document.getElementById("images");
if (!fileInput.files?.length) {
    this.showMessage("uploadStatus", "Please select at least one image to upload", "error");
    return;
}

this.showStatus("uploadStatus", true);

const formData = new FormData();
for (const file of fileInput.files) {
    formData.append("images", file);
}

try {
    const response = await fetch(`/api/upload${sessionId ? `/${sessionId}` : ''}`, {
        method: "POST",
        body: formData
    });
    
    const result = await response.json();
    if (result.success) {
        this.sessionId = result.sessionId;
        localStorage.setItem('sessionId', this.sessionId);
        this.showMessage("uploadStatus", `Uploaded ${result.filePaths.length} images successfully`, "success");
        this.loadImages(this.sessionId);
    } else {
        this.showMessage("uploadStatus", `Upload failed: ${result.error || "Unknown error"}`, "error");
    }
} catch (error) {
    console.error("Error uploading files:", error);
    this.showMessage("uploadStatus", `Failed to upload images: ${error.message}`, "error");
} finally {
    this.showStatus("uploadStatus", false);
}
}

showImagePreviews(event) {
const files = event.target.files;
const previewContainer = document.getElementById("previewContainer");
previewContainer.innerHTML = "";

for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.classList.add("preview-thumbnail");
        img.addEventListener("click", () => {
            console.log(`Clicked preview for ${file.name}`);
        });
        previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
}
}

startRecording() {
if (this.recording.isRecording) {
    this.showMessage("startRecordingStatus", "Recording already in progress", "error");
    return;
}

this.showStatus("startRecordingStatus", true);
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

const indicator = document.getElementById("recordingIndicator");
indicator.classList.remove("hidden");
indicator.textContent = "Recording... (2 minutes remaining)";

let timeLeft = 120;
this.recordingTimer = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    indicator.textContent = `Recording... (${minutes}:${seconds < 10 ? '0' : ''}${seconds} remaining)`;
    if (timeLeft <= 0) {
        clearInterval(this.recordingTimer);
        this.stopRecording();
    }
}, 1000);
this.showMessage("startRecordingStatus", "Recording started", "success");
this.showStatus("startRecordingStatus", false);
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
if (!this.recording.isRecording) {
    this.showMessage("stopRecordingStatus", "No recording in progress", "error");
    return;
}

this.showStatus("stopRecordingStatus", true);
this.recording.mediaRecorder.stop();
this.recording.isRecording = false;

const indicator = document.getElementById("recordingIndicator");
indicator.classList.add("hidden");
if (this.recordingTimer) {
    clearInterval(this.recordingTimer);
    this.recordingTimer = null;
}

this.renderer.setSize(window.innerWidth, window.innerHeight);
this.camera.aspect = window.innerWidth / window.innerHeight;
this.camera.updateProjectionMatrix();
this.showMessage("stopRecordingStatus", "Recording stopped", "success");
this.showStatus("stopRecordingStatus", false);
console.log("Recording stopped...");
}

toggleRotate() {
this.showStatus("toggleRotateStatus", true);
this.controls.autoRotate = !this.controls.autoRotate;
this.showMessage("toggleRotateStatus", this.controls.autoRotate ? "Auto-rotate enabled" : "Auto-rotate disabled", "success");
this.showStatus("toggleRotateStatus", false);
console.log(this.controls.autoRotate ? "🔄 Auto-rotate enabled" : "🛑 Auto-rotate disabled");
}

rotateScene(angle) {
this.showStatus("prevPageStatus", true);
this.scene.rotation.y += angle;
this.showMessage("prevPageStatus", "Rotated left", "success");
this.showStatus("prevPageStatus", false);

this.showStatus("nextPageStatus", true);
this.scene.rotation.y += angle;
this.showMessage("nextPageStatus", "Rotated right", "success");
this.showStatus("nextPageStatus", false);
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

showStatus(statusId, show) {
const statusElement = document.getElementById(statusId);
if (statusElement) {
    statusElement.classList.toggle("hidden", !show);
    if (show) {
        statusElement.classList.remove("success", "error");
        statusElement.classList.add("loading");
        statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        statusElement.classList.remove("loading");
    }
}
}

showMessage(statusId, message, type) {
const statusElement = document.getElementById(statusId);
if (statusElement) {
    statusElement.classList.remove("hidden", "loading");
    statusElement.classList.add(type === "success" ? "success" : "error");
    statusElement.innerHTML = type === "success" ? '<i class="fas fa-check"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
    statusElement.setAttribute("data-tooltip", message);
    
    setTimeout(() => {
        statusElement.classList.add("hidden");
        statusElement.removeAttribute("data-tooltip");
        statusElement.classList.remove("success", "error");
    }, 3000);
}
}}

const app = new ThreeJSApp();
app.init();