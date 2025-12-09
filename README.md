# IDAPP: Universal Controller for ESP32 robots

**IDAPP** is a futuristic Progressive Web App (PWA) designed to act as the extended nervous system and remote controller for the **IDC** robots. It connects directly via **Web Bluetooth**, requiring no app store installation, and features a "Living UI" that synchronizes with the robot's emotional state.

## Keep in mind ! ! !
The robots are still a work in progress and therefore still private. The app is useless without them.

### **Live App:** [https://batmanos1.github.io/IDAPP/](https://batmanos1.github.io/IDAPP/)

## Key Features

* **Web Bluetooth Connectivity:** Connects directly from Chrome, Edge, or Bluefy to an ESP32 microcontroller without a backend server.
* **Mood Sync:** The entire application theme (colors, animations, and the "Aurora" background) shifts instantly to match the robot's internal emotion (Happy, Angry, Tired, Love).
* **Real-Time Vitals:** Monitors the robot's Happiness, Hunger, and Energy levels.
* **Game Console:** Launches and controls minigames running on the robot.
* **PWA Core:** Installable to the home screen on iOS and Android with full-screen support (handles notches and dynamic islands natively).

## Installation & Usage

### 1. Open the App
Navigate to [https://batmanos1.github.io/IDAPP/](https://batmanos1.github.io/IDAPP/) on a Bluetooth-enabled device (Smartphone, Tablet, or Laptop).

### 2. Install to Home Screen (Recommended)
For the best experience (Full Screen, No URL bar), install IDAPP as a PWA:
* **iOS (Safari):** Tap **Share** -> **Add to Home Screen**.
* **Android (Chrome):** Tap **Menu (⋮)** -> **Install App**.

### 3. Connect to Robot
1.  Ensure your **IDC** robot of any type is powered on.
2.  Tap the **CONNECT** button in the top-right corner.
3.  Select **"Robot's model"** from the browser's Bluetooth pairing menu.
4.  Once connected, the background will come alive!

## Bluetooth Protocol

IDAPP communicates using a custom ASCII protocol over BLE UART.

**UUIDs:**
* **Service:** `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
* **RX (Write):** `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
* **TX (Notify):** `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

**Commands (App -> Robot):**
* `L` / `R`: Left/Right Sensor Trigger
* `1-3`: Start Games (Memory, Reflex, Slots)
* `X`: Stop Game
* `F`: Feed (Spend Coins)
* `V`: Toggle Sound
* `Z`: Force Sleep

**Events (Robot -> App):**
* `M:x`: Mood Change (0=Default, 1=Happy, 2=Angry, 3=Tired, 5=Love)
* `A:x`: Affection Level (0-100)
* `C:x`: Coin Update
* `T:text`: Text display update
* `I:type|name|coins`: Identity Handshake

## 📜 License

This project is open-source and available under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
