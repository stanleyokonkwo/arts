
        import * as THREE from "three";
        import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

        class ThreeJSApp {
            constructor() {
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                this.camera.position.set(0, 1.6, 5);

                this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
                this.renderer.setClearColor(0x000000, 0.2);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                document.body.appendChild(this.renderer.domElement);

                this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.enableZoom = true;
                this.controls.minDistance = 0.1;
                this.controls.maxDistance = 10;
                this.controls.enablePan = false;
                this.controls.screenSpacePanning = false;
                this.controls.maxPolarAngle = Math.PI / 2;

                this.images = [];
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

                this.addLighting();
                this.createGallery();
                this.setupAudio();
                this.setupMovementControls();
            }

            addLighting() {
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                this.scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(0, 10, 10);
                directionalLight.castShadow = true;
                this.scene.add(directionalLight);
            }

            createGallery() {
                const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xeeeeee });
                const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, transparent: true, opacity: 0.8 });

                const room1 = new THREE.Group();
                const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMaterial);
                floor1.rotation.x = -Math.PI / 2;
                room1.add(floor1);

                const walls1 = [
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial),
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial),
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial),
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial)
                ];
                walls1[0].position.set(0, 2.5, -5);
                walls1[1].position.set(0, 2.5, 5);
                walls1[1].rotation.y = Math.PI;
                walls1[2].position.set(-5, 2.5, 0);
                walls1[2].rotation.y = Math.PI / 2;
                walls1[3].position.set(5, 2.5, 0);
                walls1[3].rotation.y = -Math.PI / 2;

                const door1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), doorMaterial);
                door1.position.set(5, 2, 0);
                door1.rotation.y = -Math.PI / 2;
                door1.userData = { nextRoom: 1 };
                room1.add(door1);

                walls1.forEach(wall => room1.add(wall));
                room1.position.set(0, 0, 0);
                this.rooms.push(room1);

                const room2 = new THREE.Group();
                const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMaterial);
                floor2.rotation.x = -Math.PI / 2;
                room2.add(floor2);

                const walls2 = [
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial),
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial),
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial),
                    new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial)
                ];
                walls2[0].position.set(0, 2.5, -5);
                walls2[1].position.set(0, 2.5, 5);
                walls2[1].rotation.y = Math.PI;
                walls2[2].position.set(-5, 2.5, 0);
                walls2[2].rotation.y = Math.PI / 2;
                walls2[3].position.set(5, 2.5, 0);
                walls2[3].rotation.y = -Math.PI / 2;

                const door2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), doorMaterial);
                door2.position.set(-5, 2, 0);
                door2.rotation.y = Math.PI / 2;
                door2.userData = { nextRoom: 0 };
                room2.add(door2);

                walls2.forEach(wall => room2.add(wall));
                room2.position.set(15, 0, 0);
                this.rooms.push(room2);

                this.rooms.forEach(room => this.scene.add(room));
            }

            setupAudio() {
                this.backgroundAudio.setBuffer(this.loadAudio('path/to/ambient-gallery.mp3'));
                this.backgroundAudio.setLoop(true);
                this.backgroundAudio.setVolume(0.3);
                this.backgroundAudio.play();

                this.clickSound.setBuffer(this.loadAudio('path/to/click-sound.mp3'));
                this.clickSound.setVolume(0.5);
            }

            loadAudio(url) {
                const audioLoader = new THREE.AudioLoader();
                let buffer;
                audioLoader.load(url, (audioBuffer) => buffer = audioBuffer);
                return buffer;
            }

            init() {
                console.log("🚀 Virtual Gallery loaded");
                this.setupEventListeners();
                if (this.sessionId) this.loadImages(this.sessionId);
                this.animate();
                window.addEventListener("resize", () => this.handleResize());
            }

            animate() {
                requestAnimationFrame(() => this.animate());
                this.controls.update();
                this.renderer.render(this.scene, this.camera);
            }

            setupEventListeners() {
                this.renderer.domElement.addEventListener("click", (event) => this.onCanvasClick(event));
                document.getElementById("uploadForm")?.addEventListener("submit", (e) => this.handleUploadSubmit(e));
                document.getElementById("screenshotForm")?.addEventListener("submit", (e) => this.handleScreenshotSubmit(e));
                document.getElementById("downloadBtn")?.addEventListener("click", () => this.handleDownload());
                document.getElementById("zoomSlider")?.addEventListener("input", () => this.handleZoom());
                document.getElementById("toggleControlsBtn")?.addEventListener("click", () => this.toggleControls());
                document.getElementById("prevPage")?.addEventListener("click", () => this.moveToRoom(this.currentRoom - 1));
                document.getElementById("nextPage")?.addEventListener("click", () => this.moveToRoom(this.currentRoom + 1));
            }

            toggleControls() {
                const controlPanels = document.querySelectorAll(".control-panel");
                const toggleButton = document.getElementById("toggleControlsBtn");
                controlPanels.forEach(panel => panel.classList.toggle("hidden-panel"));
                toggleButton.textContent = toggleButton.textContent === "Hide Controls" ? "Show Controls" : "Hide Controls";
            }

            setupMovementControls() {
                const moveSpeed = 0.1;
                const keys = { w: false, a: false, s: false, d: false };

                document.addEventListener("keydown", (event) => {
                    switch (event.key.toLowerCase()) {
                        case "w": keys.w = true; break;
                        case "a": keys.a = true; break;
                        case "s": keys.s = true; break;
                        case "d": keys.d = true; break;
                    }
                });

                document.addEventListener("keyup", (event) => {
                    switch (event.key.toLowerCase()) {
                        case "w": keys.w = false; break;
                        case "a": keys.a = false; break;
                        case "s": keys.s = false; break;
                        case "d": keys.d = false; break;
                    }
                });

                const updatePosition = () => {
                    if (this.isMoving) return;

                    const direction = new THREE.Vector3();
                    this.camera.getWorldDirection(direction);
                    direction.y = 0;
                    direction.normalize();

                    if (keys.w) this.camera.position.addScaledVector(direction, moveSpeed);
                    if (keys.s) this.camera.position.addScaledVector(direction, -moveSpeed);
                    if (keys.a) {
                        const left = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
                        this.camera.position.addScaledVector(left, -moveSpeed);
                    }
                    if (keys.d) {
                        const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
                        this.camera.position.addScaledVector(right, moveSpeed);
                    }

                    this.checkCollisions();
                    requestAnimationFrame(updatePosition);
                };
                updatePosition();
            }

            checkCollisions() {
                this.camera.position.y = 1.6;
                const roomBounds = this.rooms[this.currentRoom].position;
                const minX = roomBounds.x - 4.5;
                const maxX = roomBounds.x + 4.5;
                const minZ = roomBounds.z - 4.5;
                const maxZ = roomBounds.z + 4.5;

                this.camera.position.x = Math.max(minX, Math.min(maxX, this.camera.position.x));
                this.camera.position.z = Math.max(minZ, Math.min(maxZ, this.camera.position.z));
            }

            moveToRoom(roomIndex) {
                if (roomIndex < 0 || roomIndex >= this.rooms.length || this.isMoving) return;

                this.isMoving = true;
                const targetPos = this.rooms[roomIndex].position.clone().add(new THREE.Vector3(0, 1.6, 0));
                const startPos = this.camera.position.clone();
                const duration = 1000;
                const startTime = performance.now();

                const animateMove = (time) => {
                    const elapsed = time - startTime;
                    const t = Math.min(elapsed / duration, 1);
                    this.camera.position.lerpVectors(startPos, targetPos, t);

                    if (t < 1) {
                        requestAnimationFrame(animateMove);
                    } else {
                        this.currentRoom = roomIndex;
                        this.isMoving = false;
                    }
                };
                requestAnimationFrame(animateMove);
            }

            async loadImages(sessionId) {
                try {
                    const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json();
                    if (!data.screenshots?.length) {
                        console.log("No screenshots found");
                        return;
                    }

                    this.imagesToLoad = data.screenshots;
                    this.displayImagesInGallery();
                } catch (error) {
                    console.error("❌ Error fetching images:", error);
                }
            }

            async displayImagesInGallery() {
                if (!this.imagesToLoad) return;

                this.clearScene();
                const totalImages = this.imagesToLoad.length;
                let imageIndex = 0;

                for (let room of this.rooms) {
                    const wallPositions = [
                        { pos: new THREE.Vector3(-3, 2, -4.9), rot: 0 },
                        { pos: new THREE.Vector3(3, 2, -4.9), rot: 0 },
                        { pos: new THREE.Vector3(-4.9, 2, -2), rot: Math.PI / 2 },
                        { pos: new THREE.Vector3(-4.9, 2, 2), rot: Math.PI / 2 },
                        { pos: new THREE.Vector3(4.9, 2, -2), rot: -Math.PI / 2 },
                        { pos: new THREE.Vector3(4.9, 2, 2), rot: -Math.PI / 2 }
                    ];

                    for (let wall of wallPositions) {
                        if (imageIndex >= totalImages) break;

                        const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                        const aspectRatio = texture.image.width / texture.image.height;
                        const planeHeight = 2;
                        const planeWidth = Math.min(planeHeight * aspectRatio, 3);

                        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
                        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                        const mesh = new THREE.Mesh(geometry, material);

                        mesh.position.copy(wall.pos).add(room.position);
                        mesh.rotation.y = wall.rot;
                        mesh.userData = { filename: this.imagesToLoad[imageIndex] };

                        room.add(mesh);
                        this.images.push({ mesh, filename: this.imagesToLoad[imageIndex] });
                        imageIndex++;
                    }
                    if (imageIndex >= totalImages) break;
                }
            }

            clearScene() {
                this.images.forEach(img => {
                    img.mesh.parent.remove(img.mesh);
                    img.mesh.geometry.dispose();
                    img.mesh.material.dispose();
                });
                this.images = [];
            }

            loadTexture(filename) {
                return new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        filename,
                        (texture) => {
                            texture.minFilter = THREE.LinearFilter;
                            texture.magFilter = THREE.LinearFilter;
                            resolve(texture);
                        },
                        undefined,
                        (err) => reject(err)
                    );
                });
            }

            onCanvasClick(event) {
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined)]);

                if (intersects.length > 0) {
                    const obj = intersects[0].object;
                    if (obj.userData.nextRoom !== undefined) {
                        this.moveToRoom(obj.userData.nextRoom);
                    } else if (obj.userData.filename) {
                        console.log(`Clicked image: ${obj.userData.filename}`);
                        if (!this.clickSound.isPlaying) this.clickSound.play();
                        this.focusImage(obj);
                    }
                }
            }

            focusImage(mesh) {
                const targetPos = mesh.position.clone().sub(this.camera.getWorldDirection().multiplyScalar(2));
                targetPos.y = 1.6;
                const startPos = this.camera.position.clone();
                const duration = 500;
                const startTime = performance.now();

                const animateFocus = (time) => {
                    const elapsed = time - startTime;
                    const t = Math.min(elapsed / duration, 1);
                    this.camera.position.lerpVectors(startPos, targetPos, t);
                    this.camera.lookAt(mesh.position);

                    if (t < 1) requestAnimationFrame(animateFocus);
                };
                requestAnimationFrame(animateFocus);
            }

            handleDownload() {
                const imgData = this.renderer.domElement.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = imgData;
                link.download = "gallery_view.png";
                link.click();
            }

            handleZoom() {
                const zoomSlider = document.getElementById("zoomSlider");
                const zoomValue = document.getElementById("zoomValue");
                const zoomLevel = parseFloat(zoomSlider.value);
                zoomValue.textContent = zoomLevel.toFixed(1);
                this.controls.maxDistance = zoomLevel;
                this.controls.update();
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
        }

        const app = new ThreeJSApp();
        app.init();
    



#MODERN INTERIOR 

