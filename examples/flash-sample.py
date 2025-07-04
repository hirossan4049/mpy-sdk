"""
M5Stack Flash Sample Code
UIでランダムカラー背景とアニメーション表示
"""

from m5stack import *
from m5ui import *
import time
import urandom

# 初期設定
lcd.clear()

# ランダム色生成関数
def random_color():
    """16bit RGB565形式のランダム色を生成"""
    r = urandom.getrandbits(5) << 11  # 5bit赤
    g = urandom.getrandbits(6) << 5   # 6bit緑
    b = urandom.getrandbits(5)        # 5bit青
    return r | g | b

# UI要素の初期化
def init_ui():
    # メインタイトル
    title = M5TextBox(10, 20, "M5STACK DEMO", lcd.FONT_DejaVu24, 0xFFFFFF, rotate=0)
    
    # サブタイトル
    subtitle = M5TextBox(15, 50, "Random Color Background", lcd.FONT_Default, 0xFFFF00, rotate=0)
    
    # ステータス表示
    status = M5TextBox(10, 80, "Status: Running", lcd.FONT_Default, 0x00FF00, rotate=0)
    
    # カウンター表示
    counter = M5TextBox(10, 110, "Count: 0", lcd.FONT_DejaVu18, 0x00FFFF, rotate=0)
    
    # 時刻表示
    time_display = M5TextBox(10, 140, "Time: 00:00", lcd.FONT_Default, 0xFFFFFF, rotate=0)
    
    # 色情報表示
    color_info = M5TextBox(10, 170, "RGB: 0x000000", lcd.FONT_Default, 0xFFFFFF, rotate=0)
    
    # プログレスバー背景
    lcd.rect(10, 200, 300, 20, 0x333333, 0x333333)
    
    return title, subtitle, status, counter, time_display, color_info

# メイン関数
def main():
    print("M5Stack Flash Sample Started!")
    
    # UI初期化
    title, subtitle, status, counter, time_display, color_info = init_ui()
    
    count = 0
    start_time = time.ticks_ms()
    
    while True:
        try:
            # ランダム背景色を設定
            bg_color = random_color()
            setScreenColor(bg_color)
            
            # カウンター更新
            count += 1
            counter.setText(f"Count: {count}")
            
            # 経過時間計算
            elapsed = time.ticks_diff(time.ticks_ms(), start_time) // 1000
            minutes = elapsed // 60
            seconds = elapsed % 60
            time_display.setText(f"Time: {minutes:02d}:{seconds:02d}")
            
            # 色情報表示
            color_info.setText(f"RGB: 0x{bg_color:06X}")
            
            # プログレスバーのアニメーション
            import math
            progress = int(150 * (math.sin(count * 0.2) + 1))  # 0-300の範囲
            lcd.rect(10, 200, 300, 20, 0x333333, 0x333333)  # 背景
            lcd.rect(12, 202, progress, 16, 0x00FF88, 0x00FF88)  # プログレス
            
            # ステータス点滅
            if count % 4 < 2:
                status.setText("Status: ACTIVE")
                status.setColor(0x00FF00)
            else:
                status.setText("Status: READY")
                status.setColor(0x0088FF)
            
            # タイトル色変更
            title_colors = [0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF]
            title.setColor(title_colors[count % len(title_colors)])
            
            # ボタンチェック
            if btnA.isPressed():
                subtitle.setText("Button A Pressed!")
                subtitle.setColor(0xFF0000)
                time.sleep(0.1)
            elif btnB.isPressed():
                subtitle.setText("Button B Pressed!")
                subtitle.setColor(0x00FF00)
                time.sleep(0.1)
            elif btnC.isPressed():
                subtitle.setText("Button C Pressed!")
                subtitle.setColor(0x0000FF)
                time.sleep(0.1)
            else:
                subtitle.setText("Random Color Background")
                subtitle.setColor(0xFFFF00)
            
            # 少し待機
            time.sleep(0.5)
            
        except KeyboardInterrupt:
            print("Program interrupted by user")
            break
        except Exception as e:
            print(f"Error occurred: {e}")
            status.setText("Status: ERROR")
            status.setColor(0xFF0000)
            time.sleep(1)

if __name__ == "__main__":
    main()