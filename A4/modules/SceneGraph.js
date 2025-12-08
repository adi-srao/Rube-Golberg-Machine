// SceneGraph.js
import * as THREE from "three";

export default class SceneGraph {
  constructor(materialFactory) {
    this.materialFactory = materialFactory;

    this.graphs = {
      phong: {
        root: null,
        objects: {},
      },
      gouraud: {
        root: null,
        objects: {},
      },
      blinn: {
        root: null,
        objects: {},
      },
    };
  }

  /**
   * Builds two scenegraphs:
   *  - one using Phong materials
   *  - one using Gouraud materials
   *
   * Returns:
   *  {
   *    phong:   { root: Object3D, objects: {...} },
   *    gouraud: { root: Object3D, objects: {...} }
   *  }
   */
  
  build(scene) {
    const phongRoot = new THREE.Object3D();
    phongRoot.name = "RGM_Phong";
    scene.add(phongRoot);

    const gouraudRoot = new THREE.Object3D();
    gouraudRoot.name = "RGM_Gouraud";
    scene.add(gouraudRoot);

    const blinnRoot = new THREE.Object3D();
    phongRoot.name = "RGM_Blinn";
    scene.add(blinnRoot);

    this.graphs.phong.root   = phongRoot;
    this.graphs.gouraud.root = gouraudRoot;
    this.graphs.blinn.root   = blinnRoot;

    this.graphs.phong.objects   = this._buildRGM(phongRoot, "phong");
    this.graphs.gouraud.objects = this._buildRGM(gouraudRoot, "gouraud");
    this.graphs.blinn.objects   = this._buildRGM(blinnRoot, "blinn");

    console.log("[SceneGraph.build] roots:", {
    phongChildren:   phongRoot.children.length,
    gouraudChildren: gouraudRoot.children.length,
    blinnChildren:   blinnRoot.children.length,
  });

    // Let MainApp control visibility; default handled there
    return this.graphs;
  }

  _buildRGM(root, mode) {
    const objects = {
      ball1: null,
      ball2: null,
      dominos: [],
      pendulum: { root: null, pivot: null, rod: null, bob: null },
      ring: { base: null, hoop: null },
      ramp: null,
    };

    const staticRoot = new THREE.Object3D();
    staticRoot.name = `staticRoot_${mode}`;
    root.add(staticRoot);

    const dynamicRoot = new THREE.Object3D();
    dynamicRoot.name = `dynamicRoot_${mode}`;
    root.add(dynamicRoot);

    this._buildGround(staticRoot, mode);
    this._buildRing(staticRoot, mode, objects);
    this._buildPlank(staticRoot, mode, objects);
    this._buildTrackAndBall1(dynamicRoot, mode, objects);
    this._buildDominos(dynamicRoot, mode, objects);
    this._buildPendulum(dynamicRoot, mode, objects);
    this._buildBall2(dynamicRoot, mode, objects);

    return objects;
  }

  _buildGround(parent, mode) {
    const geo = new THREE.PlaneGeometry(11, 8);
    const mat = this.materialFactory.createGroundMaterial(mode);

    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.position.x = -1;
    ground.receiveShadow = true;
    ground.name = `groundPlane_${mode}`;

    parent.add(ground);
  }

  _buildRing(parent, mode, objects) {

    const hoopGeo = new THREE.TorusGeometry(1.2, 0.05, 16, 64);
    const hoopMat = this.materialFactory.createRingHoopMaterial(mode);
    const hoop = new THREE.Mesh(hoopGeo, hoopMat);
    hoop.position.set(6, -3, 0);
    hoop.rotation.x = Math.PI / 2;
    parent.add(hoop);

    objects.ring.hoop = hoop;
  }

  _buildPlank(parent, mode, objects) {
    const plankGeo = new THREE.BoxGeometry(4.5, 0.3, 1);
    const plankMat = this.materialFactory.createWoodTrackMaterial(mode);
    const plank = new THREE.Mesh(plankGeo, plankMat);
    plank.position.set(-12.5, 2.5, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    parent.add(plank);


  }

  _buildTrackAndBall1(parent, mode, objects) {
    const rampGeo = new THREE.BoxGeometry(7, 0.3, 1);
    const rampMat = this.materialFactory.createWoodTrackMaterial(mode);
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(-7, 1.236, 0);
    ramp.rotation.z =-0.39;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    parent.add(ramp);

    const ballGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const ballMat = this.materialFactory.createMetalBallMaterial(mode);
    const ball1 = new THREE.Mesh(ballGeo, ballMat);
    ball1.position.set(-13.88, 3, 0);
    ball1.castShadow = true;
    parent.add(ball1);

    objects.ball1 = ball1;
    objects.ramp = ramp;
  }

  _buildDominos(parent, mode, objects) {
    const dominoRoot = new THREE.Object3D();
    dominoRoot.name = `dominoRoot_${mode}`;
    parent.add(dominoRoot);

    const dominoGeo = new THREE.BoxGeometry(0.2, 1.0, 0.5);
    dominoGeo.translate(-0.1, 0.5, 0);

    const baseMat = this.materialFactory.createDominoMaterial(mode);

    const count = 9;
    const spacing = 0.75;

    for (let i = 0; i < count; i++) {
      const mat = baseMat.clone(); 
      const domino = new THREE.Mesh(dominoGeo, mat);
      domino.position.set(-3.6 + i * spacing, 0, 0);
      domino.castShadow = true;
      dominoRoot.add(domino);
      objects.dominos.push(domino);
    }
  }

  _buildPendulum(parent, mode, objects) {
    const pendulumRoot = new THREE.Object3D();
    pendulumRoot.name = `pendulumRoot_${mode}`;
    parent.add(pendulumRoot);

    const pivot = new THREE.Object3D();
    pivot.position.set(-15.2, 6.2, 0); // height above ground
    pivot.name = `pendulumPivot_${mode}`;
    pendulumRoot.add(pivot);

    const rodLength = 3;
    const rodGeo = new THREE.BoxGeometry(0.1, rodLength, 0.1);
    const rodMat = this.materialFactory.createPendulumRodMaterial(mode);
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(0, -rodLength / 2, 0);
    rod.castShadow = true;
    pivot.add(rod);

    const bobGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const bobMat = this.materialFactory.createMetalBallMaterial(mode);
    const bob = new THREE.Mesh(bobGeo, bobMat);
    bob.position.set(0, -rodLength, 0);
    bob.castShadow = true;
    pivot.add(bob);

    objects.pendulum.root = pendulumRoot;
    objects.pendulum.pivot = pivot;
    objects.pendulum.rod = rod;
    objects.pendulum.bob = bob;
  }

  _buildBall2(parent, mode, objects) {
    const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const ballMat = this.materialFactory.createMetalBallMaterial(mode);
    const ball2 = new THREE.Mesh(ballGeo, ballMat);
    ball2.position.set(3.4, 0.35, 0);
    ball2.castShadow = true;
    parent.add(ball2);

    objects.ball2 = ball2;
  }
}
