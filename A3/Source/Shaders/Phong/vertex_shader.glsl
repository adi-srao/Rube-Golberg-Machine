precision mediump float;

// Three.js built-in uniforms
// uniform mat4 modelMatrix;
// uniform mat4 viewMatrix;
// uniform mat4 projectionMatrix;
// uniform mat4 modelViewMatrix;
// uniform mat3 normalMatrix;

varying vec3 v_normal;
varying vec3 v_position;
varying vec2 v_uv;

void main() {
    // Transform position to world space
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_position = worldPosition.xyz;
    
    // Transform normal to world space using normalMatrix
    v_normal = normalize(normalMatrix * normal);
    
    // Pass UV coordinates if available
    #ifdef USE_UV
        v_uv = uv;
    #endif
    
    // Use Three.js built-in matrices for final position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}