import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

const shadingModels = {
    GOURAUD: 'gouraud',
    PHONG: 'phong',
    BLINN_PHONG: 'blinn_phong'
};

let currentModel = shadingModels.GOURAUD;

async function MeshFactory(scene, objPath, mtlPath, texturePath, name, vShaderPath, fShaderPath, lights)
{
    console.log('MeshFactory: start', { objPath, mtlPath, texturePath, name, vShaderPath, fShaderPath });

    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();
    const textureLoader = new THREE.TextureLoader();

    // fetch shader text (async function, returns Promise)
    const fetchText = async (path) => {
        if (!path) {
            console.log('fetchText: no path provided');
            return null;
        }
        console.log('fetchText: begin', path);
        const res = await fetch(path);
        if (!res.ok) {
            const err = new Error(`Failed to load shader ${path}: ${res.status} ${res.statusText}`);
            console.error('fetchText:', err);
            throw err;
        }
        const text = await res.text();
        console.log('fetchText: success', path);
        return text;
    };

    // wrap MTL loader (callback -> Promise)
    const fetchMaterial = (path) => {
        if (!path) {
            console.log('fetchMaterial: no path provided');
            return Promise.resolve(null);
        }
        console.log('fetchMaterial: begin', path);
        return new Promise((resolve, reject) => {
            mtlLoader.load(path,
                (materials) => {
                    materials.preload();
                    console.log('fetchMaterial: success', path, materials);
                    resolve(materials);
                },
                undefined,
                (err) => {
                    console.error('fetchMaterial: failed', path, err);
                    reject(new Error(`MTL load failed ${path}: ${err?.message || err}`));
                }
            );
        });
    };

    // wrap OBJ loader (callback -> Promise)
    const fetchObject = (path, materials) => {
        if (!path) {
            console.log('fetchObject: no path provided');
            return Promise.resolve(null);
        }
        console.log('fetchObject: begin', path, { hasMaterials: !!materials });
        return new Promise((resolve, reject) => {
            if (materials) objLoader.setMaterials(materials);
            objLoader.load(path,
                (object) => {
                    console.log('fetchObject: success', path, object);
                    resolve(object);
                },
                undefined,
                (err) => {
                    console.error('fetchObject: failed', path, err);
                    reject(new Error(`OBJ load failed ${path}: ${err?.message || err}`));
                }
            );
        });
    };

    // wrap texture loader (callback -> Promise) and set colorSpace
    const fetchTexture = (path) => {
        if (!path) {
            console.log('fetchTexture: no path provided');
            return Promise.resolve(null);
        }
        console.log('fetchTexture: begin', path);
        return new Promise((resolve, reject) => {
            textureLoader.load(path,
                (texture) => {
                    try { texture.colorSpace = THREE.SRGBColorSpace; } catch(e) { /* fallback */ }
                    console.log('fetchTexture: success', path, texture);
                    resolve(texture);
                },
                undefined,
                (err) => {
                    console.error('fetchTexture: failed', path, err);
                    reject(new Error(`Texture load failed ${path}: ${err?.message || err}`));
                }
            );
        });
    };

    // start shader fetches + texture in parallel
    console.log('MeshFactory: fetching shaders and texture in parallel');
    const [vShader, fShader, texture] = await Promise.all([
        fetchText(vShaderPath).catch((e) => { console.warn('vShader load warning', e); return null; }),
        fetchText(fShaderPath).catch((e) => { console.warn('fShader load warning', e); return null; }),
        fetchTexture(texturePath).catch((e) => { console.warn('texture load warning', e); return null; })
    ]);
    console.log('MeshFactory: shader/texture fetch complete', { vShaderLoaded: !!vShader, fShaderLoaded: !!fShader, textureLoaded: !!texture });

    // load materials then OBJ
    const materials = await fetchMaterial(mtlPath).catch((e) => { console.warn('material load warning', e); return null; });
    console.log('MeshFactory: materials result', materials ? 'loaded' : 'none');

    const root = await fetchObject(objPath, materials).catch((e) => { console.error('object load error', e); return null; });
    if (!root) {
        console.error('MeshFactory: root failed to load, aborting.');
        return null;
    }

    console.log('MeshFactory: traversing loaded root', root);

    // traverse and create runtime meshes (ShaderMaterial if both shaders available, otherwise MeshStandardMaterial)
    let meshCount = 0;
    root.traverse((child) =>
    {
        if (!child.isMesh) return;

        console.log('MeshFactory: processing mesh child', child.name || '(unnamed)', child);

        // clone geometry so runtime meshes are independent
        const geom = child.geometry ? child.geometry.clone() : null;
        if (!geom) {
            console.warn('MeshFactory: child has no geometry, skipping', child);
            return;
        }
        if (!geom.attributes.normal) {
            geom.computeVertexNormals();
            console.log('MeshFactory: computed normals for', child.name);
        }

        const srcMat = child.material || null;
        
        // Extract material properties from MTL file
        const baseColour = (srcMat && srcMat.color) ? srcMat.color.clone() : new THREE.Color(0xffffff);
        const ambientColor = new THREE.Color(0.2, 0.2, 0.2);
        const specularColor = (srcMat && srcMat.specular) ? srcMat.specular.clone() : new THREE.Color(0.3, 0.3, 0.3);
        const emissionColor = (srcMat && srcMat.emissive) ? srcMat.emissive.clone() : new THREE.Color(0.0, 0.0, 0.0);
        const shininess = (srcMat && srcMat.shininess !== undefined) ? srcMat.shininess : 30.0;
        const opacity = (srcMat && srcMat.opacity !== undefined) ? srcMat.opacity : 1.0;
        const transparent = !!(opacity < 1 || (srcMat && srcMat.transparent));
        
        const directionalLights = [];
        const pointLights = [];
        const spotLights = [];
        const hemisphereLights = [];

        for(let l of lights) 
        {
            if (l.isDirectionalLight) 
            {
                directionalLights.push({
                    direction: l.target.position.clone().sub(l.position).normalize(),
                    color: l.color.clone(),
                    intensity: l.intensity
                });
            } 
            
            else if (l.isPointLight) 
            {
                pointLights.push({
                    position: l.position.clone(),
                    color: l.color.clone(),
                    intensity: l.intensity,
                    decay: l.decay
                });
            }
            
            else if (l.isSpotLight) 
            {
                spotLights.push({
                    position: l.position.clone(),
                    direction: l.target.position.clone().sub(l.position).normalize(),
                    color: l.color.clone(),
                    intensity: l.intensity,
                    angle: l.angle,
                    penumbra: l.penumbra,
                    decay: l.decay
                });
            } 
            
            else if (l.isHemisphereLight) 
            {
                hemisphereLights.push({
                    skyColor: l.color.clone(),
                    groundColor: l.groundColor.clone(),
                    intensity: l.intensity
                });
            }
        }
                        
        let runtimeMat;
        if (vShader && fShader) {
            console.log('MeshFactory: creating ShaderMaterial for', child.name);
            
            // Get texture from material or fallback
            const baseMap = (srcMat && srcMat.map) ? srcMat.map : texture;
            
            // Prepare uniform arrays - fill with default values to match shader array sizes
            const maxDLights = 4;
            const maxPLights = 8;
            const maxSLights = 4;
            const maxHLights = 2;
            
            // Fill directional light arrays
            const dDirections = [];
            const dColors = [];
            const dIntensities = [];
            for (let i = 0; i < maxDLights; i++) {
                if (i < directionalLights.length) {
                    dDirections.push(directionalLights[i].direction);
                    dColors.push(directionalLights[i].color);
                    dIntensities.push(directionalLights[i].intensity);
                } else {
                    dDirections.push(new THREE.Vector3(0, 0, 0));
                    dColors.push(new THREE.Color(0, 0, 0));
                    dIntensities.push(0);
                }
            }
            
            // Fill point light arrays
            const pPositions = [];
            const pColors = [];
            const pIntensities = [];
            const pDecays = [];
            for (let i = 0; i < maxPLights; i++) {
                if (i < pointLights.length) {
                    pPositions.push(pointLights[i].position);
                    pColors.push(pointLights[i].color);
                    pIntensities.push(pointLights[i].intensity);
                    pDecays.push(pointLights[i].decay);
                } else {
                    pPositions.push(new THREE.Vector3(0, 0, 0));
                    pColors.push(new THREE.Color(0, 0, 0));
                    pIntensities.push(0);
                    pDecays.push(2);
                }
            }
            
            // Fill spot light arrays
            const sPositions = [];
            const sDirections = [];
            const sColors = [];
            const sIntensities = [];
            const sAngles = [];
            const sPenumbras = [];
            const sDecays = [];
            for (let i = 0; i < maxSLights; i++) {
                if (i < spotLights.length) {
                    sPositions.push(spotLights[i].position);
                    sDirections.push(spotLights[i].direction);
                    sColors.push(spotLights[i].color);
                    sIntensities.push(spotLights[i].intensity);
                    sAngles.push(spotLights[i].angle);
                    sPenumbras.push(spotLights[i].penumbra);
                    sDecays.push(spotLights[i].decay);
                } else {
                    sPositions.push(new THREE.Vector3(0, 0, 0));
                    sDirections.push(new THREE.Vector3(0, 0, 0));
                    sColors.push(new THREE.Color(0, 0, 0));
                    sIntensities.push(0);
                    sAngles.push(0);
                    sPenumbras.push(0);
                    sDecays.push(2);
                }
            }
            
            // Fill hemisphere light arrays
            const hSkyColors = [];
            const hGroundColors = [];
            const hIntensities = [];
            for (let i = 0; i < maxHLights; i++) {
                if (i < hemisphereLights.length) {
                    hSkyColors.push(hemisphereLights[i].skyColor);
                    hGroundColors.push(hemisphereLights[i].groundColor);
                    hIntensities.push(hemisphereLights[i].intensity);
                } else {
                    hSkyColors.push(new THREE.Color(0, 0, 0));
                    hGroundColors.push(new THREE.Color(0, 0, 0));
                    hIntensities.push(0);
                }
            }

            const uniforms = {
                u_color: { value: baseColour },
                u_ambientColor: { value: ambientColor },
                u_specularColor: { value: specularColor },
                u_emissionColor: { value: emissionColor },
                u_shininess: { value: shininess },
                u_map: { value: baseMap },
                u_useMap: { value: baseMap ? 1.0 : 0.0 },

                // Directional light uniforms
                u_directionalLightDirections: { value: dDirections },
                u_directionalLightColors: { value: dColors },
                u_directionalLightIntensities: { value: dIntensities },
                u_numDirectionalLights: { value: directionalLights.length },
                
                // Point light uniforms
                u_pointLightPositions: { value: pPositions },
                u_pointLightColors: { value: pColors },
                u_pointLightIntensities: { value: pIntensities },
                u_pointLightDecays: { value: pDecays },
                u_numPointLights: { value: pointLights.length },

                // Spot light uniforms
                u_spotLightPositions: { value: sPositions },
                u_spotLightDirections: { value: sDirections },
                u_spotLightColors: { value: sColors },
                u_spotLightIntensities: { value: sIntensities },
                u_spotLightAngles: { value: sAngles },
                u_spotLightPenumbras: { value: sPenumbras },
                u_spotLightDecays: { value: sDecays },
                u_numSpotLights: { value: spotLights.length },

                // Hemisphere light uniforms
                u_hemisphereLightSkyColors: { value: hSkyColors },
                u_hemisphereLightGroundColors: { value: hGroundColors },
                u_hemisphereLightIntensities: { value: hIntensities },
                u_numHemisphereLights: { value: hemisphereLights.length }
            };
            
            const hasUVs = geom.attributes.uv !== undefined;
            console.log('MeshFactory: geometry has UVs:', hasUVs);

            runtimeMat = new THREE.ShaderMaterial({
                vertexShader: vShader,
                fragmentShader: fShader,
                uniforms,
                transparent,
                side: (srcMat && srcMat.side) || THREE.FrontSide,
                defines: hasUVs ? { USE_UV: '' } : {}
            });
        } else {
            console.log('MeshFactory: creating fallback MeshStandardMaterial for', child.name);
            runtimeMat = srcMat && (srcMat.isMeshStandardMaterial || srcMat.isMeshPhongMaterial) ? srcMat.clone() : new THREE.MeshStandardMaterial();
            runtimeMat.color = baseColour;
            runtimeMat.transparent = transparent;
            runtimeMat.opacity = opacity;
            runtimeMat.needsUpdate = true;
        }

        const mesh = new THREE.Mesh(geom, runtimeMat);
        mesh.name = name || child.name || 'mesh';
        mesh.position.copy(child.position);
        mesh.quaternion.copy(child.quaternion);
        mesh.scale.copy(child.scale);

        scene.add(mesh);
        meshCount++;
        console.log('MeshFactory: added mesh to scene', mesh.name);
    });

    console.log(`MeshFactory: complete – added ${meshCount} mesh(es) to scene`);
    return root;
}

