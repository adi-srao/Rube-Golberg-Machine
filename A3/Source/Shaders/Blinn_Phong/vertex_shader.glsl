// Three.js automatically provides these attributes and uniforms
// attribute vec3 position;
// attribute vec3 normal;
// attribute vec2 uv;
// uniform mat4 modelMatrix;
// uniform mat4 viewMatrix;
// uniform mat4 projectionMatrix;
// uniform mat3 normalMatrix;

varying vec3 v_normal;
varying vec3 v_position;
varying vec2 v_uv;

void main() {
    // Use Three.js built-in uniforms
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_position = worldPosition.xyz;
    
    // Use Three.js built-in normalMatrix for proper normal transformation
    v_normal = normalize(normalMatrix * normal);
    
    // Pass UV coordinates to fragment shader
    v_uv = uv;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}