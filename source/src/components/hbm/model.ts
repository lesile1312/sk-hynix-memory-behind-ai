/**
 * HBM 封装 3D 模型的尺寸与结构定义
 *
 * 单位：1 = 1 mm。尺寸按公开封装剖面的量级取整（封装约 15 mm 见方、
 * 整包厚度约 1.3 mm），**不是任何具体型号的实测数据**，仅用于结构示意。
 *
 * 厚度按真实比例会薄成一张纸，屏幕上 12 层晶粒根本分不开，
 * 所以所有纵向尺寸统一乘 YS（见下），横向保持原样；界面文案会写明这一点。
 */

/** 纵向放大系数：只作用于高度与层间距，横向尺寸不变 */
export const YS = 2.2;

/** 毫米 → 模型单位（纵向） */
export const Y = (mm: number) => mm * YS;

/* ------------------------------------------------------------ 平面尺寸（mm） */
export const FOOT = {
  substrate: 15,
  interposer: 12.6,
  logic: 9.6,
  die: 9.2,
  cap: 9.44,
} as const;

/* ------------------------------------------------------------ 厚度（模型单位） */
export const HGT = {
  substrate: Y(0.24),
  interposer: Y(0.11),
  logic: Y(0.16),
  die: Y(0.05),
  gap: Y(0.012),
  cap: Y(0.1),
} as const;

/* ------------------------------------------------------------ 竖直布局：基板顶面 = y 0 */
export const LAYOUT = (() => {
  const substrateBottom = -HGT.substrate;
  const interposerBottom = 0;
  const logicBottom = interposerBottom + HGT.interposer;
  const stackBottom = logicBottom + HGT.logic;
  const dieY = (i: number) => stackBottom + i * (HGT.die + HGT.gap);
  const stackTop = dieY(11) + HGT.die;
  const capBottom = stackTop + HGT.gap;
  return {
    substrateBottom,
    substrateCenter: substrateBottom + HGT.substrate / 2,
    interposerBottom,
    interposerCenter: interposerBottom + HGT.interposer / 2,
    logicBottom,
    logicCenter: logicBottom + HGT.logic / 2,
    stackBottom,
    dieY,
    dieCenter: (i: number) => dieY(i) + HGT.die / 2,
    stackTop,
    capBottom,
    capCenter: capBottom + HGT.cap / 2,
    top: capBottom + HGT.cap,
    /** 整体视觉中心，用于相机取景 */
    centerY: (stackTop + substrateBottom) / 2,
  };
})();

/** 一颗微凸点的半径（模型单位）；纵向压扁，避免占到层间空隙以外 */
export const BUMP_R = 0.055;
export const BUMP_SQUASH = 0.55;

/* ------------------------------------------------------------ 结构清单 */
export type StructureId = 'package' | 'dram' | 'tsv' | 'bump' | 'logic' | 'interposer' | 'substrate';

export interface Structure {
  id: StructureId;
  no: string;
  en: string;
  zh: string;
  /** 一句话技术介绍 */
  desc: string;
  /** 它在 HBM 里承担的作用 */
  role: string;
  /** 与相邻结构的关系（PART 07：说明连接关系，不编造参数） */
  relation: string;
  /** 简明技术原理（PART 07） */
  principle: string;
  /** 微观视角的取景中心（y，模型单位）与相机距离 */
  focusY: number;
  focusDist: number;
  /** 取景的水平偏移（x, z），用来把镜头推到堆叠的一角 */
  focusXZ?: [number, number];
}

