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

void main() {
    // Normalise normals
    vec3 normal = normalize(v_normal);
    
    // Calculate light direction
    vec3 lightDir = normalize(u_lightPosition - v_position);
    
    // Calculate view direction
    vec3 viewDir = normalize(u_viewPosition - v_position);
    
    // Ambient lighting
    vec3 ambient = u_ambientColor * u_color;
    
    // Diffuse component
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * u_color;
    
    // Specular component
    float spec = pow(max(dot(normal, lightDir), 0.0), u_shininess); // Phong rendering equation
    vec3 specular = u_specularColor * spec;
    
    // Emission component
    vec3 emission = u_emissionColor;

    // Combine all components
    vec3 finalColor = ambient + diffuse + specular + emission;

    gl_FragColor = vec4(finalColor, 1.0);
}