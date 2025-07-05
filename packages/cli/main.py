# Simple Hello World for M5Stack
from m5stack import lcd
import time

# Clear screen
lcd.clear()

# Display hello world
lcd.print("Hello World", 50, 50, 0x00FF00)

print("Hello World displayed on M5Stack!")
