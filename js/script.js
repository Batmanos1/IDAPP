// ==========================================
//  CONFIGURATION
// ==========================================
const sUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const cRX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const cTX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const btnState = { 
    L: { taps: 0, timer: null }, 
    R: { taps: 0, timer: null } 
};

let isGameRunning = false; 
let lastInputTime = Date.now();
let currentHappiness = 50; 
let robotBaseColor = "#00e5ff"; 

let minEyeX = 1000, maxEyeX = -1000;
let minEyeY = 1000, maxEyeY = -1000;
let currentVitals = { hap: 50, hun: 80, eng: 100 };

let dev, serv, charRX, charTX;
let snowInterval;

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    document.body.classList.add('offline');
    initCanvas(); 
    setupVisorInteractions();
});

// ==========================================
//  BLUETOOTH CONNECTION
// ==========================================
async function connectBLE() {
    try {
        dev = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'IDC' }], optionalServices: [sUUID] });
        dev.addEventListener('gattserverdisconnected', onDisc);
        serv = await dev.gatt.connect();
        let svc = await serv.getPrimaryService(sUUID);
        charRX = await svc.getCharacteristic(cRX);
        charTX = await svc.getCharacteristic(cTX);
        await charTX.startNotifications();
        charTX.addEventListener('characteristicvaluechanged', handleUpdate);
        
        // UI Updates on Connect
        let stat = document.getElementById('status');
        if(stat) {
            stat.innerText = "ONLINE"; 
            stat.classList.add('on'); 
        }
        let ov = document.getElementById('connectOverlay');
        if(ov) ov.style.display = 'none';
        
        // [NEW] Show Weather Box
        let wBox = document.getElementById('weather-box');
        if(wBox) wBox.style.display = 'flex';
        
        lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}

function onDisc() {
    let stat = document.getElementById('status');
    if(stat) {
        stat.innerText = "OFFLINE"; 
        stat.classList.remove('on'); 
    }
    let ov = document.getElementById('connectOverlay');
    if(ov) ov.style.display = 'block'; 
    
    let cb = document.getElementById('coin-box');
    if(cb) cb.style.display = 'none'; 
    
    // Hide Weather Box
    let wBox = document.getElementById('weather-box');
    if(wBox) wBox.style.display = 'none';

    document.getElementById('visor').className = "visor mood-off"; 
    document.body.className = ""; 
    document.body.classList.add('offline'); 
    let bg = document.getElementById('nebula-bg');
    if(bg) bg.classList.remove('alive'); 
    scrollToPage(1); 
    document.getElementById('visor').innerHTML = '';
}

async function send(cmd) { 
    if(!charRX) return; 
    if (navigator.vibrate) navigator.vibrate(15); 
    try { await charRX.writeValue(new TextEncoder().encode(cmd)); } catch(e){}
}

