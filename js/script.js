const ENABLE_CHRISTMAS = false; 

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

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    document.body.classList.add('offline');
    initCanvas(); 
    
    if(ENABLE_CHRISTMAS) {
        document.body.classList.add('theme-christmas');
        startCartoonSnow();
    }

    setupVisorInteractions();
});

// --- NEW VISOR INTERACTIONS (Pet vs Poke) ---
function setupVisorInteractions() {
    const visor = document.getElementById('visor');
    let isDragging = false;
    let startX = 0, startY = 0;
    let moveDistance = 0;
    let dragStartTime = 0;

    // Helper to check if we touched an eye div
    const isEyeTarget = (t) => t.classList.contains('eye');

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
        
        // PETTING LOGIC (Glide/Rub)
        // Must move significantly (>30px) AND not be starting on an eye (optional constraint)
        // Or just allow petting anywhere if moving
        if (moveDistance > 30) {
            // Throttle sending 'P' so we don't flood bluetooth
            if (moveDistance % 60 < 10) { 
                send('P'); 
                // Visual feedback
                visor.style.transform = `scale(1.02) rotate(${Math.sin(Date.now()/100)*1}deg)`;
            }
        }
        startX = e.clientX; startY = e.clientY;
    });

    visor.addEventListener('pointerup', (e) => {
        isDragging = false;
        visor.style.transform = "scale(1) rotate(0deg)";
        let duration = Date.now() - dragStartTime;

        // TAP LOGIC (Short duration, low movement)
        if (moveDistance < 10 && duration < 400) {
            if (isEyeTarget(e.target)) {
                // TAPPED EYE -> MAD
                send('R'); 
                // Shake Animation
                visor.classList.add('mood-angry');
                setTimeout(()=>visor.classList.remove('mood-angry'), 500);
            } else {
                // TAPPED EMPTY SPACE -> LOOK/PET
                // Check if left or right side of visor
                let rect = visor.getBoundingClientRect();
                let relX = e.clientX - rect.left;
                if(relX < rect.width / 2) send('L'); else send('R');
            }
        }
    });
}

// --- BUTTON LOGIC (Single vs Double Tap) ---
// HTML calls this: onclick="handleBtnInput('L')"
window.handleBtnInput = function(id) {
    if(isGameRunning) { send(id); return; } 
    
    let btn = btnState[id];
    btn.taps++;
    
    // UI Feedback
    let el = document.getElementById('btn-' + id);
    el.classList.add('pressing');
    setTimeout(() => el.classList.remove('pressing'), 150);

    if (btn.taps === 1) {
        // Wait 300ms to see if second tap arrives
        btn.timer = setTimeout(() => {
            // SINGLE TAP EXECUTED
            if (id === 'L') send('H'); // Laugh
            if (id === 'R') send('K'); // Skitter
            btn.taps = 0;
        }, 300);
    } else {
        // DOUBLE TAP EXECUTED
        clearTimeout(btn.timer);
        if (id === 'L') send('S'); // Sing
        if (id === 'R') {
            // Right double tap reserved
            console.log("R-Double");
        }
        btn.taps = 0;
    }
}

// --- CARTOON SNOW ---
function startCartoonSnow() {
    setInterval(() => {
        const flake = document.createElement('div');
        flake.classList.add('snowflake');
        flake.innerText = Math.random() > 0.5 ? '❄' : '❅';
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = Math.random() * 3 + 2 + 's';
        flake.style.fontSize = Math.random() * 10 + 10 + 'px';
        let container = document.getElementById('cartoon-snow') || document.body;
        container.appendChild(flake);
        setTimeout(() => { flake.remove(); }, 5000);
    }, 300);
}

// --- STANDARD APP LOGIC ---

function checkIdleStatus() {
    if (document.getElementById('status').innerText === "ONLINE" && (Date.now() - lastInputTime > 5000)) {
        updateVisorMood(currentHappiness);
    }
}

function updateVisorMood(happiness) {
    let v = document.getElementById('visor');
    let b = document.body;
    v.className = "visor"; b.className = "";
    if (happiness >= 90) { v.classList.add('mood-love'); b.classList.add('mood-love'); }
    else if (happiness > 60) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); } 
    else if (happiness < 30) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
    
    if(robotBaseColor && !ENABLE_CHRISTMAS) {
        document.documentElement.style.setProperty('--c', robotBaseColor);
        document.documentElement.style.setProperty('--glow', robotBaseColor);
    }
}

function updateBackgroundVitals(vitals) {
    document.getElementById('bar-hap').style.width = vitals.hap + '%';
    document.getElementById('val-hap').innerText = vitals.hap + '%';
    document.getElementById('bar-hun').style.width = vitals.hun + '%'; 
    document.getElementById('val-hun').innerText = vitals.hun + '%';
    document.getElementById('bar-eng').style.width = vitals.eng + '%';
    document.getElementById('val-eng').innerText = vitals.eng + '%';
}

