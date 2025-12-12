// ==========================================
//  CONFIGURATION
// ==========================================
const sUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const cRX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const cTX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const btnState = { L: { taps: 0, timer: null }, R: { taps: 0, timer: null } };

let isGameRunning = false; 
let lastInputTime = Date.now();
let currentHappiness = 50; 
let robotBaseColor = "#00e5ff"; 
let weatherAutoInterval = null;

// Canvas / Editor Vars
let eyes = [{x: 44, y: 32, w: 24, h: 24, r: 12}, {x: 84, y: 32, w: 24, h: 24, r: 12}]; 
let canvas, ctx, selectedEyeIndex = -1, draggingEye = null;

let dev, serv, charRX, charTX, snowInterval;

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    initCanvas(); 
    setupVisorInteractions();
    setupJoystick();
    renderLocalVisor(eyes); 
});

// ==========================================
//  BLUETOOTH
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
        
        document.getElementById('status').innerText = "ONLINE"; 
        document.getElementById('connectOverlay').style.display = 'none';
        lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}

function onDisc() {
    document.getElementById('status').innerText = "OFFLINE"; 
    document.getElementById('connectOverlay').style.display = 'block'; 
    document.body.classList.add('offline'); 
    if(weatherAutoInterval) clearInterval(weatherAutoInterval);
}

async function send(cmd) { 
    if(!charRX) return; 
    try { await charRX.writeValue(new TextEncoder().encode(cmd)); } catch(e){}
}

function handleUpdate(event) {
    let val = new TextDecoder().decode(event.target.value);
    let parts = val.split(':'); let type = parts[0]; let data = parts[1];
    
    if (type === 'I') applyRobotIdentity(data);
    else if (type === 'L') addDynamicEye(data);
    else if (type === 'C') { document.getElementById('val-coins').innerText = data; }
    else if (type === 'M') updateMood(parseInt(data));
    else if (type === 'A') { updateVitals(parseInt(data)); } // Simple Affection Update
}

function applyRobotIdentity(data) {
    let parts = data.split('|');
    if (parts.length > 1) {
        document.getElementById('app-title').innerText = parts[1].toUpperCase();
        document.getElementById('rename-input').value = parts[1];
    }
    if (parts.length > 2) {
        document.getElementById('coin-box').style.display = 'block';
        document.getElementById('val-coins').innerText = parts[2];
    }
    // Update Vitals Bars if data exists
    if (parts.length >= 12) {
        updateBackgroundVitals({
            hap: parseInt(parts[9]),
            hun: parseInt(parts[10]),
            eng: parseInt(parts[11])
        });
    }
    if (parts.length > 3 && !document.body.classList.contains('skin-christmas')) {
        robotBaseColor = parts[3];
        document.documentElement.style.setProperty('--c', robotBaseColor);
        document.documentElement.style.setProperty('--glow', robotBaseColor);
    }
}

function updateVitals(aff) {
    document.getElementById('bar-hap').style.width = aff + '%';
    document.getElementById('val-hap').innerText = aff + '%';
}

function updateBackgroundVitals(v) {
    document.getElementById('bar-hap').style.width = v.hap + '%';
    document.getElementById('val-hap').innerText = v.hap + '%';
    document.getElementById('bar-hun').style.width = v.hun + '%';
    document.getElementById('val-hun').innerText = v.hun + '%';
    document.getElementById('bar-eng').style.width = v.eng + '%';
    document.getElementById('val-eng').innerText = v.eng + '%';
}

// ==========================================
//  INTERACTION
// ==========================================
function setupVisorInteractions() {
    const v = document.getElementById('visor');
    if(!v) return;
    v.addEventListener('pointerdown', () => send('P')); 
}

