import * as THREE from "three";
import SceneGraph from "./modules/SceneGraph.js";

const scene = new THREE.Scene();

//camera-----------------------------------------------------
const camera1 = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.0001,
  1000
);
camera1.position.set(15, 15, 20);
camera1.lookAt(0, 0, 0);

//renderer----------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("myCanvas")
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

//light----------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const mainLight = new THREE.PointLight(0xffffff, 1.0);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
scene.add(mainLight);

const lightHelper = new THREE.PointLightHelper(mainLight, 0.5);
scene.add(lightHelper);

//scene graph---------------------------------------------
const sceneGraph = new SceneGraph();
const objects = sceneGraph.build(scene);


//clock--------------------------------------------
const clock = new THREE.Clock();


//event listener-------------------------------------------
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera1.aspect = width / height;
  camera1.updateProjectionMatrix();
});

function animate() {
    requestAnimationFrame(animate);
  
    const delta = clock.getDelta();
  
    renderer.render(scene, camera1);
}
animate();