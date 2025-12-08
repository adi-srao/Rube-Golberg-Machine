import * as THREE from 'three';

// Helper to create empty placeholder arrays with UNIQUE instances
function getEmptyLightUniforms() {
    const MAX = { DIR: 4, POINT: 8, SPOT: 4, HEMI: 2 };
    
    // BAD: new Array(4).fill(new Vector3()) -> All 4 share the same memory!
    // GOOD: Array.from({ length: 4 }, () => new Vector3()) -> 4 unique vectors.
    
    const padVec3 = (count) => Array.from({ length: count }, () => new THREE.Vector3());
    const padCol = (count) => Array.from({ length: count }, () => new THREE.Color(0, 0, 0));
    const padFloat = (count) => Array.from({ length: count }, () => 0.0);

    return {
        // Directional
        u_directionalLightDirections: { value: padVec3(MAX.DIR) },
        u_directionalLightColors: { value: padCol(MAX.DIR) },
        u_directionalLightIntensities: { value: padFloat(MAX.DIR) },
        u_numDirectionalLights: { value: 0 },

        // Point
        u_pointLightPositions: { value: padVec3(MAX.POINT) },
        u_pointLightColors: { value: padCol(MAX.POINT) },
        u_pointLightIntensities: { value: padFloat(MAX.POINT) },
        u_pointLightDecays: { value: padFloat(MAX.POINT) }, // Fill with 2.0 ideally, but 0 is safe for init
        u_numPointLights: { value: 0 },

        // Spot
        u_spotLightPositions: { value: padVec3(MAX.SPOT) },
        u_spotLightDirections: { value: padVec3(MAX.SPOT) },
        u_spotLightColors: { value: padCol(MAX.SPOT) },
        u_spotLightIntensities: { value: padFloat(MAX.SPOT) },
        u_spotLightAngles: { value: padFloat(MAX.SPOT) },
        u_spotLightPenumbras: { value: padFloat(MAX.SPOT) },
        u_spotLightDecays: { value: padFloat(MAX.SPOT) },
        u_numSpotLights: { value: 0 },

        // Hemisphere
        u_hemisphereLightSkyColors: { value: padCol(MAX.HEMI) },
        u_hemisphereLightGroundColors: { value: padCol(MAX.HEMI) },
        u_hemisphereLightIntensities: { value: padFloat(MAX.HEMI) },
        u_numHemisphereLights: { value: 0 }
    };
}

export function extractMaterialProps(srcMat) {
    return {
        baseColour: (srcMat && srcMat.color) ? srcMat.color.clone() : new THREE.Color(0xffffff),
        ambientColor: new THREE.Color(0.2, 0.2, 0.2),
        specularColor: (srcMat && srcMat.specular) ? srcMat.specular.clone() : new THREE.Color(0.3, 0.3, 0.3),
        emissionColor: (srcMat && srcMat.emissive) ? srcMat.emissive.clone() : new THREE.Color(0.0, 0.0, 0.0),
        shininess: (srcMat && srcMat.shininess !== undefined) ? srcMat.shininess : 30.0,
        opacity: (srcMat && srcMat.opacity !== undefined) ? srcMat.opacity : 1.0,
        map: (srcMat && srcMat.map) ? srcMat.map : null,
        side: (srcMat && srcMat.side) || THREE.FrontSide
    };
}

export function createShaderMaterial(vShader, fShader, props, defaultTexture, hasUVs) {
    const transparent = props.opacity < 1;
    const baseMap = props.map || defaultTexture;

    const basicUniforms = {
        u_color: { value: props.baseColour },
        u_ambientColor: { value: props.ambientColor },
        u_specularColor: { value: props.specularColor },
        u_emissionColor: { value: props.emissionColor },
        u_shininess: { value: props.shininess },
        u_map: { value: baseMap },
        u_useMap: { value: baseMap ? 1.0 : 0.0 }
    };

    // Merge basic props with the initialized empty light structures
    const uniforms = {
        ...basicUniforms,
        ...getEmptyLightUniforms() 
    };

    return new THREE.ShaderMaterial({
        vertexShader: vShader,
        fragmentShader: fShader,
        uniforms: uniforms,
        transparent: transparent,
        side: props.side,
        defines: hasUVs ? { USE_UV: '' } : {}
    });
}