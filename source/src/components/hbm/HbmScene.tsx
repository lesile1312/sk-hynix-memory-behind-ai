/**
 * HBM 封装 3D 模型（React Three Fiber）
 *
 * 构成：封装基板 + C4 焊球 + 硅中介层 + 逻辑芯片 + 12 层 DRAM 晶粒（层间微凸点 + 铜缝）
 *       + 模塑顶盖 + 硅通孔。全部为程序化几何 + 程序化贴图，无外部模型文件。
 *
 * 声明：这是**结构示意**，尺寸按公开封装剖面的量级取整，不对应任何具体型号；
 *      纵向为便于观察做了放大（见 model.ts 的 YS），界面文案已注明。
 *
 * 三种视图：
 *  full    完整封装，缓慢自转，可拖拽/缩放
 *  explode 各层沿 Y 轴分离（间距大于层厚，不会互相穿插）
 *  section 用真实裁剪平面切开，并给每层加切面（不是拿黑块挡模型）
 */
import { OrbitControls, Environment, Lightformer, ContactShadows, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  BUMP_R,
  BUMP_SQUASH,
  FOOT,
  HGT,
  LAYOUT,
  STRUCTURE_MAP,
  type StructureId,
} from './model';
import {
  capTexture,
  dieCapTexture,
  dieTopTexture,
  interposerTexture,
  substrateTexture,
} from './textures';

export type ViewMode = 'full' | 'explode' | 'section';

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

const ICE = new THREE.Color('#9ccbeb');

export default function HbmScene({ mode, focus, onSelect, onClearFocus, active, reduced, onReady, className }: Props) {
  return (
    <Canvas
      className={className}
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      shadows={false}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [26.4, 13.2, 42.6], fov: 22, near: 0.5, far: 180 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onPointerMissed={() => onClearFocus()}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
        gl.localClippingEnabled = true;
      }}
    >
      <Scene mode={mode} focus={focus} onSelect={onSelect} onClearFocus={onClearFocus} reduced={reduced} onReady={onReady} />
    </Canvas>
  );
}

