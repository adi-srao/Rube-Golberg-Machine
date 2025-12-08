// RGMController.js
export const RGMState = Object.freeze({
  IDLE: "IDLE",
  BALL1_ROLLING: "BALL1_ROLLING",
  DOMINOS_FALLING: "DOMINOS_FALLING",
  PENDULUM_SWINGING: "PENDULUM_SWINGING",
  BALL2_ROLLING: "BALL2_ROLLING",
  DONE: "DONE",
});

export default class RGMController {
  constructor(rgmObjects) {
    this.rgm = rgmObjects;
    this.state = RGMState.IDLE;

    // initial conditions
    this._reset();
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

    this.rgm.pendulum.angle = 0;
    this.rgm.pendulum.angularVelocity = 0;
    this.rgm.pendulum.active = false;
  }

  update(dt, collisionEvents) {
    // Example: start chain reaction on some condition (e.g., key press later).
    if (this.state === RGMState.IDLE) {
      // auto start for now
      this._startBall1();
    }

    // react to collisions
    collisionEvents.forEach((ev) => {
      switch (ev.type) {
        case "BALL1_HIT_FIRST_DOMINO":
          this._onBall1HitFirstDomino(ev);
          break;
        case "DOMINO_HIT_NEXT":
          this._onDominoHitNext(ev);
          break;
        case "PENDULUM_HIT_BALL2":
          this._onPendulumHitBall2(ev);
          break;
      }
    });
  }

  _startBall1() {
    this.state = RGMState.BALL1_ROLLING;
    this.rgm.ball1.active = true;
    // set initial velocity roughly along the ramp direction
    this.rgm.ball1.velocity.set(2, 0, 0); // tune this
  }

  _onBall1HitFirstDomino({ ball, domino }) {
    if (this.state !== RGMState.BALL1_ROLLING) return;
    ball.active = false;
    ball.velocity.set(0, 0, 0);

    // knock first domino
    domino.angularVelocity = 1.5;
    domino.fallen = true;
    this.state = RGMState.DOMINOS_FALLING;
  }

  _onDominoHitNext({ from, to }) {
    if (this.state !== RGMState.DOMINOS_FALLING) return;
    to.angularVelocity = 1.5;
    to.fallen = true;
  }

  _onPendulumHitBall2({ ball2 }) {
    if (this.state !== RGMState.PENDULUM_SWINGING &&
        this.state !== RGMState.DOMINOS_FALLING) return;

    ball2.active = true;
    ball2.velocity.set(3, 0, 0); // send ball2 towards ring
    this.state = RGMState.BALL2_ROLLING;
  }
}