window.handleBtnInput = function(id) {
    if(isGameRunning) { send(id); return; } 
    let btn = btnState[id]; btn.taps++;
    let el = document.getElementById('btn-' + id);
    if(el) { el.classList.add('pressing'); setTimeout(() => el.classList.remove('pressing'), 150); }

    if (btn.taps === 1) {
        btn.timer = setTimeout(() => {
            if (id === 'L') send('H'); if (id === 'R') send('K');
            btn.taps = 0;
        }, 300);
    } else {
        clearTimeout(btn.timer);
        if (id === 'L') send('S');
        btn.taps = 0;
    }
}
function btnDown(k) { handleBtnInput(k); }
function btnUp(k) { } 

function setupJoystick() {
    let zone = document.getElementById('joystick-zone');
    let stick = document.getElementById('stick');
    let drag = false;
    
    const move = (e) => {
        if (!drag) return; e.preventDefault();
        const rect = zone.getBoundingClientRect();
        const cX = e.touches ? e.touches[0].clientX : e.clientX;
        const cY = e.touches ? e.touches[0].clientY : e.clientY;
        let x = cX - rect.left - 70; let y = cY - rect.top - 70; 
        let dist = Math.sqrt(x*x + y*y);
        if (dist > 50) { x = (x / dist) * 50; y = (y / dist) * 50; }
        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        let sx = Math.floor(x); let sy = Math.floor(y * 0.6); 
        if (Math.random() > 0.8) send(`J:${sx},${sy}`);
    };
    
    const end = () => { drag = false; stick.style.transform = "translate(-50%, -50%)"; send("J:0,0"); };
    zone.addEventListener('mousedown', () => drag = true);
    zone.addEventListener('touchstart', () => drag = true);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
}

