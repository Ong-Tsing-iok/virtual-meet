/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */
// import { Text } from "@react-three/drei";
import { Mesh, PointsMaterial } from "three";
const Scene = ({ sceneGeometry }) => {

  // const material = new MeshStandardMaterial({ color: 0xffffff });
  const material = new PointsMaterial({ size: 0.01, vertexColors: true });
  const mesh = new Mesh(sceneGeometry, Mesh.meshMaterial);

  return (
    <group position={[0, 0, 0]}>
      {/* <points geometry={sceneGeometry} material={material}></points> */}
      <mesh geometry={mesh.geometry} material={material} />
    </group>
  );
};

export default Scene;