export const STRUCTURES: Structure[] = [
  {
    id: 'package',
    no: '01',
    en: 'HBM PACKAGE',
    zh: '封装外壳',
    desc: '整颗堆叠被模塑材料包裹，形成一颗可独立搬运、可上板焊接的存储器件。',
    role: '隔绝水汽与机械应力，把内部微米级结构保护起来，并提供顶部标识面。',
    relation: '包住内部的 DRAM 堆叠、逻辑芯片与中介层，底部坐落在封装基板上。',
    principle: '模塑材料在芯片级封装中同时承担机械保护与环境隔离，顶面留作标识面。',
    focusY: LAYOUT.centerY + 0.4,
    focusDist: 48,
  },
  {
    id: 'dram',
    no: '02',
    en: 'DRAM STACK',
    zh: 'DRAM 堆叠层',
    desc: '多层 DRAM 晶粒垂直堆叠，通过硅通孔与微凸点实现层间互连，在单位面积内堆出容量。',
    role: '垂直堆叠替代横向铺开，让同样封装面积容纳数倍于单颗晶粒的存储单元。',
    relation: '位于逻辑芯片之上，层与层靠微凸点对接、靠硅通孔纵向贯通，最上层由封装盖保护。',
    principle: '把原本平铺的存储单元改为纵向叠加，用垂直互连换取单位面积内的容量密度。',
    focusY: (LAYOUT.dieCenter(3) + LAYOUT.dieCenter(9)) / 2,
    focusDist: 22,
    focusXZ: [3.1, 3.1],
  },
  {
    id: 'tsv',
    no: '03',
    en: 'TSV',
    zh: '硅通孔',
    desc: '贯穿晶粒的垂直铜通道，把每一层的数据与供电在堆叠内部直接连通。',
    role: '替代沿晶粒边缘绕行的键合线，缩短互连长度、降低寄生与功耗。',
    relation: '穿过每一层 DRAM 晶粒，上端连到堆叠顶部、下端落到逻辑芯片的接口。',
    principle: '在硅片中刻蚀深孔并填充金属，形成垂直导电通路，避免绕线带来的延迟。',
    focusY: (LAYOUT.dieCenter(2) + LAYOUT.dieCenter(8)) / 2,
    focusDist: 16,
    focusXZ: [3.1, 3.1],
  },
  {
    id: 'bump',
    no: '04',
    en: 'MICRO-BUMPS',
    zh: '微凸点',
    desc: '晶粒之间以微米级金属凸点阵列对接，形成高密度的层间触点。',
    role: '在极小的间距内同时承担层间信号与供电，是堆叠能做得又薄又密的前提。',
    relation: '夹在相邻两层 DRAM 晶粒之间，与硅通孔配合构成完整的纵向互连路径。',
    principle: '用可控高度的小金属凸点实现层间键合，既导电又支撑层间间距。',
    focusY: LAYOUT.dieY(6) - HGT.gap,
    focusDist: 13,
    focusXZ: [3.4, 3.4],
  },
  {
    id: 'logic',
    no: '05',
    en: 'LOGIC DIE',
    zh: '逻辑芯片',
    desc: '堆叠底部的逻辑层，负责缓冲、测试与读写调度，把上层存储与外部接口对接起来。',
    role: '统一管理各层晶粒的读写时序，让整堆 DRAM 对外表现为一颗器件。',
    relation: '上接 DRAM 堆叠的硅通孔，下连中介层，是存储阵列与外部系统的接口层。',
    principle: '把控制与缓冲电路独立成一层，避免占用存储晶粒面积，同时统一调度各层。',
    focusY: LAYOUT.logicCenter,
    focusDist: 17,
    focusXZ: [3.6, 3.6],
  },
  {
    id: 'interposer',
    no: '06',
    en: 'INTERPOSER',
    zh: '硅中介层',
    desc: '超细线宽的硅转接层，在极小间距内完成 HBM 与 GPU 之间的高密度互连。',
    role: '把原本要走封装基板的千级连线搬进硅片，缩短距离、提高带宽密度。',
    relation: '位于逻辑芯片与封装基板之间，把 HBM 的众多接口扇出到基板焊球。',
    principle: '用硅工艺制作远细于有机基板的布线，在同样面积内容纳更多高速连接。',
    focusY: LAYOUT.interposerCenter,
    focusDist: 20,
    focusXZ: [4.4, 4.4],
  },
  {
    id: 'substrate',
    no: '07',
    en: 'SUBSTRATE',
    zh: '封装基板',
    desc: '承载中介层与整颗堆叠的有机基板，内部有多层走线与过孔。',
    role: '把内部信号扇出到封装外，并通过焊球与主板连接，同时承担机械支撑。',
    relation: '整颗封装的最底层，中介层位于其上，底部焊球连接外部主板。',
    principle: '以多层有机布线完成从芯片级细间距到板级间距的过渡，并分散机械应力。',
    focusY: LAYOUT.substrateCenter,
    focusDist: 22,
    focusXZ: [4.8, 4.8],
  },
];

export const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map((s) => [s.id, s])) as Record<
  StructureId,
  Structure
>;
