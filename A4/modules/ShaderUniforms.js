import * as THREE from "three";

export function updateShaderUniforms(scene, camera, light) {
  camera.updateMatrixWorld();

  const viewProjection = new THREE.Matrix4();
  viewProjection.multiplyMatrices(
    camera.projectionMatrix,      // P
    camera.matrixWorldInverse     // V
  );

  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const mat = obj.material;
    if (!mat || !mat.uniforms) return;

    const u = mat.uniforms;

    if (!u.u_model || !u.u_viewProjection) return;

    obj.updateMatrixWorld();
    u.u_model.value.copy(obj.matrixWorld);

    u.u_viewProjection.value.copy(viewProjection);

    if (u.u_viewPosition) {
      u.u_viewPosition.value.setFromMatrixPosition(camera.matrixWorld);
    }

    if (light && u.u_lightPosition) {
      u.u_lightPosition.value.copy(light.position);
    }
  });
}