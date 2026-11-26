/**
 * 程序化生成的贴图（纯 canvas，无外部资源，离线包同样可用）
 *
 * 目标是「远看是材质，近看有内容」：走线、焊盘、存储阵列都不追求与真实光刻版图
 * 一致，只求密度、对比与尺度感对得上，避免出现大面积塑料色块。
 */
import * as THREE from 'three';

/** 固定种子的伪随机，保证每次构建的纹理一致 */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function make(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** 封装基板顶面：深色有机基板 + 铜走线 + 焊盘 */
export function substrateTexture() {
  return make(512, (ctx, s) => {
    ctx.fillStyle = '#0c1319';
    ctx.fillRect(0, 0, s, s);
    const r = rng(7);
    /* 细密走线：横竖各一层，避免规则到像格子布 */
    for (let i = 0; i < 190; i += 1) {
      const horiz = r() > 0.5;
      const a = Math.floor(r() * s);
      const b = Math.floor(r() * s);
      const len = 20 + r() * 150;
      ctx.strokeStyle = `rgba(224,170,104,${0.22 + r() * 0.4})`;
      ctx.lineWidth = 0.8 + r() * 1.1;
      ctx.beginPath();
      if (horiz) {
        const y = a;
        ctx.moveTo(b, y);
        ctx.lineTo(Math.min(s, b + len), y);
        ctx.lineTo(Math.min(s, b + len), y + (r() > 0.5 ? 10 : -10));
      } else {
        const x = a;
        ctx.moveTo(x, b);
        ctx.lineTo(x, Math.min(s, b + len));
        ctx.lineTo(x + (r() > 0.5 ? 10 : -10), Math.min(s, b + len));
      }
      ctx.stroke();
    }
    /* 焊盘阵列（对应焊球位置的外圈） */
    for (let i = 0; i < 16; i += 1) {
      for (let j = 0; j < 16; j += 1) {
        if (i > 1 && i < 14 && j > 1 && j < 14) continue;
        const x = 18 + (i * (s - 36)) / 15;
        const y = 18 + (j * (s - 36)) / 15;
        ctx.fillStyle = 'rgba(232,186,124,0.78)';
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    /* 外圈丝印框 */
    ctx.strokeStyle = 'rgba(190,200,212,0.22)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(8, 8, s - 16, s - 16);
  });
}

/** 硅中介层顶面：比基板细一个量级的密集布线 */
export function interposerTexture() {
  return make(512, (ctx, s) => {
    ctx.fillStyle = '#101a21';
    ctx.fillRect(0, 0, s, s);
    const r = rng(23);
    for (let i = 0; i < 420; i += 1) {
      const y = Math.floor(r() * s);
      const x0 = Math.floor(r() * s);
      const len = 40 + r() * 200;
      ctx.strokeStyle = `rgba(150,205,232,${0.12 + r() * 0.2})`;
      ctx.lineWidth = 0.6 + r() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + len, y);
      ctx.stroke();
    }
    for (let i = 0; i < 260; i += 1) {
      const x = Math.floor(r() * s);
      const y0 = Math.floor(r() * s);
      const len = 30 + r() * 160;
      ctx.strokeStyle = `rgba(150,205,232,${0.1 + r() * 0.18})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + len);
      ctx.stroke();
    }
  });
}

/** DRAM 晶粒顶面：存储阵列分区 + 感知放大器条带 */
export function dieTopTexture() {
  return make(512, (ctx, s) => {
    ctx.fillStyle = '#1a232c';
    ctx.fillRect(0, 0, s, s);
    const cell = s / 8;
    for (let i = 0; i < 8; i += 1) {
      for (let j = 0; j < 8; j += 1) {
        ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(44,58,72,0.42)' : 'rgba(34,45,56,0.42)';
        ctx.fillRect(i * cell + 3, j * cell + 3, cell - 6, cell - 6);
        /* 阵列内部的等距细线，密度足够低才不会糊成灰块 */
        ctx.strokeStyle = 'rgba(150,190,220,0.11)';
        ctx.lineWidth = 0.5;
        for (let k = 0; k < 11; k += 1) {
          const y = j * cell + 6 + k * ((cell - 12) / 10);
          ctx.beginPath();
          ctx.moveTo(i * cell + 5, y);
          ctx.lineTo(i * cell + cell - 5, y);
          ctx.stroke();
        }
      }
    }
    /* 中央的感知放大器与汇流条 */
    ctx.strokeStyle = 'rgba(156,203,235,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cell * 0.5, cell * 0.5, s - cell, s - cell);
  });
}

/** 模塑顶盖：石墨面 + 极细拉丝，避免大片纯色 */
export function capTexture() {
  return make(512, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#2b333b');
    g.addColorStop(0.5, '#1e252c');
    g.addColorStop(1, '#262e36');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const r = rng(41);
    for (let i = 0; i < 700; i += 1) {
      const y = r() * s;
      ctx.strokeStyle = `rgba(205,220,235,${0.02 + r() * 0.05})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(184,190,199,0.1)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
  });
}

/** 剖面切面：硅片断面 + 铜通孔圆点（位置与场景里的 TSV 网格一致） */
export function dieCapTexture(grid: number, cols: number) {
  return make(256, (ctx, s) => {
    ctx.fillStyle = '#2f373f';
    ctx.fillRect(0, 0, s, s);
    /* 断面上的轻微层状纹理 */
    for (let i = 0; i < 60; i += 1) {
      ctx.strokeStyle = `rgba(255,255,255,${0.01 + (i % 5) * 0.004})`;
      ctx.beginPath();
      ctx.moveTo(0, i * (s / 60));
      ctx.lineTo(s, i * (s / 60));
      ctx.stroke();
    }
    /* 铜通孔：按 TSV 的 5×5 网格落点 */
    const step = s / (cols + 1);
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        if (i === 0 && j === 0) continue;
        const x = step * (i + 1);
        const y = step * (j + 1);
        ctx.fillStyle = '#c8894a';
        ctx.beginPath();
        ctx.arc(x, y, s * 0.022, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,160,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    void grid;
  });
}
