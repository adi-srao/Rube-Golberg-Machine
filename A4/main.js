import * as THREE from "three";

// 1. Scene
const scene = new THREE.Scene();

// 2. Camera (FOV, aspect, near, far)
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.0001,
  1000
);

// 3. Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("myCanvas")
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Geometry + Material = Mesh
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

scene.add(cube);
camera.position.z = 3;
const clock = new THREE.Clock();

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 2, 3);
scene.add(light);

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  cube.rotation.x += 1 * delta;
  cube.rotation.y += 1 * delta;

  renderer.render(scene, camera);
}
animate();
