// MaterialFactory.js (Fixed for Texture Rendering)
import * as THREE from "three";

async function loadShader(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load shader ${url}: ${res.status}`);
  }
  return await res.text();
}

export default class MaterialFactory {
  /**
   * Use this instead of `new MaterialFactory()` directly.
   * It loads all GLSL files, then returns a ready instance.
   */
  static async create(lightHandler = null) {
    const [phongVS, phongFS, gouraudVS, gouraudFS, blinnVS, blinnFS] = await Promise.all([
      loadShader("../../A3/Source/Shaders/Phong/vertex_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Phong/fragment_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Gouraud/vertex_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Gouraud/fragment_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Blinn_Phong/vertex_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Blinn_Phong/fragment_shader.glsl"),
    ]);

    return new MaterialFactory({ 
      phongVS, phongFS, 
      gouraudVS, gouraudFS, 
      blinnVS, blinnFS 
    }, lightHandler);
  }

  constructor({ phongVS, phongFS, gouraudVS, gouraudFS, blinnVS, blinnFS }, lightHandler = null) {
    this.phongVS = phongVS;
    this.phongFS = phongFS;
    this.gouraudVS = gouraudVS;
    this.gouraudFS = gouraudFS;
    this.blinnVS = blinnVS;
    this.blinnFS = blinnFS;

    this.lightHandler = lightHandler;
    this.textureLoader = new THREE.TextureLoader();

    // Load textures with proper settings
    this.checkerTex = this._loadTexture("../../A3/Textures/2.jpg", 2);
    this.woodTex    = this._loadTexture("../../A3/Textures/wood.jpg", 2);
    
    console.log("[MaterialFactory] Textures loaded:", {
      checker: this.checkerTex,
      wood: this.woodTex
    });
  }

  /**
   * Set the light handler after construction
   * @param {LightHandler} lightHandler
   */
  setLightHandler(lightHandler) {
    this.lightHandler = lightHandler;
  }

  _loadTexture(path, repeat = 1) {
    const tex = this.textureLoader.load(
      path,
      // onLoad callback
      (texture) => {
        console.log(`[MaterialFactory] Texture loaded successfully: ${path}`);
      },
      // onProgress callback
      undefined,
      // onError callback
      (err) => {
        console.error(`[MaterialFactory] Failed to load texture: ${path}`, err);
      }
    );
    
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    
    return tex;
  }

  _getDefaultLightUniforms() {
    // If no light handler, return safe defaults
    const MAX = { DIR: 4, POINT: 8, SPOT: 4, HEMI: 2 };
    const zeros = {
      vec3: new THREE.Vector3(0, 0, 0),
      color: new THREE.Color(0, 0, 0),
      float: 0.0
    };

    const pad = (max, filler) => {
      const res = [];
      for (let i = 0; i < max; i++) res.push(filler);
      return res;
    };

    return {
      u_numDirectionalLights: 0,
      u_directionalLightDirections: pad(MAX.DIR, zeros.vec3),
      u_directionalLightColors: pad(MAX.DIR, zeros.color),
      u_directionalLightIntensities: pad(MAX.DIR, zeros.float),

      u_numPointLights: 0,
      u_pointLightPositions: pad(MAX.POINT, zeros.vec3),
      u_pointLightColors: pad(MAX.POINT, zeros.color),
      u_pointLightIntensities: pad(MAX.POINT, zeros.float),
      u_pointLightDecays: pad(MAX.POINT, 2.0),

      u_numSpotLights: 0,
      u_spotLightPositions: pad(MAX.SPOT, zeros.vec3),
      u_spotLightDirections: pad(MAX.SPOT, zeros.vec3),
      u_spotLightColors: pad(MAX.SPOT, zeros.color),
      u_spotLightIntensities: pad(MAX.SPOT, zeros.float),
      u_spotLightAngles: pad(MAX.SPOT, 0),
      u_spotLightPenumbras: pad(MAX.SPOT, 0),
      u_spotLightDecays: pad(MAX.SPOT, 2.0),

      u_numHemisphereLights: 0,
      u_hemisphereLightSkyColors: pad(MAX.HEMI, zeros.color),
      u_hemisphereLightGroundColors: pad(MAX.HEMI, zeros.color),
      u_hemisphereLightIntensities: pad(MAX.HEMI, zeros.float),
    };
  }

  _createShaderMaterial(mode, { color, map = null, shininess = 30 }) {
    const useTexture = !!map;

    // Get light uniforms from LightHandler or use defaults
    const lightUniforms = this.lightHandler 
      ? this.lightHandler.getLightUniforms() 
      : this._getDefaultLightUniforms();

    // Convert light uniform arrays to uniform objects
    const uniformsFromLights = {};
    Object.keys(lightUniforms).forEach(key => {
      uniformsFromLights[key] = { value: lightUniforms[key] };
    });

    // Base material uniforms
    const baseUniforms = {
      u_model:          { value: new THREE.Matrix4() },
      u_viewProjection: { value: new THREE.Matrix4() },
      u_color:          { value: new THREE.Color(color) },
      u_useMap:         { value: useTexture ? 1.0 : 0.0 },
      u_map:            { value: map || null },
      u_shininess:      { value: shininess },
      u_ambientColor:   { value: new THREE.Color(0x333333) },
      u_specularColor:  { value: new THREE.Color(0xffffff) },
      u_emissionColor:  { value: new THREE.Color(0x000000) },
    };

    // Combine base uniforms with light uniforms
    const uniforms = {
      ...baseUniforms,
      ...uniformsFromLights
    };

    const shaders = mode === "gouraud" 
      ? { vertexShader: this.gouraudVS, fragmentShader: this.gouraudFS }
      : (mode === "blinn" 
          ? { vertexShader: this.blinnVS, fragmentShader: this.blinnFS }
          : { vertexShader: this.phongVS, fragmentShader: this.phongFS });

    // CRITICAL: Add defines for shader preprocessing
    const defines = {};
    if (useTexture) {
      defines.USE_UV = true;  // This enables the UV code in fragment shader
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.fragmentShader,
      uniforms,
      defines,  // IMPORTANT: This was missing!
    });

    // Tag material with mode for easier debugging/identification
    material.userData.shadingMode = mode;
    material.userData.hasTexture = useTexture;

    // Debug log for texture materials
    if (useTexture) {
      console.log(`[MaterialFactory] Created material with texture:`, {
        mode,
        texture: map,
        textureLoaded: map?.image !== undefined,
        defines: material.defines
      });
    }

    return material;
  }

  // === Public APIs used by SceneGraph (mode = "phong" | "gouraud" | "blinn") ===

  createGroundMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0xffffff,
      map: this.checkerTex,
      shininess: 5,
    });
  }

  createRingBaseMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0xffffff,
      map: this.woodTex,
      shininess: 20,
    });
  }

  createRingHoopMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0xddddff,
      map: this.woodTex,
      shininess: 80,
    });
  }

  createWoodTrackMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0xffffff,
      map: this.woodTex,
      shininess: 30,
    });
  }

  createMetalBallMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0xdddddd,
      map: null,
      shininess: 100,
    });
  }

  createDominoMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0xffffff,
      map: this.checkerTex,
      shininess: 10,
    });
  }

  createPendulumRodMaterial(mode) {
    return this._createShaderMaterial(mode, {
      color: 0x888888,
      map: null,
      shininess: 40,
    });
  }
}