/* ------------------------------------------------------------------ 场景 */
function Scene({
  mode,
  focus,
  onSelect,
  onClearFocus,
  reduced,
  onReady,
}: {
  mode: ViewMode;
  focus: StructureId | null;
  onSelect: (id: StructureId) => void;
  onClearFocus: () => void;
  reduced: boolean;
  onReady?: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const [hovered, setHovered] = useState<StructureId | null>(null);

  /* 裁切平面：normal 指向 +z，保留 z < 0 的一半；切面关闭时把 constant 推远即可，
     不换材质实例，避免每帧重编译 shader */
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000), []);
  useEffect(() => {
    plane.constant = mode === 'section' ? 0 : 1000;
  }, [mode, plane]);

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }, [hovered, gl]);

  const tex = useMemo(
    () => ({
      substrate: substrateTexture(),
      interposer: interposerTexture(),
      dieTop: dieTopTexture(),
      cap: capTexture(),
      dieCap: dieCapTexture(5, 5),
    }),
    [],
  );

  const mats = useMemo(() => {
    const clip = [plane];
    return {
      substrate: new THREE.MeshStandardMaterial({
        map: tex.substrate,
        metalnessMap: tex.substrate,
        bumpMap: tex.substrate,
        bumpScale: 0.1,
        metalness: 0.88,
        roughness: 0.62,
        color: 0xffffff,
        envMapIntensity: 0.85,
        clippingPlanes: clip,
      }),
      interposer: new THREE.MeshStandardMaterial({
        map: tex.interposer,
        bumpMap: tex.interposer,
        bumpScale: 0.05,
        metalness: 0.34,
        roughness: 0.44,
        color: 0xffffff,
        envMapIntensity: 1.1,
        clippingPlanes: clip,
      }),
      logic: new THREE.MeshStandardMaterial({
        map: tex.dieTop,
        bumpMap: tex.dieTop,
        bumpScale: 0.05,
        metalness: 0.62,
        roughness: 0.46,
        color: 0xffffff,
        envMapIntensity: 1,
        clippingPlanes: clip,
      }),
      dieTop: new THREE.MeshStandardMaterial({
        map: tex.dieTop,
        bumpMap: tex.dieTop,
        bumpScale: 0.04,
        metalness: 0.24,
        roughness: 0.55,
        color: 0xffffff,
        envMapIntensity: 0.7,
        clippingPlanes: clip,
      }),
      dieSide: new THREE.MeshStandardMaterial({
        color: 0x232a31,
        metalness: 0.14,
        roughness: 0.72,
        envMapIntensity: 0.28,
        clippingPlanes: clip,
        side: THREE.DoubleSide,
      }),
      cap: new THREE.MeshStandardMaterial({
        map: tex.cap,
        bumpMap: tex.cap,
        bumpScale: 0.02,
        metalness: 0.34,
        roughness: 0.52,
        color: 0x9aa3ab,
        envMapIntensity: 0.7,
        clippingPlanes: clip,
      }),
      seam: new THREE.MeshStandardMaterial({
        color: 0xc99a63,
        metalness: 1,
        roughness: 0.3,
        emissive: new THREE.Color('#a85f18'),
        emissiveIntensity: 0.5,
        envMapIntensity: 1.6,
        clippingPlanes: clip,
      }),
      bump: new THREE.MeshStandardMaterial({
        color: 0xc3ccd6,
        metalness: 1,
        roughness: 0.26,
        envMapIntensity: 1.3,
        clippingPlanes: clip,
      }),
      tsv: new THREE.MeshStandardMaterial({
        color: 0xd39a58,
        metalness: 1,
        roughness: 0.22,
        emissive: new THREE.Color('#8a4c14'),
        emissiveIntensity: 0.6,
        envMapIntensity: 1.5,
        clippingPlanes: clip,
        side: THREE.DoubleSide,
      }),
      cut: new THREE.MeshStandardMaterial({
        map: tex.dieCap,
        metalness: 0.3,
        roughness: 0.75,
        color: 0x7a838c,
      }),
      cutPlain: new THREE.MeshStandardMaterial({ color: 0x272f37, metalness: 0.35, roughness: 0.66 }),
      ball: new THREE.MeshStandardMaterial({
        color: 0xe2e9f0,
        metalness: 1,
        roughness: 0.1,
        envMapIntensity: 2,
        clippingPlanes: clip,
      }),
    };
  }, [plane, tex]);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  /* 高亮：按结构对应到材质，记录各自的底色（铜缝与通孔自带微暖光），
     高亮时向冰蓝靠拢，取消后回到原色，避免把暖色底光一起抹掉 */
  const baseEmissive = useMemo(() => {
    const map = new Map<THREE.MeshStandardMaterial, { color: THREE.Color; intensity: number }>();
    Object.values(mats).forEach((m) => {
      /* 大多数材质 emissive 是黑的、emissiveIntensity 却是默认 1；
         直接拿 1 当底数会在高亮时把整块面打成白色，这里按实际有无自发光归零 */
      const color = m.emissive.clone();
      map.set(m, { color, intensity: color.getHex() === 0 ? 0 : m.emissiveIntensity });
    });
    return map;
  }, [mats]);

  const hlMap: Record<StructureId, THREE.MeshStandardMaterial[]> = useMemo(
    () => ({
      package: [mats.cap],
      dram: [mats.dieTop, mats.dieSide],
      tsv: [mats.tsv],
      bump: [mats.bump, mats.seam],
      logic: [mats.logic],
      interposer: [mats.interposer],
      substrate: [mats.substrate],
    }),
    [mats],
  );

  const HL_GAIN: Record<StructureId, number> = useMemo(
    () => ({ package: 0.08, dram: 0.09, tsv: 0.22, bump: 0.3, logic: 0.11, interposer: 0.12, substrate: 0.11 }),
    [],
  );

  useFrame((_, dt) => {
    const activeId = focus ?? hovered;
    const k = Math.min(1, dt * 9);
    Object.entries(hlMap).forEach(([id, list]) => {
      const on = activeId === id;
      const gain = HL_GAIN[id as StructureId] ?? 0.12;
      list.forEach((mat) => {
        const base = baseEmissive.get(mat);
        if (!base) return;
        mat.emissiveIntensity += (base.intensity + (on ? gain : 0) - mat.emissiveIntensity) * k;
        /* 本身带自发光的（铜缝、通孔）保留暖色，只提亮；不自发光的硅片才染一层冰蓝 */
        const target = on ? (base.intensity > 0 ? base.color.clone().lerp(ICE, 0.25) : ICE) : base.color;
        mat.emissive.lerp(target, k);
      });
    });
  });

  /* 层组：每个零件一个 ref，统一在 useFrame 里按 explode 进度位移 */
  const parts = useMemo(() => {
    const list: {
      key: string;
      y: number;
      h: number;
      w: number;
      explode: number;
      kind: 'substrate' | 'interposer' | 'logic' | 'die' | 'cap';
      index?: number;
    }[] = [
      { key: 'substrate', y: LAYOUT.substrateCenter, h: HGT.substrate, w: FOOT.substrate, explode: 0, kind: 'substrate' },
      { key: 'interposer', y: LAYOUT.interposerCenter, h: HGT.interposer, w: FOOT.interposer, explode: 0.18, kind: 'interposer' },
      { key: 'logic', y: LAYOUT.logicCenter, h: HGT.logic, w: FOOT.logic, explode: 0.42, kind: 'logic' },
    ];
    for (let i = 0; i < 12; i += 1) {
      list.push({
        key: `die-${i}`,
        y: LAYOUT.dieCenter(i),
        h: HGT.die,
        w: FOOT.die,
        explode: 0.92 + i * 0.42,
        kind: 'die',
        index: i,
      });
    }
    list.push({ key: 'cap', y: LAYOUT.capCenter, h: HGT.cap, w: FOOT.cap, explode: 0.92 + 11 * 0.42 + 0.62, kind: 'cap' });
    return list;
  }, []);

  const partRefs = useRef<(THREE.Group | null)[]>([]);
  const explodeRef = useRef(0);
  const frameCount = useRef(0);
  const readyFired = useRef(false);

  useFrame((_, dt) => {
    if (!readyFired.current) {
      frameCount.current += 1;
      if (frameCount.current >= 3) {
        readyFired.current = true;
        onReady?.();
      }
    }
    const target = mode === 'explode' ? 1 : 0;
    explodeRef.current += (target - explodeRef.current) * Math.min(1, dt * 3.2);
    partRefs.current.forEach((g, i) => {
      if (!g) return;
      const p = parts[i];
      g.position.y = p.y + p.explode * explodeRef.current;
    });
  });

  const section = mode === 'section';

  return (
    <>
      <color attach="background" args={['#050507']} />
      <fog attach="fog" args={['#050507', 42, 78]} />

      <ambientLight intensity={0.22} />
      <directionalLight position={[9, 14, 11]} intensity={2.4} color="#eef4fa" />
      <directionalLight position={[-11, 6, -9]} intensity={2} color="#9ccbeb" />
      <directionalLight position={[7, -6, 8]} intensity={0.8} color="#d9a066" />
      <directionalLight position={[-3, 5, -15]} intensity={1.0} color="#9ccbeb" />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#161c22']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 9, 4]} scale={[14, 8, 1]} target={[0, 0, 0]} color="#ffffff" />
        <Lightformer form="rect" intensity={3.6} position={[-9, 3, -8]} scale={[10, 10, 1]} target={[0, 0, 0]} color="#9ccbeb" />
        <Lightformer form="rect" intensity={2.2} position={[10, 2, -7]} scale={[8, 8, 1]} target={[0, 0, 0]} color="#ffb877" />
        <Lightformer form="rect" intensity={0.9} position={[0, -8, 3]} scale={[16, 10, 1]} target={[0, 0, 0]} color="#2a3742" />
        {/* 一条窄光带：在水平的盖板与基板上留下一道反光，是产品摄影里最省事的「真」 */}
        <Lightformer form="rect" intensity={7} position={[-8, 1.6, -11]} scale={[22, 0.9, 1]} target={[0, 0, 0]} color="#e6f4ff" />
        <Lightformer form="rect" intensity={3} position={[9, 1.2, -9]} scale={[16, 0.7, 1]} target={[0, 0, 0]} color="#ffcf9e" />
      </Environment>

      <group position={[0, 0, 0]}>
        {parts.map((p, i) => (
          <group
            key={p.key}
            ref={(el) => {
              partRefs.current[i] = el;
            }}
            position={[0, p.y, 0]}
          >
            <Part
              part={p}
              mats={mats}
              section={section}
              hovered={hovered}
              tsvOn={focus === 'tsv'}
              onHover={setHovered}
              onSelect={onSelect}
            />
          </group>
        ))}

        {/* C4 焊球（整包底部，跟随基板不动） */}
        <C4Balls mat={mats.ball} onSelect={onSelect} onHover={setHovered} />

        {/* 硅通孔：仅在剖面视图显示，被同一裁剪平面一起切开 */}
        <Tsv mat={mats.tsv} visible={section} />
      </group>

      <ContactShadows
        position={[0, LAYOUT.substrateBottom - 1.1, 0]}
        scale={30}
        resolution={192}
        blur={3}
        opacity={0.62}
        far={9}
        color="#000000"
        frames={Infinity}
      />

      <Rig mode={mode} focus={focus} reduced={reduced} />
    </>
  );
}

