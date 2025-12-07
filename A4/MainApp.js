import * as THREE from "three";
import SceneGraph from "./modules/SceneGraph.js";
import MaterialFactory from "./modules/MaterialFactory.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202025);

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

//clock--------------------------------------------
const clock = new THREE.Clock();

//mode
let currentMode = "phong";

function updateShaderUniforms(scene, camera, light) {
  // Make sure camera matrices are fresh
  camera.updateMatrixWorld();

  // Precompute viewProjection once per frame
  const viewProjection = new THREE.Matrix4();
  viewProjection.multiplyMatrices(
    camera.projectionMatrix,      // P
    camera.matrixWorldInverse     // V
  );

  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const mat = obj.material;
    if (!mat || !mat.uniforms) return;

    const u = mat.uniforms;

    // Only touch materials that actually use our custom uniforms
    if (!u.u_model || !u.u_viewProjection) return;

    // 1. u_model = mesh.matrixWorld
    obj.updateMatrixWorld();
    u.u_model.value.copy(obj.matrixWorld);

    // 2. u_viewProjection = P * V
    u.u_viewProjection.value.copy(viewProjection);

    // 3. u_viewPosition = camera position in world space
    if (u.u_viewPosition) {
      u.u_viewPosition.value.setFromMatrixPosition(camera.matrixWorld);
    }

    // 4. u_lightPosition = main light position in world space
    if (light && u.u_lightPosition) {
      u.u_lightPosition.value.copy(light.position);
    }
  });
}


async function init() {


  const materialFactory = await MaterialFactory.create();
  const sceneGraph = new SceneGraph(materialFactory);
  const graphs = sceneGraph.build(scene); 

  //changes attribute name from position to a_position to maintain consistency with glsl
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const geo = obj.geometry;
    if (!geo) return;

    if (!geo.getAttribute("a_position") && geo.getAttribute("position")) {
      geo.setAttribute("a_position", geo.getAttribute("position"));
    }
    if (!geo.getAttribute("a_normal") && geo.getAttribute("normal")) {
      geo.setAttribute("a_normal", geo.getAttribute("normal"));
    }
  });

  let currentMode = "phong";
  graphs.phong.root.visible = true;
  graphs.gouraud.root.visible = false;

  window.addEventListener("keydown", (e) => {
    if (e.key === "s" || e.key === "S") {
      currentMode = currentMode === "phong" ? "gouraud" : "phong";
      graphs.phong.root.visible = currentMode === "phong";
      graphs.gouraud.root.visible = currentMode === "gouraud";
      console.log("Switched shading to", currentMode);
    }
  });

  // 4. Resize handling
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera1.aspect = w / h;
    camera1.updateProjectionMatrix();
  });

  // 5. Start render loop
  animate();
}



function animate() {
    requestAnimationFrame(animate);
  
    const delta = clock.getDelta();

    updateShaderUniforms(scene, camera1, mainLight);
  
    renderer.render(scene, camera1);
}


init().catch((err) => console.error(err));