function handleUpdate(event) {
    let val = new TextDecoder().decode(event.target.value);
    let parts = val.split(':'); let type = parts[0]; let data = parts[1];
    
    if (type === 'I') applyRobotIdentity(data);
    else if (type === 'L') addDynamicEye(data);
    else if (type === 'H') { 
        let scores = data.split(','); 
        if(document.getElementById('hs-mem')) document.getElementById('hs-mem').innerText = "HS: " + scores[0]; 
        if(document.getElementById('hs-ref')) document.getElementById('hs-ref').innerText = "HS: " + scores[1]; 
        if(document.getElementById('hs-slot')) document.getElementById('hs-slot').innerText = "STRK: " + scores[2]; 
        if(document.getElementById('val-coins')) document.getElementById('val-coins').innerText = scores[3]; 
    }
    else if (type === 'T') { 
        let txtDiv = document.getElementById('game-text'); 
        if(txtDiv) {
            txtDiv.innerText = data; 
            if(data.length > 0) txtDiv.classList.add('active'); else txtDiv.classList.remove('active'); 
        }
        if (data === "GAME OVER" || data === "WINNER!" || data === "LOSE!") { setTimeout(() => { isGameRunning = false; }, 1000); } 
    }
    else if (type === 'C') { if(document.getElementById('val-coins')) document.getElementById('val-coins').innerText = data; }
    else if (type === 'A') { 
        currentVitals.hap = parseInt(data); currentHappiness = currentVitals.hap; 
        updateBackgroundVitals(currentVitals); updateVisorMood(currentHappiness); 
    }
    else if (type === 'M') { 
        let num = parseInt(data); 
        let v = document.getElementById('visor'); let b = document.body; 
        v.className = "visor"; b.className = ""; 
        
        // Respect Christmas Skin if active
        if (document.body.classList.contains('skin-christmas')) {
            // Keep christmas class
            b.classList.add('skin-christmas');
        } else if(robotBaseColor) { 
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

// ==========================================
//  [NEW] REAL WEATHER SYNC
// ==========================================
function syncWeather() {
    const btn = document.getElementById('btn-sync');
    if(!btn) return;
    btn.innerText = "LOCATING...";
    
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        btn.innerText = "NO GEO SUPPORT";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        btn.innerText = "FETCHING...";

        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            
            const temp = Math.round(data.current_weather.temperature);
            const wCode = data.current_weather.weathercode;
            
            let type = 0; 
            if (wCode >= 51) type = 1; 

            send("W:" + temp + "," + type);
            
            btn.innerText = "SENT: " + temp + "°C";
            setTimeout(() => { btn.innerText = "☁ SYNC LOCAL WEATHER"; }, 3000);

        } catch (error) {
            console.error("Weather Error:", error);
            btn.innerText = "API ERROR";
            setTimeout(() => { btn.innerText = "☁ SYNC LOCAL WEATHER"; }, 3000);
        }
    }, (err) => {
        console.warn("Geo Error: " + err.code);
        btn.innerText = "LOC PERMISSION DENIED";
        setTimeout(() => { btn.innerText = "☁ SYNC LOCAL WEATHER"; }, 3000);
    });
}

// ==========================================
//  [NEW] SKIN & SNOW LOGIC
// ==========================================
function setSkin(name) {
    document.body.className = ""; // Reset body classes
    document.querySelectorAll('.skin-dot').forEach(d => d.classList.remove('active'));
    
    if (name === 'christmas') {
        document.body.classList.add('skin-christmas');
        let dot = document.querySelector('.s-xmas');
        if(dot) dot.classList.add('active');
        startSnow();
    } else {
        let dot = document.querySelector('.s-def');
        if(dot) dot.classList.add('active');
        stopSnow(); 
        
        // Restore robot color
        if(robotBaseColor) {
             document.documentElement.style.setProperty('--c', robotBaseColor); 
             document.documentElement.style.setProperty('--glow', robotBaseColor);
        }
    }
}

function startSnow() {
    if(snowInterval) return; 
    const container = document.getElementById('snow-container');
    if(!container) return;
    container.style.display = 'block';
    
    snowInterval = setInterval(() => {
        const flake = document.createElement('div');
        flake.classList.add('snowflake');
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = Math.random() * 3 + 2 + 's'; 
        flake.style.opacity = Math.random();
        flake.innerHTML = '❄';
        container.appendChild(flake);
        setTimeout(() => { flake.remove(); }, 5000);
    }, 100);
}

function stopSnow() {
    clearInterval(snowInterval);
    snowInterval = null;
    const container = document.getElementById('snow-container');
    if(container) {
        container.innerHTML = ''; 
        container.style.display = 'none';
    }
}

// ==========================================
//  INPUT & INTERACTION
// ==========================================

// --- VISOR INTERACTIONS (Pet/Poke) ---
function setupVisorInteractions() {
    const visor = document.getElementById('visor');
    let isDragging = false;
    let startX = 0, startY = 0;
    let moveDistance = 0;
    let dragStartTime = 0;

    const isEyeTarget = (t) => t.classList.contains('eye');
    
    if (!visor) return;

    visor.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        moveDistance = 0;
        dragStartTime = Date.now();
        visor.setPointerCapture(e.pointerId);
    });

    visor.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;
        moveDistance += Math.sqrt(dx*dx + dy*dy);
        
        if (moveDistance > 30) {
            if (moveDistance % 60 < 10) { 
                send('P'); 
                visor.style.transform = `scale(1.02) rotate(${Math.sin(Date.now()/100)*1}deg)`;
            }
        }
        startX = e.clientX; startY = e.clientY;
    });

    visor.addEventListener('pointerup', (e) => {
        isDragging = false;
        visor.style.transform = "scale(1) rotate(0deg)";
        let duration = Date.now() - dragStartTime;

        if (moveDistance < 10 && duration < 400) {
            if (isEyeTarget(e.target)) {
                send('R'); 
                visor.classList.add('mood-angry');
                setTimeout(()=>visor.classList.remove('mood-angry'), 500);
            } else {
                let rect = visor.getBoundingClientRect();
                let relX = e.clientX - rect.left;
                if(relX < rect.width / 2) send('L'); else send('R');
            }
        }
    });
}

