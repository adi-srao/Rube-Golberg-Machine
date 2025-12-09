import * as THREE from 'three';
import { initScene } from './SceneHandler.js';
import { setupLights, getLightUniforms } from './LightHandler.js';
import { createMeshGroup } from './MeshFactory.js';

// State Variable
const shadingModels = { 
    GOURAUD: 'gouraud', 
    PHONG: 'phong', 
    BLINN_PHONG: 'blinn_phong' 
};
let currentModel = shadingModels.GOURAUD;
const meshVersions = {}; 


const { scene, camera, renderer, controls } = initScene('gl-canvas');
const { lights, lightHelpers } = setupLights(scene);

// Updating all shader materials with current light states 
// Updating all shader materials with current light states 
// Updating all shader materials with current light states 
function updateAllMeshUniforms() 
{
    const lightUniforms = getLightUniforms(lights);

    Object.values(meshVersions).forEach((root) =>     
    {
        if (!root) return;
        
        root.traverse((child) => 
        {
            // all children that are meshes with shader materials will have light uniforms updated
            if (child.isMesh && child.material && child.material.isShaderMaterial) {
                
                const uniforms = child.material.uniforms;

                // Update each uniform by copying the array elements
                Object.keys(lightUniforms).forEach((key) => {
                    if (uniforms[key]) {
                        const newValue = lightUniforms[key];
                        
                        // For array uniforms, copy each element
                        if (Array.isArray(newValue) && Array.isArray(uniforms[key].value)) {
                            for (let i = 0; i < newValue.length && i < uniforms[key].value.length; i++) {
                                
                                // SAFETY CHECK: Ensure newValue[i] is defined before using it
                                if (newValue[i] !== undefined) {
                                    if (newValue[i] && typeof newValue[i].copy === 'function') {
                                        // For Vector3 and Color objects
                                        if (uniforms[key].value[i] && typeof uniforms[key].value[i].copy === 'function') {
                                            uniforms[key].value[i].copy(newValue[i]);
                                        }
                                    } else {
                                        // For primitive values (numbers)
                                        uniforms[key].value[i] = newValue[i];
                                    }
                                }
                            }
                        } else {
                            // For non-array uniforms (like counts)
                            uniforms[key].value = newValue;
                        }
                    }
                });
                
                child.material.uniformsNeedUpdate = true;
            }
        });
    });
}

// Function to ensure only 1 shading model is active at a time
async function updateShadingModel(newModel) 
{
    console.log(`Switching request: ${newModel}`);

    // Hide all models initially
    Object.values(meshVersions).forEach(root => { if(root) root.visible = false; });

    currentModel = newModel;

    // Only loaded models are shown, using the current lighting state
    if (meshVersions[newModel]) 
    {
        meshVersions[newModel].visible = true;
        updateAllMeshUniforms(); 
        console.log(`Restored ${newModel} from cache`);
        return;
    }

    // Load the model for the first time, depending on the shading model
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

    const config = 
    {
        objPath: '../../Models/Monkey.obj',
        mtlPath: '../../Models/Monkey.mtl',
        texturePath: '../../Textures/2.jpg',
        name: `Monkey_${newModel}`,
        vShaderPath: vPath,
        fShaderPath: fPath
    };

    try 
    {
        const root = await createMeshGroup(scene, config);

        if (root) 
        {
            meshVersions[newModel] = root;
            
            // Ensure only this one is visible
            Object.values(meshVersions).forEach(r => { if(r) r.visible = false; });
            root.visible = true;
            
            console.log(`Loaded ${newModel}`);
            updateAllMeshUniforms();
        }
    } 
    catch (err) {
        console.error(`Failed to load ${newModel}:`, err);
    }
}

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    // For keys 1-4, toggle corresponding light visibility uniform
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

    // For keys G, P, B - switch shading models
    if (key === 'g') updateShadingModel(shadingModels.GOURAUD);
    if (key === 'p') updateShadingModel(shadingModels.PHONG);
    if (key === 'b') updateShadingModel(shadingModels.BLINN_PHONG);
});

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