import React, { Suspense, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Stage,
  Detailed,
  useGLTF,
  OrthographicCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { Character } from "../types";

interface SideScrollerSceneProps {
  character: Character;
  className?: string;
  weatherType?: string;
  processing?: boolean;
}

function ScrollingEnvironment({
  weatherType,
  isMoving,
}: {
  weatherType?: string;
  isMoving: boolean;
}) {
  const gridHelper = useMemo(
    () => new THREE.GridHelper(100, 100, 0x444444, 0x222222),
    [],
  );
  const bgRef = useRef<THREE.Group>(null);

  // Create some random pillars/ruins
  const ruins = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      position: [
        Math.random() * 100 - 40,
        (Math.random() * 4) / 2,
        -5 - Math.random() * 10,
      ] as [number, number, number],
      scale: [
        1 + Math.random() * 2,
        2 + Math.random() * 6,
        1 + Math.random() * 2,
      ] as [number, number, number],
      color: new THREE.Color().setHSL(Math.random() * 0.1, 0.1, 0.1),
    }));
  }, []);

  useFrame(({ clock, delta }) => {
    if (isMoving && bgRef.current) {
      bgRef.current.position.x -= delta * 4;
      if (bgRef.current.position.x <= -10) {
        bgRef.current.position.x = 0;
      }
    }
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Static ground/grid that only scrolls cleanly */}
      <group ref={bgRef}>
        <primitive object={gridHelper} />
        {/* Repeating floor pattern */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[200, 50]} />
          <meshStandardMaterial
            color="#080808"
            depthWrite={true}
            roughness={0.9}
          />
        </mesh>

        {/* Parallax Ruins inside the grid group so they scroll, 
            but wait, if they reset every 10 units, we need them to repeat every 10 units,
            which is hard. Let's make ruins independent and scroll them! */}
      </group>

      {/* Ruins that scroll indefinitely and wrap around */}
      {ruins.map((ruin, i) => (
        <ScrollingRuin key={i} {...ruin} isMoving={isMoving} />
      ))}

      {/* Distant background layers */}
      <mesh position={[0, 5, -20]}>
        <planeGeometry args={[200, 40]} />
        <meshBasicMaterial color="#030303" />
      </mesh>
    </group>
  );
}

function ScrollingRuin({ position, scale, color, isMoving }: any) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ delta }) => {
    if (isMoving && ref.current) {
      ref.current.position.x -= delta * 3; // Parallax slightly slower
      if (ref.current.position.x < -30) {
        ref.current.position.x = 70; // Wrap around
      }
    }
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function ProxyAnimatedCharacter({
  character,
  isMoving,
}: {
  character: Character;
  isMoving: boolean;
}) {
  const url = useMemo(() => {
    if (!character)
      return "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf";
    const race = character.race.toLowerCase();
    const gender = character.gender.toLowerCase();

    if (race.includes("skeleton") || race.includes("undead"))
      return "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/skeleton/model.gltf";
    if (gender === "female")
      return "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/druid/model.gltf";
    return "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/knight/model.gltf";
  }, [character]);

  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(), [scene]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      if (isMoving) {
        // Walking animation (bobbing and slight rocking)
        const t = clock.getElapsedTime() * 8;
        groupRef.current.position.y = Math.abs(Math.sin(t)) * 0.15 - 1;
        groupRef.current.rotation.z = Math.sin(t / 2) * 0.05;
      } else {
        // Idle breathing
        const t = clock.getElapsedTime() * 2;
        groupRef.current.position.y = Math.sin(t) * 0.02 - 1;
        groupRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={clone} scale={1.2} />
    </group>
  );
}

export default function SideScrollerScene({
  character,
  className,
  weatherType,
  processing = false,
}: SideScrollerSceneProps) {
  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]}>
        <OrthographicCamera
          makeDefault
          position={[0, 1, 10]}
          zoom={80}
          near={0.1}
          far={100}
        />
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 5, 20]} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={0.8} color="#4488ff" />

        <Suspense fallback={null}>
          <ProxyAnimatedCharacter character={character} isMoving={processing} />
          <ScrollingEnvironment
            weatherType={weatherType}
            isMoving={processing}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
