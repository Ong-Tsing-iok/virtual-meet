/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */
// import { Text } from "@react-three/drei";
import { MeshStandardMaterial } from "three";
const Scene = ({ sceneGeometry }) => {

  const material = new MeshStandardMaterial({ color: 0xffffff });

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={sceneGeometry} material={material} scale={[0.001, 0.001, 0.001]} rotation={[Math.PI / 2, Math.PI / 2 + 0.3, Math.PI / 2]}>

      </mesh>
    </group>
  );
};

export default Scene;