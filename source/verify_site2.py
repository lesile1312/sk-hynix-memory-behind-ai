"""按 section 精确定位截图 + 降级/移动端验证"""
from playwright.sync_api import sync_playwright
import json

URL = "http://127.0.0.1:5274/"
OUT = "../_sitecheck"
EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

def desktop():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EDGE,
            args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"])
        pg = b.new_page(viewport={"width":1440,"height":900}, device_scale_factor=1)
        errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type=="error" else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        pg.goto(URL, wait_until="load", timeout=120000)
        pg.wait_for_timeout(6000)

        # 逐 section 精确定位
        sections = [
            ("s1_hero", "#top"),
            ("s2_intro", "section[aria-label='品牌引言']"),
            ("s3_tech", "#technology"),
            ("s4_ai", "#intelligence"),
            ("s5_ending", "#future"),
        ]
        for name, sel in sections:
            pg.evaluate("(s)=>document.querySelector(s).scrollIntoView({behavior:'instant',block:'start'})", sel)
            pg.wait_for_timeout(1600)
            pg.screenshot(path=f"{OUT}/{name}.png")

        # HBM 段中部（列表区）
        pg.evaluate("()=>document.querySelector('#technology').scrollIntoView({block:'center'})")
        pg.wait_for_timeout(1400)
        pg.screenshot(path=f"{OUT}/s3_tech_mid.png")

        # 字体实际使用检查
        fonts = pg.evaluate("""() => ({
          cormorant: document.fonts.check('1em "Cormorant Garamond"'),
          inter: document.fonts.check('1em Inter'),
          h1font: getComputedStyle(document.querySelector('h1')).fontFamily,
          bodyfont: getComputedStyle(document.body).fontFamily,
          loaded: [...document.fonts].map(f => ({family:f.family,status:f.status})).slice(0,10)
        })""")
        print("FONTS:", json.dumps(fonts, indent=1))
        print("CONSOLE:", json.dumps(errs, ensure_ascii=False))
        b.close()

def mobile():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EDGE, args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"])
        pg = b.new_page(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL, wait_until="load", timeout=120000)
        pg.wait_for_timeout(6000)
        m = pg.evaluate("""() => ({scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth,
            hScroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1})""")
        print("MOBILE METRICS:", json.dumps(m))
        pg.screenshot(path=f"{OUT}/m1_hero.png")
        for name, sel in [("m2_intro","section[aria-label='品牌引言']"),("m3_tech","#technology"),("m4_ai","#intelligence"),("m5_ending","#future")]:
            pg.evaluate("(s)=>document.querySelector(s).scrollIntoView({behavior:'instant',block:'start'})", sel)
            pg.wait_for_timeout(1400)
            pg.screenshot(path=f"{OUT}/{name}.png")
        print("MOBILE ERRORS:", errs)
        b.close()

def fallback():
    """拦截视频请求，验证降级链"""
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EDGE, args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width":1440,"height":900})
        # 屏蔽 mp4 与 webp 动画，只留 poster
        pg.route("**/*.mp4", lambda route: route.abort())
        pg.route("**/*alpha.webp", lambda route: route.abort())
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL, wait_until="load", timeout=120000)
        pg.wait_for_timeout(8000)
        state = pg.evaluate("""() => {
          const imgs=[...document.querySelectorAll('img')];
          return {posterVisible: imgs.filter(i=>i.getAttribute('src')?.includes('poster')).map(i=>getComputedStyle(i).opacity),
                  webpVisible: imgs.filter(i=>i.getAttribute('src')?.includes('alpha')).map(i=>getComputedStyle(i).opacity)};
        }""")
        print("FALLBACK STATE:", json.dumps(state))
        pg.screenshot(path=f"{OUT}/fallback_poster.png")
        print("FALLBACK ERRORS:", errs)
        b.close()

if __name__ == "__main__":
    desktop()
    mobile()
    fallback()