/* ------------------------------------------------------------------ 单个零件 */
function Part({
  part,
  mats,
  section,
  hovered,
  tsvOn,
  onHover,
  onSelect,
}: {
  part: { key: string; h: number; w: number; kind: 'substrate' | 'interposer' | 'logic' | 'die' | 'cap'; index?: number };
  mats: Record<string, THREE.MeshStandardMaterial>;
  section: boolean;
  hovered: StructureId | null;
  tsvOn: boolean;
  onHover: (v: StructureId | null) => void;
  onSelect: (id: StructureId) => void;
}) {
  const { h, w, kind } = part;
  const d = w;
  const radius = Math.min(0.05, h * 0.32);

  const handlers = (id: StructureId) => ({
    onPointerOver: (e: any) => {
      e.stopPropagation();
      onHover(id);
    },
    onPointerOut: (e: any) => {
      e.stopPropagation();
      onHover(null);
    },
    onPointerDown: (e: any) => {
      e.stopPropagation();
      onSelect(id);
    },
  });

  if (kind === 'die') {
    return (
      <group {...handlers('dram')}>
        {/* 铜缝：晶粒之间的互连层，比晶粒略小一圈 */}
        <mesh position={[0, -h / 2 - HGT.gap / 2, 0]} material={mats.seam}>
          <boxGeometry args={[d - 0.015, HGT.gap, d - 0.015]} />
        </mesh>
        <mesh material={[mats.dieSide, mats.dieSide, mats.dieTop, mats.dieSide, mats.dieSide, mats.dieSide]}>
          <boxGeometry args={[d, h, d]} />
        </mesh>
        {tsvOn && <TsvMarks size={d} h={h} mat={mats.tsv} />}
        {section && <CutFace w={d} h={h} mat={mats.cut} z={-0.006} />}
        <BumpRing y={-h / 2 - HGT.gap / 2} size={d} mat={mats.bump} onSelect={onSelect} onHover={onHover} />
      </group>
    );
  }

  const map: Record<string, { mat: THREE.MeshStandardMaterial; id: StructureId }> = {
    substrate: { mat: mats.substrate, id: 'substrate' },
    interposer: { mat: mats.interposer, id: 'interposer' },
    logic: { mat: mats.logic, id: 'logic' },
    cap: { mat: mats.cap, id: 'package' },
  };
  const { mat, id } = map[kind];
  const isHovered = hovered === id;

  return (
    <group {...handlers(id)}>
      <RoundedBox args={[d, h, d]} radius={radius} smoothness={3} material={mat} />
      {section && <CutFace w={d} h={h} mat={mats.cutPlain} z={-0.006} />}
      {kind === 'logic' && (
        <BumpRing y={-h / 2 - HGT.gap / 2} size={d} mat={mats.bump} onSelect={onSelect} onHover={onHover} dense />
      )}
      {kind === 'interposer' && (
        <BumpRing y={-h / 2 - HGT.gap / 2} size={d} mat={mats.bump} onSelect={onSelect} onHover={onHover} dense />
      )}
      {isHovered && <EdgeGlow w={d} h={h} />}
    </group>
  );
}

