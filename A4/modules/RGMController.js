// RGMController.js
export const RGMState = Object.freeze({
  PENDULUM_SWINGING: "PENDULUM_SWINGING",
  BALL1_ROLLING: "BALL1_ROLLING",
  BALL1_FALLING: "BALL1_FALLING",
  DOMINOS_FALLING: "DOMINOS_FALLING",
  BALL2_ROLLING: "BALL2_ROLLING",
  DONE: "DONE",
});

export default class RGMController {
  constructor(rgmObjects) {
    this.rgm = rgmObjects;
    this.state = RGMState.PENDULUM_SWINGING;

    // initial conditions
    this._reset();
    console.log("Rgm reset")
  }

  _reset() {
    // set initial logical positions from meshes (e.g., phong branch)
    const b1 = this.rgm.ball1.meshes.phong;
    this.rgm.ball1.position.copy(b1.position);
    this.rgm.ball1.velocity.set(0, 0, 0);
    this.rgm.ball1.active = false;

    const b2 = this.rgm.ball2.meshes.phong;
    this.rgm.ball2.position.copy(b2.position);
    this.rgm.ball2.velocity.set(0, 0, 0);
    this.rgm.ball2.active = false;

    this.rgm.dominos.forEach((d) => {
      d.angle = 0;
      d.angularVelocity = 0;
      d.fallen = false;
    });

    this.rgm.pendulum.angle = -0.6;
    this.rgm.pendulum.angularVelocity = 0;
    this.rgm.pendulum.active = true;

    console.log("initial values set")
  }

  update(dt, collisionEvents) {

    // react to collisions
    collisionEvents.forEach((ev) => {
      switch (ev.type) {
        case "PENDULUM_HIT_BALL1":
          this._onPendulumHitBall1(ev);
          break;
        case "BALL1_HIT_RAMP":
          this._onBall1HitRamp(ev);
          break;
        case "BALL1_HIT_FIRST_DOMINO":
          this._onBall1HitFirstDomino(ev);
          break;
        case "DOMINO_HIT_NEXT":
          this._onDominoHitNext(ev);
          break;
        case "DOMINO_HIT_BALL2":
          this._onDominohit2(ev);
          break;
      }
    });
  }

  
  _onPendulumHitBall1({ ball1 }) {
    if (this.state !== RGMState.PENDULUM_SWINGING) return;

    this.rgm.pendulum.angularVelocity = 0;
    this.rgm.pendulum.active = true;


    this.rgm.ball1.active = true;
    this.rgm.ball1.velocity.set(2.0, 0, 0);
    this.state = RGMState.BALL1_ROLLING;

  }
  _onBall1HitRamp(ev){
    if (this.state !== RGMState.BALL1_ROLLING) return;
    this.state = RGMState.BALL1_FALLING;
    this.rgm.ball1.velocity.set(0, 0, 0);
  }
  _onBall1HitFirstDomino({ball,domino}){
    if (this.state !== RGMState.BALL1_FALLING) return;
    this.state = RGMState.DOMINOS_FALLING;
    ball.velocity.set(0, 0, 0);
    
    domino.fallen = true;
    domino.angularVelocity = -4.0;
    this.state = RGMState.DOMINOS_FALLING;

  }

  _onDominoHitNext({ from, to }) {
    if (this.state !== RGMState.DOMINOS_FALLING) return;

    if (!to.fallen) {
      to.fallen = true;
      to.angularVelocity = from.angularVelocity; // same speed/direction
    }
  }
  
  _onDominohit2({ball}){
    if (this.state !== RGMState.DOMINOS_FALLING) return;
    this.state = RGMState.BALL2_ROLLING;

    ball.velocity.set(2, 0, 0);
    ball.active = true;
  }
}
