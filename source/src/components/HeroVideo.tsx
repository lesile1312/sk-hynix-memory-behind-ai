import { useEffect, useRef, useState } from 'react';
import { MEDIA } from '../config';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Mode = 'poster' | 'webgl' | 'webp';

const VERT_SRC = `
attribute vec2 p;
varying vec2 uv;
uniform vec2 uScale;
uniform vec2 uOffset;
void main() {
  uv = (vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5)) * uScale + uOffset;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/** 绿幕色度键：G - max(R,B) 判背景；同时抑制芯片边缘绿色溢色。 */
const FRAG_SRC = `
precision mediump float;
uniform sampler2D tex;
varying vec2 uv;
void main() {
  vec4 c = texture2D(tex, uv);
  float g = c.g - max(c.r, c.b);
  float a = 1.0 - smoothstep(0.06, 0.14, g);
  float gg = max(c.r, c.b);
  c.g = mix(c.g, min(c.g, gg + 0.02), step(0.06, g));
  gl_FragColor = vec4(c.rgb, a);
}`;

interface HeroVideoProps {
  className?: string;
}

/**
 * HERO 动态影像渲染器（PHASE 03）
 *
 * 渲染优先级（2026-11-24 调整）：
 *   1. WebGL 实时色度键 —— 视频硬件解码 + GPU 抠像，主线程负担最低
 *   2. 已抠像透明动画 WebP —— 仅在 WebGL / 视频失败时兜底
 *   3. 透明首帧海报 —— 加载中、自动播放失败、reduced-motion 终极兜底
 *
 * 原首选 WebP 为 1920×1080 / 133 帧，逐帧解码在主线程进行，实测会造成首屏卡顿；
 * 现在只在 WebGL 不可用才加载。绿幕 MP4 压到 1280×720 / 1.1MB，
 * 画布 DPR 固定为 1，进一步降低纹理上传量。
 * ?render=webp 可强制旧路径做对比验收。
 */
export default function HeroVideo({ className }: HeroVideoProps) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>('poster');
  /* WebP 只作为 WebGL 不可用时的兜底：它的逐帧解码跑在主线程，不能当首选。 */
  const [useWebPFallback, setUseWebPFallback] = useState(false);
  const modeRef = useRef<Mode>('poster');
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webpReadyRef = useRef(false);
  /* 绿幕 MP4 仅在 WebGL 抠像路径真正需要时才挂载 src，避免首选 WebP 路径重复下载 3.8MB */
  const requestVideoRef = useRef<() => void>(() => undefined);
  const renderParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('render')
    : null;
  const forceWebGL = renderParam === 'webgl';
  const forceWebP = renderParam === 'webp';

  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* ---------- WebGL 实时抠像（快速出画 / 降级） ---------- */
  useEffect(() => {
    if (reduced) {
      setMode('poster');
      videoRef.current?.pause();
      return;
    }
    if (forceWebP) {
      setUseWebPFallback(true);
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const box = boxRef.current;
    if (!canvas || !video || !box) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      setUseWebPFallback(true); /* 无 WebGL：退回透明 WebP / 海报 */
      return;
    }

    let destroyed = false;
    let raf = 0;
    let resizeObs: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let readyTimer = 0;
    let visible = true;
    let kickHandler: (() => void) | null = null;
    let lastTime = -1;
    let fit: () => void = () => undefined;

    const kickAutoplay = () => {
      if (kickHandler || destroyed) return;
      const kick = () => {
        video.play().catch(() => undefined);
        window.removeEventListener('pointerdown', kick);
        window.removeEventListener('touchstart', kick);
        window.removeEventListener('keydown', kick);
        kickHandler = null;
      };
      kickHandler = kick;
      window.addEventListener('pointerdown', kick, { once: true });
      window.addEventListener('touchstart', kick, { once: true });
      window.addEventListener('keydown', kick, { once: true });
    };

    requestVideoRef.current = () => {
      if (destroyed || reduced) return;
      if (!video.getAttribute('src')) {
        video.src = MEDIA.video;
        video.load();
      }
      video.play().catch(kickAutoplay);
    };

    try {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader compile');
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('shader link');
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(prog, 'tex'), 0);
      const uScale = gl.getUniformLocation(prog, 'uScale');
      const uOffset = gl.getUniformLocation(prog, 'uOffset');

      /* cover 裁切随视口 / 浏览器缩放 / 移动地址栏变化重算 */
      fit = () => {
        const cw = box.clientWidth || 1;
        const ch = box.clientHeight || 1;
        /* 抠像只是一层背景视频，内部 0.8× 渲染再由浏览器平滑放大；
           在 1440×900 下少算约 36% 像素，肉眼看不出差别。 */
        const dpr = 0.8;
        const w = Math.max(2, Math.round(cw * dpr));
        const h = Math.max(2, Math.round(ch * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        const vw = video.videoWidth || 1920;
        const vh = video.videoHeight || 1080;
        const ca = cw / ch;
        const va = vw / vh;
        let sx = 1;
        let sy = 1;
        if (ca >= va) sy = va / ca;
        else sx = ca / va;
        gl.uniform2f(uScale, sx, sy);
        gl.uniform2f(uOffset, (1 - sx) / 2, (1 - sy) / 2);
      };

      /* 每帧只在视频时间推进时上传纹理；透明 WebP 模式直接跳过，零 GPU 开销 */
      const draw = () => {
        if (destroyed) return;
        raf = requestAnimationFrame(draw);
        if (modeRef.current !== 'webgl' || !visible || document.hidden) return;
        if (video.readyState < 2 || video.currentTime === lastTime) return;
        lastTime = video.currentTime;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };

      const onReady = () => {
        if (destroyed) return;
        clearTimeout(readyTimer);
        fit();
        if (modeRef.current === 'poster') setMode('webgl');
        raf = requestAnimationFrame(draw);
      };

      /* 视频是首选路径，挂载后立即开始解码；海报只在首帧前顶一下 */
      requestVideoRef.current();
      if (video.readyState >= 2) onReady();
      else {
        video.addEventListener('canplay', onReady, { once: true });
        readyTimer = window.setTimeout(() => {
          if (video.readyState < 2 && modeRef.current === 'poster') {
            setUseWebPFallback(true);
          }
        }, 6000);
      }

      video.addEventListener('error', () => {
        setUseWebPFallback(true);
        setMode('poster');
      });
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        setUseWebPFallback(true);
        setMode('poster');
      });

      resizeObs = new ResizeObserver(fit);
      resizeObs.observe(box);
      window.addEventListener('resize', fit, { passive: true });

      io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (modeRef.current !== 'webgl') return;
        if (!visible) video.pause();
        else requestVideoRef.current();
      }, { threshold: 0.01 });
      io.observe(box);
    } catch {
      /* shader 初始化失败：交由透明 WebP / 海报兜底 */
      setUseWebPFallback(true);
    }

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(readyTimer);
      resizeObs?.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', fit);
      if (kickHandler) {
        window.removeEventListener('pointerdown', kickHandler);
        window.removeEventListener('touchstart', kickHandler);
        window.removeEventListener('keydown', kickHandler);
      }
      video.pause();
      requestVideoRef.current = () => undefined;
      /* 不主动 loseContext：React StrictMode 开发环境会 mount→cleanup→mount，
         若在此永久丢失上下文，第二次挂载的 WebGL 抠像将无法恢复。 */
    };
  }, [reduced, forceWebP]);

  /* 强制 WebGL 调试路径没有 WebP，主动挂载视频源 */
  useEffect(() => {
    if (forceWebGL && !reduced) requestVideoRef.current();
  }, [forceWebGL, reduced]);

  /* 透明 WebP 加载完成即接管渲染（PHASE 03 首选路径） */
  const onWebpReady = () => {
    webpReadyRef.current = true;
    if (!forceWebGL && !reduced) {
      setMode('webp');
      videoRef.current?.pause();
    }
  };

  return (
    <div ref={boxRef} className={className} aria-label="HBM 高带宽内存芯片动态影像" role="img">
      {/* 底层：透明首帧海报，加载中 / 兜底画面 */}
      <img
        src={MEDIA.poster}
        data-hero-poster=""
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: mode === 'poster' ? 1 : 0 }}
        draggable={false}
      />

      {/* 兜底：仅 WebGL / 视频不可用时才加载逐帧解码的透明 WebP */}
      {!reduced && useWebPFallback && (
        <img
          src={MEDIA.webp}
          data-hero-webp=""
          alt=""
          onLoad={onWebpReady}
          onError={() => {
            webpReadyRef.current = false;
            setMode('poster');
          }}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: mode === 'webp' ? 1 : 0 }}
          draggable={false}
        />
      )}

      {/* 首选：WebGL 实时色度键画布（视频硬件解码，GPU 上抠像） */}
      <canvas
        ref={canvasRef}
        data-hero-canvas=""
        className="absolute inset-0 h-full w-full transition-opacity duration-500"
        style={{ opacity: mode === 'webgl' ? 1 : 0 }}
      />

      {/* 视频源：绿幕原片，仅 WebGL 路径消费 */}
      <video
        ref={videoRef}
        data-hero-video=""
        poster={MEDIA.poster}
        muted
        loop
        playsInline
        preload="none"
        controls={false}
        disablePictureInPicture
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
