import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

export function initScene(canvasId) 
{
    const canvas = document.getElementById(canvasId);
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x606060);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height, false);

    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 5.0;
    controls.zoomSpeed = 2.0;
    controls.dynamicDampingFactor = 0.3;

    return { scene, camera, renderer, controls };
}