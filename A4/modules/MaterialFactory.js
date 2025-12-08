// MaterialFactory.js
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
  static async create() {
    const [phongVS, phongFS, gouraudVS, gouraudFS, blinnVS, blinnFS] = await Promise.all([
      loadShader("../../A3/Source/Shaders/Phong/vertex_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Phong/fragment_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Gouraud/vertex_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Gouraud/fragment_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Blinn_Phong/vertex_shader.glsl"),
      loadShader("../../A3/Source/Shaders/Blinn_Phong/fragment_shader.glsl"),

    ]);

    return new MaterialFactory({ phongVS, phongFS, gouraudVS, gouraudFS, blinnVS, blinnFS });
  }

  constructor({ phongVS, phongFS, gouraudVS, gouraudFS, blinnVS, blinnFS }) {
    this.phongVS = phongVS;
    this.phongFS = phongFS;
    this.gouraudVS = gouraudVS;
    this.gouraudFS = gouraudFS;
    this.blinnVS = blinnVS;
    this.blinnFS = blinnFS;

    this.textureLoader = new THREE.TextureLoader();

    // Adjust texture paths to your actual files
    this.checkerTex = this._loadTexture("../../A3/Textures/1.jpg", 2);
    this.woodTex    = this._loadTexture("../../A3/Textures/1.jpg", 2);
  }

  _loadTexture(path, repeat = 1) {
    const tex = this.textureLoader.load(path);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    return tex;
  }

  _createShaderMaterial(mode, { color, map = null, shininess = 30 }) {
    const useTexture = !!map;

      const uniforms = {
      u_model:          { value: new THREE.Matrix4() },
      u_viewProjection: { value: new THREE.Matrix4() },
      u_color: { value: new THREE.Color(color) },
      u_useMap: { value: useTexture },
      u_map:    { value: map || null },
      u_lightPosition:   { value: new THREE.Vector3(10, 20, 10) },
      u_lightColor: { value: new THREE.Color(0xffffff) },
      u_shininess:  { value: shininess },
    };

    const shaders =
      mode === "gouraud"
        ? { vertexShader: this.gouraudVS, fragmentShader: this.gouraudFS }
        :(mode === "blinn" ? { vertexShader: this.blinnVS, fragmentShader: this.blinnFS } : { vertexShader: this.phongVS,   fragmentShader: this.phongFS   });


        //console.log("=== Creating material - mode:", mode);
        //console.log("VERTEX SHADER:\n", shaders.vertexShader);
        //console.log("FRAGMENT SHADER:\n", shaders.fragmentShader);
        //console.log("UNIFORMS:", uniforms);
    
    return new THREE.ShaderMaterial({
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.fragmentShader,
      uniforms,
    });
  }

  // === Public APIs used by SceneGraph (mode = "phong" | "gouraud") ===

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
      map: null,
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
