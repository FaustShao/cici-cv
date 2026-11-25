"""Check the assembled site with an installed desktop browser and its native driver."""
import os
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check(driver, url):
    wait = WebDriverWait(driver, 120)
    js = driver.execute_script

    def click(selector):
        driver.find_element(By.CSS_SELECTOR, selector).click()

    driver.set_window_size(1366, 768)
    driver.get(url)
    wait.until(lambda _: js("return !!window.designWorld && document.body.dataset.ready && document.querySelector('#loading').hidden"))
    assert js("return designWorld.identity.getObjectByName('voxel-name-blocks').count") == 2752
    click('#map-trigger')
    click('[data-destination="portfolio"]')
    wait.until(lambda _: js("return WORLD_STATE.place === 'portfolio'"))
    # Test the browser Back button after opening a project via its actual controls.
    click('#next')
    # The desktop project button is a keyboard control that appears on focus.
    js("document.querySelector('#open-work').focus()")
    driver.switch_to.active_element.send_keys(Keys.ENTER)
    wait.until(lambda _: js("return document.querySelector('#frames iframe')?.contentDocument?.documentElement.dataset.pageBoot === 'ready'"))
    driver.back()
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
    click('#map-trigger')
    click('[data-destination="other"]')
    js("designWorld.selectOther(4); designWorld.openCurrent()")
    wait.until(lambda _: js("return !!document.querySelector('#frames iframe')?.contentDocument?.querySelector('#stage [data-action]')"))
    click('#close-reader')
    wait.until(lambda _: js("return WORLD_STATE.place === 'other' && WORLD_STATE.otherIndex === 4 && !document.querySelector('#frames iframe')"))
    print(driver.capabilities['browserName'], driver.capabilities['browserVersion'], driver.capabilities['platformName'], 'PASS', flush=True)


if __name__ == '__main__':
    browser = sys.argv[1]
    if browser == 'safari':
        driver = webdriver.Safari()
    else:
        options = webdriver.EdgeOptions() if browser == 'edge' else webdriver.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--enable-unsafe-swiftshader')
        options.add_argument('--force-device-scale-factor=' + ('1.25' if browser == 'edge' else '1.5'))
        driver = (webdriver.Edge if browser == 'edge' else webdriver.Chrome)(options=options)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(StaticFiles, directory=os.path.abspath('public')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        check(driver, f'http://127.0.0.1:{server.server_port}/')
    finally:
        driver.quit()
        server.shutdown()
