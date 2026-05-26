import React from 'react';
import * as THREE from 'three';

interface SoccerPlayerGeometryProps {
  torsoRef: React.RefObject<THREE.Group | null>;
  headGroupRef: React.RefObject<THREE.Group | null>;
  
  // Limb Refs
  leftUpperArmRef: React.RefObject<THREE.Group | null>;
  leftLowerArmRef: React.RefObject<THREE.Group | null>;
  rightUpperArmRef: React.RefObject<THREE.Group | null>;
  rightLowerArmRef: React.RefObject<THREE.Group | null>;
  
  leftUpperLegRef: React.RefObject<THREE.Group | null>;
  leftLowerLegRef: React.RefObject<THREE.Group | null>;
  rightUpperLegRef: React.RefObject<THREE.Group | null>;
  rightLowerLegRef: React.RefObject<THREE.Group | null>;

  // Materials
  skinMat: THREE.Material;
  hairMat: THREE.Material;
  shirtMat: THREE.Material;
  shirtLightMat: THREE.Material;
  shortsMat: THREE.Material;
  shortsDetailMat: THREE.Material;
  socksMat: THREE.Material;
  socksBandMat: THREE.Material;
  bootsMat: THREE.Material;
  gloveMat: THREE.Material;

  isKeeper: boolean;
  angle: number;
}

const LimbSegment = ({ 
  widthTop, widthBottom, length, color, position, rotation, segments = 4 
}: any) => (
  <mesh position={position} rotation={rotation} material={color}>
    <cylinderGeometry args={[widthTop, widthBottom, length, segments]} />
  </mesh>
);

const Joint = ({ size, color, position }: any) => (
  <mesh position={position} material={color}>
     <sphereGeometry args={[size, 6, 6]} />
  </mesh>
);

