// CameraController.js
import * as THREE from 'three';

export default class CameraController {
  constructor(orbitCamera, followCamera, canvas, rgmObjects) {
    this.orbitCamera = orbitCamera;
    this.followCamera = followCamera;
    this.canvas = canvas;
    this.rgmObjects = rgmObjects;

    // Camera mode: 'orbit' or 'follow'
    this.mode = 'orbit';

    // Orbit camera settings
    this.orbitDistance = 25;
    this.orbitCenter = new THREE.Vector3(-4, 2, 1);
    this.rotationQuat = new THREE.Quaternion(); // Identity quaternion

    // Follow camera settings
    this.followTarget = null;
    this.followOffset = new THREE.Vector3(0, 3, 5); // Offset from target
    this.followYRotation = 0; // Y-axis rotation angle

    // Mouse tracking for orbit mode
    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };

    this._setupEventListeners();
    this._initializeOrbitCamera();
  }

  _setupEventListeners() {
    // Mouse events for orbit camera trackball
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this._onMouseUp());
  }

  _initializeOrbitCamera() {
    // Set initial orbit camera position
    this.orbitCamera.position.set(0, 15, 25);
    this.orbitCamera.lookAt(this.orbitCenter);
    
    // Initialize rotation quaternion from current camera orientation
    const initialDir = new THREE.Vector3();
    this.orbitCamera.getWorldDirection(initialDir);
    this.rotationQuat.identity();
  }

  _onMouseDown(e) {
    if (this.mode !== 'orbit') return;
    
    this.isDragging = true;
    this.lastMousePos = { x: e.offsetX, y: e.offsetY };
  }

  _onMouseUp() {
    this.isDragging = false;
  }

  _onMouseMove(e) {
    
    if (this.mode !== 'orbit' || !this.isDragging) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Convert mouse coordinates to normalized device coordinates [-1, 1]
    const x1 = (2 * this.lastMousePos.x - width) / width;
    const y1 = (height - 2 * this.lastMousePos.y) / height;
    const z1 = this._projectToSphere(x1, y1);

    const x2 = (2 * e.offsetX - width) / width;
    const y2 = (height - 2 * e.offsetY) / height;
    const z2 = this._projectToSphere(x2, y2);

    // Create vectors on virtual trackball
    const p2 = new THREE.Vector3(x1, y1, z1).normalize();
    const p1 = new THREE.Vector3(x2, y2, z2).normalize();

    // Calculate rotation axis and angle
    const axis = new THREE.Vector3().crossVectors(p1, p2).normalize();
    const angle = Math.acos(Math.min(1.0, p1.dot(p2)));

    // Create quaternion from axis-angle
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    // Multiply quaternions: new rotation * accumulated rotation
    this.rotationQuat.multiplyQuaternions(q, this.rotationQuat);
    this.rotationQuat.normalize();

    // Update last position
    this.lastMousePos = { x: e.offsetX, y: e.offsetY };
  }

  _projectToSphere(x, y, radius = 1.0) {
    const d = Math.sqrt(x * x + y * y);
    const r = radius;
    const t = r * Math.SQRT1_2;
    
    if (d < t) {
      // Inside sphere
      return Math.sqrt(r * r - d * d);
    } else {
      // Outside sphere - use hyperbolic sheet
      return (t * t) / d;
    }
  }

  /**
   * Toggle between orbit and follow camera modes
   */
  toggleCameraMode() {
    this.mode = this.mode === 'orbit' ? 'follow' : 'orbit';
    
    if (this.mode === 'orbit') {
      // Reset orbit camera
      this._updateOrbitCamera();
    } else {
      // Initialize follow camera if target exists
      if (this.followTarget) {
        this._updateFollowCamera();
      }
    }
  }

  /**
   * Get current camera mode
   */
  getCameraMode() {
    return this.mode;
  }

  /**
   * Get the currently active camera
   */
  getActiveCamera() {
    return this.mode === 'orbit' ? this.orbitCamera : this.followCamera;
  }

  /**
   * Set the target for follow camera
   * @param {THREE.Vector3} target - Position to follow
   */
  setFollowTarget(target) {
    this.followTarget = target;
  }

  /**
   * Rotate follow camera around vertical axis
   * @param {number} angle - Rotation angle in radians
   */
  rotateFollowCamera(angle) {
    if (this.mode !== 'follow') return;
    
    this.followYRotation += angle;
    // Keep angle in reasonable range
    this.followYRotation = this.followYRotation % (Math.PI * 2);
  }

  /**
   * Update camera positions and orientations
   * @param {number} dt - Delta time
   */
  update(dt) {
    if (this.mode === 'orbit') {
      this._updateOrbitCamera();
    } else {
      this._updateFollowCamera();
    }
  }

  _updateOrbitCamera() {
    // Create base position at orbit distance
    const basePosition = new THREE.Vector3(0, 0, this.orbitDistance);

    // Apply accumulated rotation quaternion
    basePosition.applyQuaternion(this.rotationQuat);

    // Position camera relative to orbit center
    this.orbitCamera.position.copy(basePosition).add(this.orbitCenter);

    // Look at center
    this.orbitCamera.lookAt(this.orbitCenter);
  }

  _updateFollowCamera() {
    if (!this.followTarget) return;

    // Calculate rotated offset
    const offset = this.followOffset.clone();
    
    // Create rotation matrix for Y-axis rotation
    const rotationMatrix = new THREE.Matrix4().makeRotationY(this.followYRotation);
    offset.applyMatrix4(rotationMatrix);

    // Position camera at offset from target
    this.followCamera.position.copy(this.followTarget).add(offset);

    // Look at target (slightly above it for better view)
    const lookAtPoint = this.followTarget.clone();
    lookAtPoint.y += 0.5; // Look slightly above the object
    this.followCamera.lookAt(lookAtPoint);
  }

  /**
   * Reset orbit camera to default position and rotation
   */
  resetOrbitCamera() {
    this.rotationQuat.identity();
    this.orbitCamera.position.set(0, 15, 25);
    this.orbitCamera.lookAt(this.orbitCenter);
  }

  /**
   * Reset follow camera rotation
   */
  resetFollowCamera() {
    this.followYRotation = 0;
  }

  /**
   * Set orbit camera distance from center
   * @param {number} distance
   */
  setOrbitDistance(distance) {
    this.orbitDistance = distance;
  }

  /**
   * Set orbit camera center point
   * @param {THREE.Vector3} center
   */
  setOrbitCenter(center) {
    this.orbitCenter.copy(center);
  }

  /**
   * Set follow camera offset from target
   * @param {THREE.Vector3} offset
   */
  setFollowOffset(offset) {
    this.followOffset.copy(offset);
  }

  /**
   * Clean up event listeners
   */
  dispose() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
  }
}