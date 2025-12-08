// MainApp.js (Updated with LightHandler integration)
import * as THREE from "three";
import SceneGraph from "./modules/SceneGraph.js";
import MaterialFactory from "./modules/MaterialFactory.js";
import { updateShaderUniforms } from "./modules/ShaderUniforms.js";
import InputManager from "./modules/InputManager.js";
import CameraManager from "./modules/CameraController.js";
import LightHandler from "./modules/LightHandler.js";
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
let lightHandler = null;
let controller = null;
let animationSystem = null;
let collisionSystem = null;
let rgmObjects = null;

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
    position: b1Phong.position.clone(),
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
    length: 3,
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
  };

  // --- Ramp ---
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
  // Initialize LightHandler first
  lightHandler = new LightHandler(scene);

  // Create MaterialFactory with LightHandler
  const materialFactory = await MaterialFactory.create(lightHandler);
  
  const sceneGraph = new SceneGraph(materialFactory);
  const graphs = sceneGraph.build(scene);
  graphsGlobal = graphs;

  console.log("[init] graphs keys:", Object.keys(graphs));
  console.log("[init] blinn root:", graphs.blinn?.root);
  console.log("[init] blinn objects:", graphs.blinn?.objects);

  // Initial visibility: blinn on, others off
  shadingState.currentMode = "blinn";
  graphs.blinn.root.visible   = true;
  graphs.phong.root.visible   = false;
  graphs.gouraud.root.visible = false;

  console.log("[init] initial mode:", shadingState.currentMode, {
    blinnVisible:   graphs.blinn.root.visible,
    phongVisible:   graphs.phong.root.visible,
    gouraudVisible: graphs.gouraud.root.visible,
  });

  rgmObjects = buildRGMObjects(graphs);

  // Systems
  inputManager   = new InputManager(camera1, graphs, shadingState, lightHandler);
  cameraManager  = new CameraManager(camera1);
  controller     = new RGMController(rgmObjects);
  animationSystem = new AnimationSystem(rgmObjects);
  collisionSystem = new CollisionSystem(rgmObjects, { debugBounds: true });

  // Set up keyboard controls for lights
  setupLightControls();

  // Resize handling
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera1.aspect = w / h;
    camera1.updateProjectionMatrix();
  });

  animate();
}

function setupLightControls() {
  // Keyboard controls for toggling lights
  document.addEventListener('keydown', (e) => {
    switch(e.key) {
      case '1':
        lightHandler.toggleLight('point');
        break;
      case '2':
        lightHandler.toggleLight('directional');
        break;
      case '3':
        lightHandler.toggleLight('tracking');
        break;
      case 'h':
      case 'H':
        // Toggle helpers visibility
        const firstHelper = lightHandler.lightHelpers[0];
        const currentlyVisible = firstHelper.helper.visible;
        lightHandler.setHelpersVisible(!currentlyVisible);
        console.log(`[LightHandler] Helpers: ${!currentlyVisible ? 'ON' : 'OFF'}`);
        break;
    }
  });

  console.log("[LightHandler] Controls:");
  console.log("  1 - Toggle Point Light");
  console.log("  2 - Toggle Directional Spotlight");
  console.log("  3 - Toggle Tracking Spotlight");
  console.log("  H - Toggle Light Helpers");
}

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // Update input
  if (inputManager) inputManager.update(dt);
  
  // Update animations and physics
  animationSystem.update(dt, controller.state);
  collisionSystem.update(dt);
  controller.update(dt, collisionSystem.events);

  // Determine which object is currently active for tracking spotlight
  updateTrackingTarget();

  // Update light positions and orientations
  if (lightHandler) lightHandler.update(dt);

  // Update camera
  if (cameraManager) cameraManager.update(dt);

  // Update all shader uniforms with current light state
  updateShaderUniforms(scene, camera1, lightHandler);

  renderer.render(scene, camera1);
}

/**
 * Updates the tracking spotlight target based on which object is currently moving
 */
function updateTrackingTarget() {
  if (!lightHandler || !controller) return;

  const state = controller.state;
  
  // Determine which object is active
  if (state === 'BALL1_ROLLING' || state === 'BALL1_FALLING') {
    // Track ball1
    const mode = shadingState.currentMode;
    const ball1Mesh = graphsGlobal[mode].objects.ball1;
    if (ball1Mesh) {
      lightHandler.setTrackingTarget(ball1Mesh.position);
    }
  } else if (state === 'DOMINOS_FALLING') {
    const mode = shadingState.currentMode;
    const dominos = rgmObjects.dominos;
    const meshDominos    = graphsGlobal[mode].objects.dominos; 
    if (dominos && dominos.length > 0) {
      // Track falling domino using number of fallen dominos and set it to that domino's position
       let lastFallenIndex = -1;
        for (let i = 0; i < dominos.length; i++) {
          if (dominos[i].fallen) {
            lastFallenIndex = i;
          }
        }

    if (lastFallenIndex >= 0) {
        const targetMesh = meshDominos[lastFallenIndex];
        lightHandler.setTrackingTarget(targetMesh.position);
      }
    }      
    
  } else if (state === 'PENDULUM_SWINGING') {
    // Track pendulum bob
    const mode = shadingState.currentMode;
    const pendulum = graphsGlobal[mode].objects.pendulum;
    if (pendulum && pendulum.bob) {
      lightHandler.setTrackingTarget(pendulum.bob.position);
    }
  } else if (state === 'BALL2_ROLLING') {
    // Track ball2
    const mode = shadingState.currentMode;
    const ball2Mesh = graphsGlobal[mode].objects.ball2;
    if (ball2Mesh) {
      lightHandler.setTrackingTarget(ball2Mesh.position);
    }
  } else {
    // No active object, point at scene center
    lightHandler.setTrackingTarget(new THREE.Vector3(0, 0, 0));
  }
}

init().catch((err) => console.error(err));