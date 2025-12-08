precision mediump float;

uniform vec3 u_color;
uniform vec3 u_ambientColor;
uniform vec3 u_specularColor;
uniform vec3 u_emissionColor; 
uniform float u_shininess;
uniform sampler2D u_map;
uniform float u_useMap;

// Light Uniforms
#define D_LIGHTS_MAX 4
uniform int u_numDirectionalLights;
uniform vec3 u_directionalLightDirections[D_LIGHTS_MAX];
uniform vec3 u_directionalLightColors[D_LIGHTS_MAX];
uniform float u_directionalLightIntensities[D_LIGHTS_MAX];

#define MAX_P_LIGHTS 8
uniform int u_numPointLights;
uniform vec3 u_pointLightPositions[MAX_P_LIGHTS];
uniform vec3 u_pointLightColors[MAX_P_LIGHTS];
uniform float u_pointLightIntensities[MAX_P_LIGHTS];
uniform float u_pointLightDecays[MAX_P_LIGHTS];

#define MAX_S_LIGHTS 4
uniform int u_numSpotLights;
uniform vec3 u_spotLightPositions[MAX_S_LIGHTS];
uniform vec3 u_spotLightDirections[MAX_S_LIGHTS];
uniform vec3 u_spotLightColors[MAX_S_LIGHTS];
uniform float u_spotLightIntensities[MAX_S_LIGHTS];
uniform float u_spotLightAngles[MAX_S_LIGHTS];
uniform float u_spotLightPenumbras[MAX_S_LIGHTS];
uniform float u_spotLightDecays[MAX_S_LIGHTS];

#define MAX_H_LIGHTS 2
uniform int u_numHemisphereLights;
uniform vec3 u_hemisphereLightSkyColors[MAX_H_LIGHTS];
uniform vec3 u_hemisphereLightGroundColors[MAX_H_LIGHTS];
uniform float u_hemisphereLightIntensities[MAX_H_LIGHTS];

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
    
    // Base color
    vec3 baseColor = u_color;
    #ifdef USE_UV
        if (u_useMap > 0.5) {
            vec4 texColor = texture2D(u_map, uv);
            baseColor = texColor.rgb * u_color;
        }
    #endif
    
    // Normalize normals
    vec3 norm = normalize(v_normal);
    
    // View direction
    vec3 viewDir = normalize(cameraPosition - v_position);

    // Start with ambient and emission
    vec3 finalColor = u_ambientColor * baseColor + u_emissionColor;

    // Process Directional Lights
    for(int i = 0; i < D_LIGHTS_MAX; i++) 
    {
        if(i >= u_numDirectionalLights) break;
        
        vec3 lightDir = normalize(u_directionalLightDirections[i]);
        
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * baseColor * u_directionalLightColors[i] * u_directionalLightIntensities[i];
        
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
        vec3 specular = u_specularColor * spec * u_directionalLightColors[i] * u_directionalLightIntensities[i];
        
        finalColor += diffuse + specular;
    }

    // Process Point Lights
    for(int i = 0; i < MAX_P_LIGHTS; i++) 
    {
        if(i >= u_numPointLights) break;
        
        vec3 lightDir = normalize(u_pointLightPositions[i] - v_position);
        float distance = length(u_pointLightPositions[i] - v_position);
        
        // Calculate attenuation (distance falloff)
        float decay = u_pointLightDecays[i];
        float attenuation = pow(clamp(1.0 - (distance * distance) / (100.0 * 100.0), 0.0, 1.0), decay);
        
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * baseColor * u_pointLightColors[i] * u_pointLightIntensities[i] * attenuation;
        
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
        vec3 specular = u_specularColor * spec * u_pointLightColors[i] * u_pointLightIntensities[i] * attenuation;
        
        finalColor += diffuse + specular;
    }

    // Process Spot Lights
    for(int i = 0; i < MAX_S_LIGHTS; i++) 
    {
        if(i >= u_numSpotLights) break;
        
        vec3 lightDir = normalize(u_spotLightPositions[i] - v_position);
        float distance = length(u_spotLightPositions[i] - v_position);
        
        // Calculate attenuation (distance falloff)
        float decay = u_spotLightDecays[i];
        float attenuation = pow(clamp(1.0 - (distance * distance) / (100.0 * 100.0), 0.0, 1.0), decay);
        
        // Check if fragment is in cone
        vec3 spotDir = normalize(u_spotLightDirections[i]);
        float theta = dot(lightDir, -spotDir);
        
        // Calculate spot effect with penumbra
        float outerCone = cos(u_spotLightAngles[i]);
        float innerCone = cos(u_spotLightAngles[i] * (1.0 - u_spotLightPenumbras[i]));
        float epsilon = innerCone - outerCone;
        float spotEffect = clamp((theta - outerCone) / epsilon, 0.0, 1.0);
        
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * baseColor * u_spotLightColors[i] * u_spotLightIntensities[i] * spotEffect * attenuation;
        
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
        vec3 specular = u_specularColor * spec * u_spotLightColors[i] * u_spotLightIntensities[i] * spotEffect * attenuation;
        
        finalColor += diffuse + specular;
    }

    // Process Hemisphere Lights
    for(int i = 0; i < MAX_H_LIGHTS; i++) 
    {
        if(i >= u_numHemisphereLights) break;
        
        // Sky lighting using +ve Y-axis as up
        float upDot = dot(norm, vec3(0.0, 1.0, 0.0));
        
        // Map from [-1, 1] to [0, 1]
        float mixFactor = upDot * 0.5 + 0.5;
        
        // Interpolate between ground and sky color
        vec3 hemisphereColor = mix(
            u_hemisphereLightGroundColors[i], 
            u_hemisphereLightSkyColors[i], 
            mixFactor
        );
        
        finalColor += hemisphereColor * baseColor * u_hemisphereLightIntensities[i];
    }

    v_colour = vec4(finalColor, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}