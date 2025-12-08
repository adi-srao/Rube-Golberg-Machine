precision mediump float;

// Three.js built-in uniforms
// uniform mat4 viewMatrix;

uniform vec3 u_color;
uniform vec3 u_lightPosition;
uniform float u_lightIntensity;
uniform vec3 u_ambientColor;
uniform vec3 u_specularColor;
uniform vec3 u_emissionColor; 
uniform float u_shininess;
uniform sampler2D u_map;
uniform float u_useMap;

varying vec3 v_normal;
varying vec3 v_position;
varying vec2 v_uv;

void main() {
    // Normalise normals
    vec3 normal = normalize(v_normal);
    
    // Sample texture if available, otherwise use material color
    vec3 baseColor = u_color;
    if (u_useMap > 0.5) {
        vec4 texColor = texture2D(u_map, v_uv);
        baseColor = texColor.rgb * u_color;
    }
    
    // Calculate light direction
    vec3 lightDir = normalize(u_lightPosition - v_position);
    
    // Calculate view direction (camera is moving, so we use built-in cameraPosition)
    vec3 viewDir = normalize(cameraPosition - v_position);
    
    // Ambient lighting
    vec3 ambient = u_ambientColor * baseColor;
    
    // Diffuse component with light intensity
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * baseColor * u_lightIntensity;
    
    // Specular component (Blinn-Phong) with light intensity
    float spec = pow(max(dot(normal, lightDir), 0.0), u_shininess);
    vec3 specular = u_specularColor * spec * u_lightIntensity;
    
    // Emission component
    vec3 emission = u_emissionColor;

    // Combine all components
    vec3 finalColor = ambient + diffuse + specular + emission;

    gl_FragColor = vec4(finalColor, 1.0);
}