// --- BUTTONS (Single/Double Tap) ---
window.handleBtnInput = function(id) {
    if(isGameRunning) { send(id); return; } 
    
    let btn = btnState[id];
    btn.taps++;
    
    let el = document.getElementById('btn-' + id);
    if(el) {
        el.classList.add('pressing');
        setTimeout(() => el.classList.remove('pressing'), 150);
    }

    if (btn.taps === 1) {
        btn.timer = setTimeout(() => {
            if (id === 'L') send('H'); // Laugh
            if (id === 'R') send('K'); // Skitter
            btn.taps = 0;
        }, 300);
    } else {
        clearTimeout(btn.timer);
        if (id === 'L') send('S'); // Sing
        if (id === 'R') console.log("R-Double");
        btn.taps = 0;
    }
}
// Mapping for new UI calls (if index.html uses different names)
function btnDown(k) { handleBtnInput(k); }
function btnUp(k) { } 

// --- JOYSTICK ---
let joyZone = document.getElementById('joystick-zone');
let stick = document.getElementById('stick');
let isDraggingJoy = false;
if(joyZone) {
    joyZone.addEventListener('mousedown', () => isDraggingJoy = true);
    joyZone.addEventListener('touchstart', () => isDraggingJoy = true);
    window.addEventListener('mouseup', endJoy);
    window.addEventListener('touchend', endJoy);
    window.addEventListener('mousemove', moveJoy);
    window.addEventListener('touchmove', moveJoy);
}
function moveJoy(e) {
    if (!isDraggingJoy) return; e.preventDefault();
    const rect = joyZone.getBoundingClientRect();
    const cX = e.touches ? e.touches[0].clientX : e.clientX;
    const cY = e.touches ? e.touches[0].clientY : e.clientY;
    let x = cX - rect.left - 80; let y = cY - rect.top - 80;
    let dist = Math.sqrt(x*x + y*y);
    if (dist > 60) { x = (x / dist) * 60; y = (y / dist) * 60; }
    stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    let sendX = Math.floor((x / 60) * 50); let sendY = Math.floor((y / 60) * 30);
    if (Math.random() > 0.8) send(`J:${sendX},${sendY}`);
}
function endJoy() { if (!isDraggingJoy) return; isDraggingJoy = false; stick.style.transform = `translate(-50%, -50%)`; send(`J:0,0`); }

// --- SWIPE (Page Navigation) ---
let startY = 0; const container = document.getElementById('app-container');
function handleStart(y) { startY = y; }
function handleEnd(y) { 
    if(!container) return;
    if (Math.abs(startY - y) > 50) { scrollToPage(startY > y ? 2 : 1); } 
}
document.addEventListener('touchstart', e => handleStart(e.touches[0].clientY), {passive: false});
document.addEventListener('touchend', e => handleEnd(e.changedTouches[0].clientY), {passive: false});
document.addEventListener('mousedown', e => handleStart(e.clientY));
document.addEventListener('mouseup', e => handleEnd(e.clientY));
function scrollToPage(p) { if(container) container.style.transform = p === 2 ? "translateY(-100vh)" : "translateY(0)"; }

// ==========================================
//  WORKSHOP & EDITOR
// ==========================================
let eyes = [{x: 44, y: 32, w: 24, h: 24, r: 12}, {x: 84, y: 32, w: 24, h: 24, r: 12}]; 
let canvas, ctx, selectedEyeIndex = -1;

function initCanvas() {
    canvas = document.getElementById('face-canvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    drawFace();
    
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('touchstart', startDrag);
    canvas.addEventListener('mousemove', moveDrag);
    canvas.addEventListener('touchmove', moveDrag);
    canvas.addEventListener('mouseup', () => draggingEye = null);
    canvas.addEventListener('touchend', () => draggingEye = null);
}

function drawFace() {
    if(!ctx) return;
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,256,128);
    let strokeColor = document.body.classList.contains('skin-christmas') ? "#ff3333" : robotBaseColor;
    let fillColor = document.body.classList.contains('skin-christmas') ? "#ff3333" : robotBaseColor;
    
    ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.strokeRect(0,0,256,128);
    
    eyes.forEach((e, i) => {
        ctx.fillStyle = (i === selectedEyeIndex) ? "#fff" : fillColor;
        let cx = e.x * 2; let cy = e.y * 2;
        let cw = e.w * 2; let ch = e.h * 2;
        let cr = (e.r || 0) * 2;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(cx - cw/2, cy - ch/2, cw, ch, cr);
        else ctx.rect(cx - cw/2, cy - ch/2, cw, ch);
        ctx.fill();
    });
}