// Setup scene
const canvas = document.getElementById('gl-canvas');
let windowHeight = (canvas.clientHeight || canvas.height);
let windowWidth = (canvas.clientWidth || canvas.width);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x606060);
const camera = new THREE.PerspectiveCamera(75, windowWidth/windowHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(windowWidth, windowHeight, false);

// Create one of each type of light
const lights = [];

// 1. Directional Light - Main key light from top-right
const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
directionalLight.position.set(0, -40, 40);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);
lights.push(directionalLight);

// 2. Point Light - Warm accent light from the left
const pointLight = new THREE.PointLight(0xffaa88, 6, 0, 2);
pointLight.position.set(-40, 40, -40);
scene.add(pointLight);
lights.push(pointLight);

// 3. Spot Light - Focused light from bottom-right
const spotLight = new THREE.SpotLight(0x88aaff, 6, 100, Math.PI / 6, 0.3, 2);
spotLight.position.set(40, 40, -40);
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight);
scene.add(spotLight.target);
lights.push(spotLight);

// 4. Hemisphere Light - Ambient environment lighting
const hemisphereLight = new THREE.HemisphereLight(0x8888ff, 0x442200, 3);
scene.add(hemisphereLight);
lights.push(hemisphereLight);

const lightHelpers = [];

// Helper for Directional Light (cone pointing in light direction)
const dirHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.2),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
);
dirHelper.position.copy(directionalLight.position);
dirHelper.lookAt(directionalLight.target.position);
scene.add(dirHelper);
lightHelpers.push({ helper: dirHelper, light: directionalLight });

