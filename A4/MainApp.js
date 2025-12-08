import * as THREE from "three";
import SceneGraph from "./modules/SceneGraph.js";
import MaterialFactory from "./modules/MaterialFactory.js";
import AnimationSystem from "./modules/AnimationSystem.js";
import CollisionSystem from "./modules/CollisionSystem.js";
import RGMController from "./modules/RGMController.js";
import CameraManager from "./modules/CameraManager.js";
import LightingManager from "./modules/LightingManager.js";

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
let currentMode = "blinn";



async function init() {

  function buildRGMObjects(graphs) {
    // Helper to collect corresponding meshes in all 3 graphs
    const collect = (name) => ({
      phong:   graphs.phong.objects[name],
      gouraud: graphs.gouraud.objects[name],
      blinn:   graphs.blinn.objects[name],
    });

    return {
      ball1: {
        meshes: collect("ball1"),
        radius: 0.3,
        position: new THREE.Vector3(),   // logical position
        velocity: new THREE.Vector3(),   // logical velocity
        active: false,
      },
      ball2: {
        meshes: collect("ball2"),
        radius: 0.35,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        active: false,
      },
      dominos: graphs.phong.objects.dominos.map((_, i) => ({
        meshes: {
          phong:   graphs.phong.objects.dominos[i],
          gouraud: graphs.gouraud.objects.dominos[i],
          blinn:   graphs.blinn.objects.dominos[i],
        },
        // orientation state, angle, angular velocity etc.
        angle: 0,
        angularVelocity: 0,
        fallen: false,
      })),
      pendulum: {
        pivotMeshes: {
          phong:   graphs.phong.objects.pendulum.pivot,
          gouraud: graphs.gouraud.objects.pendulum.pivot,
          blinn:   graphs.blinn.objects.pendulum.pivot,
        },
        angle: 0,
        angularVelocity: 0,
        length: 3,
        active: false,
      },
      // ring/hoop if you want to collide with ball2
      ring: {
        meshes: {
          phong:   graphs.phong.objects.ring.hoop,
          gouraud: graphs.gouraud.objects.ring.hoop,
          blinn:   graphs.blinn.objects.ring.hoop,
        },
        // maybe for scoring if ball2 passes through
      },
    };
  }


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

  currentMode = "blinn";
  graphs.blinn.root.visible = true;
  graphs.phong.root.visible = false;
  graphs.gouraud.root.visible = false;

  const rgmObjects      = buildRGMObjects(graphs);
  const rgmController   = new RGMController(rgmObjects);
  const animationSystem = new AnimationSystem(rgmObjects);
  const collisionSystem = new CollisionSystem(rgmObjects);
  const lightingManager = new LightingManager(mainLight);
  const cameraManager   = new CameraManager(camera1);

  window._systems = {
    rgmController,
    animationSystem,
    collisionSystem,
    lightingManager,
    cameraManager,
  };
  

  window.addEventListener("keydown", (e) => {
    //cycle through modes "phong", "gouraud", "blinn"
    if (e.key === "p" || e.key === "P") {
      if (currentMode === "phong") {
        currentMode = "gouraud";
        graphs.phong.root.visible = false;
        graphs.gouraud.root.visible = true;
      } else if (currentMode === "gouraud") {
        currentMode = "blinn";
        graphs.gouraud.root.visible = false;
        graphs.blinn.root.visible = true;
      } else if (currentMode === "blinn") {
        currentMode = "phong";
        graphs.blinn.root.visible = false;
        graphs.phong.root.visible = true;
      }
      
    }

    else if (e.key == "a" || e.key == "A") {
      //shift camera to the left
      camera1.position.x -= 1;
      camera1.lookAt(0, 0, 0);
    }

    else if (e.key == "d" || e.key == "D") {
      //shift camera to the left
      camera1.position.x += 1;
      camera1.lookAt(0, 0, 0);
    }

    else if (e.key == "w" || e.key == "W") {
      //shift camera to the left
      camera1.position.z -= 1;
      camera1.lookAt(0, 0, 0);
    }

    else if (e.key == "s" || e.key == "S") {
      //shift camera to the left
      camera1.position.z += 1;
      camera1.lookAt(0, 0, 0);
    }

    else if (e.key == "q" || e.key == "Q") {
      //shift camera to the left
      camera1.position.y -= 1;
      camera1.lookAt(0, 0, 0);
    }

    else if (e.key == "e" || e.key == "E") {
      //shift camera to the left
      camera1.position.y += 1;
      camera1.lookAt(0, 0, 0);
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

    const { rgmController, animationSystem, collisionSystem,
          lightingManager, cameraManager } = window._systems;

    rgmController.update(delta, collisionSystem.events);
    animationSystem.update(delta);
    collisionSystem.update(delta);
    lightingManager.update(delta);
    cameraManager.update(delta);
  
    renderer.render(scene, camera1);
}


init().catch((err) => console.error(err));