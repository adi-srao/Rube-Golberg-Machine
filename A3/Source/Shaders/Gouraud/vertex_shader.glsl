precision mediump float;

// Three.js provides these automatically - DO NOT redeclare
// attribute vec3 position;
// attribute vec3 normal;
// attribute vec2 uv;
// uniform mat4 modelMatrix;
// uniform mat4 viewMatrix;
// uniform mat4 projectionMatrix;
// uniform mat4 modelViewMatrix;
// uniform mat3 normalMatrix;

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
varying vec4 v_colour;
varying vec2 v_uv;

void main() {
    // Transform position to world space using Three.js's modelMatrix
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_position = worldPosition.xyz;
    
    // Transform normal to world space using normalMatrix
    v_normal = normalize(normalMatrix * normal);
    
    // Pass UV coordinates if available
    #ifdef USE_UV
        v_uv = uv;
    #endif
    
    // Normalize normals
    vec3 norm = normalize(v_normal);
    
    // Calculate light direction
    vec3 lightDir = normalize(u_lightPosition - v_position);
    
    // Calculate view direction using Three.js built-in cameraPosition
    vec3 viewDir = normalize(cameraPosition - v_position);
    
    // Sample texture if available, otherwise use material color
    vec3 baseColor = u_color;
    if (u_useMap > 0.5) {
        vec4 texColor = texture2D(u_map, v_uv);
        baseColor = texColor.rgb * u_color;
    }    
    // Ambient lighting
    vec3 ambient = u_ambientColor * baseColor;
    
    // Diffuse component with light intensity (matching Blinn-Phong)
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * baseColor * u_lightIntensity;
    
    // Specular component (Phong reflection) with light intensity
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    vec3 specular = u_specularColor * spec * u_lightIntensity;    
    // Emission component
    vec3 emission = u_emissionColor;

    // Combine all components and pass to fragment shader
    vec3 litColor = ambient + diffuse + specular + emission;
    v_colour = vec4(litColor, 1.0);

    // Use Three.js built-in matrices for final position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}