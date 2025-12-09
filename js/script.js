const btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
let isGameRunning = false; 
let lastInputTime = Date.now();
let currentHappiness = 50; 
let robotBaseColor = "#00e5ff"; 

// Identity Variables
let robotShape = 0; 
let robotRad = 0;   
let robotStrX = 100;  
let robotStrY = 100; 

// Track Layout Bounds for Auto-Sizing
let minEyeX = 1000, maxEyeX = -1000;
let minEyeY = 1000, maxEyeY = -1000;

const initialVitalStates = { hap: 50, hun: 80, eng: 10 };

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
});

function checkIdleStatus() {
    if (document.getElementById('status').innerText === "ONLINE" && (Date.now() - lastInputTime > 5000)) {
        updateVisorMood(currentHappiness);
    }
}

function updateVisorMood(happiness) {
    let v = document.getElementById('visor');
    let b = document.body;
    v.className = "visor"; b.className = "";
    
    // Updates mood classes which trigger the CSS Heartbeat changes
    if (happiness >= 90) { v.classList.add('mood-love'); b.classList.add('mood-love'); }
    else if (happiness > 60) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); } 
    else if (happiness < 30) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
    
    if(robotBaseColor) {
        document.documentElement.style.setProperty('--c', robotBaseColor);
        document.documentElement.style.setProperty('--glow', robotBaseColor);
    }
}

function updateBackgroundVitals(vitals) {
    document.getElementById('bar-hap').style.width = vitals.hap + '%';
    document.getElementById('bar-hun').style.width = vitals.hun + '%'; 
    document.getElementById('bar-eng').style.width = (100 - vitals.eng) + '%';
    
    document.getElementById('val-eng').innerText = (100 - vitals.eng) + '%';
    document.getElementById('val-hap').innerText = vitals.hap + '%';
    document.getElementById('val-hun').innerText = vitals.hun + '%';
}

function applyRobotIdentity(dataString) {
    // Protocol: Family | Name | Coins | Color | ShapeType | Radius | StretchX | StretchY
    let parts = dataString.split('|');
    if (parts.length < 8) return; 

    let rName = parts[1];
    let rCoins = parts[2];
    let rColor = parts[3]; 
    
    robotShape = parseInt(parts[4]); 
    robotRad = parseInt(parts[5]);   
    robotStrX = parseInt(parts[6]);  
    robotStrY = parseInt(parts[7]); 

    document.getElementById('app-title').innerText = rName.toUpperCase();
    if(rCoins) document.getElementById('val-coins').innerText = rCoins;

    if(rColor) {
        robotBaseColor = rColor;
        document.documentElement.style.setProperty('--c', rColor);
        document.documentElement.style.setProperty('--glow', rColor);
    }
    
    // Reset Layout Tracking
    document.getElementById('visor').innerHTML = '';
    minEyeX = 1000; maxEyeX = -1000;
    minEyeY = 1000; maxEyeY = -1000;
    
    console.log("Connected to " + rName + ". Waiting for layout...");
}

