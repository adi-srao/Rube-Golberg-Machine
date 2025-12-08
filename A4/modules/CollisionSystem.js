// CollisionSystem.js
import * as THREE from "three";

export default class CollisionSystem {
  constructor(rgmObjects) {
    this.rgm = rgmObjects;
    this.events = []; // queue of collision events for this frame
  }

  update(dt) {
    this.events.length = 0;  // clear from last frame

    this._checkBall1HitsFirstDomino();
    this._checkDominoChain();
    this._checkPendulumHitsBall2();
  }

  _emit(type, payload = {}) {
    this.events.push({ type, ...payload });
  }

  _checkBall1HitsFirstDomino() {
    const ball = this.rgm.ball1;
    const firstDomino = this.rgm.dominos[0];

    const mesh = firstDomino.meshes.phong; // position is same for all
    const dominoPos = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);

    const dist = ball.position.distanceTo(dominoPos);
    const threshold = ball.radius + 0.5; // approximate

    if (!firstDomino.fallen && dist < threshold) {
      this._emit("BALL1_HIT_FIRST_DOMINO", { ball, domino: firstDomino });
    }
  }

  _checkDominoChain() {
    for (let i = 0; i < this.rgm.dominos.length - 1; i++) {
      const d1 = this.rgm.dominos[i];
      const d2 = this.rgm.dominos[i + 1];
      if (!d1.fallen || d2.fallen) continue;

      // simple heuristic: when d1 angle beyond some threshold, knock d2
      if (Math.abs(d1.angle) > Math.PI / 6) {
        this._emit("DOMINO_HIT_NEXT", { from: d1, to: d2 });
      }
    }
  }

  _checkPendulumHitsBall2() {
    const pend = this.rgm.pendulum;
    const ball2 = this.rgm.ball2;

    // get bob position from one of the meshes (world space)
    const bobMesh = this.rgm.pendulum.pivotMeshes.phong.children.find(
      (c) => c.geometry && c.geometry.type === "SphereGeometry"
    );
    if (!bobMesh) return;

    const bobPos = new THREE.Vector3().setFromMatrixPosition(bobMesh.matrixWorld);
    const dist = bobPos.distanceTo(ball2.position);
    const threshold = ball2.radius + 0.4;

    if (dist < threshold) {
      this._emit("PENDULUM_HIT_BALL2", { bobPos, ball2 });
    }
  }
}
