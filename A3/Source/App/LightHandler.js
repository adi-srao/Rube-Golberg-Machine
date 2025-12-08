import * as THREE from 'three';

export function setupLights(scene) 
{
    const lights = [];
    const lightHelpers = [];

    // Add lights of all types to scene, along with objects to visualize them (colour and position)
    // Up to 4 of each type can be handled in the shader

    const dirLight = new THREE.DirectionalLight(0xffffff, 6);
    dirLight.position.set(0, -10, 10);
    dirLight.target.position.set(0, 0, 0);
    scene.add(dirLight);
    scene.add(dirLight.target);
    lights.push(dirLight);
    addHelper(scene, dirLight, lightHelpers, 0xfffff);

    const pointLight = new THREE.PointLight(0xffaa88, 6, 0, 2);
    pointLight.position.set(-10, 10, -10);
    scene.add(pointLight);
    lights.push(pointLight);
    addHelper(scene, pointLight, lightHelpers, 0xffaa88, 'sphere');

    const spotLight = new THREE.SpotLight(0x88aaff, 6, 100, Math.PI / 6, 0.3, 2);
    spotLight.position.set(10, 10, -10);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);
    lights.push(spotLight);
    addHelper(scene, spotLight, lightHelpers, 0x88aaff);

    const hemiLight = new THREE.HemisphereLight(0x8888ff, 0x442200, 1.5);
    scene.add(hemiLight);
    lights.push(hemiLight);
    
    // Hemisphere visualiser uses 2 hemispheres of the sky and ground colour to visualise
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x8888ff }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x442200 }));
    top.position.set(0, 3, 0); bot.position.set(0, 3, 0);
    scene.add(top); scene.add(bot);
    lightHelpers.push({ helper: top, light: hemiLight, secondHelper: bot });

    return { lights, lightHelpers };
}

function addHelper(scene, light, list, color, type='default') 
{
    let mesh;
    if (type === 'sphere')
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color }));
    else 
    {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color }));
        if(light.target) mesh.lookAt(light.target.position);
    }

    mesh.position.copy(light.position);
    scene.add(mesh);
    list.push({ helper: mesh, light });
}

// Function to traverse lights and generate uniforms for shaders
export function getLightUniforms(lights) 
{
    const MAX = { DIR: 4, POINT: 4, SPOT: 4, HEMI: 2 };
    const data = { dir: [], point: [], spot: [], hemi: [] };

    lights.forEach(l => 
    {
        if (!l) return;
        const effectiveIntensity = l.visible ? l.intensity : 0.0;
        
        if (l.isDirectionalLight) data.dir.push({ l, intensity: effectiveIntensity });
        else if (l.isPointLight) data.point.push({ l, intensity: effectiveIntensity });
        else if (l.isSpotLight) data.spot.push({ l, intensity: effectiveIntensity });
        else if (l.isHemisphereLight) data.hemi.push({ l, intensity: effectiveIntensity });
    });

    // Generating padded arrays for each light type
    const zeros = { vec3: new THREE.Vector3(), color: new THREE.Color(0,0,0), float: 0.0 };

    const pad = (arr, max, filler) => {
        const res = [...arr];
        while (res.length < max) res.push(filler);
        return res;
    };

    return{
        // Directional
        u_directionalLightDirections: pad(data.dir.map(d => d.l.target.position.clone().sub(d.l.position).normalize()), MAX.DIR, zeros.vec3),
        u_directionalLightColors: pad(data.dir.map(d => d.l.color), MAX.DIR, zeros.color),
        u_directionalLightIntensities: pad(data.dir.map(d => d.intensity), MAX.DIR, zeros.float),
        u_numDirectionalLights: data.dir.length,

        // Point
        u_pointLightPositions: pad(data.point.map(p => p.l.position), MAX.POINT, zeros.vec3),
        u_pointLightColors: pad(data.point.map(p => p.l.color), MAX.POINT, zeros.color),
        u_pointLightIntensities: pad(data.point.map(p => p.intensity), MAX.POINT, zeros.float),
        u_pointLightDecays: pad(data.point.map(p => p.l.decay), MAX.POINT, 2.0),
        u_numPointLights: data.point.length,

        // Spot
        u_spotLightPositions: pad(data.spot.map(s => s.l.position), MAX.SPOT, zeros.vec3),
        u_spotLightDirections: pad(data.spot.map(s => s.l.target.position.clone().sub(s.l.position).normalize()), MAX.SPOT, zeros.vec3),
        u_spotLightColors: pad(data.spot.map(s => s.l.color), MAX.SPOT, zeros.color),
        u_spotLightIntensities: pad(data.spot.map(s => s.intensity), MAX.SPOT, zeros.float),
        u_spotLightAngles: pad(data.spot.map(s => s.l.angle), MAX.SPOT, 0),
        u_spotLightPenumbras: pad(data.spot.map(s => s.l.penumbra), MAX.SPOT, 0),
        u_spotLightDecays: pad(data.spot.map(s => s.l.decay), MAX.SPOT, 2.0),
        u_numSpotLights: data.spot.length,

        // Hemisphere
        u_hemisphereLightSkyColors: pad(data.hemi.map(h => h.l.color), MAX.HEMI, zeros.color),
        u_hemisphereLightGroundColors: pad(data.hemi.map(h => h.l.groundColor), MAX.HEMI, zeros.color),
        u_hemisphereLightIntensities: pad(data.hemi.map(h => h.intensity), MAX.HEMI, zeros.float),
        u_numHemisphereLights: data.hemi.length
    };
}