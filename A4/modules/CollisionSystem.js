// CollisionSystem.js
import * as THREE from "three";

export default class CollisionSystem {
  constructor(rgmObjects, { debugBounds = false } = {}) {
    this.rgm = rgmObjects;
    this.events = []; // queue of collision events for this frame
    this.debugBounds = debugBounds;

    // cache bob mesh once instead of searching every frame
    this._bobMesh = null;
    const pivotPhong = this.rgm.pendulum.pivotMeshes.phong;
    if (pivotPhong) {
      this._bobMesh = pivotPhong.children.find(
        (c) => c.geometry && c.geometry.type === "SphereGeometry"
      );
    }
  }

  update(dt) {
    this.events.length = 0;  // clear from last frame

    this._checkPendulumHitsBall1();
    this._checkBall1HitsRamp();
    this._checkBall1HitsFirstDomino();
    this._checkDominoChain();
    this._checkDominoHitsBall2();
  }

  _emit(type, payload = {}) {
    this.events.push({ type, ...payload });
  }

  /**
   * Ensure mesh has:
   *  - geometry.boundingBox (local space, static)
   *  - mesh.userData.worldBounds (THREE.Box3, world space)
   *  - optional Box3Helper for debug
   */
  _ensureWorldBounds(mesh) {
    if (!mesh) return null;

    // local bbox (only once per geometry)
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }

    // allocate world box if needed
    if (!mesh.userData.worldBounds) {
      mesh.userData.worldBounds = new THREE.Box3();
    }
    const worldBox = mesh.userData.worldBounds;

    // update world matrix & world box
    mesh.updateWorldMatrix(true, false);
    worldBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

    // optional visualization
    if (this.debugBounds) {
      if (!mesh.userData.boundsHelper) {
        mesh.userData.boundsHelper = new THREE.Box3Helper(worldBox);
        mesh.parent.add(mesh.userData.boundsHelper);
      }
      mesh.userData.boundsHelper.visible = true;
    }

    return worldBox;
  }

  _checkPendulumHitsBall1() {
    const pend  = this.rgm.pendulum;
    const ball1 = this.rgm.ball1;

    if (!this._bobMesh) return;
    const bobMesh   = this._bobMesh;
    const ball1Mesh = ball1.meshes.phong;

    const bobBox   = this._ensureWorldBounds(bobMesh);
    const ball1Box = this._ensureWorldBounds(ball1Mesh);
    if (!bobBox || !ball1Box) return;

    if (bobBox.intersectsBox(ball1Box)) {
      this._emit("PENDULUM_HIT_BALL1", { ball1 });
      console.log("pendulum hit ball1");
    }
  }

  _checkBall1HitsRamp(){
    const ball1 = this.rgm.ball1;
    const ramp  = this.rgm.ramp;

    const ball1Mesh = ball1.meshes.phong;
    const rampMesh  = ramp.meshes.phong;

    const ball1Box = this._ensureWorldBounds(ball1Mesh);
    const rampBox  = this._ensureWorldBounds(rampMesh);
    if (!ball1Box || !rampBox) return;

    if (ball1Box.intersectsBox(rampBox)) {
      this._emit("BALL1_HIT_RAMP", { ball1 });
      console.log("ball1 hit ramp");
    }

  }

  _checkBall1HitsFirstDomino() {
    const ball1 = this.rgm.ball1;
    const firstDomino = this.rgm.dominos[0];

    if (!firstDomino) return;
    if (firstDomino.fallen) return;

    const ballMesh   = ball1.meshes.phong;
    const dominoMesh = firstDomino.meshes.phong;

    const ballBox   = this._ensureWorldBounds(ballMesh);
    const dominoBox = this._ensureWorldBounds(dominoMesh);
    if (!ballBox || !dominoBox) return;

    if (ballBox.intersectsBox(dominoBox)) {
      this._emit("BALL1_HIT_FIRST_DOMINO", {
        ball:   ball1,
        domino: firstDomino,
      });
    }
  }

  _checkDominoChain() {
    // keep your angle-based chain; boxes not necessary here
    for (let i = 0; i < this.rgm.dominos.length - 1; i++) {
      const d1 = this.rgm.dominos[i];
      const d2 = this.rgm.dominos[i + 1];
      if (!d1.fallen || d2.fallen) continue;

      if (Math.abs(d1.angle) > (1.7* Math.PI / 9)) {
        this._emit("DOMINO_HIT_NEXT", { from: d1, to: d2 });
      }
    }
  }

  _checkDominoHitsBall2() {

    const ball2 = this.rgm.ball2;
    const lastDomino = this.rgm.dominos[this.rgm.dominos.length - 1];

    if (!lastDomino) return;
    if (!lastDomino.fallen) return;

    if(lastDomino.angle < -0.6) {
      this._emit("DOMINO_HIT_BALL2", {
        ball:   ball2,
      });
    }
    
  }


}