import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
            { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) },
            { position: new THREE.Vector3(18, 1.6, 5), lookAt: new THREE.Vector3(18, 1.6, 0) }
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 10;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
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
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xfff5e1, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xfff5e1, 0.5);
        directionalLight.position.set(0, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.bias = -0.0001;
        this.scene.add(directionalLight);
    }

    createGallery() {
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.4,
            metalness: concreteMetalness,
            map: new THREE.Texture(this.generateNoiseCanvas(256, 256)),
            normalMap: new THREE.Texture(this.generateNoiseCanvas(256, 256)),
            normalScale: new THREE.Vector2(0.05, 0.05)
        });

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0
        });

        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xaab8c2,
            transparent: true,
            opacity: 0.85,
            roughness: 0.1,
            metalness: 0.2,
            transmission: 0.9,
            thickness: 0.05,
            envMapIntensity: 1.5,
            clearcoat: 0.3,
            clearcoatRoughness: 0.1
        });

        const windowFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.7,
            metalness: 0.2
        });

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xe5e5e5,
            roughness: 0.3
        });

        const accentWallMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.1
        });

        const modernFurnitureMaterial = new THREE.MeshStandardMaterial({
            color: 0x3c2f2f,
            roughness: 0.6,
            metalness: 0
        });

        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.3,
            metalness: 0.8
        });

        // Room 1: Main Gallery Space
        const room1 = new THREE.Group();
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.receiveShadow = true;
        room1.add(floor1);

        const ceiling1 = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), ceilingMaterial);
        ceiling1.position.y = 6;
        ceiling1.rotation.x = Math.PI / 2;
        ceiling1.receiveShadow = true;
        room1.add(ceiling1);

        const ceilingLight = new THREE.RectAreaLight(0xfff5e1, 5, 16, 16);
        ceilingLight.position.set(0, 5.9, 0);
        ceilingLight.rotation.x = Math.PI;
        room1.add(ceilingLight);

        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(18, 6), accentWallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(18, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(18, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(18, 6), wallMaterial)
        ];
        walls1[0].position.set(0, 3, -9);
        walls1[1].position.set(0, 3, 9);
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-9, 3, 0);
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(9, 3, 0);
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach(wall => {
            wall.receiveShadow = true;
            room1.add(wall);
        });

        const windowWidth = 10;
        const windowHeight = 5.8;
        const windowFrameThickness = 0.05;
        const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHeight), glassMaterial);
        windowGlass.position.set(0, 3, -8.9);
        room1.add(windowGlass);

        const frameGeometryTopBottom = new THREE.BoxGeometry(windowWidth + windowFrameThickness * 2, windowFrameThickness, windowFrameThickness);
        const frameGeometrySides = new THREE.BoxGeometry(windowFrameThickness, windowHeight, windowFrameThickness);
        const frameTop = new THREE.Mesh(frameGeometryTopBottom, windowFrameMaterial);
        frameTop.position.set(0, 3 + windowHeight / 2, -8.9);
        room1.add(frameTop);
        const frameBottom = new THREE.Mesh(frameGeometryTopBottom, windowFrameMaterial);
        frameBottom.position.set(0, 3 - windowHeight / 2, -8.9);
        room1.add(frameBottom);
        const frameLeft = new THREE.Mesh(frameGeometrySides, windowFrameMaterial);
        frameLeft.position.set(-windowWidth / 2, 3, -8.9);
        room1.add(frameLeft);
        const frameRight = new THREE.Mesh(frameGeometrySides, windowFrameMaterial);
        frameRight.position.set(windowWidth / 2, 3, -8.9);
        room1.add(frameRight);

        const windowSpotLight = new THREE.SpotLight(0xfff5e1, 2.5, 10, Math.PI / 6, 0.8);
        windowSpotLight.position.set(0, 5.8, -8);
        windowSpotLight.target.position.set(0, 3, -8.9);
        windowSpotLight.castShadow = true;
        room1.add(windowSpotLight);
        room1.add(windowSpotLight.target);

        // Modern Furniture: Sleek Sofa
        const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.2), modernFurnitureMaterial);
        sofaSeat.position.set(0, 0.2, 4);
        sofaSeat.castShadow = true;
        sofaSeat.receiveShadow = true;
        room1.add(sofaSeat);

        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.2), modernFurnitureMaterial);
        sofaBack.position.set(0, 0.6, 4.5);
        sofaBack.castShadow = true;
        sofaBack.receiveShadow = true;
        room1.add(sofaBack);

        const sofaLegs = [];
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16), metalMaterial);
            leg.position.set(
                (i % 2 === 0 ? -1.4 : 1.4),
                0.2,
                (i < 2 ? 3.5 : 4.5)
            );
            leg.castShadow = true;
            leg.receiveShadow = true;
            room1.add(leg);
            sofaLegs.push(leg);
        }

        // Modern Coffee Table
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), modernFurnitureMaterial);
        tableTop.position.set(0, 0.5, 2);
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        room1.add(tableTop);

        const tableLegs = [];
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), metalMaterial);
            leg.position.set(
                (i % 2 === 0 ? -0.9 : 0.9),
                0.25,
                (i < 2 ? 1.5 : 2.5)
            );
            leg.castShadow = true;
            leg.receiveShadow = true;
            room1.add(leg);
            tableLegs.push(leg);
        }

        room1.position.set(0, 0, 0);
        this.rooms.push(room1);

        // Room 2: Secondary Space
        const room2 = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        room2.add(floor2);

        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), ceilingMaterial);
        ceiling2.position.y = 5;
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        room2.add(ceiling2);

        const ceilingLight2 = new THREE.RectAreaLight(0xfff5e1, 4, 12, 12);
        ceilingLight2.position.set(0, 4.9, 0);
        ceilingLight2.rotation.x = Math.PI;
        room2.add(ceilingLight2);

        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(14, 5), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(14, 5), accentWallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(14, 5), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(14, 5), wallMaterial)
        ];
        walls2[0].position.set(0, 2.5, -7);
        walls2[1].position.set(0, 2.5, 7);
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-7, 2.5, 0);
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(7, 2.5, 0);
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            room2.add(wall);
        });

        const door2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.5), glassMaterial);
        door2.position.set(-6.9, 2.25, 0);
        door2.rotation.y = Math.PI / 2;
        door2.userData = { nextRoom: 0 };
        room2.add(door2);

        // Modern Chair
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), modernFurnitureMaterial);
        chairSeat.position.set(0, 0.5, 0);
        chairSeat.castShadow = true;
        chairSeat.receiveShadow = true;
        room2.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.1), modernFurnitureMaterial);
        chairBack.position.set(0, 0.9, 0.45);
        chairBack.castShadow = true;
        chairBack.receiveShadow = true;
        room2.add(chairBack);

        const chairLegs = [];
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), metalMaterial);
            leg.position.set(
                (i % 2 === 0 ? -0.45 : 0.45),
                0.25,
                (i < 2 ? -0.45 : 0.45)
            );
            leg.castShadow = true;
            leg.receiveShadow = true;
            room2.add(leg);
            chairLegs.push(leg);
        }

        room2.position.set(18, 0, 0);
        this.rooms.push(room2);

        this.rooms.forEach(room => this.scene.add(room));
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
        console.log("🚀 Virtual Gallery loaded");
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
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 8;
            const maxX = roomBounds.x + 8;
            const minZ = roomBounds.z - 8;
            const maxZ = roomBounds.z + 8;

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
            }
        };
        requestAnimationFrame(animateMove);
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                return;
            }
            this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = 0;

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.2 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        for (let room of this.rooms) {
            const wallLength = room === this.rooms[0] ? 18 : 14;
            const displayWidth = 3;
            const displayHeight = 2;
            const displayDepth = 0.2;
            const spacing = 1.5;
            const numDisplaysPerWall = Math.floor(wallLength / (displayWidth + spacing));
            const windowWidth = room === this.rooms[0] ? 10 : 0;
            const windowXMin = -windowWidth / 2;
            const windowXMax = windowWidth / 2;

            const wallConfigs = [
                { basePos: new THREE.Vector3(0, 2, -wallLength / 2 + 0.3), rot: 0, dir: 'x' },
                { basePos: new THREE.Vector3(-wallLength / 2 + 0.3, 2, 0), rot: Math.PI / 2, dir: 'z' },
                { basePos: new THREE.Vector3(wallLength / 2 - 0.3, 2, 0), rot: -Math.PI / 2, dir: 'z' },
                { basePos: new THREE.Vector3(0, 2, wallLength / 2 - 0.3), rot: Math.PI, dir: 'x' }
            ];

            for (let wall of wallConfigs) {
                if (imageIndex >= totalImages) break;

                const wallPositions = [];
                const isWindowWall = (room === this.rooms[0] && wall.rot === 0);
                const availableWidth = wallLength - (isWindowWall ? windowWidth + spacing * 2 : 0);
                const numDisplaysAdjusted = isWindowWall ? Math.floor(availableWidth / (displayWidth + spacing)) : numDisplaysPerWall;

                for (let i = 0; i < numDisplaysPerWall && imageIndex < totalImages; i++) {
                    let offset;
                    if (isWindowWall) {
                        const displaysPerSide = Math.floor(numDisplaysAdjusted / 2);
                        const sideWidth = (wallLength - windowWidth) / 2;
                        if (i < displaysPerSide) {
                            offset = -wallLength / 2 + (i + 0.5) * (sideWidth / displaysPerSide) + spacing;
                        } else {
                            const rightIndex = i - displaysPerSide;
                            offset = windowXMax + spacing + (rightIndex + 0.5) * (sideWidth / displaysPerSide);
                        }
                    } else {
                        offset = -wallLength / 2 + (i + 0.5) * (wallLength / numDisplaysPerWall);
                    }

                    const pos = wall.basePos.clone();
                    if (wall.dir === 'x') pos.x += offset;
                    else pos.z += offset;

                    if (isWindowWall && pos.x > windowXMin - displayWidth / 2 - spacing && pos.x < windowXMax + displayWidth / 2 + spacing) {
                        continue;
                    }

                    wallPositions.push({ pos, rot: wall.rot });
                }

                for (let { pos, rot } of wallPositions) {
                    const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vec4 color = texture2D(map, vUv);
                                    if (color.a < 0.1) discard;
                                    vec2 adjustedUv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
                                    color = texture2D(map, adjustedUv);
                                    gl_FragColor = vec4(color.rgb, opacity);
                                }
                            `,
                            transparent: true,
                            side: THREE.DoubleSide
                        });
                    } else {
                        material = fallbackMaterial;
                    }

                    const aspectRatio = texture.image ? texture.image.width / texture.image.height : 1;
                    const maxWidth = 3;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    const displayGeometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const displayMesh = new THREE.Mesh(displayGeometry, material);
                    displayMesh.position.copy(pos).add(room.position);
                    displayMesh.rotation.y = rot;
                    displayMesh.castShadow = true;
                    displayMesh.receiveShadow = true;
                    displayMesh.userData = { filename: this.imagesToLoad[imageIndex] };
                    room.add(displayMesh);
                    this.images.push({ mesh: displayMesh, filename: this.imagesToLoad[imageIndex] });

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
                    frame.position.copy(displayMesh.position);
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xfff5e1, 2.5, 15, Math.PI / 8, 0.7);
                    const lightOffset = 1.5;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        room === this.rooms[0] ? 5.5 : 4.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = displayMesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                }
            }
        }
    }

    clearScene() {
        this.images.forEach(img => {
            img.mesh.parent.remove(img.mesh);
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x1a1a1a && !(child.geometry instanceof THREE.PlaneGeometry))
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 8 + 1;
            const maxX = roomBounds.x + 8 - 1;
            const minZ = roomBounds.z - 8 + 1;
            const maxZ = roomBounds.z + 8 - 1;

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
                else {
                    this.isFocused = false;
                }
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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 10 / zoomLevel;
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
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




#NORMAL ROOM VIEW

import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
            { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) },
            { position: new THREE.Vector3(18, 1.6, 5), lookAt: new THREE.Vector3(18, 1.6, 0) }
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 10;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
    }

createGallery() {
    const concreteColor = 0x888888;
    const concreteRoughness = 0.7;
    const concreteMetalness = 0.1;

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: concreteColor,
        roughness: 0.3,
        metalness: concreteMetalness
    });

    const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
    noiseTexture.needsUpdate = true;
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.repeat.set(4, 4);
    floorMaterial.map = noiseTexture;
    floorMaterial.normalMap = noiseTexture;
    floorMaterial.normalScale.set(0.1, 0.1);

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.4,
        metalness: concreteMetalness,
        map: noiseTexture
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xaaaaaa, 
        transparent: true, 
        opacity: 0.3, 
        roughness: 0, 
        metalness: 0.1, 
        transmission: 0.9 
    });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
    const modernFurnitureMaterial = new THREE.MeshStandardMaterial({
        color: 0x3c2f2f,
        roughness: 0.6,
        metalness: 0
    });
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.3,
        metalness: 0.8
    });
    const woodMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.7,
        metalness: 0
    });

    // Room 1: Main Gallery Space
    const room1 = new THREE.Group();
    const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), floorMaterial);
    floor1.rotation.x = -Math.PI / 2;
    floor1.receiveShadow = true;
    room1.add(floor1);

    // Ceiling 1: Suspended Geometric Panels
    const hexGeometry = new THREE.CircleGeometry(1, 6); // Hexagon shape
    const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            if (Math.abs(i) === 2 && Math.abs(j) === 2) continue;
            const panel = new THREE.Mesh(hexGeometry, ceilingMaterial);
            const heightOffset = Math.random() * 0.5 + 4.5; // Varying heights between 4.5 and 5
            panel.position.set(i * 2.5, heightOffset, j * 2.5);
            panel.rotation.x = Math.PI / 2;
            panel.receiveShadow = true;
            room1.add(panel);

            // Integrated LED light
            const led = new THREE.Mesh(new THREE.CircleGeometry(0.3, 6), ledMaterial);
            led.position.set(i * 2.5, heightOffset - 0.05, j * 2.5);
            led.rotation.x = Math.PI / 2;
            room1.add(led);

            const panelLight = new THREE.PointLight(0xffffff, 1, 5);
            panelLight.position.set(i * 2.5, heightOffset - 0.1, j * 2.5);
            room1.add(panelLight);
        }
    }

    const walls1 = [
        new THREE.Mesh(new THREE.PlaneGeometry(15, 5), wallMaterial),
        new THREE.Mesh(new THREE.PlaneGeometry(15, 5), wallMaterial),
        new THREE.Mesh(new THREE.PlaneGeometry(15, 5), wallMaterial),
        new THREE.Mesh(new THREE.PlaneGeometry(15, 5), wallMaterial)
    ];
    walls1[0].position.set(0, 2.5, -7.5);
    walls1[1].position.set(0, 2.5, 7.5);
    walls1[1].rotation.y = Math.PI;
    walls1[2].position.set(-7.5, 2.5, 0);
    walls1[2].rotation.y = Math.PI / 2;
    walls1[3].position.set(7.5, 2.5, 0);
    walls1[3].rotation.y = -Math.PI / 2;
    walls1.forEach(wall => {
        wall.receiveShadow = true;
        room1.add(wall);
    });

    // Window 1: Curved Floor-to-Ceiling Glass Wall
    const curvePoints = [];
    for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI;
        const x = Math.cos(angle) * 2 - 7.5; // Curve inward from back wall
        const z = Math.sin(angle) * 2 - 7.5;
        curvePoints.push(new THREE.Vector3(x, 0, z));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const glassGeometry = new THREE.ExtrudeGeometry(
        new THREE.Shape([new THREE.Vector2(-7.5, 0), new THREE.Vector2(7.5, 0), new THREE.Vector2(7.5, 5), new THREE.Vector2(-7.5, 5)]),
        { depth: 0.1, extrudePath: curve }
    );
    const curvedWindow = new THREE.Mesh(glassGeometry, glassMaterial);
    curvedWindow.position.set(0, 0, 0);
    room1.add(curvedWindow);

    // Metal accents for the curved window
    const metalStripGeometry = new THREE.BoxGeometry(0.05, 5, 0.05);
    for (let i = -6; i <= 6; i += 2) {
        const strip = new THREE.Mesh(metalStripGeometry, metalMaterial);
        strip.position.set(i, 2.5, -7.4);
        strip.castShadow = true;
        room1.add(strip);
    }

    // Modern Furniture: Sleek Sofa
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.2), modernFurnitureMaterial);
    sofaSeat.position.set(0, 0.2, 4);
    sofaSeat.castShadow = true;
    sofaSeat.receiveShadow = true;
    room1.add(sofaSeat);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.2), modernFurnitureMaterial);
    sofaBack.position.set(0, 0.6, 4.5);
    sofaBack.castShadow = true;
    sofaBack.receiveShadow = true;
    room1.add(sofaBack);

    for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16), metalMaterial);
        leg.position.set(
            (i % 2 === 0 ? -1.4 : 1.4),
            0.2,
            (i < 2 ? 3.5 : 4.5)
        );
        leg.castShadow = true;
        leg.receiveShadow = true;
        room1.add(leg);
    }

    // Modern Coffee Table
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), modernFurnitureMaterial);
    tableTop.position.set(0, 0.5, 2);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    room1.add(tableTop);

    for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), metalMaterial);
        leg.position.set(
            (i % 2 === 0 ? -0.9 : 0.9),
            0.25,
            (i < 2 ? 1.5 : 2.5)
        );
        leg.castShadow = true;
        leg.receiveShadow = true;
        room1.add(leg);
    }

    room1.position.set(0, 0, 0);
    this.rooms.push(room1);

    // Room 2: Secondary Space
    const room2 = new THREE.Group();
    const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
    floor2.rotation.x = -Math.PI / 2;
    floor2.receiveShadow = true;
    room2.add(floor2);

    // Ceiling 2: Exposed Industrial Beams with Skylights
    const beamGeometry = new THREE.BoxGeometry(12, 0.5, 0.5);
    const beams = [];
    for (let i = -1; i <= 1; i += 2) {
        const beam = new THREE.Mesh(beamGeometry, ceilingMaterial);
        beam.position.set(0, 4.25, i * 3);
        beam.receiveShadow = true;
        room2.add(beam);
        beams.push(beam);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 12), ceilingMaterial);
    crossBeam.position.set(0, 4.25, 0);
    crossBeam.rotation.y = Math.PI / 2;
    room2.add(crossBeam);

    const skylightGeometry = new THREE.CircleGeometry(0.5, 32);
    const skylightMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.6,
        roughness: 0,
        metalness: 0.1,
        transmission: 0.9
    });
    for (let i = -1; i <= 1; i += 2) {
        const skylight = new THREE.Mesh(skylightGeometry, skylightMaterial);
        skylight.position.set(i * 3, 4.5, 0);
        skylight.rotation.x = Math.PI / 2;
        room2.add(skylight);

        const skylightLight = new THREE.PointLight(0xffffff, 0.8, 5);
        skylightLight.position.set(i * 3, 4.4, 0);
        room2.add(skylightLight);
    }

    const walls2 = [
        new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMaterial),
        new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMaterial),
        new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMaterial),
        new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMaterial)
    ];
    walls2[0].position.set(0, 2, -6);
    walls2[1].position.set(0, 2, 6);
    walls2[1].rotation.y = Math.PI;
    walls2[2].position.set(-6, 2, 0);
    walls2[2].rotation.y = Math.PI / 2;
    walls2[3].position.set(6, 2, 0);
    walls2[3].rotation.y = -Math.PI / 2;
    walls2.forEach(wall => {
        wall.receiveShadow = true;
        room2.add(wall);
    });

    // Window 2: Vertical Slatted Window
    const slatWindow = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.5), glassMaterial);
    slatWindow.position.set(6, 1.75, 0);
    slatWindow.rotation.y = -Math.PI / 2;
    room2.add(slatWindow);

    const slatGeometry = new THREE.BoxGeometry(2, 0.1, 0.05);
    for (let i = 0; i < 6; i++) {
        const slat = new THREE.Mesh(slatGeometry, woodMaterial);
        slat.position.set(6, 0.5 + i * 0.6, 0);
        slat.rotation.y = -Math.PI / 2;
        slat.rotation.z = Math.PI / 4; // Slightly tilted for effect
        slat.castShadow = true;
        room2.add(slat);
    }

    const door2 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), glassMaterial);
    door2.position.set(-6, 1.75, 0);
    door2.rotation.y = Math.PI / 2;
    door2.userData = { nextRoom: 0 };
    room2.add(door2);

    // Modern Chair
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), modernFurnitureMaterial);
    chairSeat.position.set(0, 0.5, 0);
    chairSeat.castShadow = true;
    chairSeat.receiveShadow = true;
    room2.add(chairSeat);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.1), modernFurnitureMaterial);
    chairBack.position.set(0, 0.9, 0.45);
    chairBack.castShadow = true;
    chairBack.receiveShadow = true;
    room2.add(chairBack);

    for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), metalMaterial);
        leg.position.set(
            (i % 2 === 0 ? -0.45 : 0.45),
            0.25,
            (i < 2 ? -0.45 : 0.45)
        );
        leg.castShadow = true;
        leg.receiveShadow = true;
        room2.add(leg);
    }

    room2.position.set(18, 0, 0);
    this.rooms.push(room2);

    this.rooms.forEach(room => this.scene.add(room));
}

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016; // Approx 60 FPS delta time
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
                const spotlight = img.mesh.parent.children.find(child => child instanceof THREE.SpotLight && child.target === img.mesh);
                if (spotlight) {
                    spotlight.intensity = 2.0 + Math.sin(this.time * 2 + index) * 0.2;
                }
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7;
            const maxX = roomBounds.x + 7;
            const minZ = roomBounds.z - 7;
            const maxZ = roomBounds.z + 7;

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
                this.displayImagesInGallery();
            }
        };
        requestAnimationFrame(animateMove);
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 12; // Limit to 12 images per room

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 15 : 12;
        const displayWidth = 3.5;
        const displayHeight = 2.5;
        const displayDepth = 0.2;
        const spacing = 1.0; // Increased spacing for 3D models
        const imageOffset = 0.1;
        const backWallOffset = 0.3;
        const numImagesPerWall = Math.floor(wallLength / (displayWidth + spacing));
        const maxImagesInRoom = Math.min(12, numImagesPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 2, -wallLength / 2 + backWallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-wallLength / 2 + backWallOffset, 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(wallLength / 2 - backWallOffset, 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, 2, wallLength / 2 - backWallOffset), rot: Math.PI, dir: 'x' }
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numImagesPerWall && imageIndex < totalImages && this.images.length < maxImagesInRoom; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * (wallLength / numImagesPerWall);
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }

            for (let { pos, rot } of wallPositions) {
                try {
                    const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 },
                                time: { value: 0.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                uniform float time;
                                varying vec2 vUv;
                                varying vec3 vNormal;
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
                    const maxWidth = 3.5;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    // Use 3D BoxGeometry instead of PlaneGeometry
                    const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = { filename: this.imagesToLoad[imageIndex] };
                    room.add(mesh);
                    this.images.push({ mesh, filename: this.imagesToLoad[imageIndex] });

                    // 3D Frame using ExtrudeGeometry
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
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        room === this.rooms[0] ? 4.5 : 3.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${this.imagesToLoad[imageIndex]}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7 + 1;
            const maxX = roomBounds.x + 7 - 1;
            const minZ = roomBounds.z - 7 + 1;
            const maxZ = roomBounds.z + 7 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 10 / zoomLevel;
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
                await this.loadImages(this.sessionId);
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
                await this.loadImages(this.sessionId);
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
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





#Attempts at adding layouts


import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
            { position: new THREE.Vector3(0, 1.6, 10), lookAt: new THREE.Vector3(0, 1.6, 0) }, // Main room
            { position: new THREE.Vector3(10, 1.6, 0), lookAt: new THREE.Vector3(10, 1.6, -10) } // Adjacent room
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 15;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
        this.imagesToLoad = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();

        console.log("MAX_TEXTURE_IMAGE_UNITS:", this.renderer.getContext().getParameter(this.renderer.getContext().MAX_TEXTURE_IMAGE_UNITS));
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const ceilingLight = new THREE.DirectionalLight(0xffffff, 0.6);
        ceilingLight.position.set(0, 10, 0);
        ceilingLight.castShadow = true;
        ceilingLight.shadow.mapSize.width = 2048;
        ceilingLight.shadow.mapSize.height = 2048;
        ceilingLight.shadow.camera.near = 0.5;
        ceilingLight.shadow.camera.far = 50;
        this.scene.add(ceilingLight);
    }

    createGallery() {
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: concreteColor,
            roughness: 0.3,
            metalness: concreteMetalness
        });

        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(4, 4);
        floorMaterial.map = noiseTexture;
        floorMaterial.normalMap = noiseTexture;
        floorMaterial.normalScale.set(0.1, 0.1);

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.4,
            metalness: concreteMetalness,
            map: noiseTexture
        });

        const glassMaterial = new THREE.MeshPhysicalMaterial({ 
            color: 0xaaaaaa, 
            transparent: true, 
            opacity: 0.3, 
            roughness: 0, 
            metalness: 0.1, 
            transmission: 0.9 
        });
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
        const infoPanelMaterial = new THREE.MeshBasicMaterial({ color: 0x4b0082, transparent: true, opacity: 0.9 });
        const modernFurnitureMaterial = new THREE.MeshStandardMaterial({
            color: 0x3c2f2f,
            roughness: 0.6,
            metalness: 0
        });
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.3,
            metalness: 0.8
        });

        // Main Room
        const mainRoom = new THREE.Group();
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.receiveShadow = true;
        mainRoom.add(floor1);

        // Ceiling with Geometric Panels
        const hexGeometry = new THREE.CircleGeometry(1, 6);
        const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
                if (Math.abs(i) === 3 && Math.abs(j) === 3) continue;
                const panel = new THREE.Mesh(hexGeometry, ceilingMaterial);
                const heightOffset = 4.8 + Math.random() * 0.2;
                panel.position.set(i * 2.5, heightOffset, j * 2.5);
                panel.rotation.x = Math.PI / 2;
                panel.receiveShadow = true;
                mainRoom.add(panel);

                const led = new THREE.Mesh(new THREE.CircleGeometry(0.2, 6), ledMaterial);
                led.position.set(i * 2.5, heightOffset - 0.05, j * 2.5);
                led.rotation.x = Math.PI / 2;
                mainRoom.add(led);

                const panelLight = new THREE.PointLight(0xffffff, 0.8, 5);
                panelLight.position.set(i * 2.5, heightOffset - 0.1, j * 2.5);
                mainRoom.add(panelLight);
            }
        }

        // Walls for Main Room
        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Front wall (partial)
            new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial), // Left wall (partial)
            new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial)  // Right wall (partial)
        ];
        walls1[0].position.set(0, 2.5, -10); // Back wall
        walls1[1].position.set(0, 2.5, 10);  // Front wall (open on right)
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-10, 2.5, 0); // Left wall (open on front)
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(10, 2.5, 5);  // Right wall (open doorway to adjacent room)
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach(wall => {
            wall.receiveShadow = true;
            mainRoom.add(wall);
        });

        // Curved Glass Wall
        const curvePoints = [];
        for (let i = 0; i <= 20; i++) {
            const angle = (i / 20) * Math.PI;
            const x = Math.cos(angle) * 1 - 10;
            const z = Math.sin(angle) * 1 - 10;
            curvePoints.push(new THREE.Vector3(x, 0, z));
        }
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const glassGeometry = new THREE.ExtrudeGeometry(
            new THREE.Shape([new THREE.Vector2(-10, 0), new THREE.Vector2(10, 0), new THREE.Vector2(10, 5), new THREE.Vector2(-10, 5)]),
            { depth: 0.1, extrudePath: curve }
        );
        const curvedWindow = new THREE.Mesh(glassGeometry, glassMaterial);
        curvedWindow.position.set(0, 0, -10);
        mainRoom.add(curvedWindow);

        // Metal accents
        const metalStripGeometry = new THREE.BoxGeometry(0.05, 5, 0.05);
        for (let i = -8; i <= 8; i += 2) {
            const strip = new THREE.Mesh(metalStripGeometry, metalMaterial);
            strip.position.set(i, 2.5, -9.9);
            strip.castShadow = true;
            mainRoom.add(strip);
        }

        // Informational Panel
        const infoPanelGeometry = new THREE.PlaneGeometry(2.5, 2);
        const infoPanel1 = new THREE.Mesh(infoPanelGeometry, infoPanelMaterial);
        infoPanel1.position.set(0, 2.5, -5);
        infoPanel1.userData = { isInfoPanel: true, text: "HOME EDUCATION\nThere are many reasons for choosing to educate your child at home. Join us in a celebration of the wonderful world of home education." };
        mainRoom.add(infoPanel1);

        // Modern Furniture
        const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.2), modernFurnitureMaterial);
        sofaSeat.position.set(0, 0.2, 4);
        sofaSeat.castShadow = true;
        sofaSeat.receiveShadow = true;
        mainRoom.add(sofaSeat);

        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.2), modernFurnitureMaterial);
        sofaBack.position.set(0, 0.6, 4.5);
        sofaBack.castShadow = true;
        sofaBack.receiveShadow = true;
        mainRoom.add(sofaBack);

        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16), metalMaterial);
            leg.position.set(
                (i % 2 === 0 ? -1.4 : 1.4),
                0.2,
                (i < 2 ? 3.5 : 4.5)
            );
            leg.castShadow = true;
            leg.receiveShadow = true;
            mainRoom.add(leg);
        }

        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), modernFurnitureMaterial);
        tableTop.position.set(0, 0.5, 2);
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        mainRoom.add(tableTop);

        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), metalMaterial);
            leg.position.set(
                (i % 2 === 0 ? -0.9 : 0.9),
                0.25,
                (i < 2 ? 1.5 : 2.5)
            );
            leg.castShadow = true;
            leg.receiveShadow = true;
            mainRoom.add(leg);
        }

        mainRoom.position.set(0, 0, 0);
        this.rooms.push(mainRoom);

        // Adjacent Room
        const adjacentRoom = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        adjacentRoom.add(floor2);

        // Ceiling for Adjacent Room
        for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
                if (Math.abs(i) === 3 && Math.abs(j) === 3) continue;
                const panel = new THREE.Mesh(hexGeometry, ceilingMaterial);
                const heightOffset = 4.8 + Math.random() * 0.2;
                panel.position.set(i * 2.5 + 10, heightOffset, j * 2.5 - 10);
                panel.rotation.x = Math.PI / 2;
                panel.receiveShadow = true;
                adjacentRoom.add(panel);

                const led = new THREE.Mesh(new THREE.CircleGeometry(0.2, 6), ledMaterial);
                led.position.set(i * 2.5 + 10, heightOffset - 0.05, j * 2.5 - 10);
                led.rotation.x = Math.PI / 2;
                adjacentRoom.add(led);

                const panelLight = new THREE.PointLight(0xffffff, 0.8, 5);
                panelLight.position.set(i * 2.5 + 10, heightOffset - 0.1, j * 2.5 - 10);
                adjacentRoom.add(panelLight);
            }
        }

        // Walls for Adjacent Room
        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Front wall
            new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial), // Left wall (partial)
            new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial)  // Right wall (partial)
        ];
        walls2[0].position.set(10, 2.5, -20); // Back wall
        walls2[1].position.set(10, 2.5, 0);   // Front wall (open on left)
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(0, 2.5, -10);  // Left wall (open doorway)
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(20, 2.5, -10); // Right wall
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            adjacentRoom.add(wall);
        });

        // Informational Panel for Adjacent Room
        const infoPanel2 = new THREE.Mesh(infoPanelGeometry, infoPanelMaterial);
        infoPanel2.position.set(15, 2.5, -15);
        infoPanel2.userData = { isInfoPanel: true, text: "EXHIBIT DETAILS\nExplore more about our featured collections." };
        adjacentRoom.add(infoPanel2);

        adjacentRoom.position.set(0, 0, 0);
        this.rooms.push(adjacentRoom);

        this.scene.add(mainRoom);
        this.scene.add(adjacentRoom);
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
                const spotlight = img.mesh.parent.children.find(child => child instanceof THREE.SpotLight && child.target === img.mesh);
                if (spotlight) {
                    spotlight.intensity = 1.5 + Math.sin(this.time * 2 + index) * 0.1;
                }
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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

        const discoverButton = document.createElement("button");
        discoverButton.id = "discoverButton";
        discoverButton.textContent = "Discover more art";
        discoverButton.style.cssText = "position:absolute; bottom:20px; left:20px; padding:10px 20px; background:#1e90ff; color:white; border:none; border-radius:20px; cursor:pointer; z-index:10;";
        discoverButton.addEventListener("click", () => console.log("Discover more art clicked"));
        document.body.appendChild(discoverButton);

        const menuButton = document.createElement("button");
        menuButton.id = "menuButton";
        menuButton.innerHTML = "⋮";
        menuButton.style.cssText = "position:absolute; bottom:20px; right:20px; padding:10px; background:#1e90ff; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; z-index:10;";
        menuButton.addEventListener("click", () => console.log("Menu clicked"));
        document.body.appendChild(menuButton);

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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 10;
            const maxX = roomBounds.x + 10;
            const minZ = roomBounds.z - 10;
            const maxZ = roomBounds.z + 10;

            // Adjust bounds for open doorway between rooms
            if (this.currentRoom === 0 && this.camera.position.x > 8 && this.camera.position.x < 12 && this.camera.position.z > -2 && this.camera.position.z < 2) {
                minX = -20; maxX = 20; minZ = -20; maxZ = 20; // Allow transition
            } else if (this.currentRoom === 1 && this.camera.position.x > -2 && this.camera.position.x < 2 && this.camera.position.z > -12 && this.camera.position.z < -8) {
                minX = -20; maxX = 20; minZ = -20; maxZ = 20; // Allow transition
            }

            this.camera.position.x = Math.max(minX, Math.min(maxX, this.camera.position.x));
            this.camera.position.z = Math.max(minZ, Math.min(maxZ, this.camera.position.z));
            this.controls.getObject().position.copy(this.camera.position);

            // Automatic room switching
            if (this.currentRoom === 0 && this.camera.position.x > 10) this.moveToRoom(1);
            else if (this.currentRoom === 1 && this.camera.position.x < 0) this.moveToRoom(0);
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
                this.displayImagesInGallery();
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
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            console.log("Initial imagesToLoad:", this.imagesToLoad);
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            console.log("Fallback imagesToLoad:", this.imagesToLoad);
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        console.log("displayImagesInGallery called with imagesToLoad:", this.imagesToLoad);
        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 6; // 6 images per room
        const seenHashes = new Set();

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = 20;
        const displayWidth = 2.5;
        const displayHeight = 2.0;
        const displayDepth = 0.2;
        const spacing = 1.5;
        const backWallOffset = 0.3;

        const numImagesPerWall = Math.floor(wallLength / (displayWidth + spacing));
        const maxImagesInRoom = Math.min(6, numImagesPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 2, -10 + backWallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-10 + backWallOffset, 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(10 - backWallOffset, 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, 2, 10 - backWallOffset), rot: Math.PI, dir: 'x' }
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numImagesPerWall && imageIndex < totalImages && this.images.length < maxImagesInRoom; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * (wallLength / numImagesPerWall);
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }

            for (let { pos, rot } of wallPositions) {
                if (imageIndex >= totalImages) break;

                const filename = this.imagesToLoad[imageIndex];
                console.log(`Loading image at index ${imageIndex}: ${filename}`);
                try {
                    const texture = await this.loadTexture(filename);
                    const hash = await this.computeImageHash(texture);
                    console.log(`Hash for ${filename}: ${hash}`);

                    if (seenHashes.has(hash)) {
                        console.warn(`Duplicate image content detected for ${filename} with hash ${hash}, skipping`);
                        imageIndex++;
                        continue;
                    }
                    seenHashes.add(hash);

                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 },
                                time: { value: 0.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                uniform float time;
                                varying vec2 vUv;
                                varying vec3 vNormal;
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
                    const maxWidth = 2.5;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = { filename, hash };
                    room.add(mesh);
                    this.images.push({ mesh, filename, hash });

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
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 1.5, 15, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${filename}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length, "Unique hashes:", seenHashes.size);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.textureLoader = new THREE.TextureLoader();
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.isInfoPanel || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.isInfoPanel) {
                    this.showInfoPanel(obj);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 10 + 1;
            const maxX = roomBounds.x + 10 - 1;
            const minZ = roomBounds.z - 10 + 1;
            const maxZ = roomBounds.z + 10 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 15 / zoomLevel;
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
                await this.loadImages(this.sessionId);
            }
        } catch (error) {
            console.error("Error capturing screenshot:", error);
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
            const response = await fetch(`http://localhost:3000/api/upload${sessionId ? `/${sessionId}` : ''}`, {
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        }
        document.body.appendChild(instructions);

        document.getElementById("closeInstructions").addEventListener("click", () => {
            document.body.removeChild(instructions);
        });
    }

    showInfoPanel(panel) {
        const infoText = panel.userData.text || "This is an informational panel about the artwork.";
        const instructions = document.createElement("div");
        instructions.id = "infoPanelOverlay";
        instructions.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center; max-width:300px;";
        instructions.innerHTML = `
            <h3>Artwork Info</h3>
            <p>${infoText}</p>
            <button id="closeInfo" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
        `;
        document.body.appendChild(instructions);

        document.getElementById("closeInfo").addEventListener("click", () => {
            document.body.removeChild(instructions);
        });
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
    }
}

