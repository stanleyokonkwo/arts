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
            { position: new THREE.Vector3(0, 2, 15), lookAt: new THREE.Vector3(0, 2, 0) },
            { position: new THREE.Vector3(30, 2, 15), lookAt: new THREE.Vector3(30, 2, 0) }
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
        this.createMuseum();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Reduced intensity
        this.scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(0, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.bias = -0.0001;
        this.scene.add(directionalLight);
    }
    
    createMuseum() {
        // Materials
        const floorTileMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4d4d4,
            roughness: 0.3,
            metalness: 0.1,
            map: this.generateMarbleTileTexture(512, 512)
        });
    
        const floorBorderMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.5,
            metalness: 0.2
        });
    
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            roughness: 0.2,
            metalness: 0
        });
    
        const cofferMaterial = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.4,
            metalness: 0.1
        });
    
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.4,
            metalness: 0,
            side: THREE.DoubleSide // Ensure rendering on both sides
        });
    
        const columnMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0e0e0,
            roughness: 0.5,
            metalness: 0.2
        });
    
        // Room 1: Grand Hall
        const room1 = new THREE.Group();
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorTileMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.receiveShadow = true;
        room1.add(floor1);
    
        const borderGeometry = new THREE.BoxGeometry(30, 0.2, 1);
        const borderTop = new THREE.Mesh(borderGeometry, floorBorderMaterial);
        borderTop.position.set(0, 0.1, 14.5);
        borderTop.receiveShadow = true;
        room1.add(borderTop);
        const borderBottom = borderTop.clone();
        borderBottom.position.z = -14.5;
        room1.add(borderBottom);
        const borderLeft = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 30), floorBorderMaterial);
        borderLeft.position.set(-14.5, 0.1, 0);
        borderLeft.receiveShadow = true;
        room1.add(borderLeft);
        const borderRight = borderLeft.clone();
        borderRight.position.x = 14.5;
        room1.add(borderRight);
    
        const ceiling1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), ceilingMaterial);
        ceiling1.position.y = 10;
        ceiling1.rotation.x = Math.PI / 2;
        ceiling1.receiveShadow = true;
        room1.add(ceiling1);
    
        const cofferGeometry = new THREE.BoxGeometry(4, 0.5, 4);
        for (let x = -12; x <= 12; x += 6) {
            for (let z = -12; z <= 12; z += 6) {
                const coffer = new THREE.Mesh(cofferGeometry, cofferMaterial);
                coffer.position.set(x, 9.75, z);
                coffer.receiveShadow = true;
                room1.add(coffer);
            }
        }
    
        const ceilingLight1 = new THREE.RectAreaLight(0xf0f0f0, 0.5, 28, 28); // Reduced intensity
        ceilingLight1.position.set(0, 9.5, 0); // Adjusted position
        ceilingLight1.rotation.x = Math.PI;
        room1.add(ceilingLight1);
    
        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMaterial)
        ];
        walls1[0].position.set(0, 5, -15);
        walls1[1].position.set(0, 5, 15);
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-15, 5, 0);
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(15, 5, 0);
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach(wall => {
            console.log("Wall material color:", wall.material.color.getHexString());
            wall.receiveShadow = true;
            room1.add(wall);
        });
    
        const columnGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
        for (let x = -10; x <= 10; x += 10) {
            for (let z = -10; z <= 10; z += 10) {
                if (x === 0 && z === 0) continue;
                const column = new THREE.Mesh(columnGeometry, columnMaterial);
                column.position.set(x, 5, z);
                column.castShadow = true;
                column.receiveShadow = true;
                room1.add(column);
            }
        }
    
        // Room 2: Artifact Room
        const room2 = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorTileMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        room2.add(floor2);
    
        const borderGeometry2 = new THREE.BoxGeometry(20, 0.2, 1);
        const borderTop2 = new THREE.Mesh(borderGeometry2, floorBorderMaterial);
        borderTop2.position.set(0, 0.1, 9.5);
        borderTop2.receiveShadow = true;
        room2.add(borderTop2);
        const borderBottom2 = borderTop2.clone();
        borderBottom2.position.z = -9.5;
        room2.add(borderBottom2);
        const borderLeft2 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 20), floorBorderMaterial);
        borderLeft2.position.set(-9.5, 0.1, 0);
        borderLeft2.receiveShadow = true;
        room2.add(borderLeft2);
        const borderRight2 = borderLeft2.clone();
        borderRight2.position.x = 9.5;
        room2.add(borderRight2);
    
        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilingMaterial);
        ceiling2.position.y = 8;
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        room2.add(ceiling2);
    
        const cofferGeometry2 = new THREE.BoxGeometry(3, 0.4, 3);
        for (let x = -8; x <= 8; x += 4) {
            for (let z = -8; z <= 8; z += 4) {
                const coffer = new THREE.Mesh(cofferGeometry2, cofferMaterial);
                coffer.position.set(x, 7.8, z);
                coffer.receiveShadow = true;
                room2.add(coffer);
            }
        }
    
        const ceilingLight2 = new THREE.RectAreaLight(0xffffff, 3, 18, 18);
        ceilingLight2.position.set(0, 7.9, 0);
        ceilingLight2.rotation.x = Math.PI;
        room2.add(ceilingLight2);
    
        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial)
        ];
        walls2[0].position.set(0, 4, -10);
        walls2[1].position.set(0, 4, 10);
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-10, 4, 0);
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(10, 4, 0);
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            console.log("Wall material color:", wall.material.color.getHexString());
            wall.receiveShadow = true;
            room2.add(wall);
        });
    
        const door2 = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 7),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
        );
        door2.position.set(-9.9, 3.5, 0);
        door2.rotation.y = Math.PI / 2;
        door2.userData = { nextRoom: 0 };
        room2.add(door2);
    
        room1.position.set(0, 0, 0);
        room2.position.set(30, 0, 0);
        this.rooms.push(room1, room2);
        this.rooms.forEach(room => this.scene.add(room));
    }

    generateMarbleTileTexture(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const tileSize = 64;
                const isBorder = (x % tileSize < 2 || x % tileSize > tileSize - 3) || (y % tileSize < 2 || y % tileSize > tileSize - 3);
                const noise = Math.random() * 0.05;
                if (isBorder) {
                    imageData.data[i] = 139 * (1 + noise);     // Darker brown for borders
                    imageData.data[i + 1] = 69 * (1 + noise);
                    imageData.data[i + 2] = 19 * (1 + noise);
                } else {
                    imageData.data[i] = 212 * (1 + noise);     // Light marble
                    imageData.data[i + 1] = 212 * (1 + noise);
                    imageData.data[i + 2] = 212 * (1 + noise);
                }
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
            const backgroundBuffer = await this.loadAudio('./assets/sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('./assets/sweet.mp3');
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
        console.log("🚀 Virtual Museum loaded");
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
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap exhibits to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the museum. Use W, A, S, D to move, mouse to look, double-click exhibits to focus, click avatar for help.";
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
            const minX = roomBounds.x - 14;
            const maxX = roomBounds.x + 14;
            const minZ = roomBounds.z - 14;
            const maxZ = roomBounds.z + 14;

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
            console.log("📸 Found exhibits in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No exhibits found");
                return;
            }
            this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            await this.displayExhibits();
        } catch (error) {
            console.error("❌ Error fetching exhibits:", error);
        }
    }

    async displayExhibits() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 12;
        const seenHashes = new Set();

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.2 });
        const artifactMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6, metalness: 0.3 });
        const plaqueMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.2 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 30 : 20;
        const displayWidth = 4;
        const displayHeight = 3;
        const displayDepth = 0.1;
        const spacing = 2;
        const numExhibitsPerWall = Math.floor((wallLength - spacing) / (displayWidth + spacing));
        const maxExhibitsInRoom = Math.min(12, numExhibitsPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 3.5, -wallLength / 2 + 0.1), rot: 0, dir: 'x', isWall: true },           // Back wall
            { basePos: new THREE.Vector3(-wallLength / 2 + 0.1, 3.5, 0), rot: Math.PI / 2, dir: 'z', isWall: true }, // Left wall
            { basePos: new THREE.Vector3(wallLength / 2 - 0.1, 3.5, 0), rot: -Math.PI / 2, dir: 'z', isWall: true },  // Right wall
            { basePos: new THREE.Vector3(0, 3.5, wallLength / 2 - 0.1), rot: 0, dir: 'x', isWall: true },            // Front wall (fixed rotation)
            { basePos: new THREE.Vector3(0, 0.5, 0), rot: 0, dir: 'x', isWall: false }                                // Floor exhibits
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.exhibits.length >= maxExhibitsInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numExhibitsPerWall && imageIndex < totalImages && this.exhibits.length < maxExhibitsInRoom; i++) {
                const offset = -wallLength / 2 + spacing + i * (displayWidth + spacing) + displayWidth / 2;
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                if (!wall.isWall) pos.z += offset / 2;
                wallPositions.push({ pos, rot: wall.rot, isWall: wall.isWall });
            }

            for (let { pos, rot, isWall } of wallPositions) {
                if (imageIndex >= totalImages) break;

                const filename = this.imagesToLoad[imageIndex];
                try {
                    const texture = await this.loadTexture(filename);
                    const hash = await this.computeImageHash(texture);

                    if (seenHashes.has(hash)) {
                        console.warn(`Duplicate exhibit content detected for ${filename} with hash ${hash}, skipping`);
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
                        mesh.rotation.y = rot + (pos.z > 0 ? Math.PI : 0); // Adjust rotation for front wall
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;

                        const frameThickness = 0.15;
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
                        const artifactGeometry = new THREE.DodecahedronGeometry(1, 0);
                        mesh = new THREE.Mesh(artifactGeometry, artifactMaterial);
                        mesh.position.copy(pos).add(room.position);
                        mesh.position.y = 1.5;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                    }

                    mesh.userData = { filename, hash, isWall };
                    room.add(mesh);
                    this.exhibits.push({ mesh, filename, hash });

                    const spotlight = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 6, 0.5);
                    spotlight.position.set(pos.x, isWall ? (room === this.rooms[0] ? 9 : 7) : 5, pos.z).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    const plaqueGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.1);
                    const plaque = new THREE.Mesh(plaqueGeometry, plaqueMaterial);
                    plaque.position.copy(mesh.position);
                    plaque.position.y -= isWall ? displayHeight / 2 + 0.4 : 1.2;
                    plaque.rotation.y = mesh.rotation.y;
                    plaque.castShadow = true;
                    plaque.receiveShadow = true;
                    room.add(plaque);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading exhibit ${filename}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🏛️ Exhibits rendered in room ${this.currentRoom}:`, this.exhibits.length, "Unique hashes:", seenHashes.size);
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
                (child.material?.color?.getHex() === 0x1a1a1a || child.material?.color?.getHex() === 0x333333 || child.material?.color?.getHex() === 0x8b4513)
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
                    console.log(`Clicked exhibit: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusExhibit(obj);
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
            const minX = roomBounds.x - 14 + 1;
            const maxX = roomBounds.x + 14 - 1;
            const minZ = roomBounds.z - 14 + 1;
            const maxZ = roomBounds.z + 14 - 1;

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
        link.download = "museum_view.png";
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

    showAvatarInstructions() {
        const instructions = document.createElement("div");
        instructions.id = "avatarInstructions";
        instructions.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            instructions.innerHTML = `
                <h3>Museum Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an exhibit to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Museum Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an exhibit to focus, double-click again to reset.</p>
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