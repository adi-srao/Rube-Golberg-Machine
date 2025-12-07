import * as THREE from "three";

export default class SceneGraph {
  constructor(materialFactory) {
    this.materialFactory = materialFactory;

    // references you’ll need later for animation/collision
    this.objects = {
      ball1: null,
      ball2: null,
      dominos: [],
      pendulum: {
        root: null,
        pivot: null,
        rod: null,
        bob: null,
      },
      ring: {
        base: null,
        hoop: null,
      },
    };
  }

  build(scene) {
    const worldRoot = new THREE.Object3D();
    worldRoot.name = 'worldRoot';
    scene.add(worldRoot);

    const staticRoot = new THREE.Object3D();
    staticRoot.name = 'staticRoot';
    worldRoot.add(staticRoot);

    const dynamicRoot = new THREE.Object3D();
    dynamicRoot.name = 'dynamicRoot';
    worldRoot.add(dynamicRoot);

    this._buildGround(staticRoot);
    this._buildRing(staticRoot);
    this._buildTrackAndBall1(dynamicRoot);
    this._buildDominos(dynamicRoot);
    this._buildPendulum(dynamicRoot);
    this._buildBall2(dynamicRoot);

    return this.objects;
  }

  // ---------- static objects ----------

  _buildGround(parent) {
    const geo = new THREE.PlaneGeometry(50, 50);
    const mat = this.materialFactory.createGroundMaterial(); // A3-based
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'groundPlane';
    parent.add(ground);
  }

  _buildRing(parent) {
    // base
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
    const baseMat = this.materialFactory.createRingBaseMaterial();
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(10, 0.1, 0); // example position
    base.receiveShadow = true;
    parent.add(base);

    // hoop
    const hoopGeo = new THREE.TorusGeometry(1.2, 0.05, 16, 64);
    const hoopMat = this.materialFactory.createRingHoopMaterial();
    const hoop = new THREE.Mesh(hoopGeo, hoopMat);
    hoop.position.set(10, 0.3, 0);
    hoop.rotation.x = Math.PI / 2;

    parent.add(hoop);

    this.objects.ring.base = base;
    this.objects.ring.hoop = hoop;
  }

  // ---------- dynamic objects ----------

  _buildTrackAndBall1(parent) {
    // simple ramp as a box
    const rampGeo = new THREE.BoxGeometry(8, 0.3, 1);
    const rampMat = this.materialFactory.createWoodTrackMaterial();
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(-10, 1.5, 0);
    ramp.rotation.z = -Math.PI / 10; // slight incline
    ramp.castShadow = true;
    ramp.receiveShadow = true;

    parent.add(ramp);

    // ball1 on ramp
    const ballGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const ballMat = this.materialFactory.createMetalBallMaterial();
    const ball1 = new THREE.Mesh(ballGeo, ballMat);
    ball1.position.set(-13, 2.0, 0); // adjust based on ramp
    ball1.castShadow = true;

    parent.add(ball1);

    this.objects.ball1 = ball1;
  }

  _buildDominos(parent) {
    const dominoRoot = new THREE.Object3D();
    dominoRoot.name = 'dominoRoot';
    parent.add(dominoRoot);

    const dominoGeo = new THREE.BoxGeometry(0.2, 1.0, 0.5);
    const dominoMat = this.materialFactory.createDominoMaterial();

    const count = 10;
    const spacing = 0.7;
    for (let i = 0; i < count; i++) {
      const domino = new THREE.Mesh(dominoGeo, dominoMat.clone());
      domino.position.set(-4 + i * spacing, 0.5, 0); // line in +x direction
      domino.castShadow = true;
      dominoRoot.add(domino);
      this.objects.dominos.push(domino);
    }
  }

  _buildPendulum(parent) {
    const pendulumRoot = new THREE.Object3D();
    pendulumRoot.name = 'pendulumRoot';
    parent.add(pendulumRoot);

    // pivot at top (this is the one you'll rotate later)
    const pivot = new THREE.Object3D();
    pivot.position.set(2, 4, 0); // height above ground
    pivot.name = 'pendulumPivot';
    pendulumRoot.add(pivot);

    // thin rod: cuboid
    const rodLength = 3;
    const rodGeo = new THREE.BoxGeometry(0.1, rodLength, 0.1);
    const rodMat = this.materialFactory.createPendulumRodMaterial();
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(0, -rodLength / 2, 0); 
    rod.castShadow = true;
    pivot.add(rod);

    // bob: sphere at rod end
    const bobGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const bobMat = this.materialFactory.createMetalBallMaterial();
    const bob = new THREE.Mesh(bobGeo, bobMat);
    bob.position.set(0, -rodLength, 0);
    bob.castShadow = true;
    pivot.add(bob);

    this.objects.pendulum.root = pendulumRoot;
    this.objects.pendulum.pivot = pivot;
    this.objects.pendulum.rod = rod;
    this.objects.pendulum.bob = bob;
  }

  _buildBall2(parent) {
    const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const ballMat = this.materialFactory.createMetalBallMaterial();
    const ball2 = new THREE.Mesh(ballGeo, ballMat);
    // place near pendulum so it can be knocked off a ledge later
    ball2.position.set(6, 2.0, 0);
    ball2.castShadow = true;

    parent.add(ball2);
    this.objects.ball2 = ball2;
  }
}
