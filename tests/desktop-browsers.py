"""Check the assembled site with an installed desktop browser and its native driver."""
import json
import os
import sys
import traceback
from urllib.parse import urlencode

from PIL import Image
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.safari.service import Service as SafariService
from selenium.webdriver.support.ui import WebDriverWait


def capture(driver, path):
    # Capture the already-painted frame. Continuous software rendering competes
    # with ChromeDriver's compositor readback on Windows virtual displays.
    driver.execute_script("""
        const r = window.designWorld?.world.renderer;
        if (r) { window.resumeSceneCapture = r.getAnimationLoop(); r.setAnimationLoop(null); }
    """)
    try:
        driver.save_screenshot(path)
    finally:
        driver.execute_script("""
            if (window.resumeSceneCapture) designWorld.world.renderer.setAnimationLoop(window.resumeSceneCapture);
            delete window.resumeSceneCapture;
        """)


def check(driver, url, revision):
    wait = WebDriverWait(driver, 120)
    js = driver.execute_script

    def click(selector, hold=False):
        # Modal entrance and hover transforms can put the DOM click coordinates a frame behind.
        # Wait until the position accepts an actual pointer, then click that viewport point.
        script = """
            const el = document.querySelector(arguments[0]);
            if (!el) return false;
            const modal = el.closest('dialog');
            if (modal && (!modal.open || modal.getAnimations().some(a => a.playState === 'running'))) return false;
            const r = el.getBoundingClientRect();
            const x = Math.floor(r.left + r.width / 2), y = Math.floor(r.top + r.height / 2);
            return r.width && r.height && el.contains(document.elementFromPoint(x,y)) ? [x,y] : false;
        """
        point = wait.until(lambda _: js(script, selector), message=f'Pointer target {selector}')
        chain = ActionChains(driver)
        chain.w3c_actions.pointer_action.move_to_location(*point)
        pointer = chain.w3c_actions.pointer_action
        if hold:
            pointer.pointer_down().pause(.25).pointer_up()
        else:
            pointer.click()
        chain.perform()

    driver.set_window_size(1366, 768)
    driver.get(url + '?' + urlencode({'build': revision}))
    wait.until(lambda _: js("return document.querySelector('meta[name=cecilia-release]')?.content") == revision,
               message='Published HTML has the expected release')
    wait.until(lambda _: js("return window.designWorld?.world.renderCount >= 3 && document.body.dataset.ready && document.querySelector('#loading').hidden"))
    assert js("return designWorld.identity.getObjectByName('voxel-name-blocks').count") == 2752
    wait.until(lambda _: js("return document.querySelector('#world').dataset.presentation !== 'image' || !!document.querySelector('.scene-image')?.naturalWidth"))
    js("""
        window.testPointerEvents = [];
        window.testClickDelays = [];
        let pressedAt;
        window.addEventListener('pointerdown', () => { pressedAt = performance.now(); }, true);
        window.addEventListener('pointerup', () => { pressedAt = undefined; }, true);
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
            if (this.buffer?.duration < .02) testClickDelays.push(pressedAt === undefined ? null : performance.now() - pressedAt);
            return start.apply(this, args);
        };
        for (const type of ['pointerdown','pointerup','click']) document.addEventListener(type, e => {
            testPointerEvents.push([type, e.target.id || e.target.tagName, e.clientX, e.clientY]);
            if(testPointerEvents.length > 12) testPointerEvents.shift();
        }, true);
    """)
    capture(driver, 'browser-home.png')
    # The HTML map and buttons can still paint over a missing WebGL scene.
    # Sample the landscape, away from the controls and the map prompt.
    with Image.open('browser-home.png') as screenshot:
        width, height = screenshot.size
        landscape = screenshot.crop((width // 8, height // 4, width // 2, height * 3 // 4))
        sample = landscape.convert('RGB').resize((64, 40))
        colors = sample.getcolors(64 * 40)
        assert len(colors) > 512 and max(count for count, _ in colors) < 64 * 40 * .85, '3D landscape is missing'
    click('#map-trigger', hold=True)
    delays = js("return window.testClickDelays")
    assert len(delays) == 1 and delays[0] is not None, 'The map press must schedule exactly one click before release'
    print(f"First map press to Web Audio scheduling: {delays[0]:.1f} ms", flush=True)
    click('[data-destination="portfolio"]')
    wait.until(lambda _: js("return WORLD_STATE.place === 'portfolio'"))
    # Test the browser Back button after opening a project via its actual controls.
    click('#next')
    # The desktop project button is a keyboard control that appears on focus.
    js("document.querySelector('#open-work').focus()")
    driver.switch_to.active_element.send_keys(Keys.ENTER)
    wait.until(lambda _: js("return document.querySelector('#frames iframe')?.contentDocument?.documentElement?.dataset.pageBoot === 'ready'"))
    # Some WebKit drivers wait for a new document load after a same-document Back.
    driver.set_page_load_timeout(10)
    try:
        driver.back()
    except TimeoutException:
        if js("return document.querySelector('#reader').open"):
            raise
    wait.until(lambda _: js("return !document.querySelector('#reader').open && WORLD_STATE.place === 'portfolio' && preview.area.navigation.index === 1"))
    # Resume at the same station, including after resizing the browser window.
    for width, height in [(1024, 680), (1920, 1080)]:
        driver.set_window_size(width, height)
        wait.until(lambda _: js("""
            const w = designWorld, camera = w.world.camera;
            if (Math.abs(camera.aspect - innerWidth / innerHeight) > .001) return false;
            if (Math.hypot(...w.viewState().look.map((v,i)=>v-w.viewState().target[i])) > .03) return false;
            const items = Object.values(w.portfolio.area.attributes.items).filter(i=>i.group.visible);
            return items.length > 0 && items.every(item=>{
              const mesh = item.group.children.find(n=>n.name.startsWith('text'));
              const p = mesh.geometry.attributes.position;
              for(let i=0;i<p.count;i++){
                const v=mesh.localToWorld(mesh.position.clone().fromBufferAttribute(p,i)).project(camera);
                if(Math.abs(v.x)>1) return false;
              }
              return true;
            });
        """))
        if width == 1024:
            capture(driver, 'browser-portfolio.png')
    click('#map-trigger')
    click('[data-destination="other"]')
    js("designWorld.selectOther(4); designWorld.openCurrent()")
    wait.until(lambda _: js("return !!document.querySelector('#frames iframe')?.contentDocument?.querySelector('#stage [data-action]')"))
    click('#close-reader')
    wait.until(lambda _: js("return WORLD_STATE.place === 'other' && WORLD_STATE.otherIndex === 4 && !document.querySelector('#frames iframe')"))
    print(f"::notice::{driver.name} {driver.capabilities['browserVersion']} on {driver.capabilities['platformName']}: passed", flush=True)


def run(browser):
    if browser == 'safari':
        options = webdriver.SafariOptions()
        driver_type = webdriver.Safari
    else:
        options = webdriver.EdgeOptions() if browser == 'edge' else webdriver.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--enable-unsafe-swiftshader')
        options.add_argument('--force-device-scale-factor=' + ('1.25' if browser == 'edge' else '1.5'))
        driver_type = webdriver.Edge if browser == 'edge' else webdriver.Chrome
    if browser != 'safari':
        options.add_argument('--use-angle=swiftshader')
    options.page_load_strategy = 'none'
    url = os.environ['SITE_URL']
    revision = os.environ['SITE_REVISION']
    # The Safari client only connects over loopback to the OS driver. The test
    # opens the public site and never needs permission to serve a local network.
    if browser == 'safari':
        driver = driver_type(service=SafariService(port=4545), options=options)
    else:
        driver = driver_type(options=options)
    try:
        check(driver, url, revision)
    except Exception:
        try:
            state = driver.execute_script("""
                const q = s => document.querySelector(s);
                return {url: location.href, state: history.state, ready: document.body.dataset.ready,
                    failed: document.body.dataset.failed, release: document.documentElement.dataset.releaseState,
                    visibility: document.visibilityState, focus: document.hasFocus(),
                    map: q('#world-map')?.open, reader: q('#reader')?.open, frames: window.designWorld?.world.renderCount,
                    events: window.testPointerEvents, bodyOpacity: getComputedStyle(document.body).opacity, focused: document.activeElement?.id};
            """)
            print('Browser state:', json.dumps(state), flush=True)
            capture(driver, 'browser-failure.png')
        except Exception as diagnostic_error:
            print('Could not capture failure:', diagnostic_error, flush=True)
        raise
    finally:
        driver.quit()


if __name__ == '__main__':
    try:
        run(sys.argv[1])
    except Exception as error:
        frame = next((f for f in reversed(traceback.extract_tb(error.__traceback__)) if f.filename == __file__), None)
        step = frame.line if frame else ''
        message = f'{sys.argv[1]}: {type(error).__name__} at {step}. {str(error)[:500]}'
        print('::error::' + message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'), flush=True)
        raise
