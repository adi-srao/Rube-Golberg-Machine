import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

async function MeshFactory(scene, objPath, mtlPath, texturePath, name, vShaderPath, fShaderPath)
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
        const ambientColor = new THREE.Color(0.5, 0.5, 0.5); // Brighter ambient light
        const specularColor = (srcMat && srcMat.specular) ? srcMat.specular.clone() : new THREE.Color(0.3, 0.3, 0.3);
        const emissionColor = (srcMat && srcMat.emissive) ? srcMat.emissive.clone() : new THREE.Color(0.0, 0.0, 0.0);
        const shininess = (srcMat && srcMat.shininess !== undefined) ? srcMat.shininess : 30.0;
        const opacity = (srcMat && srcMat.opacity !== undefined) ? srcMat.opacity : 1.0;
        const transparent = !!(opacity < 1 || (srcMat && srcMat.transparent));

        let runtimeMat;
        if (vShader && fShader) {
            console.log('MeshFactory: creating ShaderMaterial for', child.name);
            
            // Get texture from material or fallback
            const baseMap = (srcMat && srcMat.map) ? srcMat.map : texture;
            
            const uniforms = {
                u_color: { value: baseColour },
                u_lightPosition: { value: new THREE.Vector3(0, 2, 2) },
                u_lightIntensity: { value: 5.0 },
                u_ambientColor: { value: ambientColor },
                u_specularColor: { value: specularColor },
                u_emissionColor: { value: emissionColor },
                u_shininess: { value: shininess },
                u_map: { value: baseMap },
                u_useMap: { value: baseMap ? 1.0 : 0.0 }
            };
            
            runtimeMat = new THREE.ShaderMaterial({
                vertexShader: vShader,
                fragmentShader: fShader,
                uniforms,
                transparent,
                side: (srcMat && srcMat.side) || THREE.FrontSide
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

// ...existing code...
const canvas = document.getElementById('gl-canvas');
let windowHeight = (canvas.clientHeight || canvas.height);
let windowWidth = (canvas.clientWidth || canvas.width);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x606060);
const camera = new THREE.PerspectiveCamera( 75,  windowWidth/windowHeight , 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(windowWidth, windowHeight, false);

const color = 0xFFFFFF;
const intensity = 5;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(0, 2, 2);
light.target.position.set(0, 0, 0);
scene.add(light);
camera.position.z = 5;

// Setup TrackballControls
const controls = new TrackballControls(camera, canvas);
controls.rotateSpeed = 2.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;

function onWindowResize() {
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    controls.handleResize();
}
window.addEventListener('resize', onWindowResize, false);

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Only update light position if needed (it's static in your case)
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material.isShaderMaterial) {
            obj.material.uniforms.u_lightPosition.value.set(0, 2, 2);
        }
    });
    
    renderer.render(scene, camera);
}

MeshFactory(
    scene,
    '../../Models/Monkey.obj',
    '../../Models/Monkey.mtl',
    '../../Textures/1.jpg',
    'Monkey',
    '../Shaders/Blinn_Phong/vertex_shader.glsl',
    '../Shaders/Blinn_Phong/fragment_shader.glsl'
).then(() => {
    // Debug: log scene contents AFTER mesh is added
    console.log('animate: scene children', scene.children);
    scene.traverse((obj) => {
        if (obj.isMesh) {
            console.log('Scene mesh:', obj.name, {
                position: obj.position,
                scale: obj.scale,
                visible: obj.visible,
                material: obj.material.type,
                geometry: obj.geometry ? { vertices: obj.geometry.attributes.position.count } : null
            });
        }
    });

    console.log('Camera:', {
        position: camera.position,
        fov: camera.fov,
        aspect: camera.aspect,
        near: camera.near,
        far: camera.far
    });

    // start animation loop now that mesh is ready
    animate();
}).catch(err => {
    console.error('MeshFactory failed:', err);
    animate(); // still start render loop on error
});