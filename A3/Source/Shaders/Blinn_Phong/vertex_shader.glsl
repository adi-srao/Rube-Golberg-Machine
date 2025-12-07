// Three.js automatically provides these attributes
// attribute vec3 position;  // provided by Three.js
// attribute vec3 normal;    // provided by Three.js

uniform mat4 u_model;
uniform mat4 u_viewProjection;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    // Use Three.js's built-in attributes: position and normal
    vec4 worldPosition = u_model * vec4(position, 1.0);
    v_position = worldPosition.xyz;
    
    mat3 normalMatrix = mat3(u_model);
    v_normal = normalize(normalMatrix * normal);
    
    gl_Position = u_viewProjection * worldPosition;
}