const app = new ThreeJSApp();
app.init();





#white gallery implementtion

import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
        
        // Camera settings for each room
        this.roomCameraSettings = [
            { position: new THREE.Vector3(0, 1.6, 8), lookAt: new THREE.Vector3(0, 1.6, 0) }, // Main room
            { position: new THREE.Vector3(-20, 1.6, 0), lookAt: new THREE.Vector3(-20, 1.6, 0) }, // Adjacent room
            { position: new THREE.Vector3(0, 1.6, -20), lookAt: new THREE.Vector3(0, 1.6, -20) } // Back room
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);
        console.log("Camera position:", this.camera.position);
        console.log("Camera looking at:", initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 15;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
        this.imagesToLoad = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();

        // Add a test cube to confirm rendering
        const testCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        testCube.position.set(0, 0.5, 0);
        this.scene.add(testCube);
        console.log("Added test cube at origin");

        console.log("MAX_TEXTURE_IMAGE_UNITS:", this.renderer.getContext().getParameter(this.renderer.getContext().MAX_TEXTURE_IMAGE_UNITS));
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);
        console.log("Added ambient light");

        const ceilingLight = new THREE.PointLight(0xffffff, 1.0, 50);
        ceilingLight.position.set(0, 4.9, 0);
        this.scene.add(ceilingLight);
        console.log("Added ceiling light");
    }

    createGallery() {
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: concreteColor,
            roughness: 0.3,
            metalness: concreteMetalness
        });

        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(4, 4);
        floorMaterial.map = noiseTexture;
        floorMaterial.normalMap = noiseTexture;
        floorMaterial.normalScale.set(0.1, 0.1);

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.4,
            metalness: concreteMetalness,
        });

        // Solid white wall material
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.0
        });

        // Remove purple gradient, use solid white for info panels
        const infoPanelMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: false
        });

        // Main Room
        const mainRoom = new THREE.Group();
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.receiveShadow = true;
        mainRoom.add(floor1);
        console.log("Added floor to main room");

        const ceiling1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilingMaterial);
        ceiling1.position.set(0, 5, 0);
        ceiling1.rotation.x = Math.PI / 2;
        ceiling1.receiveShadow = true;
        mainRoom.add(ceiling1);
        console.log("Added ceiling to main room");

        const lightPanel1 = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        lightPanel1.position.set(0, 4.9, 0);
        lightPanel1.rotation.x = Math.PI / 2;
        mainRoom.add(lightPanel1);
        console.log("Added light panel to main room");

        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Front wall
            new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial), // Left wall (partial for doorway to adjacent room)
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial)  // Right wall
        ];
        walls1[0].position.set(0, 2.5, -10); // Back wall
        walls1[1].position.set(0, 2.5, 10);  // Front wall
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-10, 2.5, -5); // Left wall (partial, doorway at z: -5 to 5)
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(10, 2.5, 0);  // Right wall
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach((wall, index) => {
            wall.receiveShadow = true;
            mainRoom.add(wall);
            console.log(`Added wall ${index} to main room`);
        });

        const leftWallTop1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial);
        leftWallTop1.position.set(-10, 2.5, 5);
        leftWallTop1.rotation.y = Math.PI / 2;
        leftWallTop1.receiveShadow = true;
        mainRoom.add(leftWallTop1);
        console.log("Added left wall top segment to main room");

        const infoPanel1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), infoPanelMaterial);
        infoPanel1.position.set(8, 2.5, -5);
        infoPanel1.userData = { isInfoPanel: true, text: "HOME EDUCATION\nWelcome to the main gallery space." };
        mainRoom.add(infoPanel1);
        console.log("Added info panel to main room");

        mainRoom.position.set(0, 0, 0);
        this.rooms.push(mainRoom);

        // Adjacent Room
        const adjacentRoom = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        adjacentRoom.add(floor2);
        console.log("Added floor to adjacent room");

        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilingMaterial);
        ceiling2.position.set(0, 5, 0);
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        adjacentRoom.add(ceiling2);
        console.log("Added ceiling to adjacent room");

        const lightPanel2 = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        lightPanel2.position.set(0, 4.9, 0);
        lightPanel2.rotation.x = Math.PI / 2;
        adjacentRoom.add(lightPanel2);
        console.log("Added light panel to adjacent room");

        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Front wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Left wall
            new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial)  // Right wall (partial for doorway to main room)
        ];
        walls2[0].position.set(0, 2.5, -10); // Back wall
        walls2[1].position.set(0, 2.5, 10);  // Front wall
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-10, 2.5, 0); // Left wall
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(10, 2.5, -5); // Right wall (partial, doorway at z: -5 to 5)
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach((wall, index) => {
            wall.receiveShadow = true;
            adjacentRoom.add(wall);
            console.log(`Added wall ${index} to adjacent room`);
        });

        const rightWallTop2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial);
        rightWallTop2.position.set(10, 2.5, 5);
        rightWallTop2.rotation.y = -Math.PI / 2;
        rightWallTop2.receiveShadow = true;
        adjacentRoom.add(rightWallTop2);
        console.log("Added right wall top segment to adjacent room");

        const infoPanel2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), infoPanelMaterial);
        infoPanel2.position.set(-5, 2.5, -5);
        infoPanel2.userData = { isInfoPanel: true, text: "ADJACENT ROOM\nExplore this connected space." };
        adjacentRoom.add(infoPanel2);
        console.log("Added info panel to adjacent room");

        adjacentRoom.position.set(-20, 0, 0); // Connects to main room's left doorway
        this.rooms.push(adjacentRoom);

        // Back Room
        const backRoom = new THREE.Group();
        const floor3 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor3.rotation.x = -Math.PI / 2;
        floor3.receiveShadow = true;
        backRoom.add(floor3);
        console.log("Added floor to back room");

        const ceiling3 = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilingMaterial);
        ceiling3.position.set(0, 5, 0);
        ceiling3.rotation.x = Math.PI / 2;
        ceiling3.receiveShadow = true;
        backRoom.add(ceiling3);
        console.log("Added ceiling to back room");

        const lightPanel3 = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        lightPanel3.position.set(0, 4.9, 0);
        lightPanel3.rotation.x = Math.PI / 2;
        backRoom.add(lightPanel3);
        console.log("Added light panel to back room");

        const walls3 = [
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Front wall (partial for doorway to main room)
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial), // Left wall
            new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMaterial)  // Right wall
        ];
        walls3[0].position.set(0, 2.5, -10); // Back wall
        walls3[1].position.set(0, 2.5, 10);  // Front wall
        walls3[1].rotation.y = Math.PI;
        walls3[2].position.set(-10, 2.5, 0); // Left wall
        walls3[2].rotation.y = Math.PI / 2;
        walls3[3].position.set(10, 2.5, 0);  // Right wall
        walls3[3].rotation.y = -Math.PI / 2;
        walls3.forEach((wall, index) => {
            wall.receiveShadow = true;
            backRoom.add(wall);
            console.log(`Added wall ${index} to back room`);
        });

        const frontWallTop3 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial);
        frontWallTop3.position.set(0, 2.5, 10);
        frontWallTop3.rotation.y = Math.PI;
        frontWallTop3.receiveShadow = true;
        backRoom.add(frontWallTop3);
        console.log("Added front wall top segment to back room");

        const infoPanel3 = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), infoPanelMaterial);
        infoPanel3.position.set(0, 2.5, -5);
        infoPanel3.userData = { isInfoPanel: true, text: "BACK ROOM\nA quiet space for reflection." };
        backRoom.add(infoPanel3);
        console.log("Added info panel to back room");

        backRoom.position.set(0, 0, -20); // Connects to main room's back doorway
        this.rooms.push(backRoom);

        this.scene.add(mainRoom);
        this.scene.add(adjacentRoom);
        this.scene.add(backRoom);
        console.log("Scene children:", this.scene.children.length);
        console.log("Main room children:", mainRoom.children.length);
        console.log("Adjacent room children:", adjacentRoom.children.length);
        console.log("Back room children:", backRoom.children.length);
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
        console.log("Rendering frame");
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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

        const discoverButton = document.createElement("button");
        discoverButton.id = "discoverButton";
        discoverButton.textContent = "Discover more art";
        discoverButton.style.cssText = "position:absolute; bottom:20px; left:20px; padding:10px 20px; background:#1e90ff; color:white; border:none; border-radius:20px; cursor:pointer; z-index:10;";
        discoverButton.addEventListener("click", () => console.log("Discover more art clicked"));
        document.body.appendChild(discoverButton);

        const menuButton = document.createElement("button");
        menuButton.id = "menuButton";
        menuButton.innerHTML = "⋮";
        menuButton.style.cssText = "position:absolute; bottom:20px; right:20px; padding:10px; background:#1e90ff; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; z-index:10;";
        menuButton.addEventListener("click", () => console.log("Menu clicked"));
        document.body.appendChild(menuButton);

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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;

            // Dynamic bounds based on current room
            let minX, maxX, minZ, maxZ;
            if (this.currentRoom === 0) {
                // Main room bounds
                minX = -10;
                maxX = 10;
                minZ = -10;
                maxZ = 10;
            } else if (this.currentRoom === 1) {
                // Adjacent room bounds
                minX = -30; // -20 (room position) - 10
                maxX = -10; // -20 (room position) + 10
                minZ = -10;
                maxZ = 10;
            } else if (this.currentRoom === 2) {
                // Back room bounds
                minX = -10;
                maxX = 10;
                minZ = -30; // -20 (room position) - 10
                maxZ = -10; // -20 (room position) + 10
            }

            // Allow passage through doorways
            if (this.currentRoom === 0 && this.camera.position.x > -12 && this.camera.position.x < -8 && this.camera.position.z > -5 && this.camera.position.z < 5) {
                // Transition to adjacent room
            } else if (this.currentRoom === 1 && this.camera.position.x > -12 && this.camera.position.x < -8 && this.camera.position.z > -5 && this.camera.position.z < 5) {
                // Transition to main room
            } else if (this.currentRoom === 0 && this.camera.position.z > -12 && this.camera.position.z < -8 && this.camera.position.x > -5 && this.camera.position.x < 5) {
                // Transition to back room
            } else if (this.currentRoom === 2 && this.camera.position.z > -12 && this.camera.position.z < -8 && this.camera.position.x > -5 && this.camera.position.x < 5) {
                // Transition to main room
            } else {
                this.camera.position.x = Math.max(minX, Math.min(maxX, this.camera.position.x));
                this.camera.position.z = Math.max(minZ, Math.min(maxZ, this.camera.position.z));
            }

            this.controls.getObject().position.copy(this.camera.position);

            // Automatic room switching
            if (this.currentRoom === 0 && this.camera.position.x < -10) {
                this.moveToRoom(1);
                console.log("Switched to adjacent room");
            } else if (this.currentRoom === 1 && this.camera.position.x > -10) {
                this.moveToRoom(0);
                console.log("Switched to main room");
            } else if (this.currentRoom === 0 && this.camera.position.z < -10) {
                this.moveToRoom(2);
                console.log("Switched to back room");
            } else if (this.currentRoom === 2 && this.camera.position.z > -10) {
                this.moveToRoom(0);
                console.log("Switched to main room");
            }
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
                this.displayImagesInGallery();
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
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            console.log("Initial imagesToLoad:", this.imagesToLoad);
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            console.log("Fallback imagesToLoad:", this.imagesToLoad);
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        console.log("displayImagesInGallery called with imagesToLoad:", this.imagesToLoad);
        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 6;
        const seenHashes = new Set();

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = 20;
        const backWallOffset = 0.3;

        const maxImagesInRoom = 6;

        const imageConfigs = this.currentRoom === 0 ? [
            { pos: new THREE.Vector3(-8, 3.5, -9.7), size: new THREE.Vector2(2, 3), rot: 0 },
            { pos: new THREE.Vector3(-2, 2.5, -9.7), size: new THREE.Vector2(2, 1.5), rot: 0 },
            { pos: new THREE.Vector3(2, 2.5, -9.7), size: new THREE.Vector2(2, 1.5), rot: 0 },
            { pos: new THREE.Vector3(9.7, 2.5, -2), size: new THREE.Vector2(1.5, 1), rot: -Math.PI / 2 },
            { pos: new THREE.Vector3(9.7, 2, 2), size: new THREE.Vector2(1.5, 1), rot: -Math.PI / 2 },
            { pos: new THREE.Vector3(-2, 2.5, 9.7), size: new THREE.Vector2(2, 1.5), rot: Math.PI }
        ] : this.currentRoom === 1 ? [
            { pos: new THREE.Vector3(-28, 3.5, -9.7), size: new THREE.Vector2(2, 3), rot: 0 },
            { pos: new THREE.Vector3(-22, 2.5, -9.7), size: new THREE.Vector2(2, 1.5), rot: 0 },
            { pos: new THREE.Vector3(-18, 2.5, -9.7), size: new THREE.Vector2(2, 1.5), rot: 0 },
            { pos: new THREE.Vector3(-9.7, 2, -5), size: new THREE.Vector2(1.5, 1), rot: Math.PI / 2 },
            { pos: new THREE.Vector3(-18, 2.5, 9.7), size: new THREE.Vector2(2, 1.5), rot: Math.PI },
            { pos: new THREE.Vector3(-9.7, 2.5, 2), size: new THREE.Vector2(1.5, 1), rot: -Math.PI / 2 }
        ] : [
            { pos: new THREE.Vector3(-8, 3.5, -29.7), size: new THREE.Vector2(2, 3), rot: 0 },
            { pos: new THREE.Vector3(-2, 2.5, -29.7), size: new THREE.Vector2(2, 1.5), rot: 0 },
            { pos: new THREE.Vector3(2, 2.5, -29.7), size: new THREE.Vector2(2, 1.5), rot: 0 },
            { pos: new THREE.Vector3(9.7, 2, -22), size: new THREE.Vector2(1.5, 1), rot: -Math.PI / 2 },
            { pos: new THREE.Vector3(9.7, 2, -18), size: new THREE.Vector2(1.5, 1), rot: -Math.PI / 2 },
            { pos: new THREE.Vector3(-2, 2.5, -9.7), size: new THREE.Vector2(2, 1.5), rot: Math.PI }
        ];

        console.log("Starting image placement for room", this.currentRoom);
        for (let config of imageConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const filename = this.imagesToLoad[imageIndex];
            console.log(`Loading image at index ${imageIndex}: ${filename}`);
            try {
                const texture = await this.loadTexture(filename);
                const hash = await this.computeImageHash(texture);
                console.log(`Hash for ${filename}: ${hash}`);

                if (seenHashes.has(hash)) {
                    console.warn(`Duplicate image content detected for ${filename} with hash ${hash}, skipping`);
                    imageIndex++;
                    continue;
                }
                seenHashes.add(hash);

                let material;
                if (texture.image) {
                    material = new THREE.ShaderMaterial({
                        uniforms: {
                            map: { value: texture },
                            opacity: { value: 1.0 },
                            time: { value: 0.0 }
                        },
                        vertexShader: `
                            varying vec2 vUv;
                            varying vec3 vNormal;
                            void main() {
                                vUv = uv;
                                vNormal = normalMatrix * normal;
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            uniform sampler2D map;
                            uniform float opacity;
                            uniform float time;
                            varying vec2 vUv;
                            varying vec3 vNormal;
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

                const displayDepth = 0.2;
                const geometry = new THREE.BoxGeometry(config.size.x, config.size.y, displayDepth);
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.copy(config.pos).add(room.position); // Adjust position relative to room
                mesh.rotation.y = config.rot;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData = { filename, hash };
                room.add(mesh);
                this.images.push({ mesh, filename, hash });
                console.log(`Added image at position: ${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z}`);

                const frameThickness = 0.1;
                const frameShape = new THREE.Shape();
                frameShape.moveTo(-config.size.x / 2 - frameThickness, -config.size.y / 2 - frameThickness);
                frameShape.lineTo(config.size.x / 2 + frameThickness, -config.size.y / 2 - frameThickness);
                frameShape.lineTo(config.size.x / 2 + frameThickness, config.size.y / 2 + frameThickness);
                frameShape.lineTo(-config.size.x / 2 - frameThickness, config.size.y / 2 + frameThickness);
                frameShape.lineTo(-config.size.x / 2 - frameThickness, -config.size.y / 2 - frameThickness);

                const hole = new THREE.Path();
                hole.moveTo(-config.size.x / 2, -config.size.y / 2);
                hole.lineTo(config.size.x / 2, -config.size.y / 2);
                hole.lineTo(config.size.x / 2, config.size.y / 2);
                hole.lineTo(-config.size.x / 2, config.size.y / 2);
                hole.lineTo(-config.size.x / 2, -config.size.y / 2);
                frameShape.holes.push(hole);

                const extrudeSettings = { depth: frameThickness, bevelEnabled: false };
                const frameGeometry = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
                const frame = new THREE.Mesh(frameGeometry, frameMaterial);
                frame.position.copy(mesh.position);
                frame.position.z += (config.rot === 0 ? -displayDepth / 2 : (config.rot === Math.PI ? displayDepth / 2 : 0));
                frame.position.x += (config.rot === Math.PI / 2 ? -displayDepth / 2 : (config.rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                frame.rotation.y = config.rot;
                frame.castShadow = true;
                frame.receiveShadow = true;
                room.add(frame);
                console.log("Added frame for image");

                imageIndex++;
            } catch (error) {
                console.error(`Error loading image ${filename}:`, error);
                imageIndex++;
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length, "Unique hashes:", seenHashes.size);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.textureLoader = new THREE.TextureLoader();
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.isInfoPanel || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.isInfoPanel) {
                    this.showInfoPanel(obj);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 10 + 1;
            const maxX = roomBounds.x + 10 - 1;
            const minZ = roomBounds.z - 10 + 1;
            const maxZ = roomBounds.z + 10 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 15 / zoomLevel;
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
                await this.loadImages(this.sessionId);
            }
        } catch (error) {
            console.error("Error capturing screenshot:", error);
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
            const response = await fetch(`http://localhost:3000/api/upload${sessionId ? `/${sessionId}` : ''}`, {
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        }
        document.body.appendChild(instructions);

        document.getElementById("closeInstructions").addEventListener("click", () => {
            document.body.removeChild(instructions);
        });
    }

    showInfoPanel(panel) {
        const infoText = panel.userData.text || "This is an informational panel about the artwork.";
        const instructions = document.createElement("div");
        instructions.id = "infoPanelOverlay";
        instructions.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center; max-width:300px;";
        instructions.innerHTML = `
            <h3>Artwork Info</h3>
            <p>${infoText}</p>
            <button id="closeInfo" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
        `;
        document.body.appendChild(instructions);

        document.getElementById("closeInfo").addEventListener("click", () => {
            document.body.removeChild(instructions);
        });
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
    }
}

const app = new ThreeJSApp();
app.init();


#Modern advanced architechtural gallery


import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
            { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) },
            { position: new THREE.Vector3(18, 1.6, 5), lookAt: new THREE.Vector3(18, 1.6, 0) }
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 10;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
    }

    createGallery() {
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;
    
        // Materials
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0e8e0, // Light wood/marble hybrid color
            roughness: 0.3,
            metalness: 0.1
        });
        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(8, 8);
        floorMaterial.map = noiseTexture;
    
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White ceiling
            roughness: 0.4,
            metalness: 0.1
        });
    
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87ceeb, // Light sky blue tint
            transparent: true,
            opacity: 0.3,
            roughness: 0,
            metalness: 0.1,
            transmission: 0.9
        });
    
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White walls
            roughness: 0.3,
            metalness: 0.0
        });
    
        const greenWallMaterial = new THREE.MeshStandardMaterial({
            color: 0x228b22, // Green for plant walls
            roughness: 0.6,
            metalness: 0.0
        });
    
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // Metallic gray for frames and accents
            roughness: 0.3,
            metalness: 0.8
        });
    
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b, // Dark wood for furniture
            roughness: 0.7,
            metalness: 0.0
        });
    
        // Room 1: Main Circular Gallery
        const room1 = new THREE.Group();
        const radius = 10;
        const height = 8;
    
        // Floor
        const floor1 = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.position.y = 0;
        floor1.receiveShadow = true;
        room1.add(floor1);
    
        // Curved Ceiling
        const arcSegments = 32;
        const arcHeight = 2;
        const curvePoints = [];
        for (let i = 0; i <= arcSegments; i++) {
            const angle = (i / arcSegments) * Math.PI * 2;
            const r = radius - (Math.sin(i / arcSegments * Math.PI) * arcHeight);
            curvePoints.push(new THREE.Vector3(Math.cos(angle) * r, height, Math.sin(angle) * r));
        }
        const ceilingCurve = new THREE.CatmullRomCurve3(curvePoints);
        const ceilingShape = new THREE.Shape();
        for (let i = 0; i < arcSegments; i++) {
            const point = ceilingCurve.getPoint(i / arcSegments);
            if (i === 0) ceilingShape.moveTo(point.x, point.z);
            else ceilingShape.lineTo(point.x, point.z);
        }
        ceilingShape.lineTo(curvePoints[0].x, curvePoints[0].z);
        const ceilingGeometry = new THREE.ExtrudeGeometry(ceilingShape, { depth: 0.1, bevelEnabled: false });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = height;
        ceiling.receiveShadow = true;
        room1.add(ceiling);
    
        // Glass Wall (Circular)
        const glassSegments = 8;
        for (let i = 0; i < glassSegments; i++) {
            const angle = (i / glassSegments) * Math.PI * 2;
            const nextAngle = ((i + 1) / glassSegments) * Math.PI * 2;
            const windowWidth = (Math.PI * 2 * radius) / glassSegments;
            const window = new THREE.Mesh(
                new THREE.PlaneGeometry(windowWidth, height),
                glassMaterial
            );
            window.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
            window.rotation.y = angle + Math.PI / 2;
            room1.add(window);
        }
    
        // Green Wall Accents
        const greenWallHeight = 4;
        const greenWallWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
            const greenWall = new THREE.Mesh(
                new THREE.PlaneGeometry(greenWallWidth, greenWallHeight),
                greenWallMaterial
            );
            greenWall.position.set(Math.cos(angle) * (radius - 1), greenWallHeight / 2, Math.sin(angle) * (radius - 1));
            greenWall.rotation.y = angle + Math.PI / 2;
            room1.add(greenWall);
        }
    
        // Central Atrium Pillar
        const pillarGeometry = new THREE.CylinderGeometry(0.8, 0.8, height, 32);
        const pillar = new THREE.Mesh(pillarGeometry, wallMaterial);
        pillar.position.set(0, height / 2, 0);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        room1.add(pillar);
    
        // Sculptural Elements
        const sculptureGeometry = new THREE.LatheGeometry([
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.5, 1),
            new THREE.Vector2(0, 2),
            new THREE.Vector2(-0.5, 1)
        ], 32);
        const sculptureMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.4 });
        const sculpture1 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture1.position.set(-5, 1, 0);
        sculpture1.scale.set(1, 2, 1);
        sculpture1.castShadow = true;
        sculpture1.receiveShadow = true;
        room1.add(sculpture1);
    
        const sculpture2 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture2.position.set(5, 1, 0);
        sculpture2.rotation.y = Math.PI / 2;
        sculpture2.scale.set(1, 1.5, 1);
        sculpture2.castShadow = true;
        sculpture2.receiveShadow = true;
        room1.add(sculpture2);
    
        // Plant
        const plantGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 32);
        const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        plantPot.position.set(0, 0.15, -5);
        room1.add(plantPot);
        const plant = new THREE.Mesh(plantGeometry, plantMaterial);
        plant.position.set(0, 0.65, -5);
        room1.add(plant);
    
        // Benches
        const benchSeatGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const benchBackGeometry = new THREE.BoxGeometry(2, 0.8, 0.1);
        const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2f2f, roughness: 0.6, metalness: 0 });
        const bench1Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench1Seat.position.set(-6, 0.1, 6);
        bench1Seat.castShadow = true;
        bench1Seat.receiveShadow = true;
        room1.add(bench1Seat);
        const bench1Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench1Back.position.set(-6, 0.5, 6.45);
        bench1Back.castShadow = true;
        bench1Back.receiveShadow = true;
        room1.add(bench1Back);
    
        const bench2Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench2Seat.position.set(6, 0.1, -6);
        bench2Seat.castShadow = true;
        bench2Seat.receiveShadow = true;
        room1.add(bench2Seat);
        const bench2Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench2Back.position.set(6, 0.5, -6.45);
        bench2Back.castShadow = true;
        bench2Back.receiveShadow = true;
        room1.add(bench2Back);
    
        room1.position.set(0, 0, 0);
        this.rooms.push(room1);
    
        // Room 2: Secondary Space (simplified)
        const room2 = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        room2.add(floor2);
    
        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMaterial);
        ceiling2.position.set(0, 6, 0);
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        room2.add(ceiling2);
    
        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial)
        ];
        walls2[0].position.set(0, 3, -6);
        walls2[1].position.set(0, 3, 6);
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-6, 3, 0);
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(6, 3, 0);
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            room2.add(wall);
        });
    
        const door2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), glassMaterial);
        door2.position.set(-6, 1.5, 0);
        door2.rotation.y = Math.PI / 2;
        door2.userData = { nextRoom: 0 };
        room2.add(door2);
    
        room2.position.set(18, 0, 0);
        this.rooms.push(room2);
    
        this.rooms.forEach(room => this.scene.add(room));
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016; // Approx 60 FPS delta time
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
                const spotlight = img.mesh.parent.children.find(child => child instanceof THREE.SpotLight && child.target === img.mesh);
                if (spotlight) {
                    spotlight.intensity = 2.0 + Math.sin(this.time * 2 + index) * 0.2;
                }
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7;
            const maxX = roomBounds.x + 7;
            const minZ = roomBounds.z - 7;
            const maxZ = roomBounds.z + 7;

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
                this.displayImagesInGallery();
            }
        };
        requestAnimationFrame(animateMove);
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 12; // Limit to 12 images per room

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 15 : 12;
        const displayWidth = 3.5;
        const displayHeight = 2.5;
        const displayDepth = 0.2;
        const spacing = 1.0; // Increased spacing for 3D models
        const imageOffset = 0.1;
        const backWallOffset = 0.3;
        const numImagesPerWall = Math.floor(wallLength / (displayWidth + spacing));
        const maxImagesInRoom = Math.min(12, numImagesPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 2, -wallLength / 2 + backWallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-wallLength / 2 + backWallOffset, 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(wallLength / 2 - backWallOffset, 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, 2, wallLength / 2 - backWallOffset), rot: Math.PI, dir: 'x' }
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numImagesPerWall && imageIndex < totalImages && this.images.length < maxImagesInRoom; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * (wallLength / numImagesPerWall);
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }

            for (let { pos, rot } of wallPositions) {
                try {
                    const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 },
                                time: { value: 0.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                uniform float time;
                                varying vec2 vUv;
                                varying vec3 vNormal;
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
                    const maxWidth = 3.5;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    // Use 3D BoxGeometry instead of PlaneGeometry
                    const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = { filename: this.imagesToLoad[imageIndex] };
                    room.add(mesh);
                    this.images.push({ mesh, filename: this.imagesToLoad[imageIndex] });

                    // 3D Frame using ExtrudeGeometry
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
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        room === this.rooms[0] ? 4.5 : 3.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${this.imagesToLoad[imageIndex]}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7 + 1;
            const maxX = roomBounds.x + 7 - 1;
            const minZ = roomBounds.z - 7 + 1;
            const maxZ = roomBounds.z + 7 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 10 / zoomLevel;
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
                await this.loadImages(this.sessionId);
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
                await this.loadImages(this.sessionId);
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
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




#second modern room architechtural design


import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
            { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) },
            { position: new THREE.Vector3(18, 1.6, 5), lookAt: new THREE.Vector3(18, 1.6, 0) }
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 10;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    createGallery() {
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;
    
        // Materials
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0d8c8, // Light wooden floor
            roughness: 0.3,
            metalness: 0.1
        });
        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(10, 10);
        floorMaterial.map = noiseTexture;
    
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White ceiling with organic pattern
            roughness: 0.4,
            metalness: 0.1
        });
    
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87ceeb, // Sky blue tint for glass
            transparent: true,
            opacity: 0.3,
            roughness: 0,
            metalness: 0.1,
            transmission: 0.9
        });
    
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White walls
            roughness: 0.3,
            metalness: 0.0
        });
    
        const greenWallMaterial = new THREE.MeshStandardMaterial({
            color: 0x228b22, // Lush green for living walls
            roughness: 0.6,
            metalness: 0.0
        });
    
        const waterMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                color: { value: new THREE.Color(0x87ceeb) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv;
                    float wave = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 + time) * 0.1;
                    gl_FragColor = vec4(color + wave, 0.8);
                }
            `,
            transparent: true
        });
    
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // Metallic gray for frames and accents
            roughness: 0.3,
            metalness: 0.8
        });
    
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b, // Dark wood for furniture
            roughness: 0.7,
            metalness: 0.0
        });
    
        // Room 1: Main Circular Gallery with Biophilic Elements
        const room1 = new THREE.Group();
        const radius = 12;
        const height = 8;
    
        // Floor
        const floor1 = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.position.y = 0;
        floor1.receiveShadow = true;
        room1.add(floor1);
    
        // Organic Ceiling with Wave Pattern
        const ceilingShape = new THREE.Shape();
        const ceilingPoints = [];
        for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const r = radius + Math.sin(angle * 4) * 0.5; // Wave-like pattern
            ceilingPoints.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
        }
        ceilingShape.moveTo(ceilingPoints[0].x, ceilingPoints[0].y);
        for (let i = 1; i < ceilingPoints.length; i++) {
            ceilingShape.lineTo(ceilingPoints[i].x, ceilingPoints[i].y);
        }
        const ceilingGeometry = new THREE.ExtrudeGeometry(ceilingShape, { depth: 0.1, bevelEnabled: false });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = height;
        ceiling.receiveShadow = true;
        room1.add(ceiling);
    
        // Glass Wall (Circular with Natural Light)
        const glassSegments = 12;
        for (let i = 0; i < glassSegments; i++) {
            const angle = (i / glassSegments) * Math.PI * 2;
            const windowWidth = (Math.PI * 2 * radius) / glassSegments;
            const window = new THREE.Mesh(
                new THREE.PlaneGeometry(windowWidth, height),
                glassMaterial
            );
            window.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
            window.rotation.y = angle + Math.PI / 2;
            room1.add(window);
    
            // Add light to simulate natural light from windows
            const windowLight = new THREE.PointLight(0xffffff, 0.8, 10);
            windowLight.position.set(Math.cos(angle) * (radius + 1), height / 2, Math.sin(angle) * (radius + 1));
            room1.add(windowLight);
        }
    
        // Living Wall (Vertical Garden)
        const greenWallHeight = 5;
        const greenWallWidth = 3;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
            const greenWall = new THREE.Mesh(
                new THREE.PlaneGeometry(greenWallWidth, greenWallHeight),
                greenWallMaterial
            );
            greenWall.position.set(Math.cos(angle) * (radius - 0.5), greenWallHeight / 2, Math.sin(angle) * (radius - 0.5));
            greenWall.rotation.y = angle + Math.PI / 2;
            room1.add(greenWall);
    
            // Add cascading plants (simplified as cones)
            for (let j = 0; j < 3; j++) {
                const plant = new THREE.Mesh(
                    new THREE.ConeGeometry(0.3, 0.5, 16),
                    greenWallMaterial
                );
                plant.position.set(
                    Math.cos(angle) * (radius - 0.3) + Math.cos(angle + Math.PI / 2) * (j - 1) * 0.5,
                    greenWallHeight - 0.5 - j * 0.5,
                    Math.sin(angle) * (radius - 0.3) + Math.sin(angle + Math.PI / 2) * (j - 1) * 0.5
                );
                plant.rotation.x = Math.PI / 2;
                room1.add(plant);
            }
        }
    
        // Central Water Feature (Reflective Pool)
        const poolGeometry = new THREE.CircleGeometry(2, 32);
        const pool = new THREE.Mesh(poolGeometry, waterMaterial);
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.05;
        pool.receiveShadow = true;
        room1.add(pool);
    
        // Central Sculptural Pillar with Organic Shape
        const pillarPoints = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.8, 1),
            new THREE.Vector2(0.6, 3),
            new THREE.Vector2(0.8, 5),
            new THREE.Vector2(0, height)
        ];
        const pillarGeometry = new THREE.LatheGeometry(pillarPoints, 32);
        const pillar = new THREE.Mesh(pillarGeometry, wallMaterial);
        pillar.position.set(0, 0, 0);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        room1.add(pillar);
    
        // Sculptural Elements
        const sculptureGeometry = new THREE.LatheGeometry([
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.5, 1),
            new THREE.Vector2(0, 2),
            new THREE.Vector2(-0.5, 1)
        ], 32);
        const sculptureMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.4 });
        const sculpture1 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture1.position.set(-5, 1, 0);
        sculpture1.scale.set(1, 2, 1);
        sculpture1.castShadow = true;
        sculpture1.receiveShadow = true;
        room1.add(sculpture1);
    
        const sculpture2 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture2.position.set(5, 1, 0);
        sculpture2.rotation.y = Math.PI / 2;
        sculpture2.scale.set(1, 1.5, 1);
        sculpture2.castShadow = true;
        sculpture2.receiveShadow = true;
        room1.add(sculpture2);
    
        // Plants
        const plantGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 32);
        const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const plantPot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        plantPot1.position.set(-3, 0.15, -5);
        room1.add(plantPot1);
        const plant1 = new THREE.Mesh(plantGeometry, plantMaterial);
        plant1.position.set(-3, 0.65, -5);
        room1.add(plant1);
    
        const plantPot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        plantPot2.position.set(3, 0.15, 5);
        room1.add(plantPot2);
        const plant2 = new THREE.Mesh(plantGeometry, plantMaterial);
        plant2.position.set(3, 0.65, 5);
        room1.add(plant2);
    
        // Benches
        const benchSeatGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const benchBackGeometry = new THREE.BoxGeometry(2, 0.8, 0.1);
        const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2f2f, roughness: 0.6, metalness: 0 });
        const bench1Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench1Seat.position.set(-7, 0.1, 7);
        bench1Seat.castShadow = true;
        bench1Seat.receiveShadow = true;
        room1.add(bench1Seat);
        const bench1Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench1Back.position.set(-7, 0.5, 7.45);
        bench1Back.castShadow = true;
        bench1Back.receiveShadow = true;
        room1.add(bench1Back);
    
        const bench2Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench2Seat.position.set(7, 0.1, -7);
        bench2Seat.castShadow = true;
        bench2Seat.receiveShadow = true;
        room1.add(bench2Seat);
        const bench2Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench2Back.position.set(7, 0.5, -7.45);
        bench2Back.castShadow = true;
        bench2Back.receiveShadow = true;
        room1.add(bench2Back);
    
        room1.position.set(0, 0, 0);
        this.rooms.push(room1);
    
        // Room 2: Secondary Space (simplified)
        const room2 = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        room2.add(floor2);
    
        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMaterial);
        ceiling2.position.set(0, 6, 0);
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        room2.add(ceiling2);
    
        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial)
        ];
        walls2[0].position.set(0, 3, -6);
        walls2[1].position.set(0, 3, 6);
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-6, 3, 0);
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(6, 3, 0);
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            room2.add(wall);
        });
    
        const door2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), glassMaterial);
        door2.position.set(-6, 1.5, 0);
        door2.rotation.y = Math.PI / 2;
        door2.userData = { nextRoom: 0 };
        room2.add(door2);
    
        room2.position.set(18, 0, 0);
        this.rooms.push(room2);
    
        this.rooms.forEach(room => this.scene.add(room));
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
        // Update water shader
        const pool = this.rooms[0].children.find(child => child.material instanceof THREE.ShaderMaterial);
        if (pool) pool.material.uniforms.time.value = this.time;
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
                const spotlight = img.mesh.parent.children.find(child => child instanceof THREE.SpotLight && child.target === img.mesh);
                if (spotlight) {
                    spotlight.intensity = 2.0 + Math.sin(this.time * 2 + index) * 0.2;
                }
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7;
            const maxX = roomBounds.x + 7;
            const minZ = roomBounds.z - 7;
            const maxZ = roomBounds.z + 7;

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
                this.displayImagesInGallery();
            }
        };
        requestAnimationFrame(animateMove);
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 12; // Limit to 12 images per room

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 15 : 12;
        const displayWidth = 3.5;
        const displayHeight = 2.5;
        const displayDepth = 0.2;
        const spacing = 1.0; // Increased spacing for 3D models
        const imageOffset = 0.1;
        const backWallOffset = 0.3;
        const numImagesPerWall = Math.floor(wallLength / (displayWidth + spacing));
        const maxImagesInRoom = Math.min(12, numImagesPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 2, -wallLength / 2 + backWallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-wallLength / 2 + backWallOffset, 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(wallLength / 2 - backWallOffset, 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, 2, wallLength / 2 - backWallOffset), rot: Math.PI, dir: 'x' }
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numImagesPerWall && imageIndex < totalImages && this.images.length < maxImagesInRoom; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * (wallLength / numImagesPerWall);
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }

            for (let { pos, rot } of wallPositions) {
                try {
                    const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 },
                                time: { value: 0.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                uniform float time;
                                varying vec2 vUv;
                                varying vec3 vNormal;
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
                    const maxWidth = 3.5;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    // Use 3D BoxGeometry instead of PlaneGeometry
                    const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = { filename: this.imagesToLoad[imageIndex] };
                    room.add(mesh);
                    this.images.push({ mesh, filename: this.imagesToLoad[imageIndex] });

                    // 3D Frame using ExtrudeGeometry
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
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        room === this.rooms[0] ? 4.5 : 3.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${this.imagesToLoad[imageIndex]}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7 + 1;
            const maxX = roomBounds.x + 7 - 1;
            const minZ = roomBounds.z - 7 + 1;
            const maxZ = roomBounds.z + 7 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 10 / zoomLevel;
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
                await this.loadImages(this.sessionId);
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
                await this.loadImages(this.sessionId);
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
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



#MODERN ARCHITECHTURE 3

import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
            { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) },
            { position: new THREE.Vector3(18, 1.6, 5), lookAt: new THREE.Vector3(18, 1.6, 0) }
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 10;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
    }

    createGallery() {
        // Define concrete properties
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;
    
        // Define concrete material for the pillar
        const concreteMaterial = new THREE.MeshStandardMaterial({
            color: concreteColor,
            roughness: concreteRoughness,
            metalness: concreteMetalness
        });
    
        // Materials
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0d8c8, // Light wooden floor for biophilic warmth
            roughness: 0.3,
            metalness: 0.1
        });
        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(10, 10);
        floorMaterial.map = noiseTexture;
    
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White ceiling with organic pattern
            roughness: 0.4,
            metalness: 0.1
        });
    
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87ceeb, // Sky blue tint for glass to mimic natural light
            transparent: true,
            opacity: 0.3,
            roughness: 0,
            metalness: 0.1,
            transmission: 0.9
        });
    
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White walls
            roughness: 0.3,
            metalness: 0.0
        });
    
        const greenWallMaterial = new THREE.MeshStandardMaterial({
            color: 0x228b22, // Lush green for living walls
            roughness: 0.6,
            metalness: 0.0
        });
    
       // In createGallery, update the waterMaterial to use a shader
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        color: { value: new THREE.Color(0x87ceeb) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            float wave = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 + time) * 0.1;
            gl_FragColor = vec4(color + wave, 0.8);
        }
    `,
    transparent: true
});
    
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // Metallic gray for frames and accents
            roughness: 0.3,
            metalness: 0.8
        });
    
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b, // Dark wood for furniture
            roughness: 0.7,
            metalness: 0.0
        });
    
        // Room 1: Main Gallery Space with Biophilic Elements
        const room1 = new THREE.Group();
        const roomWidth = 20;
        const roomDepth = 15;
        const roomHeight = 6;
    
        // Floor
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.position.y = 0;
        floor1.receiveShadow = true;
        room1.add(floor1);
    
        // Organic Arched Ceiling with Glass Windows
        const arcSegments = 20;
        const arcHeight = 2;
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-roomWidth / 2, roomHeight - arcHeight, -roomDepth / 2),
            new THREE.Vector3(0, roomHeight, -roomDepth / 2),
            new THREE.Vector3(roomWidth / 2, roomHeight - arcHeight, -roomDepth / 2)
        ]);
        const ceilingShape = new THREE.Shape([
            new THREE.Vector2(-roomWidth / 2, -roomDepth / 2),
            new THREE.Vector2(roomWidth / 2, -roomDepth / 2),
            new THREE.Vector2(roomWidth / 2, roomDepth / 2),
            new THREE.Vector2(-roomWidth / 2, roomDepth / 2)
        ]);
        const ceilingGeometry = new THREE.ExtrudeGeometry(ceilingShape, { depth: 0.1, bevelEnabled: false, extrudePath: curve });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = roomHeight;
        ceiling.receiveShadow = true;
        room1.add(ceiling);
    
        // Glass Windows for Natural Light
        const windowWidth = 4;
        const windowHeight = 4;
        for (let i = -1; i <= 1; i++) {
            const window = new THREE.Mesh(
                new THREE.PlaneGeometry(windowWidth, windowHeight),
                glassMaterial
            );
            window.position.set(i * (windowWidth + 1), roomHeight / 2, -roomDepth / 2 + 0.1);
            window.rotation.y = Math.PI;
            room1.add(window);
    
            // Add light to simulate natural light from windows
            const windowLight = new THREE.PointLight(0xffffff, 0.8, 10);
            windowLight.position.set(i * (windowWidth + 1), roomHeight / 2, -roomDepth / 2 - 1);
            room1.add(windowLight);
        }
    
        // Walls
        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial), // Front wall
            new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMaterial), // Left wall
            new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMaterial)  // Right wall
        ];
        walls1[0].position.set(0, roomHeight / 2, -roomDepth / 2);
        walls1[1].position.set(0, roomHeight / 2, roomDepth / 2);
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-roomWidth / 2, roomHeight / 2, 0);
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(roomWidth / 2, roomHeight / 2, 0);
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach(wall => {
            wall.receiveShadow = true;
            room1.add(wall);
        });
    
        // Living Wall (Biophilic Element)
        const greenWallHeight = 4;
        const greenWallWidth = roomWidth;
        const greenWall = new THREE.Mesh(
            new THREE.PlaneGeometry(greenWallWidth, greenWallHeight),
            greenWallMaterial
        );
        greenWall.position.set(0, greenWallHeight / 2, -roomDepth / 2 + 0.2);
        greenWall.rotation.y = Math.PI;
        room1.add(greenWall);
    
        // Add cascading plants on the living wall
        for (let i = -2; i <= 2; i++) {
            const plant = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 0.5, 16),
                greenWallMaterial
            );
            plant.position.set(i * 2, greenWallHeight - 0.5, -roomDepth / 2 + 0.3);
            plant.rotation.x = Math.PI / 2;
            room1.add(plant);
        }
    
        // Central Pillar
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, roomHeight, 32);
        const pillar = new THREE.Mesh(pillarGeometry, concreteMaterial);
        pillar.position.set(0, roomHeight / 2, 0);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        room1.add(pillar);
    
        // Central Water Feature (Reflective Pool)
        const poolGeometry = new THREE.CircleGeometry(1.5, 32);
        const pool = new THREE.Mesh(poolGeometry, waterMaterial);
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.05;
        pool.receiveShadow = true;
        room1.add(pool);
    
        // Sculptural Elements
        const sculptureGeometry = new THREE.LatheGeometry([
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.5, 1),
            new THREE.Vector2(0, 2),
            new THREE.Vector2(-0.5, 1)
        ], 32);
        const sculptureMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.4 });
        const sculpture1 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture1.position.set(-3, 1, 2);
        sculpture1.scale.set(1, 2, 1);
        sculpture1.castShadow = true;
        sculpture1.receiveShadow = true;
        room1.add(sculpture1);
    
        const sculpture2 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture2.position.set(3, 1, -2);
        sculpture2.rotation.y = Math.PI / 2;
        sculpture2.scale.set(1, 1.5, 1);
        sculpture2.castShadow = true;
        sculpture2.receiveShadow = true;
        room1.add(sculpture2);
    
        // Additional Plants
        const plantGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 32);
        const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const plantPot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        plantPot1.position.set(-5, 0.15, 5);
        room1.add(plantPot1);
        const plant1 = new THREE.Mesh(plantGeometry, plantMaterial);
        plant1.position.set(-5, 0.65, 5);
        room1.add(plant1);
    
        const plantPot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        plantPot2.position.set(5, 0.15, -5);
        room1.add(plantPot2);
        const plant2 = new THREE.Mesh(plantGeometry, plantMaterial);
        plant2.position.set(5, 0.65, -5);
        room1.add(plant2);
    
        // Benches
        const benchSeatGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const benchBackGeometry = new THREE.BoxGeometry(2, 0.8, 0.1);
        const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2f2f, roughness: 0.6, metalness: 0 });
        const bench1Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench1Seat.position.set(-5, 0.1, 5);
        bench1Seat.castShadow = true;
        bench1Seat.receiveShadow = true;
        room1.add(bench1Seat);
        const bench1Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench1Back.position.set(-5, 0.5, 5.45);
        bench1Back.castShadow = true;
        bench1Back.receiveShadow = true;
        room1.add(bench1Back);
    
        const bench2Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench2Seat.position.set(5, 0.1, -5);
        bench2Seat.castShadow = true;
        bench2Seat.receiveShadow = true;
        room1.add(bench2Seat);
        const bench2Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench2Back.position.set(5, 0.5, -5.45);
        bench2Back.castShadow = true;
        bench2Back.receiveShadow = true;
        room1.add(bench2Back);
    
        room1.position.set(0, 0, 0);
        this.rooms.push(room1);
    
        // Room 2: Secondary Space (simplified)
        const room2 = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        room2.add(floor2);
    
        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMaterial);
        ceiling2.position.set(0, 6, 0);
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        room2.add(ceiling2);
    
        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial)
        ];
        walls2[0].position.set(0, 3, -6);
        walls2[1].position.set(0, 3, 6);
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-6, 3, 0);
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(6, 3, 0);
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            room2.add(wall);
        });
    
        const door2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), glassMaterial);
        door2.position.set(-6, 1.5, 0);
        door2.rotation.y = Math.PI / 2;
        door2.userData = { nextRoom: 0 };
        room2.add(door2);
    
        room2.position.set(18, 0, 0);
        this.rooms.push(room2);
    
        this.rooms.forEach(room => this.scene.add(room));
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
    
        // Update water shader
        const pool = this.rooms[0].children.find(child => child.material instanceof THREE.ShaderMaterial);
        if (pool) pool.material.uniforms.time.value = this.time;
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
                const spotlight = img.mesh.parent.children.find(child => child instanceof THREE.SpotLight && child.target === img.mesh);
                if (spotlight) {
                    spotlight.intensity = 2.0 + Math.sin(this.time * 2 + index) * 0.2;
                }
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7;
            const maxX = roomBounds.x + 7;
            const minZ = roomBounds.z - 7;
            const maxZ = roomBounds.z + 7;

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
                this.displayImagesInGallery();
            }
        };
        requestAnimationFrame(animateMove);
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 12; // Limit to 12 images per room

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 15 : 12;
        const displayWidth = 3.5;
        const displayHeight = 2.5;
        const displayDepth = 0.2;
        const spacing = 1.0; // Increased spacing for 3D models
        const imageOffset = 0.1;
        const backWallOffset = 0.3;
        const numImagesPerWall = Math.floor(wallLength / (displayWidth + spacing));
        const maxImagesInRoom = Math.min(12, numImagesPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 2, -wallLength / 2 + backWallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-wallLength / 2 + backWallOffset, 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(wallLength / 2 - backWallOffset, 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, 2, wallLength / 2 - backWallOffset), rot: Math.PI, dir: 'x' }
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numImagesPerWall && imageIndex < totalImages && this.images.length < maxImagesInRoom; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * (wallLength / numImagesPerWall);
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }

            for (let { pos, rot } of wallPositions) {
                try {
                    const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 },
                                time: { value: 0.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                uniform float time;
                                varying vec2 vUv;
                                varying vec3 vNormal;
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
                    const maxWidth = 3.5;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    // Use 3D BoxGeometry instead of PlaneGeometry
                    const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = { filename: this.imagesToLoad[imageIndex] };
                    room.add(mesh);
                    this.images.push({ mesh, filename: this.imagesToLoad[imageIndex] });

                    // 3D Frame using ExtrudeGeometry
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
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        room === this.rooms[0] ? 4.5 : 3.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${this.imagesToLoad[imageIndex]}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7 + 1;
            const maxX = roomBounds.x + 7 - 1;
            const minZ = roomBounds.z - 7 + 1;
            const maxZ = roomBounds.z + 7 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 10 / zoomLevel;
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
                await this.loadImages(this.sessionId);
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
                await this.loadImages(this.sessionId);
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
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



# interior decorators support project

import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";

// Custom Pointer Lock Controls for smooth navigation
class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
    }

    onMouseMove(event) {
        if (this.isLocked) {
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

class InteriorDesignSimulator {
    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 5); // Eye-level starting position
        this.camera.lookAt(0, 1.6, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Controls for navigation
        this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
        this.moveSpeed = 0.1;
        this.keys = { w: false, a: false, s: false, d: false };

        // Texture loader
        this.textureLoader = new THREE.TextureLoader();

        // Design elements storage
        this.designElements = [];
        this.time = 0;

        // Initialize the simulation
        this.addLighting();
        this.createHouse();
        this.setupEventListeners();
    }

    addLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light to simulate sunlight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048, 2048);
        this.scene.add(directionalLight);
    }

    createHouse() {
        // Define materials for the house structure
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.3 });
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

        // Room dimensions (living room example)
        const roomWidth = 10, roomDepth = 8, roomHeight = 3;

        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(roomWidth, roomDepth),
            floorMaterial
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const walls = [
            new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial), // Back
            new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial), // Front
            new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMaterial), // Left
            new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMaterial)  // Right
        ];
        walls[0].position.set(0, roomHeight / 2, -roomDepth / 2);
        walls[1].position.set(0, roomHeight / 2, roomDepth / 2);
        walls[1].rotation.y = Math.PI;
        walls[2].position.set(-roomWidth / 2, roomHeight / 2, 0);
        walls[2].rotation.y = Math.PI / 2;
        walls[3].position.set(roomWidth / 2, roomHeight / 2, 0);
        walls[3].rotation.y = -Math.PI / 2;
        walls.forEach(wall => {
            wall.receiveShadow = true;
            this.scene.add(wall);
            this.designElements.push(wall); // Allow wall customization
        });

        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(roomWidth, roomDepth),
            ceilingMaterial
        );
        ceiling.position.set(0, roomHeight, 0);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.receiveShadow = true;
        this.scene.add(ceiling);

        // Add initial design elements (e.g., furniture)
        this.addDesignElements();
    }

    async addDesignElements() {
        // Example: Sofa
        const sofaTexture = await this.textureLoader.load("https://via.placeholder.com/512x512.png?text=Sofa");
        const sofa = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.8, 1),
            new THREE.MeshStandardMaterial({ map: sofaTexture })
        );
        sofa.position.set(-2, 0.4, -2);
        sofa.castShadow = true;
        sofa.receiveShadow = true;
        sofa.userData = { type: "furniture", name: "sofa" };
        this.scene.add(sofa);
        this.designElements.push(sofa);

        // Example: Coffee Table
        const table = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.5, 1),
            new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 })
        );
        table.position.set(0, 0.25, 0);
        table.castShadow = true;
        table.receiveShadow = true;
        table.userData = { type: "furniture", name: "table" };
        this.scene.add(table);
        this.designElements.push(table);
    }

    setupEventListeners() {
        // Lock controls on click
        this.renderer.domElement.addEventListener("click", () => {
            if (!this.controls.isLocked) this.controls.lock();
        });

        // Keyboard controls for movement
        document.addEventListener("keydown", (event) => this.onKeyDown(event));
        document.addEventListener("keyup", (event) => this.onKeyUp(event));

        // Pointer lock state
        document.addEventListener("pointerlockchange", () => {
            this.controls.isLocked = document.pointerLockElement === this.renderer.domElement;
        });

        // Customization controls (simulating designer input)
        document.addEventListener("keypress", (event) => this.onKeyPress(event));

        // Resize handling
        window.addEventListener("resize", () => this.handleResize());
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

    onKeyPress(event) {
        // Simulate designer customization (e.g., change wall color, move furniture)
        switch (event.key) {
            case "1": // Change wall color
                this.designElements.forEach(el => {
                    if (el.geometry instanceof THREE.PlaneGeometry && el.position.y > 0) {
                        el.material.color.setHex(Math.random() * 0xffffff);
                    }
                });
                break;
            case "2": // Move sofa
                const sofa = this.designElements.find(el => el.userData.name === "sofa");
                if (sofa) sofa.position.x += 0.5;
                break;
            case "3": // Change table texture
                const table = this.designElements.find(el => el.userData.name === "table");
                if (table) table.material.color.setHex(0x4682b4);
                break;
        }
    }

    update() {
        if (this.controls.isLocked) {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            direction.y = 0;
            direction.normalize();

            const movement = new THREE.Vector3();
            if (this.keys.w) movement.addScaledVector(direction, this.moveSpeed);
            if (this.keys.s) movement.addScaledVector(direction, -this.moveSpeed);
            if (this.keys.a) movement.addScaledVector(new THREE.Vector3().crossVectors(this.camera.up, direction), -this.moveSpeed);
            if (this.keys.d) movement.addScaledVector(new THREE.Vector3().crossVectors(this.camera.up, direction), this.moveSpeed);

            this.camera.position.add(movement);
            this.checkCollisions();
        }
    }

    checkCollisions() {
        // Simple boundary check to keep camera inside the room
        const roomWidth = 10, roomDepth = 8;
        this.camera.position.x = Math.max(-roomWidth / 2 + 0.5, Math.min(roomWidth / 2 - 0.5, this.camera.position.x));
        this.camera.position.z = Math.max(-roomDepth / 2 + 0.5, Math.min(roomDepth / 2 - 0.5, this.camera.position.z));
        this.camera.position.y = 1.6; // Fixed height
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    init() {
        console.log("🏠 Interior Design Simulator Loaded");
        this.animate();
    }
}

// Start the simulator
const simulator = new InteriorDesignSimulator();
simulator.init();



#new file 13th nature design

import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
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
        const skyboxGeometry = new THREE.SphereGeometry(50, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x87ceeb,
        side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.scene.add(skybox);
        this.roomCameraSettings = [
            { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) },
            { position: new THREE.Vector3(18, 1.6, 5), lookAt: new THREE.Vector3(18, 1.6, 0) }
        ];
        const initialSettings = this.roomCameraSettings[0];
        this.camera.position.copy(initialSettings.position);
        this.camera.lookAt(initialSettings.lookAt);

        this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setClearColor(0x000000, 1);
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
            this.controls.maxDistance = 10;
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
        } else {
            this.controls = new CustomPointerLockControls(this.camera, this.renderer.domElement);
            this.controls.getObject().position.copy(initialSettings.position);
        }

        this.images = [];
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

        this.time = 0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
    }

    createGallery() {
        // Define concrete properties
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;
    
        // Define concrete material for the pillar
        const concreteMaterial = new THREE.MeshStandardMaterial({
            color: concreteColor,
            roughness: concreteRoughness,
            metalness: concreteMetalness
        });
    
        // Materials
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0d8c8, // Light wooden floor for biophilic warmth
            roughness: 0.3,
            metalness: 0.1
        });
        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(10, 10);
        floorMaterial.map = noiseTexture;
    
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White ceiling with organic pattern
            roughness: 0.4,
            metalness: 0.1
        });
    
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87ceeb, // Sky blue tint for glass to mimic natural light
            transparent: true,
            opacity: 0.3,
            roughness: 0,
            metalness: 0.1,
            transmission: 0.9
        });
    
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White walls
            roughness: 0.3,
            metalness: 0.0
        });
    
        const greenWallMaterial = new THREE.MeshStandardMaterial({
            color: 0x228b22, // Lush green for living walls
            roughness: 0.6,
            metalness: 0.0
        });
    
       // In createGallery, update the waterMaterial to use a shader