export const SoccerPlayerGeometry: React.FC<SoccerPlayerGeometryProps> = ({
  torsoRef,
  headGroupRef,
  leftUpperArmRef,
  leftLowerArmRef,
  rightUpperArmRef,
  rightLowerArmRef,
  leftUpperLegRef,
  leftLowerLegRef,
  rightUpperLegRef,
  rightLowerLegRef,
  skinMat,
  hairMat,
  shirtMat,
  shirtLightMat,
  shortsMat,
  shortsDetailMat,
  socksMat,
  socksBandMat,
  bootsMat,
  gloveMat,
  isKeeper,
  angle
}) => {
  return (
    <group scale={[0.85, 0.85, 0.85]} position={[0, 0.08, 0]} rotation={[0, angle, 0]}>
      
      {/* A. TORSO */}
      <group ref={torsoRef}>
        <mesh material={shirtMat} position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.22, 0.15, 0.28, 4]} />
        </mesh>
        
        <mesh material={shirtMat} position={[0, 0.0, 0]}>
          <cylinderGeometry args={[0.14, 0.13, 0.22, 4]} />
        </mesh>
        
        <mesh material={shortsMat} position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 0.15, 4]} />
        </mesh>
        
        <mesh material={shirtLightMat} position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.07, 0.11, 0.05, 4]} />
        </mesh>

        {/* B. HEAD */}
        <group position={[0, 0.38, 0]}>
          <mesh material={skinMat} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.12, 6]} />
          </mesh>
           
          <group ref={headGroupRef} position={[0, 0.15, 0]}>
            <mesh material={skinMat} position={[0, 0.04, -0.02]}>
              <boxGeometry args={[0.13, 0.15, 0.14]} />
            </mesh>
            <mesh material={skinMat} position={[0, -0.06, 0]}>
              <boxGeometry args={[0.11, 0.08, 0.13]} />
            </mesh>
            <mesh material={skinMat} position={[0, -0.01, 0.07]} rotation={[-0.2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.02, 0.05, 3]} />
            </mesh>
            
            <mesh material={hairMat} position={[0, 0.11, -0.02]}>
              <boxGeometry args={[0.14, 0.05, 0.15]} />
            </mesh>
            <mesh material={hairMat} position={[0, 0.02, -0.1]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[0.13, 0.14, 0.05]} />
            </mesh>
          </group>
        </group>

        {/* C. ARMS */}
        <group ref={leftUpperArmRef} position={[-0.22, 0.26, 0]}>
          <Joint size={0.065} color={shirtMat} position={[0, 0, 0]} />
          <LimbSegment widthTop={0.055} widthBottom={0.045} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
           
          <group ref={leftLowerArmRef} position={[0, -0.24, 0]}>
            <Joint size={0.045} color={skinMat} position={[0, 0, 0]} />
            <LimbSegment widthTop={0.045} widthBottom={0.035} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
            <mesh material={isKeeper ? gloveMat : skinMat} position={[0, -0.25, 0]}>
              <boxGeometry args={[0.045, 0.07, 0.05]} />
            </mesh>
          </group>
        </group>

        <group ref={rightUpperArmRef} position={[0.22, 0.26, 0]}>
          <Joint size={0.065} color={shirtMat} position={[0, 0, 0]} />
          <LimbSegment widthTop={0.055} widthBottom={0.045} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
           
          <group ref={rightLowerArmRef} position={[0, -0.24, 0]}>
            <Joint size={0.045} color={skinMat} position={[0, 0, 0]} />
            <LimbSegment widthTop={0.045} widthBottom={0.035} length={0.22} color={skinMat} position={[0, -0.12, 0]} />
            <mesh material={isKeeper ? gloveMat : skinMat} position={[0, -0.25, 0]}>
              <boxGeometry args={[0.045, 0.07, 0.05]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* D. LEGS */}
      <group position={[0, 0.68, 0]}>
        <group ref={leftUpperLegRef} position={[-0.09, -0.1, 0]}>
          <Joint size={0.08} color={shortsMat} position={[0, 0, 0]} />
          <LimbSegment widthTop={0.11} widthBottom={0.09} length={0.22} color={shortsMat} position={[0, -0.09, 0]} />
          <mesh material={shortsDetailMat} position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.03, 6]} />
          </mesh>
          <LimbSegment widthTop={0.09} widthBottom={0.08} length={0.12} color={skinMat} position={[0, -0.24, 0]} />

          <group ref={leftLowerLegRef} position={[0, -0.32, 0]}>
            <Joint size={0.065} color={skinMat} position={[0, 0, 0]} />
            <LimbSegment widthTop={0.08} widthBottom={0.055} length={0.3} color={socksMat} position={[0, -0.15, 0]} />
            <mesh material={socksBandMat} position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.085, 0.082, 0.03, 6]} />
            </mesh>
            <group position={[0, -0.32, 0.03]}>
              <mesh material={bootsMat}>
                <boxGeometry args={[0.08, 0.07, 0.17]} />
              </mesh>
              <mesh material={bootsMat} position={[0, -0.02, 0.1]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.075, 0.045, 0.07]} />
              </mesh>
            </group>
          </group>
        </group>

        <group ref={rightUpperLegRef} position={[0.09, -0.1, 0]}>
          <Joint size={0.08} color={shortsMat} position={[0, 0, 0]} />
          <LimbSegment widthTop={0.11} widthBottom={0.09} length={0.22} color={shortsMat} position={[0, -0.09, 0]} />
          <mesh material={shortsDetailMat} position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.03, 6]} />
          </mesh>
          <LimbSegment widthTop={0.09} widthBottom={0.08} length={0.12} color={skinMat} position={[0, -0.24, 0]} />

          <group ref={rightLowerLegRef} position={[0, -0.32, 0]}>
            <Joint size={0.065} color={skinMat} position={[0, 0, 0]} />
            <LimbSegment widthTop={0.08} widthBottom={0.055} length={0.3} color={socksMat} position={[0, -0.15, 0]} />
            <mesh material={socksBandMat} position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.085, 0.082, 0.03, 6]} />
            </mesh>
            <group position={[0, -0.32, 0.03]}>
              <mesh material={bootsMat}>
                <boxGeometry args={[0.08, 0.07, 0.17]} />
              </mesh>
              <mesh material={bootsMat} position={[0, -0.02, 0.1]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.075, 0.045, 0.07]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

    </group>
  );
};
