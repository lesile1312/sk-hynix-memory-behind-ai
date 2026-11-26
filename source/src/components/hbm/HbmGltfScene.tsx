/**
 * HBM 展示场景 —— 使用离线 PBR GLB 模型作为视觉主体。
 *
 * 模型来源：AI 生成的高精度 PBR 封装模型（非 SK hynix 实际产品数据），
 * 经 2048 JPEG 贴图压缩和按 Z 轴分层后放入 public/models/hbm_package_web.glb。
 * 这里不做几何体堆砌：所有层、凸点、走线、焊球质感都来自模型本身的 PBR 贴图。
 *
 * 交互沿用原展示模块：
 *  full    完整视图，缓慢自转
 *  explode 各层沿封装厚度方向分离
 *  section 真实裁剪平面切开一半
 *  点击任一结构层 -> 右侧 Selected Structure 同步，镜头推近该层
 */
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { StructureId } from './model';

export type ViewMode = 'full' | 'explode' | 'section' | 'micro';

interface Props {
  mode: ViewMode;
  focus: StructureId | null;
  onSelect: (id: StructureId) => void;
  onClearFocus: () => void;
  active: boolean;
  reduced: boolean;
  onReady?: () => void;
  className?: string;
}

const MODEL_URL = `${import.meta.env.BASE_URL}models/hbm_package_web.glb`;
const SCALE = 3;
const STACK_CENTER_Z = -0.29;
const ICE = new THREE.Color('#6fb7e8');

/** GLB 节点名 -> 右侧结构面板 id。生成模型没有独立的中介层/通孔网格，
 *  这几项映射到它们在封装里最靠近的可见层，避免编造不存在的几何。 */
const LAYER_TO_STRUCTURE: Record<string, StructureId> = {
  hbm_substrate: 'substrate',
  hbm_logic_die: 'logic',
  hbm_dram_lower: 'dram',
  hbm_dram_middle: 'dram',
  hbm_dram_upper: 'dram',
  hbm_cap: 'package',
};

const STRUCTURE_TO_LAYERS: Record<StructureId, string[]> = {
  package: ['hbm_cap'],
  dram: ['hbm_dram_lower', 'hbm_dram_middle', 'hbm_dram_upper'],
  tsv: ['hbm_dram_middle'],
  bump: ['hbm_dram_lower'],
  logic: ['hbm_logic_die'],
  interposer: ['hbm_logic_die'],
  substrate: ['hbm_substrate'],
};

/** 镜头推近位置（模型原始 Z，旋转后即世界 Y） */
const FOCUS_Z: Record<StructureId, number> = {
  package: -0.59,
  dram: -0.32,
  tsv: -0.32,
  bump: -0.21,
  logic: -0.1,
  interposer: -0.04,
  substrate: -0.04,
};

/** 生成模型 Z=0 是基板，-Z 方向往上堆叠；旋转后世界 Y = -Z × SCALE */
const worldY = (z: number) => -z * SCALE;

const DIR = new THREE.Vector3(0.55, 0.28, 1).normalize();
const SECTION_DIR = new THREE.Vector3(0.28, 0.12, 1).normalize();

export default function HbmGltfScene({ mode, focus, onSelect, onClearFocus, active, reduced, onReady, className }: Props) {
  return (
    <Canvas
      className={className}
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      shadows={false}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [2.9, 1.15, 3.9], fov: 28, near: 0.05, far: 80 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onPointerMissed={() => onClearFocus()}
      onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.86;
      gl.localClippingEnabled = true;
    }}
  >
    <Scene mode={mode} focus={focus} onSelect={onSelect} reduced={reduced} onReady={onReady} />
    </Canvas>
  );
}

