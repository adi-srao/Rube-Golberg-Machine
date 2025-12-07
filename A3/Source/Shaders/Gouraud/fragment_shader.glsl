precision mediump float;

uniform vec3 u_color;
uniform vec3 u_lightPosition;
uniform vec3 u_viewPosition;
uniform vec3 u_ambientColor;
uniform vec3 u_specularColor;
uniform vec3 u_emissionColor; 
uniform float u_shininess;

varying vec3 v_normal;
varying vec3 v_position;
varying vec4 v_colour;

void main() {
    gl_FragColor = v_colour;
}