/** 选中 TSV 时，在晶粒被看得到的两个侧面上画出过孔露头，让「垂直互连」看得见 */
function TsvMarks({ size, h, mat }: { size: number; h: number; mat: THREE.Material }) {
  const half = size / 2 + 0.004;
  const cols = [-3.1, -1.55, 0, 1.55, 3.1];
  return (
    <group>
      {cols.map((x) => (
        <mesh key={`z${x}`} position={[x, 0, half]} material={mat}>
          <boxGeometry args={[0.055, h * 1.02, 0.008]} />
        </mesh>
      ))}
      {cols.map((z) => (
        <mesh key={`x${z}`} position={[half, 0, z]} material={mat}>
          <boxGeometry args={[0.008, h * 1.02, 0.055]} />
        </mesh>
      ))}
    </group>
  );
}

/** 切面：贴住裁剪平面的一块薄片，让剖面看起来是实心的 */
function CutFace({ w, h, mat, z }: { w: number; h: number; mat: THREE.Material; z: number }) {
  return (
    <mesh position={[0, 0, z]} material={mat}>
      <planeGeometry args={[w * 0.985, h * 0.985]} />
    </mesh>
  );
}

/** 悬停时的一圈冰蓝描边，提示「可点击」 */
function EdgeGlow({ w, h }: { w: number; h: number }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.004, h * 1.02, w * 1.004)), [w, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#9ccbeb" transparent opacity={0.4} />
    </lineSegments>
  );
}

