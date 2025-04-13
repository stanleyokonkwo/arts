import * as THREE from "three";
import { PointerLockControls } from "PointerLockControls";
import { OrbitControls } from "OrbitControls";

class CustomPointerLockControls extends PointerLockControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.sensitivity = 0.001;
        this.camera = camera; // Store camera reference
    }

    getObject() {
        return this.camera;
    }

    lock() {
        console.log("Attempting to lock pointer");
        super.lock();
        this.domElement.ownerDocument.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    unlock() {
        console.log("Unlocking pointer");
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
        this.config = {
            roomSize: 15,
            wallHeight: 5,
            cameraHeight: 1.6,
            initialCameraDistance: 5,
            maxImagesPerWall: null,
            displayWidth: 3.5,
            displayHeight: 2.5,
            displayDepth: 0.2,
            frameThickness: 0.1,
            wallOffset: 0.3,
            lightIntensity: 0.8,
            ambientIntensity: 0.5,
            maxTextureSize: 1024,
        };

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.roomCameraSettings = [
            { position: new THREE.Vector3(0, this.config.cameraHeight, this.config.initialCameraDistance), 
              lookAt: new THREE.Vector3(0, this.config.cameraHeight, 0) }
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
        this.metadata = []; 
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
        this.shareUrl = null;
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
        this.isFocused = false;
        this.isLocked = false;
        this.isSliderActive = false; // Added for slider
        this.sliderImages = []; // Added for slider
        this.currentSliderIndex = 0; // Added for slider

        this.previousCameraState = {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone(),
            target: initialSettings.lookAt.clone()
        };

        this.lastClickTime = 0;
        this.clickDelay = 300;
        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false };
        this.moveSpeed = 0.1;
        this.rotationSpeed = 0.02; // Define rotation speed (adjustable)
       
        
        this.time = 0;
        this.lightWall = null;
        this.interactionCooldown = 0;

        // Animation properties
        this.isRecording = false;
        this.recordedFrames = [];
        this.mediaRecorder = null;
        this.autoRotateSpeed = 0.5;
        this.isAutoRotating = false;
        this.previewContainer = document.getElementById('previewContainer');
        this.animationMixer = new THREE.AnimationMixer(this.scene);
        this.isAnimatingObjects = false;
        this.animationSpeed = 1.0;

        this.addLighting();
        this.createGallery();
        this.setupAudio();
        this.setupEventListeners();
        this.createAvatar();

        this.isLoading = true;
        this.showPreloader();
    }


    showPreloader() {
        const preloader = document.createElement('div');
        preloader.id = 'preloader';
        preloader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1a1a1a;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 24px;
        `;
        preloader.innerHTML = `
            <div>
                <p>Loading Gallery...</p>
                <div style="width: 50px; height: 50px; border: 5px solid #fff; border-top: 5px solid #1e90ff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        `;
        document.body.appendChild(preloader);
    }
    hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.transition = 'opacity 0.5s';
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.remove();
                this.isLoading = false;
            }, 500); // Match transition duration
        }
    }

    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, this.config.ambientIntensity);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, this.config.lightIntensity);
        directionalLight.position.set(0, this.config.wallHeight * 2, this.config.roomSize);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = this.config.roomSize * 3;
        this.scene.add(directionalLight);
    }

    
    createGallery() {
        const concreteColor = 0x888888;
        const concreteRoughness = 0.7;
        const concreteMetalness = 0.1;
    
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: concreteColor,
            roughness: 0.2,
            metalness: concreteMetalness
        });
        const noiseTexture = new THREE.Texture(this.generateNoiseCanvas(256, 256));
        noiseTexture.needsUpdate = true;
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
        noiseTexture.repeat.set(4, 4);
        floorMaterial.map = noiseTexture;
        floorMaterial.normalMap = noiseTexture;
        floorMaterial.normalScale.set(0.05, 0.05);
    
        const waveTexture = new THREE.TextureLoader().load('/wave.jpg');
        waveTexture.wrapS = waveTexture.wrapT = THREE.RepeatWrapping;
        waveTexture.repeat.set(2, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            roughness: 0.4,
            metalness: 0,
            normalMap: waveTexture,
            normalScale: new THREE.Vector2(0.1, 0.1)
        });
    
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
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.3,
            metalness: 0.8
        });
        const acrylicMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.2,
            transmission: 0.9
        });
        const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
        const room = new THREE.Group();
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.config.roomSize, this.config.roomSize), floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        room.add(floor);
    
        // LED strips on the floor
        const ledStripGeometry = new THREE.BoxGeometry(this.config.roomSize, 0.02, 0.1);
        const ledSpacing = this.config.roomSize / 5;
        for (let i = -this.config.roomSize / 2 + ledSpacing; i < this.config.roomSize / 2; i += ledSpacing) {
            const stripX = new THREE.Mesh(ledStripGeometry, ledMaterial);
            stripX.position.set(0, 0.01, i);
            stripX.rotation.x = -Math.PI / 2;
            room.add(stripX);
    
            const stripZ = new THREE.Mesh(ledStripGeometry, ledMaterial);
            stripZ.position.set(i, 0.01, 0);
            stripZ.rotation.x = -Math.PI / 2;
            stripZ.rotation.z = Math.PI / 2;
            room.add(stripZ);
    
            const ledLight = new THREE.PointLight(0xffffff, 0.5, 2);
            ledLight.position.set(i, 0.05, i);
            room.add(ledLight);
        }
    
        // Metal baseboards between wall and floor
        const baseboardHeight = 0.15;
        const baseboardDepth = 0.05;
        const baseboardGeometry = new THREE.BoxGeometry(this.config.roomSize, baseboardHeight, baseboardDepth);
        const wallEdge = this.config.roomSize / 2;
    
        const baseboards = [
            { position: new THREE.Vector3(0, baseboardHeight / 2, -wallEdge + baseboardDepth / 2), rotation: { x: 0, y: 0, z: 0 } },
            { position: new THREE.Vector3(0, baseboardHeight / 2, wallEdge - baseboardDepth / 2), rotation: { x: 0, y: Math.PI, z: 0 } },
            { position: new THREE.Vector3(-wallEdge + baseboardDepth / 2, baseboardHeight / 2, 0), rotation: { x: 0, y: Math.PI / 2, z: 0 } },
            { position: new THREE.Vector3(wallEdge - baseboardDepth / 2, baseboardHeight / 2, 0), rotation: { x: 0, y: -Math.PI / 2, z: 0 } }
        ];
    
        baseboards.forEach(config => {
            const baseboard = new THREE.Mesh(baseboardGeometry, metalMaterial);
            baseboard.position.copy(config.position);
            baseboard.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
            baseboard.castShadow = true;
            baseboard.receiveShadow = true;
            room.add(baseboard);
        });
    
        const hexGeometry = new THREE.CircleGeometry(1, 6);
        const ceilingTileSpacing = this.config.roomSize / 5;
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                if (Math.abs(i) === 2 && Math.abs(j) === 2) continue;
                const panel = new THREE.Mesh(hexGeometry, ceilingMaterial);
                const heightOffset = Math.random() * 0.5 + this.config.wallHeight - 0.5;
                panel.position.set(i * ceilingTileSpacing, heightOffset, j * ceilingTileSpacing);
                panel.rotation.x = Math.PI / 2;
                panel.receiveShadow = true;
                room.add(panel);
    
                const led = new THREE.Mesh(new THREE.CircleGeometry(0.3, 6), ledMaterial);
                led.position.set(i * ceilingTileSpacing, heightOffset - 0.05, j * ceilingTileSpacing);
                led.rotation.x = Math.PI / 2;
                room.add(led);
    
                const panelLight = new THREE.PointLight(0xffffff, 1, this.config.roomSize / 3);
                panelLight.position.set(i * ceilingTileSpacing, heightOffset - 0.1, j * ceilingTileSpacing);
                room.add(panelLight);
            }
        }
    
        const walls = [
            new THREE.Mesh(new THREE.PlaneGeometry(this.config.roomSize, this.config.wallHeight), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(this.config.roomSize, this.config.wallHeight), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(this.config.roomSize, this.config.wallHeight), wallMaterial),
            new THREE.Mesh(new THREE.PlaneGeometry(this.config.roomSize, this.config.wallHeight), wallMaterial)
        ];
        const wallCenter = this.config.wallHeight / 2;
        walls[0].position.set(0, wallCenter, -wallEdge);
        walls[1].position.set(0, wallCenter, wallEdge);
        walls[1].rotation.y = Math.PI;
        walls[2].position.set(-wallEdge, wallCenter, 0);
        walls[2].rotation.y = Math.PI / 2;
        walls[3].position.set(wallEdge, wallCenter, 0);
        walls[3].rotation.y = -Math.PI / 2;
        walls.forEach(wall => {
            wall.receiveShadow = true;
            room.add(wall);
        });
    
        const curvePoints = [];
        const curveSegments = 20;
        for (let i = 0; i <= curveSegments; i++) {
            const angle = (i / curveSegments) * Math.PI;
            const x = Math.cos(angle) * 2 - wallEdge;
            const z = Math.sin(angle) * 2 - wallEdge;
            curvePoints.push(new THREE.Vector3(x, 0, z));
        }
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const glassGeometry = new THREE.ExtrudeGeometry(
            new THREE.Shape([
                new THREE.Vector2(-wallEdge, 0), 
                new THREE.Vector2(wallEdge, 0), 
                new THREE.Vector2(wallEdge, this.config.wallHeight), 
                new THREE.Vector2(-wallEdge, this.config.wallHeight)
            ]),
            { depth: 0.1, extrudePath: curve }
        );
        const curvedWindow = new THREE.Mesh(glassGeometry, glassMaterial);
        curvedWindow.position.set(0, 0, 0);
        room.add(curvedWindow);
    
        const metalStripGeometry = new THREE.BoxGeometry(0.05, this.config.wallHeight, 0.05);
        const stripSpacing = this.config.roomSize / 7;
        for (let i = -wallEdge + stripSpacing; i < wallEdge; i += stripSpacing) {
            const strip = new THREE.Mesh(metalStripGeometry, metalMaterial);
            strip.position.set(i, wallCenter, -wallEdge + 0.1);
            strip.castShadow = true;
            room.add(strip);
        }
    
        const benchWidth = this.config.roomSize / 4;
        const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(benchWidth, 0.3, 1), acrylicMaterial);
        benchSeat.position.set(0, 0.15, this.config.roomSize / 5);
        benchSeat.castShadow = true;
        benchSeat.receiveShadow = true;
        room.add(benchSeat);
    
        const benchFrameGeometry = new THREE.BoxGeometry(benchWidth + 0.1, 0.05, 0.05);
        const benchFrame1 = new THREE.Mesh(benchFrameGeometry, metalMaterial);
        benchFrame1.position.set(0, 0.3, this.config.roomSize / 5);
        benchFrame1.castShadow = true;
        room.add(benchFrame1);
    
        const benchFrame2 = new THREE.Mesh(benchFrameGeometry, metalMaterial);
        benchFrame2.position.set(0, 0, this.config.roomSize / 5);
        benchFrame2.castShadow = true;
        room.add(benchFrame2);
    
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 16), metalMaterial);
            leg.position.set(
                (i % 2 === 0 ? -benchWidth / 2 + 0.1 : benchWidth / 2 - 0.1),
                0.15,
                this.config.roomSize / 5 + (i < 2 ? -0.5 : 0.5)
            );
            leg.castShadow = true;
            leg.receiveShadow = true;
            room.add(leg);
        }
    
        // Removed lightWall (dynamic colored rods on back wall)
        /*
        this.lightWall = new THREE.Group();
        this.lightWall.userData = { isInteractive: true, type: 'lightWall' };
        const rodGeometry = new THREE.CylinderGeometry(0.05, 0.05, this.config.wallHeight - 1, 16);
        const rodSpacing = this.config.roomSize / 13;
        for (let i = -wallEdge + rodSpacing; i < wallEdge; i += rodSpacing) {
            const rod = new THREE.Mesh(rodGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
            rod.position.set(i, wallCenter, wallEdge - 0.01);
            rod.userData = { baseColor: 0xffffff, intensity: 1 };
            this.lightWall.add(rod);
        }
        room.add(this.lightWall);
        */
    
        room.position.set(0, 0, 0);
        this.rooms.push(room);
        this.scene.add(room);
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

        // Add keyframe animation for avatar
        this.setupAvatarAnimation();

        this.updateAvatarPosition();
    }

    setupAvatarAnimation() {
        const times = [0, 1, 2];
        const armValues = [
            [Math.PI / 4, -Math.PI / 4],   // Start
            [-Math.PI / 4, Math.PI / 4],   // Mid
            [Math.PI / 4, -Math.PI / 4]    // End
        ];

        const leftArmTrack = new THREE.NumberKeyframeTrack(
            '.children[3].rotation[z]',
            times,
            armValues.map(v => v[0])
        );
        const rightArmTrack = new THREE.NumberKeyframeTrack(
            '.children[4].rotation[z]',
            times,
            armValues.map(v => v[1])
        );

        const clip = new THREE.AnimationClip('avatarWave', 2, [leftArmTrack, rightArmTrack]);
        const action = this.animationMixer.clipAction(clip, this.avatarGroup);
        action.setLoop(THREE.LoopRepeat);
        action.play();
    }

    updateAvatarPosition() {
        if (this.isMobile) {
            const roomCenter = this.rooms[0].position.clone();
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
            const backgroundBuffer = await this.loadAudio('/sweet.mp3');
            this.backgroundAudio.setBuffer(backgroundBuffer);
            this.backgroundAudio.setLoop(true);
            this.backgroundAudio.setVolume(0.2);
            this.backgroundAudio.play();

            const clickBuffer = await this.loadAudio('/sweet.mp3');
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

async init() {
        console.log("🚀 Virtual Gallery loading...");
        if (this.sessionId) await this.loadImages(this.sessionId);
        await this.setupAudio(); // Ensure audio is loaded
        this.animate();
        window.addEventListener("resize", () => this.handleResize());
        this.hidePreloader();
        console.log("🚀 Virtual Gallery loaded");
    }


    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.isLoading) { // Only update scene when loading is complete
            this.time += 0.016;
            this.update();
            this.updateImageEffects();
            this.renderer.render(this.scene, this.camera);
            if (this.isMobile) this.controls.update();
            this.updateAvatarPosition();
            
            if (this.isRecording) {
                // Frame capture handled by MediaRecorder
            }
            this.animationMixer.update(0.016 * this.animationSpeed);
            this.updateObjectAnimations();
        }
    }



    startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordedFrames = [];
        const stream = this.renderer.domElement.captureStream(30);
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedFrames.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.saveRecording();
        };
        
        this.mediaRecorder.start();
        document.getElementById('recordStatus').classList.remove('hidden');
        console.log("🎥 Recording started");
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        this.isRecording = false;
        this.mediaRecorder.stop();
        document.getElementById('recordStatus').classList.add('hidden');
        console.log("🎥 Recording stopped");
    }

    saveRecording() {
        const blob = new Blob(this.recordedFrames, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gallery_recording_${new Date().toISOString()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        this.recordedFrames = [];
    }

    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        const rotateBtn = document.getElementById('autoRotateBtn');
        rotateBtn.textContent = this.isAutoRotating ? 'Stop Rotation' : 'Auto Rotate';
        console.log(this.isAutoRotating ? "🔄 Auto-rotation enabled" : "🔄 Auto-rotation disabled");
    }

    toggleObjectAnimation() {
        this.isAnimatingObjects = !this.isAnimatingObjects;
        const animateBtn = document.getElementById('animateObjectsBtn');
        animateBtn.textContent = this.isAnimatingObjects ? 'Stop Animating' : 'Animate Objects';
        console.log(this.isAnimatingObjects ? "🎬 Object animation enabled" : "🎬 Object animation disabled");
    }

    updateAutoRotate() {
        if (this.isAutoRotating && !this.isFocused) {
            if (this.isMobile) {
                this.controls.azimuthAngle += THREE.MathUtils.degToRad(this.autoRotateSpeed);
                this.controls.update();
            } else if (this.isLocked) {
                const euler = new THREE.Euler(0, 0, 0, "YXZ");
                euler.setFromQuaternion(this.camera.quaternion);
                euler.y -= THREE.MathUtils.degToRad(this.autoRotateSpeed);
                this.camera.quaternion.setFromEuler(euler);
            }
        }
    }

    updateObjectAnimations() {
        if (this.isAnimatingObjects) {
            this.images.forEach(img => {
                img.mesh.rotation.y += 0.02 * this.animationSpeed;
            });
            if (this.lightWall) {
                this.lightWall.children.forEach(rod => {
                    rod.rotation.y += 0.03 * this.animationSpeed;
                });
            }
        }
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
      
        if (this.isMobile) {
            tutorial.innerHTML = `
                Welcome to your 3D Gallery!<br>
                • Swipe to look around.<br>
                • Pinch to zoom.<br>
                • Tap artwork to focus.<br>
                • Tap avatar for help!
            `;
            tutorial.style.display = "none"; 
        } else {
            tutorial.innerHTML = `
                Welcome to your 3D Gallery!<br>
                Click anywhere to start exploring!
            `;
            tutorial.dataset.step = "start";
        }
        document.body.appendChild(tutorial);

        this.renderer.domElement.addEventListener(this.isMobile ? "touchstart" : "click", (event) => this.onCanvasClick(event));
        if (!this.isMobile) {
            document.addEventListener("keydown", (event) => this.onKeyDown(event));
            document.addEventListener("keyup", (event) => this.onKeyUp(event));
            this.renderer.domElement.addEventListener("click", () => {
                if (!this.isLocked && !this.isFocused && !this.isSliderActive) {
                    this.controls.lock();
                    if (tutorial.dataset.step === "start") {
                        this.updateTutorialOnAction({ type: "click" }, tutorial);
                    }
                }
            });
            document.addEventListener("pointerlockchange", () => {
                this.isLocked = document.pointerLockElement === this.renderer.domElement;
                console.log("Pointer lock state changed:", this.isLocked ? "Locked" : "Unlocked");
                if (!this.isLocked) this.isFocused = false;
            });
            document.addEventListener("pointerlockerror", () => {
                console.error("Pointer Lock failed");
            });
            
            document.addEventListener("click", (e) => this.updateTutorialOnAction(e, tutorial));
            document.addEventListener("keydown", (e) => this.updateTutorialOnAction(e, tutorial));
        } else {
            tutorial.style.display = "none";
        }

        const shareBtn = document.getElementById("shareBtn");
        if (shareBtn) {
            shareBtn.addEventListener("click", () => this.handleShare());
            console.log("✅ Share button listener attached");
        } else {
            console.error("❌ Share button not found in DOM");
        }

        document.getElementById("uploadForm")?.addEventListener("submit", (e) => this.handleUploadSubmit(e));
        document.getElementById("uploadForm")?.addEventListener("change", (e) => this.showImagePreviewsAndMetadataPrompt(e));
        document.getElementById("screenshotForm")?.addEventListener("submit", (e) => this.handleScreenshotSubmit(e));
        document.getElementById("downloadBtn")?.addEventListener("click", () => this.handleDownload());
        document.getElementById("zoomSlider")?.addEventListener("input", () => this.handleZoom());
        document.getElementById("toggleControlsBtn")?.addEventListener("click", () => this.toggleControls());
        document.getElementById("recordBtn")?.addEventListener("click", () => {
            if (this.isRecording) {
                this.stopRecording();
                document.getElementById('recordBtn').textContent = 'Start Recording';
            } else {
                this.startRecording();
                document.getElementById('recordBtn').textContent = 'Stop Recording';
            }
        });
        document.getElementById("autoRotateBtn")?.addEventListener("click", () => this.toggleAutoRotate());
        document.getElementById("animateObjectsBtn")?.addEventListener("click", () => this.toggleObjectAnimation());
        document.getElementById("animationSpeedSlider")?.addEventListener("input", () => {
            const slider = document.getElementById("animationSpeedSlider");
            const value = document.getElementById("animationSpeedValue");
            this.animationSpeed = parseFloat(slider.value);
            value.textContent = this.animationSpeed.toFixed(1);
        });

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

        
        const prevBtn = document.getElementById('prevImage');
        const nextBtn = document.getElementById('nextImage');
        const closeBtn = document.getElementById('closeSlider');

        if (prevBtn) prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Prev button clicked");
            this.prevSliderImage();
        });
        if (nextBtn) nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Next button clicked");
            this.nextSliderImage();
        });
        if (closeBtn) closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Close button clicked");
            this.closeSlider();
        });

        
        document.addEventListener('keydown', (event) => {
            if (this.isSliderActive) {
                if (event.key === 'ArrowLeft') {
                    console.log("Arrow Left pressed");
                    this.prevSliderImage();
                } else if (event.key === 'ArrowRight') {
                    console.log("Arrow Right pressed");
                    this.nextSliderImage();
                }
            }
            this.onKeyDown(event);
        });
    }

   
    async handleShare() {
        console.log(`Share button clicked, sessionId: ${this.sessionId}`);

        if (!this.images.length) {
            this.showMessage('shareStatus', 'No images in the gallery to share', 'error');
            console.warn('No images available for sharing');
            return;
        }

        this.showStatus('shareStatus', true);

        try {
            // Get current HTML pathname (e.g., /creative.html)
            const htmlPath = window.location.pathname;
            console.log(`Sharing with htmlPath: ${htmlPath}`);

            const response = await fetch(`/api/share/${this.sessionId || 'new'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ htmlPath })
            });

            console.log('Fetch response status:', response.status);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const result = await response.json();
            console.log('Fetch result:', result);

            if (result.success && result.shareUrl) {
                this.sessionId = result.sessionId || this.sessionId;
                this.shareUrl = result.shareUrl;
                localStorage.setItem('sessionId', this.sessionId);
                this.showShareLink();
                this.showMessage('shareStatus', 'Share link generated', 'success');
            } else {
                throw new Error('No share URL provided by server');
            }
        } catch (error) {
            console.error('Error sharing gallery:', error);
            this.showMessage('shareStatus', `Failed to share: ${error.message}`, 'error');
        } finally {
            this.showStatus('shareStatus', false);
        }
    }

    
    showShareLink() {
        console.log("showShareLink called with shareUrl:", this.shareUrl);
        if (!this.shareUrl) {
            console.error("No shareUrl available");
            this.showMessage("shareStatus", "No share link available", "error");
            return;
        }
    
        const shareModal = document.getElementById("shareModal");
        if (!shareModal) {
            console.error("shareModal element not found in DOM");
            this.showMessage("shareStatus", "Failed to display share modal", "error");
            return;
        }
    
        shareModal.innerHTML = `
            <h3>Share Your Gallery</h3>
            <input type="text" value="${this.shareUrl}" id="shareLinkInput" readonly>
            <button id="copyShareLink" class="glow-btn">Copy Link</button>
            <button id="closeShareModal" class="glow-btn">Close</button>
        `;
        shareModal.style.display = 'block';
    
        console.log("Modal displayed:", shareModal);
    
        const copyButton = document.getElementById("copyShareLink");
        const closeButton = document.getElementById("closeShareModal");
    
        if (copyButton) {
            copyButton.addEventListener("click", async () => {
                const input = document.getElementById("shareLinkInput");
                if (input) {
                    try {
                        await navigator.clipboard.writeText(input.value);
                        this.showMessage("shareStatus", "Link copied to clipboard", "success");
                    } catch (err) {
                        console.warn("Clipboard API failed, using fallback:", err);
                        input.select();
                        document.execCommand("copy");
                        this.showMessage("shareStatus", "Link copied to clipboard", "success");
                    }
                } else {
                    console.error("shareLinkInput not found");
                    this.showMessage("shareStatus", "Failed to copy link", "error");
                }
            });
        } else {
            console.error("copyShareLink button not found");
        }
    
        if (closeButton) {
            closeButton.addEventListener("click", () => {
                shareModal.style.display = 'none';
                shareModal.innerHTML = ''; // Clear to prevent duplicate listeners
                console.log("Share modal closed");
            });
        } else {
            console.error("closeShareModal button not found");
        }
    }



    updateTutorialOnAction(event, tutorial) {
        if (this.isMobile) return; // Skip tutorial progression on mobile

        if (tutorial.dataset.step === "start" && event.type === "click") {
            tutorial.innerHTML = `
                Great! Now move around:<br>
                • <strong>W</strong>: Forward<br>
                • <strong>A</strong>: Left<br>
                • <strong>S</strong>: Back<br>
                • <strong>D</strong>: Right<br>
                Try it!
            `;
            tutorial.dataset.step = "move";
        } else if (tutorial.dataset.step === "move" && ["w", "a", "s", "d"].includes(event.key?.toLowerCase())) {
            tutorial.innerHTML = `
                Nice! Turn and look:<br>
                • <strong>Q</strong>: Turn left<br>
                • <strong>E</strong>: Turn right<br>
                • Move mouse to look up/down<br>
                Give it a go!
            `;
            tutorial.dataset.step = "rotate";
        } else if (tutorial.dataset.step === "rotate" && ["q", "e"].includes(event.key?.toLowerCase())) {
            tutorial.innerHTML = `
                Good job! More tips:<br>
                • Double-click art to zoom in<br>
                • Press <strong>Esc</strong> to exit zoom<br>
                • Click the avatar for help<br>
                Enjoy exploring!
            `;
            tutorial.dataset.step = "zoom";
            // Fade out after a delay
            setTimeout(() => {
                tutorial.style.transition = "opacity 1s";
                tutorial.style.opacity = "0";
                setTimeout(() => tutorial.remove(), 1000);
            }, 6000); // Show for 5 seconds before fading
        }
    }

    showImagePreviewsAndMetadataPrompt(event) {
        const files = event.target.files;
        if (!files || !this.previewContainer) return;

        this.pendingFiles = Array.from(files);
        this.previewContainer.innerHTML = '';

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'image-preview';
                    img.style.cssText = 'max-width: 100px; max-height: 100px; margin: 5px; object-fit: cover;';
                    this.previewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });

        this.showMetadataModal();
    }

    showMetadataModal() {
        const modal = document.getElementById('metadataModal');
        const inputsContainer = document.getElementById('metadataInputs');
        inputsContainer.innerHTML = '';

        this.pendingFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <h4>${file.name}</h4>
                <input type="text" id="title-${index}" placeholder="Image Title" value="${file.name.split('.')[0]}">
                <input type="text" id="description-${index}" placeholder="Description">
                <input type="text" id="artist-${index}" placeholder="Url">
            `;
            inputsContainer.appendChild(div);
        });

        modal.style.display = 'block';

        document.getElementById('submitMetadata').onclick = () => this.submitMetadata();
        document.getElementById('cancelMetadata').onclick = () => {
            modal.style.display = 'none';
            this.pendingFiles = [];
            this.previewContainer.innerHTML = '';
            document.getElementById('images').value = '';
        };
    }

    submitMetadata() {
        const modal = document.getElementById('metadataModal');
        this.metadata = this.pendingFiles.map((file, index) => ({
            filename: file.name,
            title: document.getElementById(`title-${index}`).value || file.name.split('.')[0],
            description: document.getElementById(`description-${index}`).value || '',
            artist: document.getElementById(`artist-${index}`).value || 'Unknown'
        }));
        modal.style.display = 'none';
        this.handleUploadSubmit({ preventDefault: () => {} });
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
            case "q": this.keys.q = true; break;
            case "e": this.keys.e = true; break;
            case "escape": this.controls.unlock(); break;
        }
    }

    onKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case "w": this.keys.w = false; break;
            case "a": this.keys.a = false; break;
            case "s": this.keys.s = false; break;
            case "d": this.keys.d = false; break;
            case "q": this.keys.q = false; break;
            case "e": this.keys.e = false; break;
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
    
            const euler = new THREE.Euler(0, 0, 0, "YXZ");
            euler.setFromQuaternion(this.camera.quaternion);
            if (this.keys.q) euler.y += this.rotationSpeed;
            if (this.keys.e) euler.y -= this.rotationSpeed;
            this.camera.quaternion.setFromEuler(euler);
        }
        // Removed lightWall dynamic coloring
        /*
        if (this.lightWall) {
            const cameraPos = this.camera.position;
            this.lightWall.children.forEach(rod => {
                const dist = cameraPos.distanceTo(rod.position);
                const intensity = Math.max(0.5, Math.min(1.5, 5 / dist));
                const hue = (dist / 10 + this.time) % 1;
                rod.material.color.setHSL(hue, 0.8, intensity * 0.5);
                rod.userData.intensity = intensity;
            });
        }
        */
        if (this.interactionCooldown > 0) this.interactionCooldown -= 0.016;
        this.updateAutoRotate();
    }
    checkCollisions() {
        if (!this.isMobile) {
            this.camera.position.y = this.config.cameraHeight;
            const roomBounds = this.rooms[0].position;
            const edge = this.config.roomSize / 2 - 1;
            const minX = roomBounds.x - edge;
            const maxX = roomBounds.x + edge;
            const minZ = roomBounds.z - edge;
            const maxZ = roomBounds.z + edge;

            this.camera.position.x = Math.max(minX, Math.min(maxX, this.camera.position.x));
            this.camera.position.z = Math.max(minZ, Math.min(maxZ, this.camera.position.z));
            this.controls.getObject().position.copy(this.camera.position);
        }
    }

    async computeImageHash(texture) {
        return new Promise((resolve) => {
            const img = texture.image;
            const canvas = document.createElement('canvas');
            canvas.width = 8;
            canvas.height = 8;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 8, 8);
            const imageData = ctx.getImageData(0, 0, 8, 8).data;

            let hash = 0;
            for (let i = 0; i < imageData.length; i += 4) {
                hash += imageData[i] + imageData[i + 1] + imageData[i + 2];
            }
            resolve(hash.toString());
        });
    }

    async loadImages(sessionId) {
        const maxRetries = 3;
        let attempt = 0;
    
        while (attempt < maxRetries) {
            try {
                const response = await fetch(`/api/screenshots/${sessionId}/`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                console.log("📸 Fetched data for session", sessionId, ":", data);
    
                // Validate and sanitize screenshots
                if (!Array.isArray(data.screenshots) || data.screenshots.length === 0) {
                    console.warn("No valid screenshots in response, using fallback");
                    this.imagesToLoad = [
                        "https://via.placeholder.com/350x250",
                        "https://via.placeholder.com/350x250"
                    ];
                    this.metadata = [
                        { filename: "placeholder1.jpg", title: "Untitled", description: "", artist: "Unknown" },
                        { filename: "placeholder2.jpg", title: "Untitled", description: "", artist: "Unknown" }
                    ];
                } else {
                    this.imagesToLoad = data.screenshots
                        .filter(s => s && typeof s === 'string')
                        .map(s => s.trim());
                    // Handle metadata as object or array
                    this.metadata = [];
                    if (data.metadata && typeof data.metadata === 'object') {
                        if (Array.isArray(data.metadata.metadata)) {
                            this.metadata = data.metadata.metadata.map(m => ({
                                filename: m.filename,
                                title: m.title || 'Untitled',
                                description: m.description || '',
                                artist: m.artist || 'Unknown'
                            }));
                        } else if (Array.isArray(data.metadata)) {
                            this.metadata = data.metadata.map(m => ({
                                filename: m.filename,
                                title: m.title || 'Untitled',
                                description: m.description || '',
                                artist: m.artist || 'Unknown'
                            }));
                        }
                    }
                    // Fallback if no metadata
                    if (!this.metadata.length && this.imagesToLoad.length) {
                        this.metadata = this.imagesToLoad.map(filename => ({
                            filename: filename.split('/').pop(),
                            title: 'Untitled',
                            description: '',
                            artist: 'Unknown'
                        }));
                    }
                }
    
                console.log("Sanitized imagesToLoad:", this.imagesToLoad);
                console.log("Sanitized metadata:", this.metadata);
    
                if (!this.imagesToLoad.length) {
                    console.error("No valid images to load after sanitization");
                    return;
                }
    
                await this.displayImagesInGallery();
                return;
            } catch (error) {
                console.error("❌ Error fetching images (attempt " + attempt + "):", error);
                attempt++;
                if (attempt === maxRetries) {
                    console.error("Max retries reached, using fallback");
                    this.imagesToLoad = [
                        "https://via.placeholder.com/350x250",
                        "https://via.placeholder.com/350x250"
                    ];
                    this.metadata = [
                        { filename: "placeholder1.jpg", title: "Untitled", description: "", artist: "Unknown" },
                        { filename: "placeholder2.jpg", title: "Untitled", description: "", artist: "Unknown" }
                    ];
                    console.log("Fallback imagesToLoad:", this.imagesToLoad);
                    console.log("Fallback metadata:", this.metadata);
                    await this.displayImagesInGallery();
                } else {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
            }
        }
    }

    async displayImagesInGallery() {
        if (!this.imagesToLoad || !Array.isArray(this.imagesToLoad) || this.imagesToLoad.length === 0) {
            console.error("imagesToLoad is invalid or empty:", this.imagesToLoad);
            return;
        }
    
        this.clearScene();
        const totalImages = this.imagesToLoad.length;
        let imageIndex = 0;
        const seenHashes = new Set();
    
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0 });
    
        const room = this.rooms[0];
        const wallLength = this.config.roomSize;
        const wallCount = 4;
        this.config.maxImagesPerWall = Math.ceil(totalImages / wallCount);
        const spacing = wallLength / (this.config.maxImagesPerWall + 1);
    
        const wallConfigs = [
            { basePos: new THREE.Vector3(0, this.config.wallHeight / 2, -wallLength / 2 + this.config.wallOffset), rot: 0, dir: 'x' },
            { basePos: new THREE.Vector3(-wallLength / 2 + this.config.wallOffset, this.config.wallHeight / 2, 0), rot: Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(wallLength / 2 - this.config.wallOffset, this.config.wallHeight / 2, 0), rot: -Math.PI / 2, dir: 'z' },
            { basePos: new THREE.Vector3(0, this.config.wallHeight / 2, wallLength / 2 - this.config.wallOffset), rot: Math.PI, dir: 'x' }
        ];
    
        console.log("Starting displayImagesInGallery with imagesToLoad:", this.imagesToLoad);
    
        for (let wall of wallConfigs) {
            if (imageIndex >= totalImages) break;
    
            const wallPositions = [];
            for (let i = 0; i < this.config.maxImagesPerWall && imageIndex < totalImages; i++) {
                const offset = -wallLength / 2 + (i + 0.5) * spacing;
                const pos = wall.basePos.clone();
                if (wall.dir === 'x') pos.x += offset;
                else pos.z += offset;
                wallPositions.push({ pos, rot: wall.rot });
            }
    
            for (let { pos, rot } of wallPositions) {
                const filename = this.imagesToLoad[imageIndex];
                if (!filename || typeof filename !== 'string') {
                    console.error(`Invalid filename at index ${imageIndex}:`, filename);
                    imageIndex++;
                    continue;
                }
    
                const fileBaseName = filename.split('/').pop();
                const meta = this.metadata.find(m => m.filename === fileBaseName) || {
                    filename: fileBaseName,
                    title: 'Untitled',
                    description: '',
                    artist: 'Unknown'
                };
                console.log(`Processing image ${imageIndex}/${totalImages}: ${filename}, Metadata:`, meta);
    
                try {
                    const texture = await this.loadTexture(filename);
                    const hash = await this.computeImageHash(texture);
    
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
                    const adjustedWidth = Math.min(this.config.displayHeight * aspectRatio, this.config.displayWidth);
    
                    const geometry = new THREE.BoxGeometry(adjustedWidth, this.config.displayHeight, this.config.displayDepth);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.copy(pos).add(room.position);
                    mesh.rotation.y = rot;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData = {
                        filename,
                        hash,
                        baseScale: mesh.scale.clone(),
                        metadata: {
                            title: meta.title,
                            description: meta.description,
                            artist: meta.artist
                        }
                    };
                    room.add(mesh);
                    this.images.push({ mesh, filename, hash, metadata: meta });

                    const frameShape = new THREE.Shape();
                    frameShape.moveTo(-adjustedWidth / 2 - this.config.frameThickness, -this.config.displayHeight / 2 - this.config.frameThickness);
                    frameShape.lineTo(adjustedWidth / 2 + this.config.frameThickness, -this.config.displayHeight / 2 - this.config.frameThickness);
                    frameShape.lineTo(adjustedWidth / 2 + this.config.frameThickness, this.config.displayHeight / 2 + this.config.frameThickness);
                    frameShape.lineTo(-adjustedWidth / 2 - this.config.frameThickness, this.config.displayHeight / 2 + this.config.frameThickness);
                    frameShape.lineTo(-adjustedWidth / 2 - this.config.frameThickness, -this.config.displayHeight / 2 - this.config.frameThickness);

                    const hole = new THREE.Path();
                    hole.moveTo(-adjustedWidth / 2, -this.config.displayHeight / 2);
                    hole.lineTo(adjustedWidth / 2, -this.config.displayHeight / 2);
                    hole.lineTo(adjustedWidth / 2, this.config.displayHeight / 2);
                    hole.lineTo(-adjustedWidth / 2, this.config.displayHeight / 2);
                    hole.lineTo(-adjustedWidth / 2, -this.config.displayHeight / 2);
                    frameShape.holes.push(hole);

                    const extrudeSettings = { depth: this.config.frameThickness, bevelEnabled: false };
                    const frameGeometry = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
                    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
                    frame.position.copy(mesh.position);
                    frame.position.z += (rot === 0 ? -this.config.displayDepth / 2 : (rot === Math.PI ? this.config.displayDepth / 2 : 0));
                    frame.position.x += (rot === Math.PI / 2 ? -this.config.displayDepth / 2 : (rot === -Math.PI / 2 ? this.config.displayDepth / 2 : 0));
                    frame.rotation.y = rot;
                    frame.castShadow = true;
                    frame.receiveShadow = true;
                    room.add(frame);

                    const spotlight = new THREE.SpotLight(0xffffff, 2.0, this.config.roomSize, Math.PI / 6, 0.7);
                    const lightOffset = 1;
                    spotlight.position.set(
                        pos.x + (Math.abs(rot) === Math.PI / 2 ? (rot > 0 ? lightOffset : -lightOffset) : 0),
                        this.config.wallHeight - 0.5,
                        pos.z + (Math.abs(rot) === Math.PI / 2 ? 0 : (rot === 0 ? -lightOffset : lightOffset))
                    ).add(room.position);
                    spotlight.target = mesh;
                    spotlight.castShadow = true;
                    spotlight.shadow.mapSize.width = 512;
                    spotlight.shadow.mapSize.height = 512;
                    spotlight.shadow.bias = -0.0001;
                    room.add(spotlight);

                    imageIndex++;
                } catch (error) {
                    console.error(`Error loading image ${filename}:`, error);
                    imageIndex++;
                }
            }
        }
        console.log(`🎨 Images rendered in room ${this.currentRoom}: ${this.images.length}/${totalImages}, Unique hashes: ${seenHashes.size}`);
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
                child.userData.filename || 
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
                    const maxSize = this.config.maxTextureSize;
                    if (texture.image.width > maxSize || texture.image.height > maxSize) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const scale = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
                        canvas.width = texture.image.width * scale;
                        canvas.height = texture.image.height * scale;
                        ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
                        texture.image = canvas;
                        texture.needsUpdate = true;
                    }
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = true;
                    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
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
            const intersects = this.raycaster.intersectObjects([
                ...this.images.map(img => img.mesh),
                ...this.scene.children.filter(obj => 
                    (obj.parent && obj.parent.userData.isAvatar) || 
                    obj.userData.isInteractive
                ).flatMap(obj => obj.children.length ? obj.children : [obj])
            ]);

            if (intersects.length > 0 && this.interactionCooldown <= 0) {
                const obj = intersects[0].object;
                if (this.isFocused) {
                    this.resetCamera();
                    this.closeSlider();
                } else if (obj.parent && obj.parent.userData.isAvatar) {
                    this.showAvatarInstructions();
                } else if (obj.userData.filename) {
                    console.log(`Clicked image: ${obj.userData.filename}`);
                    if (!this.clickSound.isPlaying) this.clickSound.play();
                    this.focusImage(obj);
                    this.scaleImage(obj);
                    this.openSlider(obj); // Open slider on double-click
                } else if (obj.parent && obj.parent.userData.type === 'lightWall') {
                    obj.material.color.setHSL(Math.random(), 0.8, 1);
                    this.interactionCooldown = 0.5;
                }
            }
        }
        this.lastClickTime = currentTime;
    }

    openSlider(selectedMesh) {
        if (!this.images.length) return;
    
        if (!this.isMobile && this.isLocked) {
            this.controls.unlock();
            this.isLocked = false;
        }
        this.isSliderActive = true;
        this.sliderImages = this.images.map(img => ({
            src: img.filename,
            mesh: img.mesh,
            metadata: img.metadata || img.mesh.userData.metadata || { title: 'Untitled', description: '', artist: 'Unknown' }
        }));
        console.log("Slider images with metadata:", this.sliderImages);
    
        this.currentSliderIndex = this.sliderImages.findIndex(img => img.mesh === selectedMesh);
        if (this.currentSliderIndex === -1) this.currentSliderIndex = 0;
    
        const sliderContainer = document.getElementById('imageSliderContainer');
        if (sliderContainer) {
            sliderContainer.classList.remove('hidden');
            sliderContainer.style.pointerEvents = 'auto';
            this.updateSliderDisplay();
        } else {
            console.error("Slider container not found in DOM");
            this.isSliderActive = false;
        }
    }
    
    closeSlider() {
        this.isSliderActive = false;
        const sliderContainer = document.getElementById('imageSliderContainer');
        if (sliderContainer) {
            sliderContainer.classList.add('hidden');
            sliderContainer.style.pointerEvents = 'none';
        } else {
            console.error("Slider container not found in DOM");
        }
        
        if (this.isFocused) {
            this.resetCamera();
        } else {
            console.log("Slider closed; click canvas to re-lock pointer if desired");
        }
    }
    
    prevSliderImage() {
        if (this.currentSliderIndex > 0) {
            this.currentSliderIndex--;
            this.updateSliderDisplay();
            this.focusImage(this.sliderImages[this.currentSliderIndex].mesh);
        }
    }
    
    nextSliderImage() {
        if (this.currentSliderIndex < this.sliderImages.length - 1) {
            this.currentSliderIndex++;
            this.updateSliderDisplay();
            this.focusImage(this.sliderImages[this.currentSliderIndex].mesh);
        }
    }
    
    updateSliderDisplay() {
        const sliderImage = document.getElementById('sliderImage');
        const sliderIndex = document.getElementById('sliderIndex');
        const sliderContent = document.querySelector('.slider-content');
        const currentImage = this.sliderImages[this.currentSliderIndex];
    
        if (sliderImage && sliderIndex && sliderContent) {
            sliderImage.src = currentImage.src;
            sliderIndex.textContent = `${this.currentSliderIndex + 1} / ${this.sliderImages.length}`;
    
            let metadataDiv = document.getElementById('sliderMetadata');
            if (!metadataDiv) {
                metadataDiv = document.createElement('div');
                metadataDiv.id = 'sliderMetadata';
                metadataDiv.style.cssText = 'color: white; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; margin-top: 10px;';
                sliderContent.appendChild(metadataDiv);
            }
            console.log("Displaying metadata for image", currentImage.src, ":", currentImage.metadata);
            metadataDiv.innerHTML = `
                <h3>${currentImage.metadata.title || 'Untitled'}</h3>
                <p><strong>Url:</strong> ${currentImage.metadata.artist ? `<a href="${currentImage.metadata.artist}" target="_blank">${currentImage.metadata.artist}</a>` : 'None'}</p>
                <p><strong>Description:</strong> ${currentImage.metadata.description || ''}</p>
            `;
        } else {
            console.error("Slider elements missing:", { sliderImage, sliderIndex, sliderContent });
        }
    }
    
    scaleImage(mesh) {
        const startScale = mesh.scale.clone();
        const targetScale = mesh.userData.baseScale.clone().multiplyScalar(1.2);
        const duration = 500;
        const startTime = performance.now();

        const animateScale = (time) => {
            const elapsed = time - startTime;
            const t = Math.min(elapsed / duration, 1);
            mesh.scale.lerpVectors(startScale, targetScale, t);

            if (t < 1) requestAnimationFrame(animateScale);
            else {
                const reverseScale = (time) => {
                    const elapsed = time - startTime - duration;
                    const t = Math.min(elapsed / duration, 1);
                    mesh.scale.lerpVectors(targetScale, startScale, t);

                    if (t < 1) requestAnimationFrame(reverseScale);
                };
                requestAnimationFrame(reverseScale);
            }
        };
        requestAnimationFrame(animateScale);
    }

    focusImage(mesh) {
        this.updateCameraState();
        this.isFocused = true;

        if (this.isMobile) {
            const targetPos = mesh.position.clone();
            targetPos.y = this.config.cameraHeight;
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
            targetPos.y = this.config.cameraHeight;

            const roomBounds = this.rooms[0].position;
            const edge = this.config.roomSize / 2 - 1;
            const minX = roomBounds.x - edge;
            const maxX = roomBounds.x + edge;
            const minZ = roomBounds.z - edge;
            const maxZ = roomBounds.z + edge;

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
                    this.closeSlider();
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
                    this.closeSlider();
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
            if (!this.pendingFiles.length || !this.metadata.length) {
                console.log("No files or metadata to upload");
                return;
            }
        
            const formData = new FormData();
            this.pendingFiles.forEach((file, index) => {
                formData.append("images", file);
                formData.append("title", this.metadata[index].title);
                formData.append("description", this.metadata[index].description);
                formData.append("artist", this.metadata[index].artist);
            });
        
            try {
                const response = await fetch(`/api/upload${this.sessionId ? `/${this.sessionId}` : ''}`, {
                    method: "POST",
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    this.sessionId = result.sessionId;
                    localStorage.setItem('sessionId', this.sessionId);
                    // Update this.metadata with backend filenames
                    this.metadata = result.filePaths.map((filePath, index) => ({
                        filename: filePath.split('/').pop(),
                        title: this.metadata[index].title,
                        description: this.metadata[index].description,
                        artist: this.metadata[index].artist
                    }));
                    console.log("Updated metadata with backend filenames:", this.metadata);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await this.loadImages(this.sessionId);
                    this.pendingFiles = [];
                    document.getElementById('images').value = '';
                    this.previewContainer.innerHTML = '';
                } else {
                    throw new Error("Upload failed");
                }
            } catch (error) {
                console.error("Error uploading files:", error);
                this.showMessage("shareStatus", "Failed to upload images", "error");
            }
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
                <p>Double-click an artwork to focus and scale, double-click again to reset.</p>
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