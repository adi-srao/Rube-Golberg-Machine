import * as THREE from 'three';
import { initScene } from './SceneHandler.js';
import { setupLights, getLightUniforms } from './LightHandler.js';
import { createMeshGroup } from './MeshFactory.js';

// --- State ---
const shadingModels = { 
    GOURAUD: 'gouraud', 
    PHONG: 'phong', 
    BLINN_PHONG: 'blinn_phong' 
};
let currentModel = shadingModels.GOURAUD;
const meshVersions = {}; 

// --- Init ---
const { scene, camera, renderer, controls } = initScene('gl-canvas');
const { lights, lightHelpers } = setupLights(scene);

// --- 1. Dynamic Uniform Update System ---
function updateAllMeshUniforms() {
    const lightUniforms = getLightUniforms(lights);

    Object.values(meshVersions).forEach((root) => {
        if (!root) return;
        
        root.traverse((child) => {
            // Target any mesh with a ShaderMaterial
            if (child.isMesh && child.material && child.material.isShaderMaterial) {
                
                const uniforms = child.material.uniforms;

                Object.keys(lightUniforms).forEach((key) => {
                    if (uniforms[key]) {
                        uniforms[key].value = lightUniforms[key];
                    }
                });
                
                child.material.uniformsNeedUpdate = true;
            }
        });
    });
}

// --- 2. Model Switching Logic ---
async function updateShadingModel(newModel) {
    console.log(`Switching request: ${newModel}`);

    // 1. Hide ALL existing models first (Scorched earth policy)
    Object.values(meshVersions).forEach(root => {
        if(root) root.visible = false;
    });

    currentModel = newModel;

    // 2. If already loaded, just show it
    if (meshVersions[newModel]) {
        meshVersions[newModel].visible = true;
        updateAllMeshUniforms(); // Apply current lighting state
        console.log(`Restored ${newModel} from cache`);
        return;
    }

    // 3. Load from scratch
    let vPath, fPath;
    const basePath = '../Shaders';
    if (newModel === shadingModels.GOURAUD) {
        vPath = `${basePath}/Gouraud/vertex_shader.glsl`;
        fPath = `${basePath}/Gouraud/fragment_shader.glsl`;
    } else if (newModel === shadingModels.PHONG) {
        vPath = `${basePath}/Phong/vertex_shader.glsl`;
        fPath = `${basePath}/Phong/fragment_shader.glsl`;
    } else {
        vPath = `${basePath}/Blinn_Phong/vertex_shader.glsl`;
        fPath = `${basePath}/Blinn_Phong/fragment_shader.glsl`;
    }

    const config = {
        objPath: '../../Models/Sphere.obj',
        mtlPath: '../../Models/Sphere.mtl',
        texturePath: '../../Textures/2.jpg',
        name: `Sphere_${newModel}`,
        vShaderPath: vPath,
        fShaderPath: fPath
    };

    try {
        const root = await createMeshGroup(scene, config);

        if (root) {
            meshVersions[newModel] = root;
            
            // Ensure only this one is visible
            Object.values(meshVersions).forEach(r => { if(r) r.visible = false; });
            root.visible = true;
            
            console.log(`Loaded ${newModel}`);
            updateAllMeshUniforms();
        }
    } catch (err) {
        console.error(`Failed to load ${newModel}:`, err);
    }
}

// --- 3. Event Listeners ---
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    // Toggle Lights 1-4
    if (key >= '1' && key <= '4') 
    {
        const index = parseInt(key) - 1;
        if (lights[index]) 
        {
            const light = lights[index];
            light.visible = !light.visible;
            
            const helperEntry = lightHelpers[index];
            if (helperEntry) {
                if (helperEntry.helper) helperEntry.helper.visible = light.visible;
                if (helperEntry.secondHelper) helperEntry.secondHelper.visible = light.visible;
            }

            console.log(`Light ${index + 1}: ${light.visible ? 'ON' : 'OFF'}`);
            updateAllMeshUniforms();
        }
    }

    if (key === 'g') updateShadingModel(shadingModels.GOURAUD);
    if (key === 'p') updateShadingModel(shadingModels.PHONG);
    if (key === 'b') updateShadingModel(shadingModels.BLINN_PHONG);
});

// --- 4. Start ---
async function start() {
    await updateShadingModel(shadingModels.GOURAUD);
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

start();