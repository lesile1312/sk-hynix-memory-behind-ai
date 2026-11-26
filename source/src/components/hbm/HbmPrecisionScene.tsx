/**
 * HBM 精细工程展示场景
 *
 * 方案：保留原 PBR GLB 的基板与逻辑层（贴图质感最好），
 * 用程序化几何重建 DRAM 逐层晶粒 / TSV 铜柱阵列 / 微凸点阵列 / 贴合封盖。
 * 所有结构均为工程示意，不代表 SK hynix 实际产品或实测尺寸。
 *
 * 层次（世界坐标 Y 向上，单位与相机取景兼容）：
 *   substrate(保留GLB) → logic(保留GLB) → 8×DRAM die → cap
 */
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  /** PART 05：结构扫描模式（纯视觉示意，不代表真实检测） */
  scan?: boolean;
  onReady?: () => void;
  className?: string;
}

const MODEL_URL = `${import.meta.env.BASE_URL}models/hbm_package_web.glb`;
const SCALE = 3;
const ICE = new THREE.Color('#6fb7e8');
const BLACK = new THREE.Color(0x000000);

/* ---------- 布局常量 ---------- */
const DIE_COUNT = 8;                 // 工程示意：主流 HBM 常见 8 层堆叠
const DIE_W = 1.62;                  // die 平面尺寸
const DIE_T = 0.082;                 // die 厚度
const DIE_GAP = 0.052;               // 层间距（容纳微凸点）
const STACK_BOTTOM = 0.44;           // 堆叠起始 Y（logic die 之上）
const STACK_TOP = STACK_BOTTOM + DIE_COUNT * (DIE_T + DIE_GAP);
const CAP_Y = STACK_TOP + 0.10;
const CENTER_Y = (STACK_BOTTOM + CAP_Y) / 2;

const dieY = (i: number) => STACK_BOTTOM + i * (DIE_T + DIE_GAP) + DIE_T / 2;
/* 爆炸位移：全部向上分离，底层不动，避免最下层穿到基板下方 */
const layerOffset = (i: number) => i * 0.27;

/* TSV：每层 6 根铜柱，沿 die 前缘排列（参考图特征，边缘可见） */
const TSV_POSITIONS: [number, number][] = [
  [-0.62, 0.72], [-0.37, 0.72], [-0.12, 0.72],
  [0.13, 0.72], [0.38, 0.72], [0.63, 0.72],
];
/* 微凸点：沿 die 边缘一圈，每层 32 个 */
const BUMP_POSITIONS = (() => {
  const pts: [number, number][] = [];
  const half = DIE_W / 2 - 0.075;
  const perSide = 8;
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < perSide; k++) {
      const t = -half + (2 * half * k) / (perSide - 1);
      if (s === 0) pts.push([t, -half]);
      if (s === 1) pts.push([t, half]);
      if (s === 2) pts.push([-half, t]);
      if (s === 3) pts.push([half, t]);
    }
  }
  return pts;
})();

const DIR = new THREE.Vector3(0.55, 0.28, 1).normalize();
const SECTION_DIR = new THREE.Vector3(0.28, 0.12, 1).normalize();

/** 结构 id → Y 焦点（Macro Inspection 用） */
const FOCUS_Y: Record<StructureId, number> = {
  package: CAP_Y,
  dram: dieY(4),
  tsv: dieY(3),
  bump: dieY(5) - DIE_GAP / 2,
  logic: 0.29,
  interposer: 0.20,
  substrate: 0.11,
};

export default function HbmPrecisionScene({ mode, focus, onSelect, onClearFocus, active, reduced, scan = false, onReady, className }: Props) {
  return (
    <Canvas
      className={className}
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      shadows={false}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [2.9, 1.35, 3.9], fov: 28, near: 0.05, far: 80 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onPointerMissed={() => onClearFocus()}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.92;
        gl.localClippingEnabled = true;
      }}
    >
      <Scene mode={mode} focus={focus} onSelect={onSelect} reduced={reduced} scan={scan} onReady={onReady} />
    </Canvas>
  );
}

