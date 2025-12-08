import * as THREE from 'three';
import { fetchText, fetchTexture, fetchMaterial, fetchObject } from './PromiseGenerator.js';
import { extractMaterialProps, createShaderMaterial } from './MaterialHandler.js';

export async function createMeshGroup(scene, config) 
{
    const { objPath, mtlPath, texturePath, name, vShaderPath, fShaderPath } = config;

    console.log(`MeshFactory: loading ${name}...`);

    // Load shaders, texture, and materials in parallel, ensuring that all are ready before proceeding
    const [vShader, fShader, texture, materials] = await Promise.all([
        fetchText(vShaderPath),
        fetchText(fShaderPath),
        fetchTexture(texturePath),
        fetchMaterial(mtlPath)
    ]);

    // Load the raw geometry structure
    const rawRoot = await fetchObject(objPath, materials);
    if (!rawRoot) return null;

    // Create a meshGroup for our custom meshes
    const meshGroup = new THREE.Group();
    meshGroup.name = name;

    // Traverse the scene in the .obj file and create create custom meshes that encapsulate our shaders (which map tedxtures), and material information
    rawRoot.traverse((child) => 
    {
        if (!child.isMesh) return;

        const geom = child.geometry.clone();
        if (!geom.attributes.normal) geom.computeVertexNormals();
        
        const props = extractMaterialProps(child.material);
        const hasUVs = geom.attributes.uv !== undefined;
        let runtimeMat;

        if (vShader && fShader)
            runtimeMat = createShaderMaterial(vShader, fShader, props, texture, hasUVs);
        else
            runtimeMat = new THREE.MeshStandardMaterial({ color: props.baseColour });

        const mesh = new THREE.Mesh(geom, runtimeMat);
        mesh.name = child.name || 'mesh';
        
        // Copy transforms
        mesh.position.copy(child.position);
        mesh.quaternion.copy(child.quaternion);
        mesh.scale.copy(child.scale);
        
        // Add the new mesh to the group
        meshGroup.add(mesh);
    });

    // Add the group to the scene
    scene.add(meshGroup);
    return meshGroup;
}