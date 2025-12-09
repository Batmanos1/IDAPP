const btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
let isGameRunning = false; 
let lastInputTime = Date.now();
let currentHappiness = 50; 
let robotBaseColor = "#00e5ff"; 

// Identity Variables
let robotShape = 0; 
let robotRad = 0;   
// Stretch factors are kept for reference but not applied to dimensions anymore
let robotStrX = 100;  
let robotStrY = 100; 

// Track Layout Bounds for Auto-Sizing
let minEyeX = 1000, maxEyeX = -1000;
let minEyeY = 1000, maxEyeY = -1000;

// Vitals Container
let currentVitals = { hap: 50, hun: 80, eng: 100 };

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    // Start "dimmed"
    document.body.classList.add('offline');
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
    // Updates UI Bars with safety checks
    let h = vitals.hap || 0;
    let u = vitals.hun || 0;
    let e = vitals.eng || 0;

    document.getElementById('bar-hap').style.width = h + '%';
    document.getElementById('val-hap').innerText = h + '%';

    document.getElementById('bar-hun').style.width = u + '%'; 
    document.getElementById('val-hun').innerText = u + '%';

    document.getElementById('bar-eng').style.width = e + '%';
    document.getElementById('val-eng').innerText = e + '%';
}

function applyRobotIdentity(dataString) {
    // Protocol: 
    // 0:Family | 1:Name | 2:Coins | 3:Color | 4:Shape | 5:Rad | 6:StrX | 7:StrY | 8:Layout
    // 9:Affection | 10:Hunger | 11:Energy
    
    console.log("Applying Identity: " + dataString); // DEBUG
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
    
    if(rCoins) {
        document.getElementById('val-coins').innerText = rCoins;
        document.getElementById('coin-box').style.display = 'block';
    }

    if(rColor) {
        robotBaseColor = rColor;
        document.documentElement.style.setProperty('--c', rColor);
        document.documentElement.style.setProperty('--glow', rColor);
        document.body.classList.remove('offline');
    }
    
    // --- SYNC VITALS ---
    if (parts.length >= 12) {
        currentVitals.hap = parseInt(parts[9]);
        currentVitals.hun = parseInt(parts[10]);
        currentVitals.eng = parseInt(parts[11]);
        currentHappiness = currentVitals.hap;
        
        updateBackgroundVitals(currentVitals);
        updateVisorMood(currentHappiness);
    }
    
    // Reset Layout Tracking for new eyes
    document.getElementById('visor').innerHTML = '';
    minEyeX = 1000; maxEyeX = -1000;
    minEyeY = 1000; maxEyeY = -1000;
    
    console.log("Connected to " + rName);
}

function addDynamicEye(dataString) {
    console.log("Received Layout Packet: " + dataString); // DEBUG
    
    // Protocol: relX, relY, baseW, baseH
    let coords = dataString.split(',');
    let xOff = parseInt(coords[0]);
    let yOff = parseInt(coords[1]);
    let w = parseInt(coords[2]);
    let h = parseInt(coords[3]);

    const visor = document.getElementById('visor');
    const scale = 1.6; // Scale factor for phone screen

    let div = document.createElement('div');
    div.className = 'eye';
    
    // 1. Calculate Dimensions (No extra stretch math needed)
    let finalW = w * scale;
    let finalH = h * scale;
    
    // 2. Position Logic
    let finalX = xOff * scale; 
    let finalY = yOff * scale;

    div.style.width = finalW + 'px';
    div.style.height = finalH + 'px';
    // Center alignment
    div.style.left = `calc(50% + ${finalX}px)`;
    div.style.top = `calc(50% + ${finalY}px)`;

    // 3. Shape Handling
    if(robotShape === 1) { 
        // RECTANGLE (Glitch/Monster)
        // If Radius is 0, it's a sharp square. If >0, rounded.
        // We multiply radius by scale to match visual size
        let calcRad = robotRad * scale;
        div.style.borderRadius = calcRad + "px"; 
    } else {
        // CIRCLE (Standard/Ghost)
        div.style.borderRadius = "50%";
    }

    visor.appendChild(div);
    
    // 4. Update Visor Geometry Bounds
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
    const paddingX = 40; 
    const paddingY = 30; 
    const minW = 100;    
    const minH = 60;

    let contentW = (maxEyeX - minEyeX);
    let contentH = (maxEyeY - minEyeY);
    
    let finalW = Math.max(minW, contentW + paddingX);
    let finalH = Math.max(minH, contentH + paddingY);
    
    visor.style.width = finalW + "px";
    visor.style.height = finalH + "px";
    
    // Auto-adjust corners to look nice (pill shape vs box)
    let rad = Math.min(finalW, finalH) / 2;
    // Cap radius at 30px for a "tech" look, unless it's very small
    visor.style.borderRadius = Math.min(30, rad) + "px";
}

// ... (Input Handlers) ...
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

// --- SWIPE LOGIC (Unified Touch & Mouse) ---
function handleStart(y) { startY = y; }
function handleEnd(y) {
    if (Math.abs(startY - y) > 50) {
        scrollToPage(startY > y ? 2 : 1);
    }
}

// Touch Events
document.addEventListener('touchstart', e => handleStart(e.touches[0].clientY), {passive: false});
document.addEventListener('touchend', e => handleEnd(e.changedTouches[0].clientY), {passive: false});

// Mouse Events (PC Swipe)
document.addEventListener('mousedown', e => handleStart(e.clientY));
document.addEventListener('mouseup', e => handleEnd(e.clientY));

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
    document.body.classList.add('offline'); 
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
        document.getElementById('val-coins').innerText = scores[3]; // Update coin text
    }
    else if (type === 'T') { 
        let txtDiv = document.getElementById('game-text');
        txtDiv.innerText = data;
        if(data.length > 0) txtDiv.classList.add('active'); else txtDiv.classList.remove('active');
        if (data === "GAME OVER" || data === "WINNER!" || data === "LOSE!") { setTimeout(() => { isGameRunning = false; }, 1000); }
    }
    else if (type === 'C') { document.getElementById('val-coins').innerText = data; }
    else if (type === 'A') { 
        // This is a direct affection update (single value update)
        currentVitals.hap = parseInt(data);
        currentHappiness = currentVitals.hap;
        updateBackgroundVitals(currentVitals);
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
