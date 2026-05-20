import React from 'react';
import * as THREE from 'three';

// --- STATIC OPTIMIZED THREE.JS MATERIALS ---
const postMaterial = new THREE.MeshStandardMaterial({
  color: 'white',
  roughness: 0.5
});

const supportMaterial = new THREE.MeshStandardMaterial({
  color: '#ccc',
  roughness: 0.8
});

const netMaterial = new THREE.MeshBasicMaterial({
  color: '#dddddd',
  wireframe: true,
  opacity: 0.3,
  transparent: true
});

const Goal: React.FC = () => {
  return (
    <group>
      {/* Posts (White Cylinders) */}
      {/* Left Post */}
      <mesh position={[-1.1, 0.35, 0]} material={postMaterial}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
      </mesh>
      {/* Right Post */}
      <mesh position={[1.1, 0.35, 0]} material={postMaterial}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]} material={postMaterial}>
        <cylinderGeometry args={[0.04, 0.04, 2.2, 8]} />
      </mesh>

      {/* Net Support (Back) */}
      <mesh position={[-1.1, 0.35, -0.3]} rotation={[Math.PI / 2, 0, 0]} material={supportMaterial}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
      </mesh>
      <mesh position={[1.1, 0.35, -0.3]} rotation={[Math.PI / 2, 0, 0]} material={supportMaterial}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
      </mesh>

      {/* Net (Wireframe Box) */}
      <mesh position={[0, 0.35, -0.3]} material={netMaterial}>
        <boxGeometry args={[2.2, 0.7, 0.6]} />
      </mesh>
    </group>
  );
};

export default React.memo(Goal);