function renderLocalVisor(eyeList) {
    const visor = document.getElementById('visor');
    if(!visor) return;
    visor.innerHTML = ''; 
    minEyeX = 1000; maxEyeX = -1000; minEyeY = 1000; maxEyeY = -1000;
    const scale = 2.2; 

    eyeList.forEach(e => {
        let div = document.createElement('div');
        div.className = 'eye';
        let finalW = e.w * scale; let finalH = e.h * scale;
        let relX = (e.x - 64) * scale; let relY = (e.y - 32) * scale;

        div.style.width = finalW + 'px'; div.style.height = finalH + 'px';
        div.style.left = `calc(50% + ${relX}px)`; div.style.top = `calc(50% + ${relY}px)`;
        let rad = (e.r || 0) * scale; div.style.borderRadius = rad + "px";

        visor.appendChild(div);
        
        let halfW = finalW / 2; let halfH = finalH / 2;
        if (relX - halfW < minEyeX) minEyeX = relX - halfW;
        if (relX + halfW > maxEyeX) maxEyeX = relX + halfW;
        if (relY - halfH < minEyeY) minEyeY = relY - halfH;
        if (relY + halfH > maxEyeY) maxEyeY = relY + halfH;
    });
    updateVisorGeometry();
}

function updateVisorGeometry() {
    const visor = document.getElementById('visor');
    if(!visor) return;
    const paddingX = 40; const paddingY = 30; const minW = 100; const minH = 60;
    let contentW = (maxEyeX - minEyeX);
    let contentH = (maxEyeY - minEyeY);
    let finalW = Math.max(minW, contentW + paddingX);
    let finalH = Math.max(minH, contentH + paddingY);
    visor.style.width = finalW + "px";
    visor.style.height = finalH + "px";
    let rad = Math.min(finalW, finalH) / 2;
    visor.style.borderRadius = Math.min(30, rad) + "px";
}

// Editor Utilities
function selectEye(index) {
    selectedEyeIndex = index;
    let controls = document.getElementById('eye-controls');
    if(index > -1 && controls) {
        controls.style.display = 'block';
        document.getElementById('edit-w').value = eyes[index].w;
        document.getElementById('edit-h').value = eyes[index].h;
        document.getElementById('edit-r').value = eyes[index].r || 0;
    } else if (controls) {
        controls.style.display = 'none';
    }
    drawFace();
}

window.updateEyeParam = function() {
    if(selectedEyeIndex === -1) return;
    eyes[selectedEyeIndex].w = parseInt(document.getElementById('edit-w').value);
    eyes[selectedEyeIndex].h = parseInt(document.getElementById('edit-h').value);
    eyes[selectedEyeIndex].r = parseInt(document.getElementById('edit-r').value);
    drawFace();
}

window.addEye = function() { 
    if(eyes.length < 8) { 
        let offsetX = (eyes.length % 2 === 0) ? 20 : -20;
        let offsetY = (eyes.length > 2) ? 10 : 0;
        eyes.push({x: 64 + offsetX, y: 32 + offsetY, w: 24, h: 24, r: 5}); 
        selectEye(eyes.length-1); 
    } 
}
window.clearCanvas = function() { eyes = []; selectEye(-1); drawFace(); }
window.uploadFace = function() {
    let str = `U:${eyes.length}`;
    eyes.forEach(e => { str += `;${Math.floor(e.x-64)},${Math.floor(e.y-32)},${e.w},${e.h},${e.r||0}`; });
    send(str);
    renderLocalVisor(eyes);
    closeWorkshop();
}

