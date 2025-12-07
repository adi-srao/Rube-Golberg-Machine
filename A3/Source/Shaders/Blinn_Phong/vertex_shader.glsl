attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_viewProjection;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    vec4 worldPosition = u_model * vec4(a_position, 1.0);
    v_position = worldPosition.xyz;
    
    mat3 normalMatrix = mat3(u_model);
    v_normal = normalize(normalMatrix * a_normal);
    
    gl_Position = u_viewProjection * worldPosition;
}