// LightHandler.js
import * as THREE from 'three';

export default class LightHandler {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.lightHelpers = [];
    this.trackingTarget = null;
    
    // Light references for easy access
    this.pointLight = null;
    this.directionalSpotlight = null;
    this.trackingSpotlight = null;
    
    this._initializeLights();
  }

  _initializeLights() {
    // 1. Fixed Point Light - illuminates entire scene
    this.pointLight = new THREE.PointLight(0xffffff, 0.75, 0, 2);
    this.pointLight.position.set(0, 15, 10);
    this.pointLight.visible = true;
    this.scene.add(this.pointLight);
    this.lights.push(this.pointLight);
    this._addHelper(this.pointLight, 0xffffff, 'sphere');

    // 2. Directional Spotlight - fixed position, lights middle of scene
    this.directionalSpotlight = new THREE.SpotLight(
      0x00ff88,  // Cyan-green color
      0.5,        // intensity
      50,        // distance
      Math.PI / 48,  // angle (30 degrees)
      0.3,       // penumbra
      2          // decay
    );
    this.directionalSpotlight.position.set(-15, 10, 5);
    this.directionalSpotlight.target.position.set(0, 0, 0);
    this.directionalSpotlight.visible = true;
    this.scene.add(this.directionalSpotlight);
    this.scene.add(this.directionalSpotlight.target);
    this.lights.push(this.directionalSpotlight);
    this._addHelper(this.directionalSpotlight, 0x00ff88, 'directional');

    // 3. Tracking Spotlight - follows moving object
    this.trackingSpotlight = new THREE.SpotLight(
      0xff6600,  // Orange color
      2,        // intensity
      40,        // distance
      Math.PI / 96,  // angle (22.5 degrees - tighter beam)
      0.4,       // penumbra
      2          // decay
    );
    this.trackingSpotlight.position.set(0, 12, 8);
    this.trackingSpotlight.target.position.set(0, 0, 0);
    this.trackingSpotlight.visible = true;
    this.scene.add(this.trackingSpotlight);
    this.scene.add(this.trackingSpotlight.target);
    this.lights.push(this.trackingSpotlight);
    this._addHelper(this.trackingSpotlight, 0xff6600, 'tracking');
  }

  _addHelper(light, color, type) {
    let helper;
    
    if (type === 'sphere') {
      // Point light helper
      helper = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color })
      );
      helper.position.copy(light.position);
    } else if (type === 'directional' || type === 'tracking') {
      // Spotlight helper - arrow-like shape
      const group = new THREE.Group();
      
      // Main sphere
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({ color })
      );
      group.add(sphere);
      
      // Direction indicator (cone)
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.4, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      cone.rotation.x = Math.PI / 2;
      cone.position.z = -0.3;
      group.add(cone);
      
      helper = group;
      helper.position.copy(light.position);
    }
    
    this.scene.add(helper);
    this.lightHelpers.push({ helper, light, type });
  }

  /**
   * Set the object that the tracking spotlight should follow
   * @param {THREE.Vector3} position - Position to track (reference to object's position)
   */
  setTrackingTarget(position) {
    this.trackingTarget = position;
  }

  /**
   * Clear the tracking target
   */
  clearTrackingTarget() {
    this.trackingTarget = null;
  }

  /**
   * Toggle a specific light on/off
   * @param {string} lightType - 'point', 'directional', or 'tracking'
   */
  toggleLight(lightType) {
    let light;
    switch(lightType) {
      case 'point':
        light = this.pointLight;
        break;
      case 'directional':
        light = this.directionalSpotlight;
        break;
      case 'tracking':
        light = this.trackingSpotlight;
        break;
      default:
        console.warn(`Unknown light type: ${lightType}`);
        return;
    }
    
    if (light) {
      light.visible = !light.visible;
      console.log(`[LightHandler] ${lightType} light: ${light.visible ? 'ON' : 'OFF'}`);
    }
  }

  /**
   * Set visibility of a specific light
   * @param {string} lightType - 'point', 'directional', or 'tracking'
   * @param {boolean} visible - true to turn on, false to turn off
   */
  setLightVisible(lightType, visible) {
    let light;
    switch(lightType) {
      case 'point':
        light = this.pointLight;
        break;
      case 'directional':
        light = this.directionalSpotlight;
        break;
      case 'tracking':
        light = this.trackingSpotlight;
        break;
      default:
        console.warn(`Unknown light type: ${lightType}`);
        return;
    }
    
    if (light) {
      light.visible = visible;
    }
  }

  /**
   * Update light positions and targets (call every frame)
   * @param {number} dt - Delta time
   */
  update(dt) {
    // Update tracking spotlight to follow target
    if (this.trackingTarget && this.trackingSpotlight.visible) {
      // Keep spotlight at fixed height but adjust x/z to be near target
      this.trackingSpotlight.position.x = this.trackingTarget.x;
      this.trackingSpotlight.position.z = this.trackingTarget.z + 8;
      
      // Point at the target
      this.trackingSpotlight.target.position.copy(this.trackingTarget);
    }

    // Update helpers to match light positions/orientations
    this.lightHelpers.forEach(({ helper, light, type }) => {
      helper.position.copy(light.position);
      
      if (type === 'directional' || type === 'tracking') {
        // Orient helper to point at target
        const direction = new THREE.Vector3()
          .subVectors(light.target.position, light.position)
          .normalize();
        helper.lookAt(light.target.position);
      }
      
      // Show/hide helpers based on light visibility
      helper.visible = light.visible;
    });
  }

  /**
   * Get uniforms for all lights to be passed to shaders
   * This generates the uniform object that matches your shader expectations
   * @returns {Object} Uniform object for ShaderMaterial
   */
  getLightUniforms() {
    const MAX = { DIR: 4, POINT: 8, SPOT: 4, HEMI: 2 };
    const data = { dir: [], point: [], spot: [], hemi: [] };

    // Categorize lights by type
    this.lights.forEach(light => {
      if (!light) return;
      const effectiveIntensity = light.visible ? light.intensity : 0.0;
      
      if (light.isDirectionalLight) {
        data.dir.push({ light, intensity: effectiveIntensity });
      } else if (light.isPointLight) {
        data.point.push({ light, intensity: effectiveIntensity });
      } else if (light.isSpotLight) {
        data.spot.push({ light, intensity: effectiveIntensity });
      } else if (light.isHemisphereLight) {
        data.hemi.push({ light, intensity: effectiveIntensity });
      }
    });

    // Safe default values
    const zeros = {
      vec3: new THREE.Vector3(0, 0, 0),
      color: new THREE.Color(0, 0, 0),
      float: 0.0
    };

    // Padding helper
    const pad = (arr, max, filler) => {
      const res = [...arr];
      while (res.length < max) res.push(filler);
      return res;
    };

    return {
      // Directional Lights
      u_directionalLightDirections: pad(
        data.dir.map(d => {
          const dir = new THREE.Vector3()
            .subVectors(d.light.target.position, d.light.position)
            .normalize();
          return dir;
        }),
        MAX.DIR,
        zeros.vec3
      ),
      u_directionalLightColors: pad(
        data.dir.map(d => d.light.color),
        MAX.DIR,
        zeros.color
      ),
      u_directionalLightIntensities: pad(
        data.dir.map(d => d.intensity),
        MAX.DIR,
        zeros.float
      ),
      u_numDirectionalLights: data.dir.length,

      // Point Lights
      u_pointLightPositions: pad(
        data.point.map(p => p.light.position),
        MAX.POINT,
        zeros.vec3
      ),
      u_pointLightColors: pad(
        data.point.map(p => p.light.color),
        MAX.POINT,
        zeros.color
      ),
      u_pointLightIntensities: pad(
        data.point.map(p => p.intensity),
        MAX.POINT,
        zeros.float
      ),
      u_pointLightDecays: pad(
        data.point.map(p => p.light.decay),
        MAX.POINT,
        2.0
      ),
      u_numPointLights: data.point.length,

      // Spot Lights
      u_spotLightPositions: pad(
        data.spot.map(s => s.light.position),
        MAX.SPOT,
        zeros.vec3
      ),
      u_spotLightDirections: pad(
        data.spot.map(s => {
          const dir = new THREE.Vector3()
            .subVectors(s.light.target.position, s.light.position)
            .normalize();
          return dir;
        }),
        MAX.SPOT,
        zeros.vec3
      ),
      u_spotLightColors: pad(
        data.spot.map(s => s.light.color),
        MAX.SPOT,
        zeros.color
      ),
      u_spotLightIntensities: pad(
        data.spot.map(s => s.intensity),
        MAX.SPOT,
        zeros.float
      ),
      u_spotLightAngles: pad(
        data.spot.map(s => s.light.angle),
        MAX.SPOT,
        0
      ),
      u_spotLightPenumbras: pad(
        data.spot.map(s => s.light.penumbra),
        MAX.SPOT,
        0
      ),
      u_spotLightDecays: pad(
        data.spot.map(s => s.light.decay),
        MAX.SPOT,
        2.0
      ),
      u_numSpotLights: data.spot.length,

      // Hemisphere Lights
      u_hemisphereLightSkyColors: pad(
        data.hemi.map(h => h.light.color),
        MAX.HEMI,
        zeros.color
      ),
      u_hemisphereLightGroundColors: pad(
        data.hemi.map(h => h.light.groundColor),
        MAX.HEMI,
        zeros.color
      ),
      u_hemisphereLightIntensities: pad(
        data.hemi.map(h => h.intensity),
        MAX.HEMI,
        zeros.float
      ),
      u_numHemisphereLights: data.hemi.length
    };
  }

  /**
   * Update shader uniforms for a specific material
   * @param {THREE.ShaderMaterial} material - The material to update
   */
  updateMaterialUniforms(material) {
    if (!material || !material.uniforms) return;

    const lightUniforms = this.getLightUniforms();
    
    // Update all light-related uniforms
    Object.keys(lightUniforms).forEach(key => {
      if (material.uniforms[key]) {
        material.uniforms[key].value = lightUniforms[key];
      }
    });
  }

  /**
   * Update all materials in the scene that use custom shaders
   * Call this once per frame or when lights change
   */
  updateAllMaterials() {
    const lightUniforms = this.getLightUniforms();
    
    this.scene.traverse((obj) => {
      if (obj.material && obj.material.uniforms) {
        Object.keys(lightUniforms).forEach(key => {
          if (obj.material.uniforms[key]) {
            obj.material.uniforms[key].value = lightUniforms[key];
          }
        });
      }
    });
  }

  /**
   * Get all lights for external use
   * @returns {Array<THREE.Light>}
   */
  getAllLights() {
    return this.lights;
  }

  /**
   * Show/hide light helpers
   * @param {boolean} visible
   */
  setHelpersVisible(visible) {
    this.lightHelpers.forEach(({ helper }) => {
      helper.visible = visible;
    });
  }

  /**
   * Dispose of resources
   */
  dispose() {
    // Remove lights from scene
    this.lights.forEach(light => {
      this.scene.remove(light);
      if (light.target) {
        this.scene.remove(light.target);
      }
    });

    // Remove helpers
    this.lightHelpers.forEach(({ helper }) => {
      this.scene.remove(helper);
      if (helper.geometry) helper.geometry.dispose();
      if (helper.material) helper.material.dispose();
    });

    this.lights = [];
    this.lightHelpers = [];
  }
}