function Scene({ mode, focus, onSelect, reduced, scan, onReady }: {
  mode: ViewMode;
  focus: StructureId | null;
  onSelect: (id: StructureId) => void;
  reduced: boolean;
  scan: boolean;
  onReady?: () => void;
}) {
  const gltf = useGLTF(MODEL_URL);
  const [hovered, setHovered] = useState<StructureId | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);
  const activeId = focus ?? (mode === 'micro' ? 'bump' : null) ?? hovered;

  /* 保留 GLB 的基板与逻辑层，隐藏其余（由程序化几何替代） */
  const keptNodes = useRef<THREE.Object3D[]>([]);
  useLayoutEffect(() => {
    const keep = ['hbm_substrate', 'hbm_logic_die'];
    keptNodes.current = [];
    Object.keys(keep).forEach(() => undefined);
    for (const name of keep) {
      const node = gltf.scene.getObjectByName(name);
      if (node) {
        node.visible = true;
        keptNodes.current.push(node);
      }
    }
    for (const name of ['hbm_cap', 'hbm_dram_upper', 'hbm_dram_middle', 'hbm_dram_lower']) {
      const node = gltf.scene.getObjectByName(name);
      if (node) node.visible = false;
    }
    return () => { keptNodes.current = []; };
  }, [gltf.scene]);

  const frames = useRef(0);
  const readyFired = useRef(false);
  useFrame(() => {
    if (readyFired.current) return;
    frames.current += 1;
    if (frames.current >= 3) {
      readyFired.current = true;
      onReady?.();
    }
  });

  const pick = (e: { stopPropagation: () => void }, id: StructureId) => {
    e.stopPropagation();
    onSelect(id);
  };

  /* PART 05 鼠标视差：模型组随指针轻微倾斜， OrbitControls 仍负责主动拖拽/自转，
     两者作用于不同对象（group vs camera），不会争抢同一属性。 */
  const tiltRef = useRef<THREE.Group>(null);
  useFrame(({ pointer }, dt) => {
    if (!tiltRef.current || reduced) return;
    const k = Math.min(1, dt * 3);
    tiltRef.current.rotation.x += (-pointer.y * 0.055 - tiltRef.current.rotation.x) * k;
    tiltRef.current.rotation.z += (pointer.x * 0.045 - tiltRef.current.rotation.z) * k;
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color="#f2f7fc" />
      <directionalLight position={[-5, 3, -4]} intensity={1.0} color="#9ccbeb" />
      <directionalLight position={[3, -2, 4]} intensity={0.5} color="#e0a56b" />
      <directionalLight position={[0, -4, 2]} intensity={0.35} color="#bcd8ef" />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0d1216']} />
        <Lightformer form="rect" intensity={1.5} position={[0, 5, 3]} scale={[9, 5, 1]} target={[0, 0, 0]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.8} position={[-6, 2, -5]} scale={[7, 7, 1]} target={[0, 0, 0]} color="#a8d4f2" />
        <Lightformer form="rect" intensity={1.0} position={[6, 1, -4]} scale={[6, 6, 1]} target={[0, 0, 0]} color="#ffbd7f" />
        <Lightformer form="rect" intensity={3.6} position={[-4, 1.2, -7]} scale={[14, 0.6, 1]} target={[0, 0, 0]} color="#e8f5ff" />
        <Lightformer form="rect" intensity={1.4} position={[5, 0.9, -6]} scale={[10, 0.5, 1]} target={[0, 0, 0]} color="#ffd4a8" />
      </Environment>

      {/* PART 05 模型组：承载鼠标视差倾斜，不改相机也不改物理 */}
      <group ref={tiltRef}>
        {/* 保留的 GLB 基板/逻辑层：旋转与缩放沿用原场景 */}
        <group
          scale={SCALE}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => pick(e, 'substrate')}
          onPointerOver={(e) => { e.stopPropagation(); setHovered('substrate'); }}
          onPointerOut={() => setHovered(null)}
        >
          <primitive object={gltf.scene} />
        </group>

        {/* 程序化 DRAM 堆叠 */}
        <DramStack
          mode={mode}
          activeId={activeId}
          plane={plane}
          scan={scan}
          onSelect={onSelect}
          onHover={setHovered}
        />

        {/* 贴合封盖，选中 package 时高亮 */}
        <Cap mode={mode} focused={activeId === 'package'} onSelect={onSelect} />
      </group>

      {/* PART 05 SCAN：冰蓝扫描线沿封装表面缓慢移动，经过结构时短暂高亮（纯视觉示意） */}
      {scan && <ScanSweep plane={plane} />}

      <ContactShadows position={[0, -0.16, 0]} scale={9} resolution={256} blur={2.6}
                      opacity={0.55} far={5} color="#000000" frames={Infinity} />

      <Rig mode={mode} focus={focus} reduced={reduced} />
    </>
  );
}

