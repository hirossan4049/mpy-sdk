"""
M5Stack Simple Flash Sample
シンプルなランダム背景色とテキスト表示
"""

from m5stack import *
from m5ui import *
import time
import urandom

def random_color():
    """ランダム色生成（RGB565形式）"""
    return urandom.getrandbits(16)

def main():
    print("Simple Flash Sample Started!")
    
    # UI要素作成
    title = M5TextBox(50, 50, "HELLO M5STACK", lcd.FONT_DejaVu24, 0xFFFFFF, rotate=0)
    info = M5TextBox(80, 100, "Random Colors!", lcd.FONT_Default, 0x00FFFF, rotate=0)
    counter = M5TextBox(100, 150, "0", lcd.FONT_DejaVu18, 0xFFFF00, rotate=0)
    
    count = 0
    
    while True:
        try:
            # ランダム背景色
            bg_color = random_color()
            setScreenColor(bg_color)
            
            # カウンター更新
            count += 1
            counter.setText(str(count))
            
            # テキスト色もランダムに
            title.setColor(random_color())
            info.setColor(random_color())
            
            time.sleep(1)
            
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    main()