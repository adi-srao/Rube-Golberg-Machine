import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();
const textureLoader = new THREE.TextureLoader();

export async function fetchText(path) {
    if (!path) return null;
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return await res.text();
    } catch (e) {
        console.warn('fetchText error:', path, e);
        return null;
    }
}

export function fetchTexture(path) {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve) => {
        textureLoader.load(path, (tex) => {
            try { tex.colorSpace = THREE.SRGBColorSpace; } catch(e) {}
            resolve(tex);
        }, undefined, (e) => {
            console.warn('Texture load error:', path, e);
            resolve(null);
        });
    });
}

export function fetchMaterial(path) {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve) => {
        mtlLoader.load(path, (materials) => {
            materials.preload();
            resolve(materials);
        }, undefined, (e) => {
            console.warn('MTL load error:', path, e);
            resolve(null);
        });
    });
}

export function fetchObject(path, materials) {
    if (!path) return Promise.resolve(null);
    if (materials) objLoader.setMaterials(materials);
    return new Promise((resolve, reject) => {
        objLoader.load(path, resolve, undefined, reject);
    });
}