// Helper for Point Light (sphere)
const pointHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffaa88 })
);
pointHelper.position.copy(pointLight.position);
scene.add(pointHelper);
lightHelpers.push({ helper: pointHelper, light: pointLight });

// Helper for Spot Light (cone with direction)
const spotHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.2),
    new THREE.MeshBasicMaterial({ color: 0x88aaff })
);
spotHelper.position.copy(spotLight.position);
spotHelper.lookAt(spotLight.target.position);
scene.add(spotHelper);
lightHelpers.push({ helper: spotHelper, light: spotLight });

// Helper for Hemisphere Light (two hemispheres)
const hemiHelperTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x8888ff })
);
const hemiHelperBottom = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x442200 })
);
hemiHelperTop.position.set(0, 3, 0);
hemiHelperBottom.position.set(0, 3, 0);
scene.add(hemiHelperTop);
scene.add(hemiHelperBottom);
lightHelpers.push({ helper: hemiHelperTop, light: hemisphereLight, secondHelper: hemiHelperBottom });


// Store references to the three mesh versions
const meshVersions = {
    [shadingModels.GOURAUD]: null,
    [shadingModels.PHONG]: null,
    [shadingModels.BLINN_PHONG]: null
};

// Event Listeners for key presses
function updateShadingModel(newModel) 
{
    if (currentModel === newModel) return;
    
    const oldModel = currentModel;
    currentModel = newModel;
    console.log(`Switching from ${oldModel} to ${newModel} shading model`);

    // Remove the old mesh version from the scene
    if (meshVersions[oldModel]) {
        scene.traverse((child) => {
            if (child.isMesh && child.name.includes(oldModel)) {
                scene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.uniforms && child.material.uniforms.u_map.value) {
                        child.material.uniforms.u_map.value.dispose();
                    }
                    child.material.dispose();
                }
            }
        });
        meshVersions[oldModel] = null;
    }

    // Load the new mesh version
    let vShaderPath, fShaderPath;
    if (currentModel === shadingModels.GOURAUD) {
        vShaderPath = '../Shaders/Gouraud/vertex_shader.glsl';
        fShaderPath = '../Shaders/Gouraud/fragment_shader.glsl';
    } else if (currentModel === shadingModels.PHONG) {
        vShaderPath = '../Shaders/Phong/vertex_shader.glsl';
        fShaderPath = '../Shaders/Phong/fragment_shader.glsl';
    } else if (currentModel === shadingModels.BLINN_PHONG) {
        vShaderPath = '../Shaders/Blinn_Phong/vertex_shader.glsl';
        fShaderPath = '../Shaders/Blinn_Phong/fragment_shader.glsl';
    }

    MeshFactory(
        scene,
        '../../Models/Sphere.obj',
        '../../Models/Sphere.mtl',
        '../../Textures/2.jpg',
        `Sphere_${currentModel}`,
        vShaderPath,
        fShaderPath,
        lights
    ).then((root) => {
        if (root) {
            meshVersions[currentModel] = root;
            root.visible = true;
            console.log(`Successfully loaded ${currentModel} model`);
        }
    }).catch(err => {
        console.error(`Failed to load ${currentModel} model:`, err);
    });
}

