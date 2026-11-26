/**
 * React Bits 官方 Lanyard 组件（源码来自 interactive-lanyard-example / React Bits 收录版本）
 *
 * 保留的官方核心实现，未改写：
 *   - Rapier 物理：Physics / RigidBody / BallCollider / CuboidCollider
 *   - 绳索关节：3 × useRopeJoint + 1 × useSphericalJoint
 *   - 拖拽交互：kinematicPosition + setNextKinematicTranslation / pointer capture
 *   - 惯性摆动：angvel 修正、CatmullRom 曲线、MeshLine 带宽
 *   - 相机与灯光参数
 *
 * 本次仅做视觉适配（不改物理）：
 *   - 资源路径改为本站 public/lanyard/
 *   - 正面纹理只替换 card 材质的 map，clip / clamp 保持独立银色材质
 *   - 吊绳纹理改为深石墨织带 + 冰蓝 SK hynix 字样
 *   - 增加 active 参数用于离屏暂停，className 用于容器适配
 */
import { useGLTF, useTexture } from '@react-three/drei';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: Record<string, unknown>;
    meshLineMaterial: Record<string, unknown>;
  }
}

const base = import.meta.env.BASE_URL;
const TAG_URL = `${base}lanyard/tag.glb`;
const BADGE_URL = `${base}lanyard/badge-front.webp`;
const BAND_URL = `${base}lanyard/lanyard-band.png`;

useGLTF.preload(TAG_URL);
useTexture.preload(BADGE_URL);
useTexture.preload(BAND_URL);

interface LanyardProps {
  active?: boolean;
  className?: string;
  /** 首帧真正绘制完成时回调，用于淡出静态占位图 */
  onReady?: () => void;
}

export default function Lanyard({ active = true, className, onReady }: LanyardProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 8.2], fov: 25 }}
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
    >
      <ambientLight intensity={1} />
      <directionalLight intensity={3} position={[5, 5, 5]} />
      <directionalLight intensity={3} position={[-5, 3, 3]} />
      <Physics gravity={[0, -40, 0]} interpolate timeStep={1 / 60} paused={!active}>
        <Band />
        <ReadyGate onReady={onReady} />
      </Physics>
    </Canvas>
  );
}

/** 仅在渲染循环真正跑起来后通知一次，避免占位图提前淡出后露出空画布 */
function ReadyGate({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current >= 3) {
      done.current = true;
      onReady?.();
    }
  });
  return null;
}

const segmentProps = {
  type: 'dynamic',
  canSleep: true,
  colliders: false,
  angularDamping: 2,
  linearDamping: 2,
} as const;

function Band({ maxSpeed = 50, minSpeed = 10 }) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null);
  const fixed = useRef<RapierRigidBody>(null);
  const j1 = useRef<RapierRigidBody>(null);
  const j2 = useRef<RapierRigidBody>(null);
  const j3 = useRef<RapierRigidBody>(null);
  const card = useRef<RapierRigidBody>(null);
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);
  const { viewport, gl } = useThree();

  /* 官方：线宽随视口反向缩放，小屏也保持可见 */
  const lineWidth = useMemo(() => {
    const baseWidth = 10;
    const baseLineWidth = 1;
    const scale = Math.max(1, baseWidth / Math.max(viewport.width, 3));
    return baseLineWidth * scale;
  }, [viewport.width]);

  const { nodes } = useGLTF(TAG_URL) as unknown as {
    nodes: Record<string, THREE.Object3D>;
  };
  const badgeTexture = useTexture(BADGE_URL);
  const bandTexture = useTexture(BAND_URL);

  /* 颜色贴图显式 sRGB + 各向异性 + mipmap，避免色偏与斜角糊化 */
  useEffect(() => {
    for (const tex of [badgeTexture, bandTexture]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
    }
  }, [badgeTexture, bandTexture, gl]);

  const isMesh = (obj: THREE.Object3D | undefined): obj is THREE.Mesh =>
    obj !== undefined && obj.type === 'Mesh';

  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(), new THREE.Vector3(),
      new THREE.Vector3(), new THREE.Vector3(),
    ])
  );

  /* 官方绳索关节：3 × RopeJoint + 1 × SphericalJoint，参数未改 */
  useRopeJoint(fixed as RefObject<RapierRigidBody>, j1 as RefObject<RapierRigidBody>, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1 as RefObject<RapierRigidBody>, j2 as RefObject<RapierRigidBody>, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2 as RefObject<RapierRigidBody>, j3 as RefObject<RapierRigidBody>, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3 as RefObject<RapierRigidBody>, card as RefObject<RapierRigidBody>, [
    [0, 0, 0],
    [0, 1.45, 0],
  ]);

  useEffect(() => {
    if (hovered) document.body.style.cursor = dragged ? 'grabbing' : 'grab';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered, dragged]);

  /* 官方每帧逻辑：拖拽跟随、绳索插值、惯性回正，未改写 */
  useFrame((state, delta) => {
    if (!(fixed.current && j1.current && j2.current && j3.current && band.current && card.current)) return;

    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      for (const ref of [card, j1, j2, j3, fixed]) ref.current?.wakeUp();
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    const [j1Lerped, j2Lerped] = [j1, j2].map((ref) => {
      if (ref.current) {
        const lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, lerped.distanceTo(ref.current.translation())));
        return lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
      }
      return undefined;
    });

    curve.points[0].copy(j3.current.translation());
    curve.points[1].copy(j2Lerped ?? j2.current.translation());
    curve.points[2].copy(j1Lerped ?? j1.current.translation());
    curve.points[3].copy(fixed.current.translation());
    band.current.geometry.setPoints(curve.getPoints(32));

    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, false);
  });

  curve.curveType = 'chordal';

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            onPointerDown={(e) => {
              (e.target as Element)?.setPointerCapture(e.pointerId);
              if (card.current) {
                setDragged(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
              }
            }}
            onPointerOut={() => hover(false)}
            onPointerOver={() => hover(true)}
            onPointerUp={(e) => {
              (e.target as Element)?.releasePointerCapture(e.pointerId);
              setDragged(false);
            }}
            position={[0, -1.25, -0.05]}
            scale={2.25}
          >
            {isMesh(nodes.card) && (
              <mesh geometry={nodes.card.geometry}>
                {/* 只替换 card 正面 map，不改动 GLB 结构与其他材质 */}
                <meshPhysicalMaterial
                  map={badgeTexture}
                  {...{ 'map-anisotropy': 8 }}
                  clearcoat={0.5}
                  clearcoatRoughness={0.3}
                  metalness={0.35}
                  roughness={0.55}
                />
              </mesh>
            )}
            {isMesh(nodes.clip) && (
              <mesh geometry={nodes.clip.geometry}>
                <meshPhysicalMaterial color="#B8BEC7" metalness={1} reflectivity={0.5} roughness={0.35} />
              </mesh>
            )}
            {isMesh(nodes.clamp) && (
              <mesh geometry={nodes.clamp.geometry}>
                <meshPhysicalMaterial color="#B8BEC7" metalness={1} reflectivity={0.5} roughness={0.35} />
              </mesh>
            )}
          </group>
        </RigidBody>
      </group>
      <mesh ref={band} renderOrder={1}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#c8d2dc"
          depthTest
          depthWrite={false}
          lineWidth={lineWidth}
          map={bandTexture}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          repeat={new THREE.Vector2(-3, 1)}
          resolution={new THREE.Vector2(2, 1)}
          useMap={1}
        />
      </mesh>
    </>
  );
}
