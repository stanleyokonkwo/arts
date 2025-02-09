import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js';

console.log('🚀 Three.js script loaded');


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
console.log('🎮 OrbitControls initialized');


const loadTexture = (filename) => {
    const texturePath = `http://localhost:3000/screenshots/${filename}`;
    console.log(`🖼 Loading texture: ${texturePath}`);
    return new THREE.TextureLoader().load(texturePath, () => {
        console.log(`✅ Successfully loaded: ${filename}`);
    }, undefined, (err) => {
        console.error(`❌ Failed to load texture: ${filename}`, err);
    });
};

// Define images and positions
const images = [
    { path: 'full.png', z: 0 },
    { path: 'header.png', z: -0.5 },
    { path: 'main.png', z: -1 },
    { path: 'footer.png', z: -1.5 }
];

images.forEach(({ path, z }) => {
    const texture = loadTexture(path);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new THREE.PlaneGeometry(3, 1.7);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = z;
    scene.add(mesh);
    console.log(`🛠 Layer added: ${path} at Z=${z}`);
});

// Start animation loop
const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

// Log message when animation starts
console.log('🎬 Animation started');
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('🔄 Window resized');
});