function applyRobotIdentity(dataString) {
    let parts = dataString.split('|');
    if (parts.length < 8) return; 
    let rName = parts[1];
    let rCoins = parts[2];
    let rColor = parts[3]; 

    document.getElementById('app-title').innerText = rName.toUpperCase();
    if(document.getElementById('rename-input')) document.getElementById('rename-input').value = rName;
    
    if(rCoins) {
        document.getElementById('val-coins').innerText = rCoins;
        document.getElementById('coin-box').style.display = 'block';
    }
    if(rColor) {
        robotBaseColor = rColor;
        if(!ENABLE_CHRISTMAS) {
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

function addDynamicEye(dataString) {
    let coords = dataString.split(',');
    let xOff = parseInt(coords[0]);
    let yOff = parseInt(coords[1]);
    let w = parseInt(coords[2]);
    let h = parseInt(coords[3]);
    let r = (h < 10) ? 2 : (Math.min(w,h)/2);

    const visor = document.getElementById('visor');
    const scale = 2.2; 
    let div = document.createElement('div');
    div.className = 'eye';
    
    let finalW = w * scale; let finalH = h * scale;
    let finalX = xOff * scale; let finalY = yOff * scale;

    div.style.width = finalW + 'px'; div.style.height = finalH + 'px';
    div.style.left = `calc(50% + ${finalX}px)`; div.style.top = `calc(50% + ${finalY}px)`;
    div.style.borderRadius = r * scale + "px";

    visor.appendChild(div);
    
    let halfW = finalW / 2; let halfH = finalH / 2;
    if (finalX - halfW < minEyeX) minEyeX = finalX - halfW;
    if (finalX + halfW > maxEyeX) maxEyeX = finalX + halfW;
    if (finalY - halfH < minEyeY) minEyeY = finalY - halfH;
    if (finalY + halfH > maxEyeY) maxEyeY = finalY + halfH;
    updateVisorGeometry();
}

function updateVisorGeometry() {
    const visor = document.getElementById('visor');
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

// --- WORKSHOP / EDITOR LOGIC ---
let eyes = [{x: 44, y: 32, w: 24, h: 24, r: 12}, {x: 84, y: 32, w: 24, h: 24, r: 12}]; 
let canvas, ctx, selectedEyeIndex = -1;

function initCanvas() {
    canvas = document.getElementById('face-canvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    drawFace();
    
    // Mouse/Touch events for Editor
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('touchstart', startDrag);
    canvas.addEventListener('mousemove', moveDrag);
    canvas.addEventListener('touchmove', moveDrag);
    canvas.addEventListener('mouseup', () => draggingEye = null);
    canvas.addEventListener('touchend', () => draggingEye = null);
}

function drawFace() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,256,128);
    let strokeColor = ENABLE_CHRISTMAS ? "#ff3333" : robotBaseColor;
    let fillColor = ENABLE_CHRISTMAS ? "#ff3333" : robotBaseColor;
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

function selectEye(index) {
    selectedEyeIndex = index;
    let controls = document.getElementById('eye-controls');
    if(index > -1) {
        controls.style.display = 'block';
        document.getElementById('edit-w').value = eyes[index].w;
        document.getElementById('edit-h').value = eyes[index].h;
        document.getElementById('edit-r').value = eyes[index].r || 0;
    } else {
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

window.centerEye = function() { if(selectedEyeIndex !== -1) { eyes[selectedEyeIndex].x = 64; drawFace(); } }
window.mirrorEye = function() {
    if(selectedEyeIndex === -1) return;
    let src = eyes[selectedEyeIndex];
    let mirrorX = 128 - src.x;
    let found = -1;
    eyes.forEach((e, i) => { if(i !== selectedEyeIndex && Math.abs(e.x - mirrorX) < 5 && Math.abs(e.y - src.y) < 5) found = i; });
    if(found > -1) { eyes[found].w = src.w; eyes[found].h = src.h; eyes[found].r = src.r; } 
    else if(eyes.length < 8) { eyes.push({x: mirrorX, y: src.y, w: src.w, h: src.h, r: src.r}); }
    drawFace();
}
window.deleteSelectedEye = function() { if(selectedEyeIndex !== -1) { eyes.splice(selectedEyeIndex, 1); selectEye(-1); } }
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
window.applyPreset = function(id) {
    const presets = [
        "U:2;-20,0,24,24,12;20,0,24,24,12", 
        "U:1;0,0,40,40,20", 
        "U:4;-36,-2,14,14,7;36,-2,14,14,7;-16,5,26,26,13;16,5,26,26,13", 
        "U:3;0,-15,24,24,2;-18,10,18,18,2;18,10,18,18,2" 
    ];
    send(presets[id]);
    let parts = presets[id].split(';');
    let count = parseInt(parts[0].split(':')[1]);
    let newEyes = [];
    for(let i=1; i<=count; i++) {
        let p = parts[i].split(',');
        newEyes.push({ x: parseInt(p[0]) + 64, y: parseInt(p[1]) + 32, w: parseInt(p[2]), h: parseInt(p[3]), r: parseInt(p[4]) });
    }
    eyes = newEyes;
    drawFace();
    renderLocalVisor(newEyes);
    closeWorkshop();
}

let draggingEye = null;
function getPos(e) {
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

// --- GENERAL UTILS ---
function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }
function openMenu() { document.getElementById('menuModal').style.display = 'flex'; send('Q'); }
function closeMenu() { document.getElementById('menuModal').style.display = 'none'; }
function openWorkshop() { document.getElementById('workshopModal').style.display = 'flex'; }
function closeWorkshop() { document.getElementById('workshopModal').style.display = 'none'; }
function forceSleep() { send('Z'); closeMenu(); document.getElementById('visor').className = "visor mood-sleep"; document.body.className = "mood-sleep"; }
window.sendName = function() { let name = document.getElementById('rename-input').value; if(name) { send("N:" + name); document.getElementById('app-title').innerText = name.toUpperCase(); } }
window.sendWeather = function() { let type = Math.random() > 0.5 ? 'R' : 'S'; send("W:" + type); }
window.switchTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.m-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    event.target.classList.add('active');
}

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

// --- SWIPE ---
let startY = 0; const container = document.getElementById('app-container');
function handleStart(y) { startY = y; }
function handleEnd(y) { if (Math.abs(startY - y) > 50) { scrollToPage(startY > y ? 2 : 1); } }
document.addEventListener('touchstart', e => handleStart(e.touches[0].clientY), {passive: false});
document.addEventListener('touchend', e => handleEnd(e.changedTouches[0].clientY), {passive: false});
document.addEventListener('mousedown', e => handleStart(e.clientY));
document.addEventListener('mouseup', e => handleEnd(e.clientY));
function scrollToPage(p) { container.style.transform = p === 2 ? "translateY(-100vh)" : "translateY(0)"; }

// --- BLE ---
const sUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; const cRX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; const cTX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
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
        document.getElementById('status').innerText = "ONLINE"; document.getElementById('status').classList.add('on'); document.getElementById('connectOverlay').style.display = 'none'; lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}
function onDisc() {
    document.getElementById('status').innerText = "OFFLINE"; document.getElementById('status').classList.remove('on'); document.getElementById('connectOverlay').style.display = 'block'; document.getElementById('coin-box').style.display = 'none'; document.getElementById('visor').className = "visor mood-off"; document.body.className = ""; document.body.classList.add('offline'); document.getElementById('nebula-bg').classList.remove('alive'); scrollToPage(1); document.getElementById('visor').innerHTML = '';
}
async function send(cmd) { if(!charRX) return; if (navigator.vibrate) navigator.vibrate(15); await charRX.writeValue(new TextEncoder().encode(cmd)); }
function handleUpdate(event) {
    let val = new TextDecoder().decode(event.target.value);
    let parts = val.split(':'); let type = parts[0]; let data = parts[1];
    if (type === 'I') applyRobotIdentity(data);
    else if (type === 'L') addDynamicEye(data);
    else if (type === 'H') { let scores = data.split(','); document.getElementById('hs-mem').innerText = "HS: " + scores[0]; document.getElementById('hs-ref').innerText = "HS: " + scores[1]; document.getElementById('hs-slot').innerText = "STRK: " + scores[2]; document.getElementById('val-coins').innerText = scores[3]; }
    else if (type === 'T') { let txtDiv = document.getElementById('game-text'); txtDiv.innerText = data; if(data.length > 0) txtDiv.classList.add('active'); else txtDiv.classList.remove('active'); if (data === "GAME OVER" || data === "WINNER!" || data === "LOSE!") { setTimeout(() => { isGameRunning = false; }, 1000); } }
    else if (type === 'C') { document.getElementById('val-coins').innerText = data; }
    else if (type === 'A') { currentVitals.hap = parseInt(data); currentHappiness = currentVitals.hap; updateBackgroundVitals(currentVitals); updateVisorMood(currentHappiness); }
    else if (type === 'M') { let num = parseInt(data); let v = document.getElementById('visor'); let b = document.body; v.className = "visor"; b.className = ""; if(robotBaseColor) { document.documentElement.style.setProperty('--c', robotBaseColor); document.documentElement.style.setProperty('--glow', robotBaseColor); } if (num === 1) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); } if (num === 2) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); } if (num === 3) { v.classList.add('mood-tired'); b.classList.add('mood-tired'); } if (num === 5) { v.classList.add('mood-love'); b.classList.add('mood-love'); } if (num === 0) v.classList.remove('mood-sleep'); lastInputTime = Date.now(); }
}