function updateAllMeshUniforms() 
{
    for (const model in meshVersions) 
    {
        const meshRoot = meshVersions[model];
        if (!meshRoot) continue;

        meshRoot.traverse((child) => 
        {
            // Check if this is a mesh with shader material uniforms
            if (!child.isMesh || !child.material || !child.material.uniforms) return;
            
            const directionalLights = [];
            const pointLights = [];
            const spotLights = [];
            const hemisphereLights = [];
            
            for (let l of lights) 
            {
                if (!l.visible) continue;
                
                if (l.isDirectionalLight) 
                {
                    directionalLights.push({
                        direction: l.target.position.clone().sub(l.position).normalize(),
                        color: l.color.clone(),
                        intensity: l.userData.originalIntensity || l.intensity
                    });
                } 
                
                else if (l.isPointLight) 
                {
                    pointLights.push({
                        position: l.position.clone(),
                        color: l.color.clone(),
                        intensity: l.userData.originalIntensity || l.intensity,
                        decay: l.decay
                    });
                } 
                
                else if (l.isSpotLight) 
                {
                    spotLights.push({
                        position: l.position.clone(),
                        direction: l.target.position.clone().sub(l.position).normalize(),
                        color: l.color.clone(),
                        intensity: l.userData.originalIntensity || l.intensity,
                        angle: l.angle,
                        penumbra: l.penumbra,
                        decay: l.decay
                    });
                } 
                
                else if (l.isHemisphereLight) 
                {
                    hemisphereLights.push({
                        skyColor: l.color.clone(),
                        groundColor: l.groundColor.clone(),
                        intensity: l.userData.originalIntensity || l.intensity
                    });
                }
            }

            // Prepare uniform arrays with proper sizes
            const maxDLights = 4;
            const maxPLights = 8;
            const maxSLights = 4;
            const maxHLights = 2;
            
            // Fill directional light arrays
            const dDirections = [];
            const dColors = [];
            const dIntensities = [];
            for (let i = 0; i < maxDLights; i++) {
                if (i < directionalLights.length) {
                    dDirections.push(directionalLights[i].direction);
                    dColors.push(directionalLights[i].color);
                    dIntensities.push(directionalLights[i].intensity);
                } else {
                    dDirections.push(new THREE.Vector3(0, 0, 0));
                    dColors.push(new THREE.Color(0, 0, 0));
                    dIntensities.push(0);
                }
            }
            
            // Fill point light arrays
            const pPositions = [];
            const pColors = [];
            const pIntensities = [];
            const pDecays = [];
            for (let i = 0; i < maxPLights; i++) {
                if (i < pointLights.length) {
                    pPositions.push(pointLights[i].position);
                    pColors.push(pointLights[i].color);
                    pIntensities.push(pointLights[i].intensity);
                    pDecays.push(pointLights[i].decay);
                } else {
                    pPositions.push(new THREE.Vector3(0, 0, 0));
                    pColors.push(new THREE.Color(0, 0, 0));
                    pIntensities.push(0);
                    pDecays.push(2);
                }
            }
            
            // Fill spot light arrays
            const sPositions = [];
            const sDirections = [];
            const sColors = [];
            const sIntensities = [];
            const sAngles = [];
            const sPenumbras = [];
            const sDecays = [];
            for (let i = 0; i < maxSLights; i++) {
                if (i < spotLights.length) {
                    sPositions.push(spotLights[i].position);
                    sDirections.push(spotLights[i].direction);
                    sColors.push(spotLights[i].color);
                    sIntensities.push(spotLights[i].intensity);
                    sAngles.push(spotLights[i].angle);
                    sPenumbras.push(spotLights[i].penumbra);
                    sDecays.push(spotLights[i].decay);
                } else {
                    sPositions.push(new THREE.Vector3(0, 0, 0));
                    sDirections.push(new THREE.Vector3(0, 0, 0));
                    sColors.push(new THREE.Color(0, 0, 0));
                    sIntensities.push(0);
                    sAngles.push(0);
                    sPenumbras.push(0);
                    sDecays.push(2);
                }
            }
            
            // Fill hemisphere light arrays
            const hSkyColors = [];
            const hGroundColors = [];
            const hIntensities = [];
            for (let i = 0; i < maxHLights; i++) {
                if (i < hemisphereLights.length) {
                    hSkyColors.push(hemisphereLights[i].skyColor);
                    hGroundColors.push(hemisphereLights[i].groundColor);
                    hIntensities.push(hemisphereLights[i].intensity);
                } else {
                    hSkyColors.push(new THREE.Color(0, 0, 0));
                    hGroundColors.push(new THREE.Color(0, 0, 0));
                    hIntensities.push(0);
                }
            }

            // Update all uniforms
            child.material.uniforms.u_directionalLightDirections.value = dDirections;
            child.material.uniforms.u_directionalLightColors.value = dColors;
            child.material.uniforms.u_directionalLightIntensities.value = dIntensities;
            child.material.uniforms.u_numDirectionalLights.value = directionalLights.length;
            
            child.material.uniforms.u_pointLightPositions.value = pPositions;
            child.material.uniforms.u_pointLightColors.value = pColors;
            child.material.uniforms.u_pointLightIntensities.value = pIntensities;
            child.material.uniforms.u_pointLightDecays.value = pDecays;
            child.material.uniforms.u_numPointLights.value = pointLights.length;

            child.material.uniforms.u_spotLightPositions.value = sPositions;
            child.material.uniforms.u_spotLightDirections.value = sDirections;
            child.material.uniforms.u_spotLightColors.value = sColors;
            child.material.uniforms.u_spotLightIntensities.value = sIntensities;
            child.material.uniforms.u_spotLightAngles.value = sAngles;
            child.material.uniforms.u_spotLightPenumbras.value = sPenumbras;
            child.material.uniforms.u_spotLightDecays.value = sDecays;
            child.material.uniforms.u_numSpotLights.value = spotLights.length;

            child.material.uniforms.u_hemisphereLightSkyColors.value = hSkyColors;
            child.material.uniforms.u_hemisphereLightGroundColors.value = hGroundColors;
            child.material.uniforms.u_hemisphereLightIntensities.value = hIntensities;
            child.material.uniforms.u_numHemisphereLights.value = hemisphereLights.length;
            
            child.material.uniformsNeedUpdate = true;
        });
    }
}

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    // Toggle lights with number keys 1-4
    if (key >= '1' && key <= '4') 
    {
        const index = parseInt(key) - 1;
        if (index < lights.length) 
        {
            const light = lights[index];
            light.visible = !light.visible;
            
            // Store original intensity if not already stored
            if (light.userData.originalIntensity === undefined)
                light.userData.originalIntensity = light.intensity;
            
            light.intensity = light.visible ? light.userData.originalIntensity : 0;

            // Toggle helper visibility
            const helperObj = lightHelpers[index];
            if (helperObj) 
            {
                helperObj.helper.visible = light.visible;
                if (helperObj.secondHelper)
                    helperObj.secondHelper.visible = light.visible;
            }

            console.log(`Light ${index + 1} (${light.type}) ${light.visible ? 'ON' : 'OFF'}`);

            // Update uniforms for the currently visible mesh
            updateAllMeshUniforms();
        }
    }

    // Switch shading models with B, P, G keys
    if (key === 'b')
        updateShadingModel(shadingModels.BLINN_PHONG);
    
    else if (key === 'p')
        updateShadingModel(shadingModels.PHONG);
    
    else if (key === 'g')
        updateShadingModel(shadingModels.GOURAUD);
});

