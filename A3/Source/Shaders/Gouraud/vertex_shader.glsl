attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_viewProjection;

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
    vec4 worldPosition = u_model * vec4(a_position, 1.0);
    v_position = worldPosition.xyz;
    
    mat3 normalMatrix = mat3(u_model);
    v_normal = normalize(normalMatrix * a_normal);
    
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
    float spec = pow(max(dot(normal, lightDir), 0.0), u_shininess);
    vec3 specular = u_specularColor * spec;
    
    // Emission component
    vec3 emission = u_emissionColor;

    // Combine all components and pass to fragment shader
    vec3 litColor = ambient + diffuse + specular + emission;
    v_colour = vec4(litColor, 1.0);

    gl_Position = u_viewProjection * worldPosition;
}