function addDynamicEye(dataString) {
    // Protocol: relX, relY, baseW, baseH
    let coords = dataString.split(',');
    let xOff = parseInt(coords[0]);
    let yOff = parseInt(coords[1]);
    let w = parseInt(coords[2]);
    let h = parseInt(coords[3]);

    const visor = document.getElementById('visor');
    const scale = 1.6; // Scale robot pixels (128x64) to Phone Visor (approx 220x80)

    let div = document.createElement('div');
    div.className = 'eye';
    
    // 1. Calculate Dimensions
    let sW = w * scale;
    let sH = h * scale;
    
    // Apply Stretch factors (from Identity)
    let sx = robotStrX ? (robotStrX / 100.0) : 1.0;
    let sy = robotStrY ? (robotStrY / 100.0) : 1.0;
    
    let finalW = sW * sx;
    let finalH = sH * sy;
    
    // 2. Position Logic (Centered)
    // We position relative to the CENTER (50% 50%) of the Visor
    // offset X scaled up
    let finalX = xOff * scale; 
    let finalY = yOff * scale;

    div.style.width = finalW + 'px';
    div.style.height = finalH + 'px';
    
    // Using calc() allows us to position relative to center without knowing container size
    div.style.left = `calc(50% + ${finalX}px)`;
    div.style.top = `calc(50% + ${finalY}px)`;

    // 3. Shape
    if(robotShape === 1) { 
        // RECTANGLE
        div.style.borderRadius = (robotRad * 2) + "px"; 
    } else {
        // CIRCLE
        div.style.borderRadius = "50%";
    }

    visor.appendChild(div);
    
    // 4. Update Visor Geometry Bounds
    // We track the edges of this eye relative to center 0,0
    let halfW = finalW / 2;
    let halfH = finalH / 2;
    
    if (finalX - halfW < minEyeX) minEyeX = finalX - halfW;
    if (finalX + halfW > maxEyeX) maxEyeX = finalX + halfW;
    if (finalY - halfH < minEyeY) minEyeY = finalY - halfH;
    if (finalY + halfH > maxEyeY) maxEyeY = finalY + halfH;
    
    updateVisorGeometry();
}

function updateVisorGeometry() {
    const visor = document.getElementById('visor');
    const paddingX = 40; // Space on sides
    const paddingY = 30; // Space on top/bottom
    const minW = 100;    // Minimum visual size
    const minH = 60;

    let contentW = (maxEyeX - minEyeX);
    let contentH = (maxEyeY - minEyeY);
    
    // Calculate new dimensions
    let finalW = Math.max(minW, contentW + paddingX);
    let finalH = Math.max(minH, contentH + paddingY);
    
    visor.style.width = finalW + "px";
    visor.style.height = finalH + "px";
    
    // Adjust border radius if it gets too tall relative to width
    // Keep it pill-shaped
    let rad = Math.min(finalW, finalH) / 2;
    visor.style.borderRadius = rad + "px";
}

// ... (Standard Input/BLE Handlers below) ...
function btnDown(e, cmd) {
    e.preventDefault(); 
    lastInputTime = Date.now(); 
    let state = btnState[cmd];
    if (state.repeat) return; 
    document.getElementById('btn-' + cmd).classList.add('pressing');
    if (isGameRunning) { send(cmd); return; }
    state.tapCount++;
    if (state.tapCount === 1) {
        send(cmd);
        state.tapTimer = setTimeout(() => {
            state.tapCount = 0; 
            if (document.getElementById('btn-' + cmd).classList.contains('pressing')) {
                state.repeat = setInterval(() => { send(cmd); lastInputTime = Date.now(); }, 200);
            }
        }, 800); 
    } else if (state.tapCount === 2) { send(cmd); send(cmd); state.tapCount = 0; }
}

function btnUp(e, cmd) {
    e.preventDefault();
    lastInputTime = Date.now();
    if (btnState[cmd].tapTimer) { clearTimeout(btnState[cmd].tapTimer); }
    if (btnState[cmd].repeat) { clearInterval(btnState[cmd].repeat); btnState[cmd].repeat = null; }
    document.getElementById('btn-' + cmd).classList.remove('pressing');
}

function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }
function openMenu() { document.getElementById('menuModal').style.display = 'flex'; send('Q'); let g = document.getElementById('cat-games'); g.style.maxHeight = g.scrollHeight + "px"; }
function closeMenu() { document.getElementById('menuModal').style.display = 'none'; }
function toggleCat(id) { const c = document.getElementById('cat-' + id); if (c.style.maxHeight) { c.style.maxHeight = null; } else { document.querySelectorAll('.cat-content').forEach(x => x.style.maxHeight = null); c.style.maxHeight = c.scrollHeight + "px"; } }
function forceSleep() { send('Z'); closeMenu(); document.getElementById('visor').className = "visor mood-sleep"; document.body.className = "mood-sleep"; }