// Promises to create and add the meshes from each shading model

Promise.all([
    // Version 1: Gouraud
    MeshFactory(
        scene,
        '../../Models/Sphere.obj',
        '../../Models/Sphere.mtl',
        '../../Textures/2.jpg',
        'Sphere_Gouraud',
        '../Shaders/Gouraud/vertex_shader.glsl',
        '../Shaders/Gouraud/fragment_shader.glsl',
        lights
    ),

    // Version 2: Phong
    MeshFactory(
        scene,
        '../../Models/Sphere.obj',
        '../../Models/Sphere.mtl',
        '../../Textures/2.jpg',
        'Sphere_Phong',
        '../Shaders/Phong/vertex_shader.glsl',
        '../Shaders/Phong/fragment_shader.glsl',
        lights
    ),

    // Version 3: Blinn-Phong
    MeshFactory(
        scene,
        '../../Models/Sphere.obj',
        '../../Models/Sphere.mtl',
        '../../Textures/2.jpg',
        'Sphere_BlinnPhong',
        '../Shaders/Blinn_Phong/vertex_shader.glsl',
        '../Shaders/Blinn_Phong/fragment_shader.glsl',
        lights
    )
]).then(([gouraudRoot, phongRoot, blinnPhongRoot]) => {
    console.log('All three mesh versions loaded');

    // Store references to each mesh version
    meshVersions[shadingModels.GOURAUD] = gouraudRoot;
    meshVersions[shadingModels.PHONG] = phongRoot;
    meshVersions[shadingModels.BLINN_PHONG] = blinnPhongRoot;

    // Initially, only show the Gouraud version
    if (gouraudRoot) gouraudRoot.visible = true;
    if (phongRoot) phongRoot.visible = false;
    if (blinnPhongRoot) blinnPhongRoot.visible = false;

    console.log('Scene ready - Press G/P/B to switch models, 1-4 to toggle lights');
    
    // Debug: log scene contents
    scene.traverse((obj) => {
        if (obj.isMesh) {
            console.log('Scene mesh:', obj.name, {
                position: obj.position,
                visible: obj.visible,
                material: obj.material.type
            });
        }
    });

    // Start animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
}).catch(err => {
    console.error('Mesh loading failed:', err);
    // Start animation loop even on error
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
});

// Camera setup
camera.position.set(0, 0, 3);
camera.lookAt(0, 0, 0);

// Trackball controls
const controls = new TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 5.0;
controls.zoomSpeed = 2.0;
controls.panSpeed = 1.0;
controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;