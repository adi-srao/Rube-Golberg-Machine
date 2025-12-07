import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

function textureMapper(scene, objPath, mtlPath, texturePath, name)
{
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    let textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(texturePath, () => {
        texture.colorSpace = THREE.SRGBColorSpace;
    });

    mtlLoader.load(mtlPath, (mtl) => {
        mtl.preload();

        objLoader.setMaterials(mtl);
        objLoader.load(objPath, (root) => {
            root.traverse((child) => {
                if (child.isMesh) {
                    let geometry = child.geometry;
                    let material = child.material;
                    material.map = texture;

                    let mesh = new THREE.Mesh(geometry, material);
                    mesh.name = 'Monkey';
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    scene.add(mesh);
                }
            });
        });
    });
}

const canvas = document.getElementById('gl-canvas');
let windowHeight = (canvas.clientHeight || canvas.height);
let windowWidth = (canvas.clientWidth || canvas.width);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x606060);
const camera = new THREE.PerspectiveCamera( 75,  windowWidth/windowHeight , 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(windowWidth,windowHeight, false);

const color = 0xFFFFFF;
const intensity = 5;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(0, 2, 2);
light.target.position.set(0, 0, 0);
scene.add(light);
camera.position.z = 5;

function onWindowResize() {
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}
window.addEventListener('resize', onWindowResize, false);

textureMapper(scene, 
    '../../Models/Monkey.obj', 
    '../../Models/Monkey.mtl', 
    '../../Textures/1.jpg', 
    'Monkey');

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
