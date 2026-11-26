"""SK hynix 品牌站端到端验证：滚动截图 + 交互检查（桌面）"""
from playwright.sync_api import sync_playwright
import json

URL = "http://127.0.0.1:5274/"
OUT = "../_sitecheck"

def run():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
                              args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"])
        pg = b.new_page(viewport={"width":1440,"height":900}, device_scale_factor=1)
        errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type=="error" else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        pg.goto(URL, wait_until="load", timeout=120000)
        pg.wait_for_timeout(7000)

        # 基本度量
        metrics = pg.evaluate("""() => {
          const doc = document.documentElement;
          const video = document.querySelector('video');
          const canvas = document.querySelector('canvas');
          let glPx = 0, glMax = 0;
          if (canvas) {
            const gl = canvas.getContext('webgl');
            if (gl) {
              const buf = new Uint8Array(canvas.width*canvas.height*4);
              gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,buf);
              for (let i=3;i<buf.length;i+=4){ if(buf[i]>0) glPx++; if(buf[i]>glMax) glMax=buf[i]; }
            }
          }
          return {
            scrollW: doc.scrollWidth, clientW: doc.clientWidth,
            scrollH: doc.scrollHeight, vh: window.innerHeight,
            hScroll: doc.scrollWidth > doc.clientWidth,
            video: video ? {rs: video.readyState, t: video.currentTime, paused: video.paused, vw: video.videoWidth} : null,
            canvas: canvas ? {w: canvas.width, h: canvas.height, keyedPx: glPx, maxA: glMax} : null,
            fonts: { serifLoaded: document.fonts.check('1em "Cormorant Garamond"'), interLoaded: document.fonts.check('1em Inter') },
          };
        }""")
        print("METRICS:", json.dumps(metrics, indent=1))

        # 逐屏截图
        total = metrics["scrollH"] - metrics["vh"]
        stops = {"01_hero": 0.0, "02_hero_mid": 0.10, "03_intro": 0.26, "04_tech": 0.46, "05_ai": 0.66, "06_ending": 0.97}
        for name, frac in stops.items():
            pg.evaluate(f"window.scrollTo(0, {int(total*frac)})")
            pg.wait_for_timeout(1800)
            pg.screenshot(path=f"{OUT}/{name}.png")

        # 标题淡入状态（回到顶部）
        pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(1500)
        pg.screenshot(path=f"{OUT}/00_top.png")

        # 溢出检测
        overflow = pg.evaluate("""() => {
          const out = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > window.innerWidth + 2 || r.left < -2) {
              const cs = getComputedStyle(el);
              if (cs.position !== 'fixed' && r.width > 0 && r.height > 0)
                out.push(`${el.tagName}.${(el.className||'').toString().slice(0,60)} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
            }
          });
          return out.slice(0, 12);
        }""")
        print("OVERFLOW:", json.dumps(overflow, ensure_ascii=False))
        print("CONSOLE ERRORS:", json.dumps(errs, ensure_ascii=False))
        b.close()

run()