// const waterMaterial = new THREE.ShaderMaterial({
//     uniforms: {
//         time: { value: 0.0 },
//         color: { value: new THREE.Color(0x87ceeb) }
//     },
//     vertexShader: `
//         varying vec2 vUv;
//         void main() {
//             vUv = uv;
//             gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//         }
//     `,
//     fragmentShader: `
//         uniform float time;
//         uniform vec3 color;
//         varying vec2 vUv;
//         void main() {
//             vec2 uv = vUv;
//             float wave = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 + time) * 0.1;
//             gl_FragColor = vec4(color + wave, 0.8);
//         }
//     `,
//     transparent: false
// });
    
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // Metallic gray for frames and accents
            roughness: 0.3,
            metalness: 0.8
        });
    
        // const woodMaterial = new THREE.MeshStandardMaterial({
        //     color: 0x8b5a2b, // Dark wood for furniture
        //     roughness: 0.7,
        //     metalness: 0.0
        // });
    
        // Room 1: Main Gallery Space with Biophilic Elements
        const room1 = new THREE.Group();
        const roomWidth = 20;
        const roomDepth = 15;
        const roomHeight = 6;
    
        // Floor
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.position.y = 0;
        floor1.receiveShadow = true;
        room1.add(floor1);
    
        // Organic Arched Ceiling with Glass Windows
        const arcSegments = 20;
        const arcHeight = 2;
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-roomWidth / 2, roomHeight - arcHeight, -roomDepth / 2),
            new THREE.Vector3(0, roomHeight, -roomDepth / 2),
            new THREE.Vector3(roomWidth / 2, roomHeight - arcHeight, -roomDepth / 2)
        ]);
        const ceilingShape = new THREE.Shape([
            new THREE.Vector2(-roomWidth / 2, -roomDepth / 2),
            new THREE.Vector2(roomWidth / 2, -roomDepth / 2),
            new THREE.Vector2(roomWidth / 2, roomDepth / 2),
            new THREE.Vector2(-roomWidth / 2, roomDepth / 2)
        ]);
        const ceilingGeometry = new THREE.ExtrudeGeometry(ceilingShape, { depth: 0.1, bevelEnabled: false, extrudePath: curve });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = roomHeight;
        ceiling.receiveShadow = true;
        room1.add(ceiling);
    
        // Glass Windows for Natural Light
        const windowWidth = 4;
        const windowHeight = 4;
        for (let i = -1; i <= 1; i++) {
            const window = new THREE.Mesh(
                new THREE.PlaneGeometry(windowWidth, windowHeight),
                glassMaterial
            );
            window.position.set(i * (windowWidth + 1), roomHeight / 2, -roomDepth / 2 + 0.1);
            window.rotation.y = Math.PI;
            room1.add(window);
    
            // Add light to simulate natural light from windows
            const windowLight = new THREE.PointLight(0xffffff, 0.8, 10);
            windowLight.position.set(i * (windowWidth + 1), roomHeight / 2, -roomDepth / 2 - 1);
            room1.add(windowLight);
        }
    
        // Walls
        const walls1 = [
            new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial), // Back wall
            new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial), // Front wall
            new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMaterial), // Left wall
            new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMaterial)  // Right wall
        ];
        walls1[0].position.set(0, roomHeight / 2, -roomDepth / 2);
        walls1[1].position.set(0, roomHeight / 2, roomDepth / 2);
        walls1[1].rotation.y = Math.PI;
        walls1[2].position.set(-roomWidth / 2, roomHeight / 2, 0);
        walls1[2].rotation.y = Math.PI / 2;
        walls1[3].position.set(roomWidth / 2, roomHeight / 2, 0);
        walls1[3].rotation.y = -Math.PI / 2;
        walls1.forEach(wall => {
            wall.receiveShadow = true;
            room1.add(wall);
        });
    
        // Living Wall (Biophilic Element)
        const greenWallHeight = 4;
        const greenWallWidth = roomWidth;
        const greenWall = new THREE.Mesh(
            new THREE.PlaneGeometry(greenWallWidth, greenWallHeight),
            greenWallMaterial
        );
        greenWall.position.set(0, greenWallHeight / 2, -roomDepth / 2 + 0.2);
        greenWall.rotation.y = Math.PI;
        room1.add(greenWall);
    
        // Add cascading plants on the living wall
        for (let i = -2; i <= 2; i++) {
            const plant = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 0.5, 16),
                greenWallMaterial
            );
            plant.position.set(i * 2, greenWallHeight - 0.5, -roomDepth / 2 + 0.3);
            plant.rotation.x = Math.PI / 2;
            room1.add(plant);
        }
    
        // Central Pillar
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, roomHeight, 32);
        const pillar = new THREE.Mesh(pillarGeometry, concreteMaterial);
        pillar.position.set(0, roomHeight / 2, 0);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        room1.add(pillar);
    
        // Central Water Feature (Reflective Pool)
        // const poolGeometry = new THREE.CircleGeometry(1.5, 32);
        // const pool = new THREE.Mesh(poolGeometry, waterMaterial);
        // pool.rotation.x = -Math.PI / 2;
        // pool.position.y = 0.05;
        // pool.receiveShadow = true;
        // room1.add(pool);
    
        // Sculptural Elements
        const sculptureGeometry = new THREE.LatheGeometry([
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.5, 1),
            new THREE.Vector2(0, 2),
            new THREE.Vector2(-0.5, 1)
        ], 32);
        const sculptureMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.4 });
        const sculpture1 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture1.position.set(-3, 1, 2);
        sculpture1.scale.set(1, 2, 1);
        sculpture1.castShadow = true;
        sculpture1.receiveShadow = true;
        room1.add(sculpture1);
    
        const sculpture2 = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
        sculpture2.position.set(3, 1, -2);
        sculpture2.rotation.y = Math.PI / 2;
        sculpture2.scale.set(1, 1.5, 1);
        sculpture2.castShadow = true;
        sculpture2.receiveShadow = true;
        room1.add(sculpture2);
    
        // Additional Plants
        // const plantGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 32);
        // const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        // const plantPot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        // plantPot1.position.set(-5, 0.15, 5);
        // room1.add(plantPot1);
        // const plant1 = new THREE.Mesh(plantGeometry, plantMaterial);
        // plant1.position.set(-5, 0.65, 5);
        // room1.add(plant1);
    
        // const plantPot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32), woodMaterial);
        // plantPot2.position.set(5, 0.15, -5);
        // room1.add(plantPot2);
        // const plant2 = new THREE.Mesh(plantGeometry, plantMaterial);
        // plant2.position.set(5, 0.65, -5);
        // room1.add(plant2);
    
        // Benches
        const benchSeatGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const benchBackGeometry = new THREE.BoxGeometry(2, 0.8, 0.1);
        const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2f2f, roughness: 0.6, metalness: 0 });
        const bench1Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench1Seat.position.set(-5, 0.1, 5);
        bench1Seat.castShadow = true;
        bench1Seat.receiveShadow = true;
        room1.add(bench1Seat);
        const bench1Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench1Back.position.set(-5, 0.5, 5.45);
        bench1Back.castShadow = true;
        bench1Back.receiveShadow = true;
        room1.add(bench1Back);
    
        const bench2Seat = new THREE.Mesh(benchSeatGeometry, benchMaterial);
        bench2Seat.position.set(5, 0.1, -5);
        bench2Seat.castShadow = true;
        bench2Seat.receiveShadow = true;
        room1.add(bench2Seat);
        const bench2Back = new THREE.Mesh(benchBackGeometry, benchMaterial);
        bench2Back.position.set(5, 0.5, -5.45);
        bench2Back.castShadow = true;
        bench2Back.receiveShadow = true;
        room1.add(bench2Back);
    
        room1.position.set(0, 0, 0);
        this.rooms.push(room1);
    
        // Room 2: Secondary Space (simplified)
        const room2 = new THREE.Group();
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.receiveShadow = true;
        room2.add(floor2);
    
        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMaterial);
        ceiling2.position.set(0, 6, 0);
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.receiveShadow = true;
        room2.add(ceiling2);
    
        const walls2 = [
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMaterial)
        ];
        walls2[0].position.set(0, 3, -6);
        walls2[1].position.set(0, 3, 6);
        walls2[1].rotation.y = Math.PI;
        walls2[2].position.set(-6, 3, 0);
        walls2[2].rotation.y = Math.PI / 2;
        walls2[3].position.set(6, 3, 0);
        walls2[3].rotation.y = -Math.PI / 2;
        walls2.forEach(wall => {
            wall.receiveShadow = true;
            room2.add(wall);
        });
    
        const door2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), glassMaterial);
        door2.position.set(-6, 1.5, 0);
        door2.rotation.y = Math.PI / 2;
        door2.userData = { nextRoom: 0 };
        room2.add(door2);
    
        room2.position.set(18, 0, 0);
        this.rooms.push(room2);
    
        this.rooms.forEach(room => this.scene.add(room));
    }

    generateNoiseCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(width, height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.1 + 0.9;
            imageData.data[i] = 136 * noise;
            imageData.data[i + 1] = 136 * noise;
            imageData.data[i + 2] = 136 * noise;
            imageData.data[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
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
            const backgroundBuffer = await this.loadAudio('sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('sweet.mp3');
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
        console.log("🚀 Virtual Gallery loaded");
        this.setupEventListeners();
        if (this.sessionId) this.loadImages(this.sessionId);
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.update();
        this.updateImageEffects();
        this.renderer.render(this.scene, this.camera);
        if (this.isMobile) this.controls.update();
        this.updateAvatarPosition();
    
        // Update water shader
        const pool = this.rooms[0].children.find(child => child.material instanceof THREE.ShaderMaterial);
        if (pool) pool.material.uniforms.time.value = this.time;
    }

    updateImageEffects() {
        this.images.forEach((img, index) => {
            if (img.mesh.material.uniforms) {
                img.mesh.material.uniforms.time.value = this.time + index;
                const spotlight = img.mesh.parent.children.find(child => child instanceof THREE.SpotLight && child.target === img.mesh);
                if (spotlight) {
                    spotlight.intensity = 2.0 + Math.sin(this.time * 2 + index) * 0.2;
                }
            }
        });
    }

    setupEventListeners() {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialOverlay";
        tutorial.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.7); padding:20px; border-radius:5px; z-index:11; text-align:center;";
        if (this.isMobile) {
            tutorial.innerHTML = "Swipe to look around, pinch to zoom, tap artwork to focus, tap avatar for help.";
        } else {
            tutorial.innerHTML = "Click to enter the gallery. Use W, A, S, D to move, mouse to look, double-click art to focus, click avatar for help.";
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
        toggleButton.querySelector("i") && (toggleButton.querySelector("i").className = this.controlsVisible ? "fas fa-eye" : "fas fa-eye-slash");
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
            this.camera.position.y = 1.6;
            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7;
            const maxX = roomBounds.x + 7;
            const minZ = roomBounds.z - 7;
            const maxZ = roomBounds.z + 7;

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
                this.displayImagesInGallery();
            }
        };
        requestAnimationFrame(animateMove);
    }

    async loadImages(sessionId) {
        try {
            const response = await fetch(`http://localhost:3000/api/screenshots/${sessionId}/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("📸 Found images in session", sessionId + ":", data.screenshots);
            if (!data.screenshots?.length) {
                console.log("No screenshots found");
                this.imagesToLoad = [
                    "https://via.placeholder.com/350x250",
                    "https://via.placeholder.com/350x250"
                ];
            } else {
                this.imagesToLoad = data.screenshots.map(img => `http://localhost:3000${img}`);
            }
            this.displayImagesInGallery();
        } catch (error) {
            console.error("❌ Error fetching images:", error);
            this.imagesToLoad = [
                "https://via.placeholder.com/350x250",
                "https://via.placeholder.com/350x250"
            ];
            this.displayImagesInGallery();
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad) return;

        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = this.currentRoom * 12; // Limit to 12 images per room

        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });

        const room = this.rooms[this.currentRoom];
        const wallLength = room === this.rooms[0] ? 15 : 12;
        const displayWidth = 3.5;
        const displayHeight = 2.5;
        const displayDepth = 0.2;
        const spacing = 1.0; // Increased spacing for 3D models
        const imageOffset = 0.1;
        const backWallOffset = 0.3;
        const numImagesPerWall = Math.floor(wallLength / (displayWidth + spacing));
        const maxImagesInRoom = Math.min(12, numImagesPerWall * 4);

        const wallConfigs = [
            { basePos: new THREE.Vector3(0, 2, -wallLength / 2 + backWallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-wallLength / 2 + backWallOffset, 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(wallLength / 2 - backWallOffset, 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, 2, wallLength / 2 - backWallOffset), rot: Math.PI, dir: 'x' }
        ];

        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages || this.images.length >= maxImagesInRoom) break;

            const wallPositions = [];
            for (let i = 0; i < numImagesPerWall && imageIndex < totalImages && this.images.length < maxImagesInRoom; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * (wallLength / numImagesPerWall);
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }

            for (let { pos, rot } of wallPositions) {
                try {
                    const texture = await this.loadTexture(this.imagesToLoad[imageIndex]);
                    let material;
                    if (texture.image) {
                        material = new THREE.ShaderMaterial({
                            uniforms: {
                                map: { value: texture },
                                opacity: { value: 1.0 },
                                time: { value: 0.0 }
                            },
                            vertexShader: `
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalMatrix * normal;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D map;
                                uniform float opacity;
                                uniform float time;
                                varying vec2 vUv;
                                varying vec3 vNormal;
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
                    const maxWidth = 3.5;
                    const adjustedWidth = Math.min(displayHeight * aspectRatio, maxWidth);

                    // Use 3D BoxGeometry instead of PlaneGeometry
                    const geometry = new THREE.BoxGeometry(adjustedWidth, displayHeight, displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = { filename: this.imagesToLoad[imageIndex] };
                    room.add(mesh);
                    this.images.push({ mesh, filename: this.imagesToLoad[imageIndex] });

                    // 3D Frame using ExtrudeGeometry
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
                    frame.position.z += (rot === 0 ? -displayDepth / 2 : (rot === Math.PI ? displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -displayDepth / 2 : (rot === -Math.PI / 2 ? displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        room === this.rooms[0] ? 4.5 : 3.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 1024;
                    spotlight.shadow.mapSize.height = 1024;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${this.imagesToLoad[imageIndex]}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}:`, this.images.length);
    }

    clearScene() {
        this.images.forEach(img => {
            if (img.mesh.parent) {
                img.mesh.parent.remove(img.mesh);
            }
            img.mesh.geometry.dispose();
            if (img.mesh.material.map) img.mesh.material.map.dispose();
            img.mesh.material.dispose();
        });
        this.images = [];
        this.rooms.forEach(room => {
            const toRemove = room.children.filter(child => 
                child instanceof THREE.SpotLight || 
                (child.material?.color?.getHex() === 0x333333)
            );
            toRemove.forEach(child => {
                room.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        console.log("🗑️ Scene cleared");
    }

    loadTexture(filename) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                filename,
                (texture) => {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
                    texture.needsUpdate = true;
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
            const intersects = this.raycaster.intersectObjects([...this.images.map(img => img.mesh), ...this.scene.children.filter(obj => obj.userData.nextRoom !== undefined || (obj.parent && obj.parent.userData.isAvatar))]);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                } else if (obj.userData.nextRoom !== undefined) {
                    this.moveToRoom(obj.userData.nextRoom);
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = 1.6;
            const distance = 2;
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

            const targetPos = mesh.position.clone().sub(direction.multiplyScalar(2));
            targetPos.y = 1.6;

            const roomBounds = this.rooms[this.currentRoom].position;
            const minX = roomBounds.x - 7 + 1;
            const maxX = roomBounds.x + 7 - 1;
            const minZ = roomBounds.z - 7 + 1;
            const maxZ = roomBounds.z + 7 - 1;

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
        link.download = "gallery_view.png";
        link.click();
    }

    handleZoom() {
        const zoomSlider = document.getElementById("zoomSlider");
        const zoomValue = document.getElementById("zoomValue");
        const zoomLevel = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoomLevel.toFixed(1);
        if (this.isMobile) {
            this.controls.minDistance = 1 / zoomLevel;
            this.controls.maxDistance = 10 / zoomLevel;
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
                await this.loadImages(this.sessionId);
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
                await this.loadImages(this.sessionId);
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
                <h3>Gallery Controls</h3>
                <p>Swipe to look around.</p>
                <p>Pinch to zoom in/out.</p>
                <p>Tap an artwork to focus, tap again to reset.</p>
                <p>Tap Previous/Next Room buttons to navigate.</p>
                <button id="closeInstructions" style="margin-top:10px; padding:5px 10px; background:#1e90ff; border:none; color:white; border-radius:5px; cursor:pointer;">Close</button>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Gallery Controls</h3>
                <p>Click to lock pointer and start exploring.</p>
                <p>Use W, A, S, D to move.</p>
                <p>Mouse to look around.</p>
                <p>Double-click an artwork to focus, double-click again to reset.</p>
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