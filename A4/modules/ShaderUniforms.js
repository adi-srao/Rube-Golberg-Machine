// ShaderUniforms.js
// Helper to update shader uniforms across the scene
import * as THREE from 'three';

/**
 * Updates shader uniforms for all custom ShaderMaterials in the scene
 * Call this once per frame in your animation loop
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The active camera
 * @param {LightHandler} lightHandler - The light handler instance
 */
export function updateShaderUniforms(scene, camera, lightHandler = null) {
  // Get light uniforms once per frame
  const lightUniforms = lightHandler ? lightHandler.getLightUniforms() : null;

  scene.traverse((obj) => {
    if (obj.material && obj.material.type === 'ShaderMaterial') {
      const material = obj.material;
      const uniforms = material.uniforms;

      // Update transformation matrices if they exist
      if (uniforms.u_model) {
        uniforms.u_model.value.copy(obj.matrixWorld);
      }

      if (uniforms.u_viewProjection) {
        const vpMatrix = new THREE.Matrix4();
        vpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        uniforms.u_viewProjection.value.copy(vpMatrix);
      }

      // Update light uniforms if lightHandler is provided
      if (lightUniforms) {
        Object.keys(lightUniforms).forEach(key => {
          if (uniforms[key]) {
            uniforms[key].value = lightUniforms[key];
          }
        });
      }

      // Flag material for update
      material.needsUpdate = true;
    }
  });
}

/**
 * Updates uniforms for a specific material
 * Useful when you want to update a single material without traversing the whole scene
 * 
 * @param {THREE.ShaderMaterial} material - The material to update
 * @param {THREE.Object3D} object - The object using this material
 * @param {THREE.Camera} camera - The active camera
 * @param {LightHandler} lightHandler - The light handler instance
 */
export function updateMaterialUniforms(material, object, camera, lightHandler = null) {
  if (!material || material.type !== 'ShaderMaterial') return;

  const uniforms = material.uniforms;

  // Update transformation matrices
  if (uniforms.u_model) {
    uniforms.u_model.value.copy(object.matrixWorld);
  }

  if (uniforms.u_viewProjection) {
    const vpMatrix = new THREE.Matrix4();
    vpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    uniforms.u_viewProjection.value.copy(vpMatrix);
  }

  // Update light uniforms
  if (lightHandler) {
    const lightUniforms = lightHandler.getLightUniforms();
    Object.keys(lightUniforms).forEach(key => {
      if (uniforms[key]) {
        uniforms[key].value = lightUniforms[key];
      }
    });
  }

  material.needsUpdate = true;
}