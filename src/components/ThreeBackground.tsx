import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const Terrain = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a simple terrain-like geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100, 64, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Simple noise-like function for mountains
      const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2 + 
                Math.sin(x * 0.3) * 0.5 + 
                Math.cos(y * 0.5) * 0.3;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -10, -20]}>
      <meshStandardMaterial 
        color="#1a2e1a" 
        wireframe 
        transparent 
        opacity={0.3} 
        emissive="#22c55e"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

const FloatingOrbs = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <Float
          key={i}
          speed={2} 
          rotationIntensity={2} 
          floatIntensity={2}
          position={[
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 10 - 10
          ]}
        >
          <Sphere args={[0.2, 16, 16]}>
            <MeshDistortMaterial
              color="#22c55e"
              speed={5}
              distort={0.4}
              radius={1}
              emissive="#22c55e"
              emissiveIntensity={2}
            />
          </Sphere>
        </Float>
      ))}
    </>
  );
};

export const ThreeBackground = () => {
  return (
    <div id="three-bg" className="fixed inset-0 -z-10 bg-[#050505]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#22c55e" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#166534" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Terrain />
        <FloatingOrbs />
        
        <fog attach="fog" args={['#050505', 10, 40]} />
      </Canvas>
    </div>
  );
};