// Dragging Logic
let draggingEye = null;
function getPos(e) {
    if(!canvas) return {x:0, y:0};
    const rect = canvas.getBoundingClientRect();
    const cX = e.touches ? e.touches[0].clientX : e.clientX;
    const cY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = 128 / rect.width;
    const scaleY = 64 / rect.height;
    return { x: (cX - rect.left) * scaleX, y: (cY - rect.top) * scaleY };
}
function startDrag(e) {
    let pos = getPos(e);
    let found = false;
    eyes.forEach((eye, i) => {
        if (pos.x >= eye.x - eye.w/2 && pos.x <= eye.x + eye.w/2 && pos.y >= eye.y - eye.h/2 && pos.y <= eye.y + eye.h/2) {
            draggingEye = eye;
            selectEye(i);
            found = true;
        }
    });
    if(!found) selectEye(-1);
}
function moveDrag(e) {
    if(!draggingEye) return;
    e.preventDefault();
    let pos = getPos(e);
    draggingEye.x = Math.floor(pos.x);
    draggingEye.y = Math.floor(pos.y);
    drawFace();
}

// --- IDENTITY & VITALS ---
function applyRobotIdentity(dataString) {
    let parts = dataString.split('|');
    if (parts.length < 8) return; 
    let rName = parts[1];
    let rCoins = parts[2];
    let rColor = parts[3]; 

    document.getElementById('app-title').innerText = rName.toUpperCase();
    if(document.getElementById('rename-input')) document.getElementById('rename-input').value = rName;
    
    if(rCoins) {
        let cb = document.getElementById('val-coins');
        if(cb) cb.innerText = rCoins;
        document.getElementById('coin-box').style.display = 'block';
    }
    if(rColor) {
        robotBaseColor = rColor;
        // Only apply if not in Christmas mode
        if(!document.body.classList.contains('skin-christmas')) {
            document.documentElement.style.setProperty('--c', rColor);
            document.documentElement.style.setProperty('--glow', rColor);
        }
        document.body.classList.remove('offline');
        document.getElementById('nebula-bg').classList.add('alive');
    }
    if (parts.length >= 12) {
        currentVitals.hap = parseInt(parts[9]);
        currentVitals.hun = parseInt(parts[10]);
        currentVitals.eng = parseInt(parts[11]);
        currentHappiness = currentVitals.hap;
        updateBackgroundVitals(currentVitals);
        updateVisorMood(currentHappiness);
    }
    if(document.getElementById('visor').children.length === 0) {
        document.getElementById('visor').innerHTML = '';
        minEyeX = 1000; maxEyeX = -1000; minEyeY = 1000; maxEyeY = -1000;
    }
}

function updateBackgroundVitals(vitals) {
    if(document.getElementById('bar-hap')) {
        document.getElementById('bar-hap').style.width = vitals.hap + '%';
        document.getElementById('val-hap').innerText = vitals.hap + '%';
        document.getElementById('bar-hun').style.width = vitals.hun + '%'; 
        document.getElementById('val-hun').innerText = vitals.hun + '%';
        document.getElementById('bar-eng').style.width = vitals.eng + '%';
        document.getElementById('val-eng').innerText = vitals.eng + '%';
    }
}

function addDynamicEye(dataString) {
    let coords = dataString.split(',');
    let newEyes = [];
    newEyes.push({ 
        x: parseInt(coords[0]) + 64, 
        y: parseInt(coords[1]) + 32, 
        w: parseInt(coords[2]), 
        h: parseInt(coords[3]),
        r: parseInt(coords[3])/2 
    });
    // Append to DOM immediately for live loading
    renderLocalVisor(newEyes);
}

// --- MENUS ---
function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }
function openMenu() { document.getElementById('menuModal').style.display = 'flex'; send('Q'); }
function closeMenu() { document.getElementById('menuModal').style.display = 'none'; }
function openWorkshop() { document.getElementById('workshopModal').style.display = 'flex'; }
function closeWorkshop() { document.getElementById('workshopModal').style.display = 'none'; }
function checkIdleStatus() {
    if (document.getElementById('status').innerText === "ONLINE" && (Date.now() - lastInputTime > 5000)) {
        updateVisorMood(currentHappiness);
    }
}
function updateVisorMood(happiness) {
    let v = document.getElementById('visor');
    let b = document.body;
    v.className = "visor"; b.className = "";
    if (document.body.classList.contains('skin-christmas')) b.classList.add('skin-christmas');
    
    if (happiness >= 90) { v.classList.add('mood-love'); b.classList.add('mood-love'); }
    else if (happiness > 60) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); } 
    else if (happiness < 30) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
}