// ==========================================
//  SYSTEM, WEATHER & MENUS
// ==========================================
function syncWeather() {
    let btn = document.getElementById('btn-sync'); btn.innerText = "WAIT...";
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            let res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`);
            let data = await res.json();
            let temp = Math.round(data.current_weather.temperature);
            let code = data.current_weather.weathercode >= 51 ? 1 : 0;
            send(`W:${temp},${code}`);
            btn.innerText = `UPDATED: ${temp}°C`;
            
            // AUTO UPDATE LOGIC
            if (!weatherAutoInterval) {
                 weatherAutoInterval = setInterval(syncWeather, 1800000); // 30 Minutes
            }
        } catch(e) { btn.innerText = "ERROR"; }
    });
}

function setSkin(name) {
    document.querySelectorAll('.skin-btn').forEach(d => d.classList.remove('active'));
    document.body.className = "";
    
    if (name === 'christmas') {
        document.body.classList.add('skin-christmas'); 
        document.querySelector('.s-xmas').classList.add('active');
        startSnow();
    } else {
        document.querySelector('.s-def').classList.add('active'); 
        stopSnow();
        document.documentElement.style.setProperty('--c', robotBaseColor);
        document.documentElement.style.setProperty('--glow', robotBaseColor);
    }
    drawFace();
}

function startSnow() {
    if(snowInterval) return;
    snowInterval = setInterval(() => {
        let f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random()*100+'vw'; f.style.animationDuration = (Math.random()*3+2)+'s';
        document.getElementById('snow-container').appendChild(f);
        setTimeout(()=>f.remove(), 5000);
    }, 200);
}
function stopSnow() { clearInterval(snowInterval); snowInterval = null; document.getElementById('snow-container').innerHTML = ''; }

function renameRobot() {
    let n = document.getElementById('rename-input').value;
    if(n) { send("N:" + n); document.getElementById('app-title').innerText = n.toUpperCase(); }
}

function updateMood(m) {
    let v = document.getElementById('visor'); v.className = "visor";
    if (m===1) v.classList.add('mood-happy'); if (m===2) v.classList.add('mood-angry');
    if (m===5) v.classList.add('mood-love');
}

// Menus
function openMenu() { document.getElementById('menuModal').style.display = 'flex'; send('Q'); }
function closeMenu() { document.getElementById('menuModal').style.display = 'none'; }
function openWorkshop() { document.getElementById('workshopModal').style.display = 'flex'; initCanvas(); }
function closeWorkshop() { document.getElementById('workshopModal').style.display = 'none'; }
function checkIdleStatus() { /* Optional mood revert */ }
function addDynamicEye(data) { /* Optional dynamic layout */ }

// GAMES
function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }

// EDITOR CANVAS
function initCanvas() {
    canvas = document.getElementById('face-canvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    
    const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
        return { x: x * (256/r.width), y: y * (128/r.height) };
    };
    
    const start = (e) => {
        let p = getPos(e); let found = false;
        eyes.forEach((eye, i) => {
            if (p.x >= (eye.x*2)-eye.w && p.x <= (eye.x*2)+eye.w && p.y >= (eye.y*2)-eye.h && p.y <= (eye.y*2)+eye.h) {
                draggingEye = eye; selectedEyeIndex = i; found = true;
                document.getElementById('eye-controls').style.display = 'flex';
                document.getElementById('edit-w').value = eye.w; document.getElementById('edit-h').value = eye.h; document.getElementById('edit-r').value = eye.r || 0;
            }
        });
        if(!found) { selectedEyeIndex = -1; document.getElementById('eye-controls').style.display = 'none'; }
        drawFace();
    };
    const move = (e) => {
        if(!draggingEye) return; e.preventDefault();
        let p = getPos(e); draggingEye.x = Math.floor(p.x / 2); draggingEye.y = Math.floor(p.y / 2);
        drawFace();
    };
    canvas.addEventListener('mousedown', start); canvas.addEventListener('touchstart', start);
    canvas.addEventListener('mousemove', move); canvas.addEventListener('touchmove', move);
    window.addEventListener('mouseup', () => draggingEye=null); window.addEventListener('touchend', () => draggingEye=null);
}

function drawFace() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,256,128);
    let col = document.body.classList.contains('skin-christmas') ? "#D42426" : robotBaseColor;
    ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.strokeRect(0,0,256,128);
    eyes.forEach((e, i) => {
        ctx.fillStyle = (i === selectedEyeIndex) ? "#FFF" : col;
        ctx.beginPath();
        let x = e.x*2 - e.w, y = e.y*2 - e.h, w = e.w*2, h = e.h*2;
        if(ctx.roundRect) ctx.roundRect(x, y, w, h, (e.r||0)*2); else ctx.rect(x,y,w,h);
        ctx.fill();
    });
}
window.addEye = function() { eyes.push({x: 64, y: 32, w: 24, h: 24, r: 5}); selectedEyeIndex = eyes.length-1; drawFace(); };
window.clearCanvas = function() { eyes = []; selectedEyeIndex = -1; drawFace(); };
window.updateEyeParam = function() { if(selectedEyeIndex === -1) return; eyes[selectedEyeIndex].w = parseInt(document.getElementById('edit-w').value); eyes[selectedEyeIndex].h = parseInt(document.getElementById('edit-h').value); eyes[selectedEyeIndex].r = parseInt(document.getElementById('edit-r').value); drawFace(); };
window.uploadFace = function() { let str = `U:${eyes.length}`; eyes.forEach(e => { str += `;${e.x-64},${e.y-32},${e.w},${e.h},${e.r||0}`; }); send(str); renderLocalVisor(eyes); closeWorkshop(); };
function renderLocalVisor(list) {
    let v = document.getElementById('visor'); v.innerHTML = '';
    list.forEach(e => {
        let d = document.createElement('div'); d.className = 'eye';
        d.style.width = (e.w * 2.2) + 'px'; d.style.height = (e.h * 2.2) + 'px';
        d.style.left = `calc(50% + ${(e.x - 64)*2.2}px)`; d.style.top = `calc(50% + ${(e.y - 32)*2.2}px)`;
        d.style.borderRadius = ((e.r||0)*2.2) + 'px';
        v.appendChild(d);
    });
}
