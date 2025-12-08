// modules/InputManager.js
export default class InputManager {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {Object} graphs - { phong: {root}, gouraud: {root}, blinn: {root} }
   * @param {Object} shadingState - { currentMode: string }
   */
  constructor(camera, graphs, shadingState) {
    this.camera = camera;
    this.graphs = graphs;
    this.state = shadingState;

    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener("keydown", this._onKeyDown);
  }

  _onKeyDown(e) {
    const key = e.key.toLowerCase();

    if (key === "p") {
      this._cycleShadingMode();
    } else if (key === "a") {
      this.camera.position.x -= 1;
      this.camera.lookAt(0, 0, 0);
    } else if (key === "d") {
      this.camera.position.x += 1;
      this.camera.lookAt(0, 0, 0);
    } else if (key === "w") {
      this.camera.position.z -= 1;
      this.camera.lookAt(0, 0, 0);
    } else if (key === "s") {
      this.camera.position.z += 1;
      this.camera.lookAt(0, 0, 0);
    } else if (key === "q") {
      this.camera.position.y -= 1;
      this.camera.lookAt(0, 0, 0);
    } else if (key === "e") {
      this.camera.position.y += 1;
      this.camera.lookAt(0, 0, 0);
    }
  }

  _cycleShadingMode() {
    const graphs = this.graphs;
    const mode = this.state.currentMode;

    let nextMode;
    if (mode === "phong") nextMode = "gouraud";
    else if (mode === "gouraud") nextMode = "blinn";
    else nextMode = "phong";

    this.state.currentMode = nextMode;

    graphs.phong.root.visible   = nextMode === "phong";
    graphs.gouraud.root.visible = nextMode === "gouraud";
    graphs.blinn.root.visible   = nextMode === "blinn";

    console.log("Switched shading to", nextMode);
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
  }

  update(dt) {
    // no-op for now; event-based
  }
}