let startY = 0;
const container = document.getElementById('app-container');
document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive: false});
document.addEventListener('touchend', e => { if (Math.abs(startY - e.changedTouches[0].clientY) > 50) scrollToPage(startY > e.changedTouches[0].clientY ? 2 : 1); }, {passive: false});
function scrollToPage(p) { container.style.transform = p === 2 ? "translateY(-100vh)" : "translateY(0)"; }

const sUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const cRX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const cTX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
let dev, serv, charRX;

async function connectBLE() {
    try {
        dev = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'IDC' }], optionalServices: [sUUID] });
        dev.addEventListener('gattserverdisconnected', onDisc);
        serv = await dev.gatt.connect();
        let svc = await serv.getPrimaryService(sUUID);
        charRX = await svc.getCharacteristic(cRX);
        let charTX = await svc.getCharacteristic(cTX);
        await charTX.startNotifications();
        charTX.addEventListener('characteristicvaluechanged', handleUpdate);
        
        document.getElementById('status').innerText = "ONLINE";
        document.getElementById('status').classList.add('on');
        document.getElementById('connectOverlay').style.display = 'none';
        document.getElementById('coin-box').style.display = 'block';
        document.getElementById('visor').classList.remove('mood-off');
        document.getElementById('nebula-bg').classList.add('alive'); 
        lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}

function onDisc() {
    document.getElementById('status').innerText = "OFFLINE";
    document.getElementById('status').classList.remove('on');
    document.getElementById('connectOverlay').style.display = 'block';
    document.getElementById('coin-box').style.display = 'none';
    document.getElementById('visor').className = "visor mood-off";
    document.body.className = ""; 
    document.getElementById('nebula-bg').classList.remove('alive');
    scrollToPage(1);
    
    // Clear dynamic eyes on disconnect
    document.getElementById('visor').innerHTML = '';
}

async function send(cmd) {
    if(!charRX) return;
    if (navigator.vibrate) navigator.vibrate(15); 
    await charRX.writeValue(new TextEncoder().encode(cmd));
}

function handleUpdate(event) {
    let val = new TextDecoder().decode(event.target.value);
    let parts = val.split(':');
    let type = parts[0]; let data = parts[1];

    if (type === 'I') { 
        applyRobotIdentity(data);
    }
    else if (type === 'L') {
        // NEW: Layout Packet Handler
        addDynamicEye(data);
    }
    else if (type === 'H') { 
        let scores = data.split(',');
        document.getElementById('hs-mem').innerText = "HS: " + scores[0];
        document.getElementById('hs-ref').innerText = "HS: " + scores[1];
        document.getElementById('hs-slot').innerText = "STRK: " + scores[2];
        document.getElementById('val-coins').innerText = scores[3];
    }
    else if (type === 'T') { 
        let txtDiv = document.getElementById('game-text');
        txtDiv.innerText = data;
        if(data.length > 0) txtDiv.classList.add('active'); else txtDiv.classList.remove('active');
        if (data === "GAME OVER" || data === "WINNER!" || data === "LOSE!") { setTimeout(() => { isGameRunning = false; }, 1000); }
    }
    else if (type === 'C') { document.getElementById('val-coins').innerText = data; }
    else if (type === 'A') { 
        currentHappiness = parseInt(data);
        initialVitalStates.hap = currentHappiness;
        updateBackgroundVitals(initialVitalStates);
        updateVisorMood(currentHappiness);
    }
    else if (type === 'M') { 
        let num = parseInt(data);
        let v = document.getElementById('visor');
        let b = document.body;
        v.className = "visor"; b.className = ""; 
        
        if(robotBaseColor) {
             document.documentElement.style.setProperty('--c', robotBaseColor);
             document.documentElement.style.setProperty('--glow', robotBaseColor);
        }

        if (num === 1) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); }
        if (num === 2) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
        if (num === 3) { v.classList.add('mood-tired'); b.classList.add('mood-tired'); }
        if (num === 5) { v.classList.add('mood-love'); b.classList.add('mood-love'); } 
        if (num === 0) v.classList.remove('mood-sleep'); 
        lastInputTime = Date.now(); 
    }
}
