const ENABLE_CHRISTMAS = true; 

const btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
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
    
    // --- APPLY CHRISTMAS THEME ---
    if(ENABLE_CHRISTMAS) {
        document.body.classList.add('theme-christmas');
    }

    // VISOR INTERACTIONS
    const visor = document.getElementById('visor');
    visor.addEventListener('click', (e) => {
        let rect = visor.getBoundingClientRect();
        if((e.clientX - rect.left) < rect.width / 2) send('L'); else send('R');
    });
    let moveCount = 0;
    visor.addEventListener('pointermove', (e) => {
        moveCount++;
        if(moveCount > 25) { 
            send('P'); 
            moveCount = 0;
            visor.style.transform = "scale(1.05)";
            setTimeout(() => visor.style.transform = "scale(1)", 200);
        }
    });
    visor.addEventListener('pointerleave', () => moveCount = 0);
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
    if (happiness >= 90) { v.classList.add('mood-love'); b.classList.add('mood-love'); }
    else if (happiness > 60) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); } 
    else if (happiness < 30) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
    
    // Apply robot base color ONLY if Christmas mode is disabled
    // If Christmas mode is ON, the CSS !important rules will handle the colors
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
        // Only set variables if NOT christmas mode
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
    document.getElementById('visor').innerHTML = '';
    minEyeX = 1000; maxEyeX = -1000;
    minEyeY = 1000; maxEyeY = -1000;
}

function addDynamicEye(dataString) {
    let coords = dataString.split(',');
    let xOff = parseInt(coords[0]);
    let yOff = parseInt(coords[1]);
    let w = parseInt(coords[2]);
    let h = parseInt(coords[3]);

    const visor = document.getElementById('visor');
    const scale = 1.6; 
    let div = document.createElement('div');
    div.className = 'eye';
    
    let finalW = w * scale;
    let finalH = h * scale;
    let finalX = xOff * scale; 
    let finalY = yOff * scale;

    div.style.width = finalW + 'px';
    div.style.height = finalH + 'px';
    div.style.left = `calc(50% + ${finalX}px)`;
    div.style.top = `calc(50% + ${finalY}px)`;
    
    if(h < 10) div.style.borderRadius = "2px"; else div.style.borderRadius = "50%";

    visor.appendChild(div);
    
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

// --- CONTROLS ---
function btnDown(e, cmd) {
    e.preventDefault(); lastInputTime = Date.now(); let state = btnState[cmd];
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
    e.preventDefault(); lastInputTime = Date.now();
    if (btnState[cmd].tapTimer) { clearTimeout(btnState[cmd].tapTimer); }
    if (btnState[cmd].repeat) { clearInterval(btnState[cmd].repeat); btnState[cmd].repeat = null; }
    document.getElementById('btn-' + cmd).classList.remove('pressing');
}

function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }

function openMenu() { document.getElementById('menuModal').style.display = 'flex'; send('Q'); }
function closeMenu() { document.getElementById('menuModal').style.display = 'none'; }
function openWorkshop() { document.getElementById('workshopModal').style.display = 'flex'; }
function closeWorkshop() { document.getElementById('workshopModal').style.display = 'none'; }
function forceSleep() { send('Z'); closeMenu(); document.getElementById('visor').className = "visor mood-sleep"; document.body.className = "mood-sleep"; }
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.m-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    event.target.classList.add('active');
}

// --- FACE BUILDER ---
let eyes = [{x: 44, y: 32, w: 24, h: 24, r: 12}, {x: 84, y: 32, w: 24, h: 24, r: 12}]; 
let canvas, ctx, selectedEyeIndex = -1;

function initCanvas() {
    canvas = document.getElementById('face-canvas');
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
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,256,128);
    // Force colors for editor preview if Christmas mode is on
    let strokeColor = ENABLE_CHRISTMAS ? "#ff0033" : robotBaseColor;
    let fillColor = ENABLE_CHRISTMAS ? "#ff0033" : robotBaseColor;
    
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

function updateEyeParam() {
    if(selectedEyeIndex === -1) return;
    eyes[selectedEyeIndex].w = parseInt(document.getElementById('edit-w').value);
    eyes[selectedEyeIndex].h = parseInt(document.getElementById('edit-h').value);
    eyes[selectedEyeIndex].r = parseInt(document.getElementById('edit-r').value);
    drawFace();
}

function centerEye() {
    if(selectedEyeIndex === -1) return;
    eyes[selectedEyeIndex].x = 64; 
    drawFace();
}

function mirrorEye() {
    if(selectedEyeIndex === -1) return;
    let src = eyes[selectedEyeIndex];
    let mirrorX = 128 - src.x;
    let found = -1;
    eyes.forEach((e, i) => {
        if(i !== selectedEyeIndex && Math.abs(e.x - mirrorX) < 5 && Math.abs(e.y - src.y) < 5) found = i;
    });
    if(found > -1) {
        eyes[found].w = src.w; eyes[found].h = src.h; eyes[found].r = src.r;
    } else if(eyes.length < 8) {
        eyes.push({x: mirrorX, y: src.y, w: src.w, h: src.h, r: src.r});
    }
    drawFace();
}

function deleteSelectedEye() {
    if(selectedEyeIndex === -1) return;
    eyes.splice(selectedEyeIndex, 1);
    selectEye(-1);
}
function addEye() { if(eyes.length < 8) { eyes.push({x: 64, y: 32, w: 20, h: 20, r: 5}); selectEye(eyes.length-1); } }
function clearCanvas() { eyes = []; selectEye(-1); drawFace(); }
function uploadFace() {
    let str = `U:${eyes.length}`;
    eyes.forEach(e => { str += `;${Math.floor(e.x-64)},${Math.floor(e.y-32)},${e.w},${e.h},${e.r||0}`; });
    send(str);
}
function applyPreset(id) {
    const presets = [
        "U:2;-20,0,24,24,12;20,0,24,24,12", 
        "U:1;0,0,40,40,20", 
        "U:4;-36,-2,14,14,7;36,-2,14,14,7;-16,5,26,26,13;16,5,26,26,13", 
        "U:3;0,-15,24,24,2;-18,10,18,18,2;18,10,18,18,2" 
    ];
    send(presets[id]);
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

// --- SYSTEM ---
function sendName() { let name = document.getElementById('rename-input').value; if(name) { send("N:" + name); document.getElementById('app-title').innerText = name.toUpperCase(); } }
function sendWeather() { let type = Math.random() > 0.5 ? 'R' : 'S'; send("W:" + type); }

// --- JOYSTICK ---
let joyZone = document.getElementById('joystick-zone');
let stick = document.getElementById('stick');
let isDraggingJoy = false;
joyZone.addEventListener('mousedown', () => isDraggingJoy = true);
joyZone.addEventListener('touchstart', () => isDraggingJoy = true);
window.addEventListener('mouseup', endJoy);
window.addEventListener('touchend', endJoy);
window.addEventListener('mousemove', moveJoy);
window.addEventListener('touchmove', moveJoy);
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