function Scene({ mode, focus, onSelect, reduced, onReady }: {
  mode: ViewMode;
  focus: StructureId | null;
  onSelect: (id: StructureId) => void;
  reduced: boolean;
  onReady?: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const gltf = useGLTF(MODEL_URL);
  const [hovered, setHovered] = useState<StructureId | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  /** 每个 GLB 节点单独克隆材质：剖面裁剪与结构高亮只影响对应层 */
  const layers = useMemo(() => {
    const list: { name: string; mesh: THREE.Mesh; centerZ: number; base: THREE.MeshStandardMaterial }[] = [];
    Object.keys(LAYER_TO_STRUCTURE).forEach((name) => {
      const node = gltf.scene.getObjectByName(name);
      if (!node || !(node instanceof THREE.Mesh)) return;
      const cloned = (node.material as THREE.MeshStandardMaterial).clone();
      cloned.emissive = new THREE.Color(0x000000);
      cloned.emissiveIntensity = 0;
      /* 生成模型本身是黑色高光封装，环境反射压低一点才不会被照成银色塑料 */
      cloned.envMapIntensity = 0.55;
      node.material = cloned;
      list.push({
        name,
        mesh: node,
        centerZ: typeof node.userData.centerZ === 'number' ? node.userData.centerZ : STACK_CENTER_Z,
        base: cloned,
      });
    });
    return list;
  }, [gltf.scene]);

  useEffect(() => {
    return () => layers.forEach((l) => l.base.dispose());
  }, [layers]);

  /* 裁剪平面数量变化会切换 shader，必须显式标记材质更新 */
  useEffect(() => {
    layers.forEach(({ base }) => {
      base.clippingPlanes = mode === 'section' ? [plane] : [];
      base.needsUpdate = true;
    });
  }, [layers, mode, plane]);

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }, [hovered, gl]);

  const activeId = focus ?? (mode === 'micro' ? 'bump' : null) ?? hovered;
  const explodeRef = useRef(0);
  const frames = useRef(0);
  const readyFired = useRef(false);

  useFrame((_, dt) => {
    if (!readyFired.current) {
      frames.current += 1;
      if (frames.current >= 3) {
        readyFired.current = true;
        onReady?.();
      }
    }

    const target = mode === 'explode' ? 1 : 0;
    explodeRef.current += (target - explodeRef.current) * Math.min(1, dt * 3);
    const k = Math.min(1, dt * 8);

    layers.forEach(({ name, mesh, centerZ, base }) => {
      /* 原模型层间本来就有间隙；爆炸视图在这个基础上继续拉开。 */
      mesh.position.z = (centerZ - STACK_CENTER_Z) * explodeRef.current * 1.25;

      const on = activeId ? STRUCTURE_TO_LAYERS[activeId].includes(name) : false;
      base.emissiveIntensity += ((on ? 0.16 : 0) - base.emissiveIntensity) * k;
      const goal = on ? ICE : BLACK;
      base.emissive.lerp(goal, k);
    });
  });

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[4, 6, 5]} intensity={1.35} color="#f2f7fc" />
      <directionalLight position={[-5, 3, -4]} intensity={0.9} color="#9ccbeb" />
      <directionalLight position={[3, -2, 4]} intensity={0.45} color="#e0a56b" />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#10151a']} />
        <Lightformer form="rect" intensity={1.4} position={[0, 5, 3]} scale={[9, 5, 1]} target={[0, 0, 0]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.9} position={[-6, 2, -5]} scale={[7, 7, 1]} target={[0, 0, 0]} color="#a8d4f2" />
        <Lightformer form="rect" intensity={1.1} position={[6, 1, -4]} scale={[6, 6, 1]} target={[0, 0, 0]} color="#ffbd7f" />
        <Lightformer form="rect" intensity={4.2} position={[-4, 1.2, -7]} scale={[14, 0.6, 1]} target={[0, 0, 0]} color="#e8f5ff" />
        <Lightformer form="rect" intensity={1.6} position={[5, 0.9, -6]} scale={[10, 0.5, 1]} target={[0, 0, 0]} color="#ffd4a8" />
      </Environment>

      <group
        scale={SCALE}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          const id = LAYER_TO_STRUCTURE[e.object.name];
          if (id) onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          const id = LAYER_TO_STRUCTURE[e.object.name];
          if (id) setHovered(id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(null);
        }}
      >
        <primitive object={gltf.scene} />
      </group>

      <ContactShadows
        position={[0, -0.12, 0]}
        scale={9}
        resolution={256}
        blur={2.6}
        opacity={0.55}
        far={5}
        color="#000000"
        frames={Infinity}
      />

      <Rig mode={mode} focus={focus} reduced={reduced} />
    </>
  );
}

const BLACK = new THREE.Color(0x000000);

/** 镜头：默认全景；选择结构或切换视图时平滑推近；其余时间把控制权交还用户 */
function Rig({ mode, focus, reduced }: { mode: ViewMode; focus: StructureId | null; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as any;
  const size = useThree((s) => s.size);
  const anim = useRef({
    t: 1,
    fromP: new THREE.Vector3(),
    toP: new THREE.Vector3(),
    fromT: new THREE.Vector3(),
    toT: new THREE.Vector3(),
  });

  useEffect(() => {
    const a = anim.current;
    const ar = size.width / Math.max(1, size.height);
    const k = THREE.MathUtils.clamp(1.25 / ar, 1, 1.5);
    const micro = mode === 'micro';
    const targetId = micro ? 'bump' : focus;
    const center = new THREE.Vector3(
      micro ? 0.42 : 0,
      worldY(targetId ? FOCUS_Z[targetId] : STACK_CENTER_Z),
      micro ? 0.42 : 0,
    );
    const dist = (
      micro ? 2.2 : targetId ? 4.0 : mode === 'explode' ? 10.5 : mode === 'section' ? 5.4 : 6.2
    ) * k;
    a.fromP.copy(camera.position);
    a.fromT.copy(controls?.target ?? new THREE.Vector3(0, worldY(STACK_CENTER_Z), 0));
    a.toT.copy(center);
    a.toP.copy(center).addScaledVector(mode === 'section' && !targetId ? SECTION_DIR : DIR, dist);
    if (mode === 'explode' && !targetId) a.toP.y += 0.8;
    a.t = 0;
    if (controls) controls.autoRotate = false;
  }, [focus, mode, camera, controls, size.width, size.height]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!controls) return;
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt / 1);
      const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
      camera.position.lerpVectors(a.fromP, a.toP, e);
      controls.target.lerpVectors(a.fromT, a.toT, e);
      controls.update();
    } else {
      controls.autoRotate = !reduced && mode === 'full' && !focus;
    }
  });

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.07}
      enablePan={false}
      autoRotateSpeed={0.5}
      minDistance={1.4}
      maxDistance={14}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2.03}
      target={[0, worldY(STACK_CENTER_Z), 0]}
    />
  );
}
