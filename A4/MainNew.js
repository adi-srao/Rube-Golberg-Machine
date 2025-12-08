// MainApp.js
import * as THREE from "three";
import SceneGraph from "./modules/SceneGraph.js";
import MaterialFactory from "./modules/MaterialFactory.js";
import { updateShaderUniforms } from "./modules/ShaderUniforms.js";
import InputManager from "./modules/InputManager.js";
import CameraManager from "./modules/CameraManager.js";
import LightingManager from "./modules/LightingManager.js";
import AnimationSystem from "./modules/AnimationSystem.js";
import CollisionSystem from "./modules/CollisionSystem.js";
import RGMController from "./modules/RGMController.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202025);

// camera -----------------------------------------------------
const camera1 = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.0001,
  1000
);
camera1.position.set(15, 15, 20);
camera1.lookAt(0, 0, 0);

// renderer ---------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("myCanvas"),
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// light ------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const mainLight = new THREE.PointLight(0xffffff, 1.0);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
scene.add(mainLight);

const lightHelper = new THREE.PointLightHelper(mainLight, 0.5);
scene.add(lightHelper);

// clock ------------------------------------------------------
const clock = new THREE.Clock();

// shading mode state (shared with InputManager)
const shadingState = {
  currentMode: "blinn",
};

// systems (filled in init)
let graphsGlobal = null;
let inputManager = null;
let cameraManager = null;
let lightingManager = null;
let controller = null;
let animationSystem = null;
let collisionSystem = null;

// rgmObjects builder

function buildRGMObjects(graphs) {
  const rgm = {};

  // --- Balls ---
  const b1Phong   = graphs.phong.objects.ball1;
  const b1Gouraud = graphs.gouraud.objects.ball1;
  const b1Blinn   = graphs.blinn.objects.ball1;

  rgm.ball1 = {
    meshes: {
      phong:   b1Phong,
      gouraud: b1Gouraud,
      blinn:   b1Blinn,
    },
    position: b1Phong.position.clone(),      // logical position
    velocity: new THREE.Vector3(),
    radius: 0.3,
    active: true,
  };

  const b2Phong   = graphs.phong.objects.ball2;
  const b2Gouraud = graphs.gouraud.objects.ball2;
  const b2Blinn   = graphs.blinn.objects.ball2;

  rgm.ball2 = {
    meshes: {
      phong:   b2Phong,
      gouraud: b2Gouraud,
      blinn:   b2Blinn,
    },
    position: b2Phong.position.clone(),
    velocity: new THREE.Vector3(),
    radius: 0.35,
    active: false,
  };

  // --- Dominos ---
  const dominosPhong   = graphs.phong.objects.dominos;
  const dominosGouraud = graphs.gouraud.objects.dominos;
  const dominosBlinn   = graphs.blinn.objects.dominos;

  rgm.dominos = dominosPhong.map((meshPhong, i) => ({
    meshes: {
      phong:   meshPhong,
      gouraud: dominosGouraud[i],
      blinn:   dominosBlinn[i],
    },
    angle: 0,
    angularVelocity: 0,
    fallen: false,
  }));

  // --- Pendulum ---
  const pendPhong   = graphs.phong.objects.pendulum;
  const pendGouraud = graphs.gouraud.objects.pendulum;
  const pendBlinn   = graphs.blinn.objects.pendulum;

  rgm.pendulum = {
    length: 3,          // you used 3 in SceneGraph
    angle: 0,
    angularVelocity: 0,
    active: false,
    pivotMeshes: {
      phong:   pendPhong.pivot,
      gouraud: pendGouraud.pivot,
      blinn:   pendBlinn.pivot,
    },
    bobMeshes: {
      phong:   pendPhong.bob,
      gouraud: pendGouraud.bob,
      blinn:   pendBlinn.bob,
    }
  }

    //ramp
  const rampPhong   = graphs.phong.objects.ramp;
  const rampGouraud = graphs.gouraud.objects.ramp;
  const rampBlinn   = graphs.blinn.objects.ramp;

  rgm.ramp = {
    meshes: {
      phong:   rampPhong,
      gouraud: rampGouraud,
      blinn:   rampBlinn,
    }
  };

  return rgm;
}


//----------------------------------------init------------------------------------------
async function init() {

  const materialFactory = await MaterialFactory.create();
  const sceneGraph = new SceneGraph(materialFactory);
  const graphs = sceneGraph.build(scene);
  graphsGlobal = graphs;

  console.log("[init] graphs keys:", Object.keys(graphs));
  console.log("[init] blinn root:", graphs.blinn?.root);
  console.log("[init] blinn objects:", graphs.blinn?.objects);


  // initial visibility: blinn on, others off
  shadingState.currentMode = "gouraud";
  graphs.blinn.root.visible   = false;
  graphs.phong.root.visible   = false;
  graphs.gouraud.root.visible = true;

  console.log("[init] initial mode:", shadingState.currentMode, {
    blinnVisible:   graphs.blinn.root.visible,
    phongVisible:   graphs.phong.root.visible,
    gouraudVisible: graphs.gouraud.root.visible,
    });

  const rgmObjects = buildRGMObjects(graphs);

  // systems
  inputManager   = new InputManager(camera1, graphs, shadingState);
  cameraManager  = new CameraManager(camera1);
  lightingManager = new LightingManager(mainLight);
  controller      = new RGMController(rgmObjects);
  animationSystem = new AnimationSystem(rgmObjects);
  collisionSystem = new CollisionSystem(rgmObjects, { debugBounds: true }); // turn off later


  // resize handling
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera1.aspect = w / h;
    camera1.updateProjectionMatrix();
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // This is the "big picture" pipeline, currently mostly stubs:
  // InputManager.update(dt);          // event-driven, so no-op
  if (inputManager) inputManager.update(dt);
  
  animationSystem.update(dt,controller.state);
  //console.log("[animateed");
  collisionSystem.update(dt);
  controller.update(dt, collisionSystem.events);

  if (lightingManager) lightingManager.update(dt);
  if (cameraManager)   cameraManager.update(dt);

  updateShaderUniforms(scene, camera1, mainLight);

  renderer.render(scene, camera1);
}

init().catch((err) => console.error(err));

