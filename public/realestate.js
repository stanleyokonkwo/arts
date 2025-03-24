import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
        this.camera = camera;
    }

    getObject() {
        return this.camera;
    }

    lock() {
        super.lock();
        this.domElement.ownerDocument.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    unlock() {
        super.unlock();
        this.domElement.ownerDocument.removeEventListener("mousemove", this.onMouseMove.bind(this));
    }

    onMouseMove(event) {
        if (this.isLocked === true) {
            const movementX = event.movementX * this.sensitivity;
            const movementY = event.movementY * this.sensitivity;

            const euler = new THREE.Euler(0, 0, 0, "YXZ");
            euler.setFromQuaternion(this.camera.quaternion);

            euler.y -= movementX;
            euler.x -= movementY;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

            this.camera.quaternion.setFromEuler(euler);
        }
    }

    setSensitivity(value) {
        this.sensitivity = value;
    }
}

class ThreeJSApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.roomCameraSettings = [
            { position: new THREE.Vector3(0, 2, 10), lookAt: new THREE.Vector3(0, 2, 0) }, // Living Room
            { position: new THREE.Vector3(20, 2, 10), lookAt: new THREE.Vector3(20, 2, 0) } // Kitchen
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
        
        if (this.isMobile) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.copy(initialSettings.lookAt);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 20;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.exhibits = [];
        this.sessionId = localStorage.getItem('sessionId');
        this.textureLoader = new THREE.TextureLoader();

        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        this.backgroundAudio = new THREE.Audio(this.audioListener);
        this.clickSound = new THREE.Audio(this.audioListener);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedMesh = null;

        this.rooms = [];
        this.currentRoom = 0;
        this.isMoving = false;
        this.isFocused = false;
        this.isLocked = false;

        this.previousCameraState = {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone(),
            target: initialSettings.lookAt.clone()
        };

        this.lastClickTime = 0;
        this.clickDelay = 300;
        this.moveSpeed = 0.1;
        this.keys = { w: false, a: false, s: false, d: false };

        this.addLighting();
        this.createProperty();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Warmer ambient light
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffe4b5, 0.6); // Warm light
        directionalLight.position.set(0, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.bias = -0.0001;
        this.scene.add(directionalLight);
    }

    createProperty() {
        // Materials
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xdeb887, // Warm wooden floor
            roughness: 0.4,
            metalness: 0.1,
            map: this.generateWoodTexture(512, 512)
        });

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0fff0, // Light green drywall
            roughness: 0.5,
            metalness: 0,
            side: THREE.DoubleSide
        });

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Bright white ceiling
            roughness: 0.2,
            metalness: 0
        });

        // Room 1: Living Room
        const livingRoom = new THREE.Group();
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.receiveShadow = true;
        livingRoom.add(floor1);

        const ceiling1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilingMaterial);
        ceiling1.position.y = 6;
        ceiling1.rotation.x = Math.PI / 2;
        ceiling1.receiveShadow = true;
        livingRoom.add(ceiling1);

        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial)
        ];
        walls1[0].position.set(0, 3, -10); // Back wall
        walls1[1].position.set(0, 3, 10); // Front wall
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-10, 3, 0); // Left wall
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(10, 3, 0); // Right wall
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach(wall => {
            wall.receiveShadow = true;
            wall.userData = { isExhibitSurface: true }; // Mark as exhibit surface
            livingRoom.add(wall);
        });

        const ceilingLight1 = new THREE.RectAreaLight(0xffe4b5, 1.5, 18, 18); // Warm ceiling light
        ceilingLight1.position.set(0, 5.9, 0);
        ceilingLight1.rotation.x = Math.PI;
        livingRoom.add(ceilingLight1);

        // Room 2: Kitchen
        const kitchen = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        kitchen.add(floor2);

        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), ceilingMaterial);
        ceiling2.position.y = 6;
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        kitchen.add(ceiling2);

        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(15, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(15, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(15, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(15, 6), wallMaterial)
        ];
        walls2[0].position.set(0, 3, -7.5); // Back wall
        walls2[1].position.set(0, 3, 7.5); // Front wall
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-7.5, 3, 0); // Left wall
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(7.5, 3, 0); // Right wall
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            wall.userData = { isExhibitSurface: true }; // Mark as exhibit surface
            kitchen.add(wall);
        });

        const ceilingLight2 = new THREE.RectAreaLight(0xffe4b5, 1.2, 13, 13);
        ceilingLight2.position.set(0, 5.9, 0);
        ceilingLight2.rotation.x = Math.PI;
        kitchen.add(ceilingLight2);

        const door = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 5),
            new THREE.MeshBasicMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.3 }) // Light blue door
        );
        door.position.set(-7.4, 3, 0);
        door.rotation.y = Math.PI / 2;
        door.userData = { nextRoom: 0 };
        kitchen.add(door);

        livingRoom.position.set(0, 0, 0);
        kitchen.position.set(20, 0, 0);
        this.rooms.push(livingRoom, kitchen);
        this.rooms.forEach(room => this.scene.add(room));
    }

    generateWoodTexture(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const noise = Math.random() * 0.1;
                const grain = Math.sin(x * 0.1) * 20 + Math.sin(y * 0.05) * 10;
                const value = Math.max(0, Math.min(255, 222 + grain + noise * 50));
                imageData.data[i] = value;     // Red (wood tone)
                imageData.data[i + 1] = value * 0.9; // Green (slightly darker)
                imageData.data[i + 2] = value * 0.8; // Blue (even darker)
                imageData.data[i + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    createAvatar() {
        this.avatarGroup = new THREE.Group();
        const avatarMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        });

        const clickablePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 })
        );
        clickablePlane.position.set(2, 1.7, 2);
        this.avatarGroup.add(clickablePlane);

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 32), avatarMaterial);
        body.position.set(2, 0.5, 2);
        this.avatarGroup.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), avatarMaterial);
        head.position.set(2, 1.2, 2);
        this.avatarGroup.add(head);

        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 32);
        const leftArm = new THREE.Mesh(armGeometry, avatarMaterial);
        leftArm.position.set(1.7, 0.7, 2);
        leftArm.rotation.z = Math.PI / 4;
        this.avatarGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, avatarMaterial);
        rightArm.position.set(2.3, 0.7, 2);
        rightArm.rotation.z = -Math.PI / 4;
        this.avatarGroup.add(rightArm);

        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 32);
        const leftLeg = new THREE.Mesh(legGeometry, avatarMaterial);
        leftLeg.position.set(1.8, 0.25, 2);
        this.avatarGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, avatarMaterial);
        rightLeg.position.set(2.2, 0.25, 2);
        this.avatarGroup.add(rightLeg);

        this.avatarGroup.userData = { isAvatar: true };
        this.scene.add(this.avatarGroup);

        this.updateAvatarPosition();
    }

    updateAvatarPosition() {
        if (this.isMobile) {
            const roomCenter = this.rooms[this.currentRoom].position.clone();
            this.avatarGroup.position.copy(roomCenter);
            this.avatarGroup.position.y = 0.5;
        } else {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            direction.y = 0;
            direction.normalize().multiplyScalar(2);
            this.avatarGroup.position.copy(this.camera.position).add(direction);
            this.avatarGroup.position.y = 0.5;
        }
    }

    async setupAudio() {
        try {
            const backgroundBuffer = await this.loadAudio('./assets/relaxing.mp3'); // Replace with a calming audio file
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('./assets/click.mp3'); // Replace with a click sound
            this.clickSound.setBuffer(clickBuffer);
            this.clickSound.setVolume(0.5);
        } catch (error) {
            console.error("Error loading audio:", error);
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
        console.log("🚀 Real Estate Tour loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap features to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the tour. Use W, A, S, D to move, mouse to look, double-click features to focus, click avatar for help.";
        }
        document.body.appendChild(tutorial);

        this.renderer.domElement.addEventListener(this.isMobile ? "touchstart" : "click", (event) => this.onCanvasClick(event));
        if (!this.isMobile) {
            document.addEventListener("keydown", (event) => this.onKeyDown(event));
            document.addEventListener("keyup", (event) => this.onKeyUp(event));
            this.renderer.domElement.addEventListener("click", () => {
                if (!this.isLocked && !this.isFocused) {
                    this.controls.lock();
                    tutorial.style.display = "none";
                }
            });
            document.addEventListener("pointerlockchange", () => {
                this.isLocked = document.pointerLockElement === this.renderer.domElement;
                if (!this.isLocked) this.isFocused = false;
            });
            document.addEventListener("pointerlockerror", () => {
                console.error("Pointer Lock failed");
            });
        } else {
            tutorial.style.display = "none";
        }

        document.getElementById("uploadForm")?.addEventListener("submit", (e) => this.handleUploadSubmit(e));
        document.getElementById("screenshotForm")?.addEventListener("submit", (e) => this.handleScreenshotSubmit(e));
        document.getElementById("downloadBtn")?.addEventListener("click", () => this.handleDownload());
        document.getElementById("zoomSlider")?.addEventListener("input", () => this.handleZoom());
        document.getElementById("toggleControlsBtn")?.addEventListener("click", () => this.toggleControls());
        document.getElementById("prevPage")?.addEventListener("click", () => this.moveToRoom(this.currentRoom - 1));
        document.getElementById("nextPage")?.addEventListener("click", () => this.moveToRoom(this.currentRoom + 1));
        if (!this.isMobile) {
            document.getElementById("sensitivitySlider")?.addEventListener("input", () => {
                const sensitivitySlider = document.getElementById("sensitivitySlider");
                const sensitivityValue = document.getElementById("sensitivityValue");
                const sensitivity = parseFloat(sensitivitySlider.value);
                sensitivityValue.textContent = sensitivity.toFixed(3);
                this.controls.setSensitivity(sensitivity);
            });
        } else {
            const sensitivityGroup = document.querySelector(".slider-group:last-child");
            if (sensitivityGroup) sensitivityGroup.style.display = "none";
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

    onKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case "w": this.keys.w = true; break;
            case "a": this.keys.a = true; break;
            case "s": this.keys.s = true; break;
            case "d": this.keys.d = true; break;
            case "escape": this.controls.unlock(); break;
        }
    }

    onKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case "w": this.keys.w = false; break;
            case "a": this.keys.a = false; break;
            case "s": this.keys.s = false; break;
            case "d": this.keys.d = false; break;
        }
    }

    update() {
        if (!this.isMobile && this.isLocked && !this.isMoving && !this.isFocused) {
            const movement = new THREE.Vector3();
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            direction.y = 0;
            direction.normalize();

            if (this.keys.w) movement.addScaledVector(direction, this.moveSpeed);
            if (this.keys.s) movement.addScaledVector(direction, -this.moveSpeed);
            if (this.keys.a) {
                const left = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
                movement.addScaledVector(left, -this.moveSpeed);
            }
            if (this.keys.d) {
                const right = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
                movement.addScaledVector(right, this.moveSpeed);
            }

            this.controls.getObject().position.add(movement);
            this.checkCollisions();
        }
    }

    checkCollisions() {
        if (!this.isMobile) {
            this.camera.position.y = 2;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - (this.currentRoom === 0 ? 9 : 7);
            const maxX = roomBounds.x + (this.currentRoom === 0 ? 9 : 7);
            const minZ = roomBounds.z - (this.currentRoom === 0 ? 9 : 7);
            const maxZ = roomBounds.z + (this.currentRoom === 0 ? 9 : 7);

            this.camera.position.x = Math.max(minX, Math.min(maxX, this.camera.position.x));
            this.camera.position.z = Math.max(minZ, Math.min(maxZ, this.camera.position.z));
            this.controls.getObject().position.copy(this.camera.position);
        }
    }

    moveToRoom(roomIndex) {
        if (roomIndex < 0 || roomIndex >= this.rooms.length || this.isMoving) return;

        this.isMoving = true;
        const settings = this.roomCameraSettings[roomIndex];
        const targetPos = settings.position.clone();
        const targetLookAt = settings.lookAt.clone();
        const startPos = this.camera.position.clone();
        const startLookAt = this.isMobile ? this.controls.target.clone() : this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(this.camera.position);
        const duration = 1000;
        const startTime = performance.now();

        const animateMove = (time) => {
            const elapsed = time - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easedT = 0.5 - 0.5 * Math.cos(Math.PI * t);
            this.camera.position.lerpVectors(startPos, targetPos, easedT);
            if (this.isMobile) {
                this.controls.target.lerpVectors(startLookAt, targetLookAt, easedT);
            } else {
                this.controls.getObject().position.copy(this.camera.position);
                this.camera.lookAt(targetLookAt);
            }
            this.checkCollisions();

            if (t < 1) {
                requestAnimationFrame(animateMove);
            } else {
                this.currentRoom = roomIndex;
                this.isMoving = false;
                this.isFocused = false;
                this.updateCameraState();
                if (!this.isMobile && this.isLocked) this.controls.lock();
                this.displayExhibits();
            }
        };
        requestAnimationFrame(animateMove);
    }

    async computeImageHash(texture) {
        return new Promise((resolve) => {
            const img = texture.image;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

            let hash = 0;
            for (let i = 0; i < imageData.length; i += 4) {
                hash += imageData[i] + imageData[i + 1] + imageData[i + 2] + imageData[i + 3];
            }
            resolve(hash.toString());
        });
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found property features in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No property features found");
                return;
            }
            this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            await this.displayExhibits();
        } catch (error) {
            console.error("❌ Error fetching property features:", error);
        }
    }

    async displayExhibits() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 8; // Reduced number of features per room
        const seenHashes = new Set();

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.7, metalness: 0.2 }); // Dark frame
        const plaqueMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.2 }); // Dark plaque
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 20 : 15;
        const displayWidth = 3;
        const displayHeight = 2;
        const displayDepth = 0.1;
        const spacing = 1.5;
        const numExhibitsPerWall = Math.floor((wallLength - spacing) / (displayWidth + spacing));
        const maxExhibitsInRoom = Math.min(8, numExhibitsPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 3.5, -wallLength / 2 + 0.1), rot: 0, dir: 'x', isWall: true }, // Back wall
            { basePos: new THREE.Vector3(-wallLength / 2 + 0.1, 3.5, 0), rot: Math.PI / 2, dir: 'z', isWall: true }, // Left wall
            { basePos: new THREE.Vector3(wallLength / 2 - 0.1, 3.5, 0), rot: -Math.PI / 2, dir: 'z', isWall: true }, // Right wall
            { basePos: new THREE.Vector3(0, 3.5, wallLength / 2 - 0.1), rot: 0, dir: 'x', isWall: true } // Front wall
        ];

        const exhibitSurfaces = room.children.filter(child => child.userData?.isExhibitSurface);

        for (let surface of exhibitSurfaces) {
            if (imageIndex >= totalImages || this.exhibits.length >= maxExhibitsInRoom) break;

            let configs = [];
            if (surface.geometry instanceof THREE.PlaneGeometry) {
                const wallIndex = exhibitSurfaces.indexOf(surface) % wallConfigs.length;
                configs = [wallConfigs[wallIndex]];
            }

            for (let wall of configs) {
                if (imageIndex >= totalImages || this.exhibits.length >= maxExhibitsInRoom) break;

                const wallPositions = [];
                for (let i = 0; i < numExhibitsPerWall && imageIndex < totalImages && this.exhibits.length < maxExhibitsInRoom; i++) {
                    const offset = -wallLength / 2 + spacing + i * (displayWidth + spacing) + displayWidth / 2;
                    const pos = wall.basePos.clone();
                    if (wall.dir === 'x') pos.x += offset;
                    else pos.z += offset;
                    wallPositions.push({ pos, rot: wall.rot, isWall: wall.isWall });
                }

                for (let { pos, rot, isWall } of wallPositions) {
                    if (imageIndex >= totalImages) break;

                    const filename = this.imagesToLoad[imageIndex];
                    try {
                        const texture = await this.loadTexture(filename);
                        const hash = await this.computeImageHash(texture);

                        if (seenHashes.has(hash)) {
                            console.warn(`Duplicate property feature detected for ${filename} with hash ${hash}, skipping`);
                            imageIndex++;
                            continue;
                        }
                        seenHashes.add(hash);

                        let mesh, material;
                        if (isWall) {
                            if (texture.image) {
                                material = new THREE.ShaderMaterial({
                                    uniforms: { map: { value: texture }, opacity: { value: 1.0 }, time: { value: 0.0 } },
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
                                        uniform float time;
                                        varying vec2 vUv;
                                        void main() {
                                            vec4 color = texture2D(map, vUv);
                                            if (color.a < 0.5) discard;
                                            gl_FragColor = vec4(color.rgb, color.a * opacity);
                                        }
                                    `,
                                    transparent: true,
                                    side: THREE.DoubleSide
                                });
                            } else {
                                material = fallbackMaterial;
                            }

                            const aspectRatio = texture.image ? texture.image.width / texture.image.height : 1;
                            const adjustedWidth = Math.min(displayHeight * aspectRatio, displayWidth);
                            const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                            mesh = new THREE.Mesh(geometry, material);
                            mesh.position.copy(pos).add(room.position);
                            mesh.rotation.y = rot + (pos.z > 0 ? Math.PI : 0);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;

                            const frameThickness = 0.1;
                            const frameShape = new THREE.Shape();
                            frameShape.moveTo(-adjustedWidth / 2 - frameThickness, -displayHeight / 2 - frameThickness);
                            frameShape.lineTo(adjustedWidth / 2 + frameThickness, -displayHeight / 2 - frameThickness);
                            frameShape.lineTo(adjustedWidth / 2 + frameThickness, displayHeight / 2 + frameThickness);
                            frameShape.lineTo(-adjustedWidth / 2 - frameThickness, displayHeight / 2 + frameThickness);
                            frameShape.lineTo(-adjustedWidth / 2 - frameThickness, -displayHeight / 2 - frameThickness);

                            const hole = new THREE.Path();
                            hole.moveTo(-adjustedWidth / 2, -displayHeight / 2);
                            hole.lineTo(adjustedWidth / 2, -displayHeight / 2);
                            hole.lineTo(adjustedWidth / 2, displayHeight / 2);
                            hole.lineTo(-adjustedWidth / 2, displayHeight / 2);
                            hole.lineTo(-adjustedWidth / 2, -displayHeight / 2);
                            frameShape.holes.push(hole);

                            const extrudeSettings = { depth: frameThickness, bevelEnabled: false };
                            const frameGeometry = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
                            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
                            frame.position.copy(mesh.position);
                            frame.position.z += (rot === 0 && pos.z < 0 ? -displayDepth / 2 : (rot === 0 && pos.z > 0 ? displayDepth / 2 : 0));
                            frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                            frame.rotation.y = mesh.rotation.y;
                            frame.castShadow = true;
                            frame.receiveShadow = true;
                            room.add(frame);
                        } else {
                            // Placeholder for 3D furniture (e.g., sofa, table)
                            const furnitureGeometry = new THREE.BoxGeometry(2, 1, 1); // Simple furniture model
                            mesh = new THREE.Mesh(furnitureGeometry, new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6, metalness: 0.3 }));
                            mesh.position.copy(pos).add(room.position);
                            mesh.position.y = 0.5;
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                        }

                        mesh.userData = { filename, hash, isWall, details: `Room ${this.currentRoom + 1} Feature: ${filename.split('/').pop()} (Size: ${Math.random() * 10 + 10}m²)` };
                        room.add(mesh);
                        this.exhibits.push({ mesh, filename, hash });

                        const spotlight = new THREE.SpotLight(0xffe4b5, 1.5, 10, Math.PI / 6, 0.5);
                        spotlight.position.set(pos.x, isWall ? 5 : 2, pos.z).add(room.position);
                        spotlight.target = mesh;
                        spotlight.castShadow = true;
                        spotlight.shadow.mapSize.width = 1024;
                        spotlight.shadow.mapSize.height = 1024;
                        spotlight.shadow.bias = -0.0001;
                        room.add(spotlight);

                        const plaqueGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.1);
                        const plaque = new THREE.Mesh(plaqueGeometry, plaqueMaterial);
                        plaque.position.copy(mesh.position);
                        plaque.position.y -= isWall ? displayHeight / 2 + 0.4 : 0.8;
                        plaque.rotation.y = mesh.rotation.y;
                        plaque.castShadow = true;
                        plaque.receiveShadow = true;
                        room.add(plaque);

                        imageIndex++;
                    } catch (error) {
                        console.error(`Error loading property feature ${filename}:`, error);
                        imageIndex++;
                    }
                }
            }
        }
        console.log(`🏡 Property features rendered in room ${this.currentRoom}:`, this.exhibits.length, "Unique hashes:", seenHashes.size);
    }

    clearScene() {
        this.exhibits.forEach(ex => {
            ex.mesh.parent.remove(ex.mesh);
            ex.mesh.geometry.dispose();
            if (ex.mesh.material.map) ex.mesh.material.map.dispose();
            ex.mesh.material.dispose();
        });
        this.exhibits = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x2f2f2f || child.material?.color?.getHex() === 0x4a4a4a)
            );
            toRemove.forEach(child => room.remove(child));
        });
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy() || 1;
                    resolve(texture);
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    onCanvasClick(event) {
        const currentTime = new Date().getTime();
        const timeSinceLastClick = currentTime - this.lastClickTime;

        if (timeSinceLastClick < this.clickDelay) {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects([...this.exhibits.map(ex => ex.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked property feature: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusExhibit(obj);
                    this.showPropertyDetails(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusExhibit(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 2;
            const distance = mesh.userData.isWall ? 2 : 3;
            const direction = new THREE.Vector3();
            direction.subVectors(this.camera.position, targetPos).normalize();
            targetPos.add(direction.multiplyScalar(-distance));

            const startPos = this.camera.position.clone();
            const startTarget = this.controls.target.clone();
            const duration = 500;
            const startTime = performance.now();

            const animateFocus = (time) => {
                const elapsed = time - startTime;
                const t = Math.min(elapsed / duration, 1);
                this.camera.position.lerpVectors(startPos, targetPos, t);
                this.controls.target.lerpVectors(startTarget, mesh.position, t);
                this.controls.update();

                if (t < 1) requestAnimationFrame(animateFocus);
            };
            requestAnimationFrame(animateFocus);
        } else {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(mesh.userData.isWall ? 2 : 3));
            targetPos.y = 2;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - (this.currentRoom === 0 ? 9 : 7) + 1;
            const maxX = roomBounds.x + (this.currentRoom === 0 ? 9 : 7) - 1;
            const minZ = roomBounds.z - (this.currentRoom === 0 ? 9 : 7) + 1;
            const maxZ = roomBounds.z + (this.currentRoom === 0 ? 9 : 7) - 1;

            targetPos.x = Math.max(minX, Math.min(maxX, targetPos.x));
            targetPos.z = Math.max(minZ, Math.min(maxZ, targetPos.z));

            const startPos = this.camera.position.clone();
            const duration = 500;
            const startTime = performance.now();

            const animateFocus = (time) => {
                const elapsed = time - startTime;
                const t = Math.min(elapsed / duration, 1);
                this.camera.position.lerpVectors(startPos, targetPos, t);
                this.controls.getObject().position.copy(this.camera.position);
                this.camera.lookAt(mesh.position);
                this.checkCollisions();

                if (t < 1) requestAnimationFrame(animateFocus);
            };
            requestAnimationFrame(animateFocus);
        }
    }

    resetCamera() {
        if (!this.isFocused) return;

        const startPos = this.camera.position.clone();
        const targetPos = this.previousCameraState.position.clone();
        const duration = 500;
        const startTime = performance.now();

        if (this.isMobile) {
            const startTarget = this.controls.target.clone();
            const targetTarget = this.previousCameraState.target.clone();

            const animateReset = (time) => {
                const elapsed = time - startTime;
                const t = Math.min(elapsed / duration, 1);
                const easedT = 0.5 - 0.5 * Math.cos(Math.PI * t);
                this.camera.position.lerpVectors(startPos, targetPos, easedT);
                this.controls.target.lerpVectors(startTarget, targetTarget, easedT);
                this.controls.update();

                if (t < 1) requestAnimationFrame(animateReset);
                else this.isFocused = false;
            };
            requestAnimationFrame(animateReset);
        } else {
            const animateReset = (time) => {
                const elapsed = time - startTime;
                const t = Math.min(elapsed / duration, 1);
                const easedT = 0.5 - 0.5 * Math.cos(Math.PI * t);
                this.camera.position.lerpVectors(startPos, targetPos, easedT);
                this.controls.getObject().position.copy(this.camera.position);
                this.checkCollisions();

                if (t < 1) requestAnimationFrame(animateReset);
                else {
                    this.isFocused = false;
                    if (!this.isMoving) this.controls.lock();
                }
            };
            requestAnimationFrame(animateReset);
        }
    }

    updateCameraState() {
        this.previousCameraState = {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone(),
            target: this.isMobile ? this.controls.target.clone() : this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(this.camera.position)
        };
    }

    handleDownload() {
        const imgData = this.renderer.domElement.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "property_tour.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 20 / zoomLevel;
            this.controls.update();
        } else {
            this.moveSpeed = zoomLevel / 10;
            this.camera.fov = 75 / (zoomLevel * 0.5 + 0.5);
            this.camera.updateProjectionMatrix();
        }
    }

    async handleScreenshotSubmit(event) {
        event.preventDefault();
        const url = document.getElementById("url")?.value;
        if (!url) return;

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
                this.loadImages(this.sessionId);
            }
        } catch (error) {
            console.error("Error capturing screenshot:", error);
        }
    }

    async handleUploadSubmit(event) {
        event.preventDefault();
        const fileInput = document.getElementById("images");
        if (!fileInput?.files?.length) return;

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append("images", file);
        }

        try {
            const response = await fetch(`http://localhost:3000/api/upload${this.sessionId ? `/${this.sessionId}` : ''}`, {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                this.sessionId = result.sessionId;
                localStorage.setItem('sessionId', this.sessionId);
                this.loadImages(this.sessionId);
            }
        } catch (error) {
            console.error("Error uploading files:", error);
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    showPropertyDetails(mesh) {
        const details = document.createElement("div");
        details.id = "propertyDetails";
        details.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center; max-width:300px;";
        details.innerHTML = `
            <h3>Property Feature</h3>
            <p>${mesh.userData.details}</p>
            <button id="closeDetails" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
        `;
        document.body.appendChild(details);

        document.getElementById("closeDetails").addEventListener("click", () => {
            document.body.removeChild(details);
        });
    }

    showAvatarInstructions() {
        const instructions = document.createElement("div");
        instructions.id = "avatarInstructions";
        instructions.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            instructions.innerHTML = `
                <h3>Tour Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap a feature to focus and view details, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Tour Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click a feature to focus and view details, double-click again to reset.</p>
                <p>Click Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        }
        document.body.appendChild(instructions);

        document.getElementById("closeInstructions").addEventListener("click", () => {
            document.body.removeChild(instructions);
        });
    }
}

const app = new ThreeJSApp();
app.init();