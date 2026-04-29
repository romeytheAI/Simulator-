import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Stage, OrbitControls, useGLTF, shaderMaterial, Detailed } from '@react-three/drei';
import { Character } from '../types';
import * as THREE from 'three';

// Procedural noise bump map generator for better topographic fidelity
const createProceduralBumpMap = (gender: string = 'male') => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Base neutral
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-pores (finer/rougher)
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  const noiseIntensity = gender === 'female' ? 8 : 22;
  for (let i = 0; i < data.length; i += 4) {
    const val = (Math.random() - 0.5) * noiseIntensity;
    const base = 128 + val;
    data[i] = base;
    data[i+1] = base;
    data[i+2] = base;
    data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  
  // Musculature/topography
  ctx.globalCompositeOperation = 'overlay';
  const bumpCount = gender === 'female' ? 25 : 60;
  for (let m = 0; m < bumpCount; m++) {
    ctx.beginPath();
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    
    // Males: sharp, smaller muscle bumps (striations). Females: Large smooth volumes.
    const radius = gender === 'female' ? (Math.random() * 200 + 100) : (Math.random() * 70 + 20);
    
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const alpha = gender === 'female' ? 0.12 : 0.45;
    grad.addColorStop(0, `rgba(160, 160, 160, ${alpha})`);
    grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
    
    ctx.fillStyle = grad;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

// Physically Based Hair Shader
const HairShaderMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#221100'),
    uTime: 0,
    uSpecularColor: new THREE.Color('#ffffff'),
    uHairType: 0, // 0: straight, 1: curly, 2: coarse
  },
  // Vertex Shader
  `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform float uHairType;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 transformed = position;
    
    // Subtle hair motion/physics approximation
    float wave = sin(uTime * 2.0 + position.y * 10.0) * 0.01;
    if (uHairType == 1.0) wave *= 2.0; // Curly has more volume/movement
    transformed += normal * wave;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  // Fragment Shader
  `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform vec3 uColor;
  uniform vec3 uSpecularColor;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fake anisotropic specular for hair
    float spec = pow(max(dot(reflect(-viewDir, normal), vec3(0, 1, 0)), 0.0), 32.0);
    
    vec3 baseColor = uColor;
    
    // Light scattering effect
    float diff = max(dot(normal, vec3(0.5, 0.7, 1.0)), 0.2);
    
    vec3 color = baseColor * diff + uSpecularColor * spec * 0.5;
    
    gl_FragColor = vec4(color, 1.0);
  }
  `
);

extend({ HairShaderMaterial });

let maleBumpMap: THREE.CanvasTexture | null = null;
let femaleBumpMap: THREE.CanvasTexture | null = null;

function Model({ url, clothingState, gender, hairType = 0, quality = 'high' }: { url: string, clothingState?: string, gender?: string, hairType?: number, quality?: 'high' | 'mid' | 'low' }) {
  const { scene } = useGLTF(url);
  const timeRef = useRef(0);

  // Apply subtle global scale based on gender for overall body proportions
  const scale = useMemo(() => {
    if (gender === 'female') return new THREE.Vector3(0.95, 0.95, 0.95);
    if (gender === 'male') return new THREE.Vector3(1.05, 1.05, 1.05);
    return new THREE.Vector3(1, 1, 1);
  }, [gender]);

  useEffect(() => {
    if (!scene || quality === 'low') return;
    
    if (!maleBumpMap) maleBumpMap = createProceduralBumpMap('male');
    if (!femaleBumpMap) femaleBumpMap = createProceduralBumpMap('female');
    
    const activeBumpMap = gender === 'female' ? femaleBumpMap : maleBumpMap;

    // Store original materials to restore them if state changes
    const originalMaterials = new Map<THREE.Object3D, THREE.Material | THREE.Material[]>();

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Save original material if not saved
        if (!originalMaterials.has(mesh)) {
          // deep clone the material so we don't permanently mess up the cached GLTF
          if (Array.isArray(mesh.material)) {
            originalMaterials.set(mesh, mesh.material.map(m => m.clone()));
          } else {
            originalMaterials.set(mesh, mesh.material.clone());
          }
        }

        const origMat = originalMaterials.get(mesh)!;

        // Apply visual changes based on clothing state
        const applyMaterialModifier = (mat: THREE.Material) => {
          const name = mat.name.toLowerCase();
          
          // Hair Shader - Only for high quality
          if (name.includes('hair') && quality === 'high') {
             const hairMat = new (THREE as any).HairShaderMaterial();
             hairMat.uColor = (mat as any).color || new THREE.Color('#332211');
             hairMat.uHairType = hairType;
             return hairMat;
          }

          if (!(mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial)) return mat;
          
          // Quality based material selection
          let targetMat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
          
          if (quality === 'high') {
            targetMat = new THREE.MeshPhysicalMaterial().copy(mat as any);
          } else {
            // Mid/Low quality uses standard material
            targetMat = new THREE.MeshStandardMaterial().copy(mat as any);
            return targetMat;
          }
          
          const clonedMat = targetMat as THREE.MeshPhysicalMaterial;
          
          const isSkin = name.includes('skin') || 
                         name.includes('body') || 
                         name.includes('face') || 
                         clonedMat.color.getHex() === 0xffccaa || 
                         clonedMat.color.getHex() === 0xffdfc4 ||
                         clonedMat.color.getHex() === 0x4ade80; // Orc green

          const isClothing = !isSkin && (
            name.includes('cloth') || 
            name.includes('fabric') || 
            name.includes('shirt') || 
            name.includes('pants') ||
            !mat.name
          );

          // Apply topographic bump map for muscular/pore details - Only for high quality
          if (activeBumpMap && quality === 'high') {
            clonedMat.bumpMap = activeBumpMap;
            
            if (isSkin) {
               // Male vs Female skin texture differences
               if (gender === 'female') {
                 clonedMat.bumpScale = 0.0018; // Subtler skin
               } else {
                 clonedMat.bumpScale = 0.0095; // More defined topography
               }
            } else if (isClothing) {
               clonedMat.bumpScale = 0.0125; // Coarser fabric weave
            }
          }
          
          if (isSkin && quality === 'high') {
             // Layered skin shader behavior using MeshPhysicalMaterial properties
             clonedMat.transmission = 0.28; 
             clonedMat.thickness = 1.6; 
             const scatterColor = clonedMat.color.clone().lerp(new THREE.Color(0xff4444), 0.35); 
             clonedMat.attenuationColor = scatterColor;
             clonedMat.clearcoat = gender === 'female' ? 0.7 : 0.4; 
             clonedMat.clearcoatRoughness = gender === 'female' ? 0.15 : 0.4;
             clonedMat.roughness = gender === 'female' ? 0.3 : 0.5; 
             clonedMat.reflectivity = 0.6;
             clonedMat.sheen = 1.0;
             clonedMat.sheenRoughness = 0.5;
             clonedMat.sheenColor = new THREE.Color(0xffaaaa);
             clonedMat.iridescence = 0.1;

             // Morphology and Anatomy Sway shader extension (bimodal osteological dimorphism)
             clonedMat.onBeforeCompile = (shader) => {
               shader.uniforms.uTime = { value: 0 };
               shader.uniforms.uGenderType = { value: gender === 'female' ? 1.0 : 0.0 };
               shader.vertexShader = `
                 uniform float uTime;
                 uniform float uGenderType;
                 ${shader.vertexShader}
               `.replace(
                 '#include <begin_vertex>',
                 `
                 #include <begin_vertex>
                 
                 // Structural Morphology Targets (Phenotype Dimorphism)
                 if (uGenderType > 0.5) {
                    if (position.y < 0.2 && position.y > -0.8) {
                      float biiliacTarget = smoothstep(0.2, -0.2, position.y) * smoothstep(-1.0, -0.2, position.y);
                      transformed.x *= (1.0 + biiliacTarget * 0.28); 
                      transformed.z *= (1.0 + biiliacTarget * 0.15); 
                    }
                    if (position.y > 0.5) {
                      transformed.x *= 0.85; 
                    }
                    if (position.y > 0.0 && position.y < 0.6 && position.z > 0.1) {
                      float mammaryFactor = smoothstep(0.0, 0.3, position.y) * smoothstep(0.6, 0.3, position.y);
                      transformed.z += mammaryFactor * 0.08;
                    }
                 } else {
                    if (position.y > 0.5) {
                      float biacromialTarget = smoothstep(0.5, 0.8, position.y);
                      transformed.x *= (1.0 + biacromialTarget * 0.25); 
                      transformed.z *= (1.0 + biacromialTarget * 0.1);
                    }
                    if (position.y < 0.0) {
                      transformed.x *= 0.92; 
                    }
                 }

                 float dist = length(position.xz);
                 float sway = sin(uTime * 2.5 + position.y * 4.0) * dist * 0.06;
                 transformed.x += sway * smoothstep(0.0, 1.0, dist);
                 transformed.z += (sway * 0.5) * smoothstep(0.0, 1.0, dist);
                 `
               );
               clonedMat.userData.shader = shader;
             };
          }

          if (isClothing && quality === 'high') {
            clonedMat.onBeforeCompile = (shader) => {
               shader.uniforms.uTime = { value: 0 };
               shader.vertexShader = `
                 uniform float uTime;
                 ${shader.vertexShader}
               `.replace(
                 '#include <begin_vertex>',
                 `
                 #include <begin_vertex>
                 float wiggle = sin(uTime * 3.0 + position.y * 5.0) * 0.008;
                 if (uTime > 0.0) {
                   transformed += normal * wiggle;
                 }
                 `
               );
               clonedMat.userData.shader = shader;
            };

            if (clothingState === 'worn') {
              clonedMat.color.multiplyScalar(0.7); 
              clonedMat.roughness = Math.min(1.0, clonedMat.roughness + 0.4);
              clonedMat.bumpScale = 0.04; 
              clonedMat.clearcoat = 0;
              clonedMat.sheen = 0.1; // dull out
            } else if (clothingState === 'torn') {
              clonedMat.transparent = true;
              clonedMat.opacity = 0.65;
              clonedMat.alphaTest = 0.4;
              if (activeBumpMap) clonedMat.alphaMap = activeBumpMap; 
              clonedMat.roughness = 0.9;
              clonedMat.bumpScale = 0.06;
              clonedMat.transmission = 0.2;
            } else if (clothingState === 'exposed') {
              clonedMat.transparent = true;
              clonedMat.opacity = 0.3; 
              clonedMat.transmission = 0.6; 
              clonedMat.thickness = 0.2;
              clonedMat.roughness = 0.8;
              clonedMat.bumpScale = 0.02;
            } else if (clothingState === 'naked') {
              clonedMat.transparent = true;
              clonedMat.opacity = 0.0;
              clonedMat.depthWrite = false;
              clonedMat.visible = false;
            }
          }
          
          return clonedMat;
        };

        if (Array.isArray(origMat)) {
          mesh.material = origMat.map(m => applyMaterialModifier(m) || m);
        } else {
          mesh.material = applyMaterialModifier(origMat) || origMat;
        }
      }
    });
  }, [scene, clothingState, gender, hairType, quality]);

  useFrame((state) => {
    if (quality !== 'high') return;
    timeRef.current = state.clock.elapsedTime;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
         const mat = (child as THREE.Mesh).material;
         if (mat && (mat as any).userData.shader) {
            (mat as any).userData.shader.uniforms.uTime.value = timeRef.current;
         }
         if (mat && (mat as any).uTime !== undefined) {
           (mat as any).uTime = timeRef.current;
         }
      }
    });
  });

  return <primitive object={scene} scale={scale} />;
}

function LowPolyProxy({ gender }: { gender?: string }) {
  const color = gender === 'female' ? '#ffccaa' : '#ffdfc4';
  return (
    <group>
      {/* Abstracted head/torso proxy for distant LOD */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.2]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.35, 0.2, 0.3]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

interface StagedModelViewerProps {
  character?: Character;
  className?: string;
  autoRotate?: boolean;
}

export default function StagedModelViewer({ character, className = "w-full h-full min-h-[300px]", autoRotate = true }: StagedModelViewerProps) {
  // Select a base model dynamically based on character traits like race, age, profession
  const url = useMemo(() => {
    if (!character) return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf';
    
    const race = character.race.toLowerCase();
    const gender = character.gender.toLowerCase();
    const age = character.age;
    const profession = character.profession.toLowerCase();
    
    if (race.includes('skeleton') || race.includes('undead')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/skeleton/model.gltf';
    }
    if (race.includes('bear') || race.includes('beast')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/bear/model.gltf';
    }
    if (race.includes('elf') || race.includes('fairy')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/druid/model.gltf';
    }
    if (race.includes('ghost') || race.includes('specter')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/ghost/model.gltf';
    }
    if (race.includes('cactus') || race.includes('plant')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/cactus/model.gltf';
    }
    if (profession.includes('knight') || profession.includes('warrior') || profession.includes('paladin')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/knight/model.gltf';
    }
    if (age < 18 || profession.includes('thief') || profession.includes('rogue')) {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/korok/model.gltf'; // Small agile looking
    }
    if (race.includes('robot') || race.includes('cyborg')) {
        return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/mac-book-pro/model.gltf'; // Tech placeholder
    }

    // Differentiated gender-based humanoid models
    if (gender === 'female') {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/druid/model.gltf'; 
    }
    if (gender === 'male') {
      return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/knight/model.gltf'; 
    }

    // Default humanoid fallback
    return 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf';
  }, [character]);

  const hairType = useMemo(() => {
    if (character?.traits?.some(t => t.toLowerCase().includes('curly'))) return 1;
    if (character?.traits?.some(t => t.toLowerCase().includes('coarse'))) return 2;
    return 0;
  }, [character]);

  const clothingState = character?.clothing?.state || 'pristine';

  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
        <Suspense fallback={null}>
          <Stage environment="sunset" intensity={0.8} contactShadow={{ resolution: 1024, scale: 10, blur: 2, opacity: 0.5, far: 10 }}>
            <Detailed distances={[0, 5, 12]}>
              <Model 
                url={url} 
                clothingState={clothingState} 
                gender={character?.gender?.toLowerCase()} 
                hairType={hairType}
                quality="high"
              />
              <Model 
                url={url.replace('-high-poly', '')} 
                clothingState={clothingState} 
                gender={character?.gender?.toLowerCase()} 
                hairType={hairType}
                quality="mid"
              />
              <LowPolyProxy gender={character?.gender?.toLowerCase()} />
            </Detailed>
          </Stage>
        </Suspense>
        <OrbitControls autoRotate={autoRotate} autoRotateSpeed={2} makeDefault />
      </Canvas>
    </div>
  );
}
