// AnimationSystem.js
import * as THREE from "three";

export default class AnimationSystem {
  constructor(rgmObjects) {
    this.rgm = rgmObjects;
    this.gravity = new THREE.Vector3(0, -9.8, 0);
  }

  update(dt) {
    this._updateBall(this.rgm.ball1, dt);
    this._updateBall(this.rgm.ball2, dt);
    this._updatePendulum(dt);
    this._syncAllMeshes();
  }

  _updateBall(ball, dt) {
    if (!ball.active) return;

    // basic Euler integration (you can constrain to ramp etc. later)
    ball.velocity.addScaledVector(this.gravity, dt);
    ball.position.addScaledVector(ball.velocity, dt);
  }

  _updatePendulum(dt) {
    const p = this.rgm.pendulum;
    if (!p.active) return;

    // simple pendulum dynamics around small angle
    const g = 9.8;
    const L = p.length;
    const acc = -(g / L) * Math.sin(p.angle);

    p.angularVelocity += acc * dt;
    p.angle += p.angularVelocity * dt;
  }

  _syncAllMeshes() {
    // Balls
    this._syncBallMeshes(this.rgm.ball1);
    this._syncBallMeshes(this.rgm.ball2);

    // Pendulum: rotate pivot around Z or X
    const p = this.rgm.pendulum;
    const angle = p.angle;

    Object.values(p.pivotMeshes).forEach((pivot) => {
      pivot.rotation.z = angle; // or .x depending on how you built it
    });

    // Dominos: rotate around base when falling
    this.rgm.dominos.forEach((d) => {
      Object.values(d.meshes).forEach((mesh) => {
        mesh.rotation.z = d.angle; // or y/x depending on orientation
      });
    });
  }

  _syncBallMeshes(ball) {
    const pos = ball.position;
    Object.values(ball.meshes).forEach((mesh) => {
      mesh.position.copy(pos);
    });
  }
}