/* ------------------------------------------------------------------ 微凸点阵列 */
function BumpRing({
  y,
  size,
  mat,
  onSelect,
  onHover,
  dense = false,
}: {
  y: number;
  size: number;
  mat: THREE.Material;
  onSelect: (id: StructureId) => void;
  onHover: (v: StructureId | null) => void;
  dense?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const half = size / 2 - 0.26;
    const step = dense ? 0.4 : 0.52;
    const n = Math.floor((half * 2) / step);
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i += 1) {
      const t = -half + i * step;
      out.push([t, -half], [t, half], [-half, t], [half, t]);
    }
    return out;
  }, [size, dense]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    positions.forEach(([x, z], i) => {
      o.position.set(x, 0, z);
      o.scale.set(1, BUMP_SQUASH, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.count = positions.length;
    m.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, positions.length]}
      material={mat}
      position={[0, y, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover('bump');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect('bump');
      }}
    >
      <sphereGeometry args={[BUMP_R, 6, 4]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ 底部 C4 焊球 */
function C4Balls({
  mat,
  onSelect,
  onHover,
}: {
  mat: THREE.Material;
  onSelect: (id: StructureId) => void;
  onHover: (v: StructureId | null) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 11;
  const pitch = (FOOT.substrate - 2.6) / (n - 1);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (let a = 0; a < n; a += 1) {
      for (let b = 0; b < n; b += 1) {
        if (a > 1 && a < n - 2 && b > 1 && b < n - 2) continue;
        o.position.set(-((n - 1) * pitch) / 2 + a * pitch, 0, -((n - 1) * pitch) / 2 + b * pitch);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        i += 1;
      }
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
  }, [pitch]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, n * n]}
      material={mat}
      position={[0, LAYOUT.substrateBottom - 0.11, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover('substrate');
      }}
      onPointerOut={() => onHover(null)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect('substrate');
      }}
    >
      <sphereGeometry args={[0.2, 12, 10]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ 硅通孔 */
function Tsv({ mat, visible }: { mat: THREE.Material; visible: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const half = 3.1;
  const cols = 5;
  const height = LAYOUT.stackTop - LAYOUT.stackBottom;

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (let a = 0; a < cols; a += 1) {
      for (let b = 0; b < cols; b += 1) {
        if (a === 0 && b === 0) continue;
        const x = -half + (a * (half * 2)) / (cols - 1);
        const z = -half + (b * (half * 2)) / (cols - 1);
        o.position.set(x, 0, z);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        i += 1;
      }
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
  }, [half]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, cols * cols - 1]}
      material={mat}
      position={[0, LAYOUT.stackBottom + height / 2, 0]}
      visible={visible}
    >
      <cylinderGeometry args={[0.048, 0.048, height, 8, 1, true]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ 相机与控制器 */
const DIR = new THREE.Vector3(0.62, 0.31, 1).normalize();
/** 剖面视图压低机位，视线更接近水平，能直接看进切面 */
const SECTION_DIR = new THREE.Vector3(0.5, 0.17, 1).normalize();

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
    const s = focus ? STRUCTURE_MAP[focus] : null;
    const off = s?.focusXZ ?? [0, 0];
    const center = new THREE.Vector3(off[0], s ? s.focusY : LAYOUT.centerY + 0.15, off[1]);
    /* 舞台越窄，同样的镜头就会把芯片切掉两边——按画布宽高比补偿距离 */
    const ar = size.width / Math.max(1, size.height);
    const k = THREE.MathUtils.clamp(1.2 / ar, 1, 1.55);
    const dist = (s ? s.focusDist : mode === 'explode' ? 62 : mode === 'section' ? 40 : 45) * k;
    a.fromP.copy(camera.position);
    a.fromT.copy(controls?.target ?? new THREE.Vector3(0, LAYOUT.centerY, 0));
    a.toT.copy(center);
    a.toP.copy(center).addScaledVector(mode === 'section' ? SECTION_DIR : DIR, dist);
    if (mode === 'explode') a.toP.y += 5.5;
    a.t = 0;
    if (controls) controls.autoRotate = false;
  }, [focus, mode, camera, controls, size.width, size.height]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!controls) return;
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt / 1.05);
      const k = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
      camera.position.lerpVectors(a.fromP, a.toP, k);
      controls.target.lerpVectors(a.fromT, a.toT, k);
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
      autoRotateSpeed={0.55}
      minDistance={8}
      maxDistance={52}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, LAYOUT.centerY, 0]}
    />
  );
}