/* ---------- DRAM 逐层晶粒 + TSV + 微凸点 ---------- */
function DramStack({ mode, activeId, plane, scan, onSelect, onHover }: {
  mode: ViewMode;
  activeId: StructureId | null;
  plane: THREE.Plane;
  scan: boolean;
  onSelect: (id: StructureId) => void;
  onHover: (id: StructureId | null) => void;
}) {
  const explode = useRef(0);
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const dieMatRefs = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const edgeMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  const dieSelected = activeId === 'dram' || activeId === 'tsv' || activeId === 'bump';
  const tsvSelected = activeId === 'tsv';
  const bumpSelected = activeId === 'bump';

  const scanT = useRef(0);
  useFrame((state, dt) => {
    const target = mode === 'explode' ? 1 : 0;
    explode.current += (target - explode.current) * Math.min(1, dt * 3.2);
    const k = Math.min(1, dt * 8);

    /* PART 05 扫描进度：SCAN 开启时沿堆叠自下而上循环，经过某层则该层短暂高亮 */
    if (scan) scanT.current = (scanT.current + dt / 2.6) % 1;
    const scanY = STACK_BOTTOM - 0.15 + scanT.current * (STACK_TOP - STACK_BOTTOM + 0.35);

    groupRefs.current.forEach((g, i) => {
      if (!g) return;
      /* PART 05 爆炸：各层依次分离，顶层先走、底层慢半拍，避免整体齐刷刷平移 */
      const delay = (DIE_COUNT - 1 - i) * 0.055;
      const p = THREE.MathUtils.clamp((explode.current - delay) / (1 - delay), 0, 1);
      const eased = p * p * (3 - 2 * p);
      g.position.y = dieY(i) + layerOffset(i) * 0.42 * eased;

      const dm = dieMatRefs.current[i];
      const em = edgeMatRefs.current[i];
      const scanned = scan && Math.abs(dieY(i) + layerOffset(i) * 0.42 * eased - scanY) < 0.14;
      if (dm) {
        const on = scanned ? 0.32 : dieSelected ? 0.14 : tsvSelected ? 0.06 : 0;
        dm.emissiveIntensity += (on - dm.emissiveIntensity) * k;
        dm.emissive.lerp(on ? ICE : BLACK, k);
      }
      if (em) {
        const on = scanned ? 0.34 : bumpSelected ? 0.22 : 0;
        em.emissiveIntensity += (on - em.emissiveIntensity) * k;
        em.emissive.lerp(on ? ICE : BLACK, k);
      }
    });
  });

  return (
    <group>
      {Array.from({ length: DIE_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => { groupRefs.current[i] = el; }}
          position={[0, dieY(i), 0]}
          onClick={(e) => { e.stopPropagation(); onSelect('dram'); }}
          onPointerOver={(e) => { e.stopPropagation(); onHover('dram'); }}
          onPointerOut={() => onHover(null)}
        >
          {/* 晶粒本体：圆角薄片，深石墨硅色 */}
          <RoundedBox args={[DIE_W, DIE_T, DIE_W]} radius={0.012} smoothness={3}>
            <meshPhysicalMaterial
              ref={(m) => { dieMatRefs.current[i] = m; }}
              color="#272b32"
              metalness={0.55}
              roughness={0.42}
              clearcoat={0.32}
              clearcoatRoughness={0.5}
              clippingPlanes={mode === 'section' ? [plane] : []}
              emissive={BLACK}
              emissiveIntensity={0}
            />
          </RoundedBox>

          {/* 晶粒边缘金属化：金色细边，制造真实层厚 */}
          <RoundedBox args={[DIE_W + 0.012, 0.018, DIE_W + 0.012]} radius={0.006} smoothness={2}
                      position={[0, -DIE_T / 2 + 0.006, 0]}>
            <meshStandardMaterial
              ref={(m) => { edgeMatRefs.current[i] = m; }}
              color="#bf9a58"
              metalness={0.95}
              roughness={0.28}
              clippingPlanes={mode === 'section' ? [plane] : []}
              emissive={BLACK}
              emissiveIntensity={0}
            />
          </RoundedBox>

          {/* 微凸点阵列：银色小球，层间连接 */}
          <BumpRing
            mode={mode}
            plane={plane}
            onSelect={onSelect}
            onHover={onHover}
          />

          {/* TSV 铜柱：每层 4 根，贯穿晶粒 */}
          {TSV_POSITIONS.map(([x, z], k) => (
            <mesh key={k} position={[x, 0, z]}
                  onClick={(e) => { e.stopPropagation(); onSelect('tsv'); }}
                  onPointerOver={(e) => { e.stopPropagation(); onHover('tsv'); }}
                  onPointerOut={() => onHover(null)}>
              <cylinderGeometry args={[0.03, 0.03, DIE_T + DIE_GAP + 0.05, 12]} />
              <meshStandardMaterial color="#d69a52" metalness={0.9} roughness={0.32}
                                    emissive="#4a2a0c" emissiveIntensity={0.18}
                                    clippingPlanes={mode === 'section' ? [plane] : []} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** 微凸点环：实例化渲染，一次性写入矩阵 */
function BumpRing({ mode, plane, onSelect, onHover }: {
  mode: ViewMode;
  plane: THREE.Plane;
  onSelect: (id: StructureId) => void;
  onHover: (id: StructureId | null) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const y = -DIE_T / 2 - 0.012;
    BUMP_POSITIONS.forEach(([x, z], i) => {
      m.makeTranslation(x, y, z);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, BUMP_POSITIONS.length]}
      onClick={(e) => { e.stopPropagation(); onSelect('bump'); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover('bump'); }}
      onPointerOut={() => onHover(null)}
    >
      <sphereGeometry args={[0.028, 10, 8]} />
      <meshStandardMaterial color="#dfe5ec" metalness={1} roughness={0.2}
                            clippingPlanes={mode === 'section' ? [plane] : []} />
    </instancedMesh>
  );
}

/* ---------- PART 05 SCAN：结构扫描线（纯视觉示意，不代表真实检测） ---------- */
function ScanSweep({ plane }: { plane: THREE.Plane }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current = (t.current + dt / 2.6) % 1;
    if (ref.current) ref.current.position.y = STACK_BOTTOM - 0.15 + t.current * (STACK_TOP - STACK_BOTTOM + 0.35);
    if (matRef.current) matRef.current.opacity = Math.sin(t.current * Math.PI) * 0.75;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[DIE_W + 0.42, DIE_W + 0.42]} />
      <meshBasicMaterial
        ref={matRef}
        color="#9ccbeb"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        clippingPlanes={plane ? [plane] : []}
      />
    </mesh>
  );
}

/* ---------- 贴合封盖：深石墨金属，带丝印标识 ---------- */
function Cap({ mode, focused, onSelect }: { mode: ViewMode; focused: boolean; onSelect: (id: StructureId) => void }) {
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  /* 丝印纹理：概念示意标识，不冒充真实产品 */
  const printTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = 'rgba(244,241,234,0.98)';
    ctx.font = '600 78px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HBM', 256, 250);
    ctx.fillStyle = 'rgba(184,190,199,0.85)';
    ctx.font = '500 26px Arial';
    ctx.fillText('CONCEPT MODEL', 256, 298);
    ctx.strokeStyle = 'rgba(156,203,235,0.72)';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 168, 352, 172);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  useFrame((_, dt) => {
    if (!matRef.current) return;
    const goal = focused ? 0.12 : 0;
    matRef.current.emissiveIntensity += (goal - matRef.current.emissiveIntensity) * Math.min(1, dt * 8);
  });

  const lift = mode === 'explode' ? 0.95 : 0;

  return (
    <group position={[0, CAP_Y + lift, 0]}
           onClick={(e) => { e.stopPropagation(); onSelect('package'); }}>
      {/* 封盖本体：贴合堆叠、深石墨色、真实厚度与倒角 */}
      <RoundedBox args={[DIE_W + 0.16, 0.14, DIE_W + 0.16]} radius={0.018} smoothness={4}>
        <meshPhysicalMaterial
          ref={matRef}
          color="#15171b"
          metalness={0.6}
          roughness={0.46}
          clearcoat={0.2}
          clearcoatRoughness={0.6}
          envMapIntensity={0.35}
          clippingPlanes={mode === 'section' ? [plane] : []}
          emissive={ICE}
          emissiveIntensity={0}
        />
      </RoundedBox>
      {/* 顶面丝印 */}
      <mesh position={[0, 0.077, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.25, 1.25]} />
        <meshBasicMaterial map={printTexture} transparent depthWrite={false}
                           clippingPlanes={mode === 'section' ? [plane] : []} />
      </mesh>
      {/* 金属细边：顶部倒角高光 */}
      <RoundedBox args={[DIE_W + 0.17, 0.02, DIE_W + 0.17]} radius={0.008} smoothness={2}
                  position={[0, 0.062, 0]}>
        <meshStandardMaterial color="#5a6069" metalness={0.9} roughness={0.38}
                              envMapIntensity={0.5}
                              clippingPlanes={mode === 'section' ? [plane] : []} />
      </RoundedBox>
    </group>
  );
}

/* ---------- 相机：四视图 + Macro Inspection ---------- */
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

  useLayoutEffect(() => {
    const a = anim.current;
    const ar = size.width / Math.max(1, size.height);
    const k = THREE.MathUtils.clamp(1.25 / ar, 1, 1.5);
    const micro = mode === 'micro';
    const targetId = micro ? 'bump' : focus;
    const center = new THREE.Vector3(
      micro ? 0.62 : 0,
      targetId ? FOCUS_Y[targetId] : CENTER_Y,
      micro ? 0.62 : 0,
    );
    const dist = (
      micro ? 1.85 : targetId ? 3.1 : mode === 'explode' ? 8.2 : mode === 'section' ? 4.6 : 5.4
    ) * k;
    a.fromP.copy(camera.position);
    a.fromT.copy(controls?.target ?? new THREE.Vector3(0, CENTER_Y, 0));
    a.toT.copy(center);
    a.toP.copy(center).addScaledVector(mode === 'section' && !targetId ? SECTION_DIR : DIR, dist);
    if (mode === 'explode' && !targetId) a.toP.y += 0.6;
    a.t = 0;
    if (controls) controls.autoRotate = false;
  }, [focus, mode, camera, controls, size.width, size.height]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!controls) return;
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt / 1.05);
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
      minDistance={1.2}
      maxDistance={14}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2.03}
      target={[0, CENTER_Y, 0]}
    />
  );
}
