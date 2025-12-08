// AnimationSystem.js
import * as THREE from "three";
import { RGMState } from "./RGMController.js";

export default class AnimationSystem {
  constructor(rgmObjects) {
    this.rgm = rgmObjects;
    this.gravity = new THREE.Vector3(0, -9.8, 0);
  
    const theta = -0.4;
    // tangent direction along ramp
    this.tangent = new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0);
    // gravitational acceleration component along ramp
    this.accel = this.tangent.multiplyScalar(-9.8 * Math.sin(theta));
  
  }

  update(dt, state) {

    //console.log("animate");
    this._updateBall(this.rgm.ball1, dt,state);
    //console.log("_updateBall");
    this._updateBall(this.rgm.ball2, dt,state);
    //console.log("_updateBall");
    this._updatePendulum(dt,state);
    //console.log("_updatePendulum");
    this._updateDominos(dt);
    this._syncAllMeshes();
    //console.log("_syncAllMeshes");
  }

  _updateBall(ball, dt,state) {
    if (!ball.active) return;
    //console.log(state)
    if (state == RGMState.BALL1_ROLLING){
      
    } else if (state == RGMState.BALL1_FALLING){
      //add downward component g * sin^2 (theta) and horizontal component g * sin(theta) * cos(theta)
      ball.velocity.addScaledVector(this.accel, dt);
    } else if (state == RGMState.BALL2_ROLLING){
      if (ball.position.x > 4.5){
        ball.velocity.addScaledVector(this.gravity,dt)
      }
    }

    ball.position.addScaledVector(ball.velocity, dt);
    //console.log("updated ball")
  }

  _updatePendulum(dt,state) {
    const p = this.rgm.pendulum;
    if (!p.active) return;

    // simple pendulum dynamics around small angle
    const g = 9.8;
    const L = p.length;
    const acc = -(g / L) * Math.sin(p.angle);

    p.angularVelocity += acc *1* dt;
    p.angle += p.angularVelocity * 1* dt;

    //console.log("angle", p.angle);

  }

  _updateDominos(dt) {
  const lastIndex = this.rgm.dominos.length - 1;

  const lastTarget  = -Math.PI / 2;   // final domino flat on the ground
  const midTarget   = -(3.6*Math.PI) / 9;   // ~-20°, all others stop here

  this.rgm.dominos.forEach((d, idx) => {
    if (!d.fallen) return;

    d.angle += d.angularVelocity * dt;

    // choose target based on whether this is the last domino
    const target = (idx === lastIndex) ? lastTarget : midTarget;

    if (d.angle < target) {      // assuming angularVelocity is negative
      d.angle = target;
      d.angularVelocity = 0;
    }
  });
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
