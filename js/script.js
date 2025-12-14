const btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
let isGameRunning = false; 
let lastInputTime = Date.now(); 
let currentHappiness = 50; 
const initialVitalStates = { hap: 50, hun: 80, eng: 10 };

// --- VISUAL SCALING FACTOR ---
const S = 1.8; 

// --- DESIGNER STATE ---
// [UPDATED] Default Start: FluxGarage Style (2 Large Eyes)
let customEyes = [
    {id:0, w:36, h:48, r:10, x:-32, y:0},  // Left Eye (FluxGarage Standard)
    {id:1, w:36, h:48, r:10, x:32, y:0}    // Right Eye
];
let selectedEyeIndex = -1;
let userHasEdited = false;

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    updateBackgroundVitals(initialVitalStates);
    
    const saved = localStorage.getItem('idapp_design');
    if (saved) { 
        customEyes = JSON.parse(saved); 
        userHasEdited = true; 
    }
    
    getWeather(); 
    onDisc(); 
});

// --- WEATHER ---
async function getWeather() {
    const wDiv = document.getElementById('weather-widget');
    if (!navigator.geolocation) { wDiv.innerText = "NO GPS"; return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`);
            const data = await res.json();
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            
            let desc = "CLEAR";
            let type = 0;
            if (code > 50 && code < 70) { desc = "RAIN"; type = 1; }
            else if (code >= 70) { desc = "SNOW"; type = 1; }
            
            wDiv.innerText = `${desc} ${temp}°C`;
            if(charRX) send(`W:${temp},${type}`);
        } catch (e) { wDiv.innerText = "OFFLINE"; }
    });
}

// --- DESIGNER LOGIC ---
function openDesigner() {
    document.getElementById('designerModal').style.display = 'flex';
    renderDesignerUI();
}

function closeDesigner() {
    document.getElementById('designerModal').style.display = 'none';
    renderEyesToMainVisor();
}

function renameRobot() {
    let name = document.getElementById('robot-name-input').value;
    if(name && name.length > 0) {
        send('N:' + name);
        document.getElementById('app-title').innerText = name.toUpperCase();
        closeDesigner();
    }
}

// --- PRESETS ---
function loadPreset(name) {
    userHasEdited = true; 
    if(name === 'incy') {
        // [UPDATED] Now the "FluxGarage" Standard (2 Eyes)
        customEyes = [
            {id:0, w:36, h:48, r:10, x:-32, y:0}, 
            {id:1, w:36, h:48, r:10, x:32, y:0}
        ];
    }
    else if(name === 'glitch') {
        customEyes = [
            {id:0, w:14, h:28, r:0, x:-25, y:-8}, 
            {id:1, w:28, h:14, r:0, x:25, y:8},   
            {id:2, w:7, h:7, r:50, x:0, y:0}      
        ];
    }
    else if(name === 'weaver') {
        // [UPDATED] Now the "4 Basic Eyes" (Old Incy Layout)
        customEyes = [
            {id:0, w:15, h:15, r:50, x:-36, y:0}, 
            {id:1, w:25, h:25, r:50, x:-16, y:0},
            {id:2, w:25, h:25, r:50, x:16, y:0},   
            {id:3, w:15, h:15, r:50, x:36, y:0}
        ];
    }
    else if(name === 'cyclops') {
        customEyes = [
            {id:0, w:40, h:40, r:50, x:0, y:0} 
        ];
    }
    selectedEyeIndex = -1; 
    renderDesignerUI(); 
    renderEyesToMainVisor(); 
}

function renderEyesToMainVisor() {
    const v = document.getElementById('visor');
    v.innerHTML = '';
    if(document.body.classList.contains('offline')) return;

    customEyes.forEach(eye => {
        let el = document.createElement('div');
        el.className = 'eye';
        el.style.width = (eye.w * S) + 'px';
        el.style.height = (eye.h * S) + 'px';
        el.style.borderRadius = (eye.r * S) + 'px';
        el.style.left = `calc(50% + ${eye.x * S}px)`;
        el.style.top = `calc(50% + ${eye.y * S}px)`;
        v.appendChild(el);
    });
}

function renderDesignerUI() {
    const pv = document.getElementById('preview-visor');
    pv.innerHTML = '';
    customEyes.forEach((eye, idx) => {
        let el = document.createElement('div');
        el.className = 'eye';
        if (idx === selectedEyeIndex) el.style.border = "1px solid #fff"; 
        
        el.style.width = (eye.w * S) + 'px';
        el.style.height = (eye.h * S) + 'px';
        el.style.borderRadius = (eye.r * S) + 'px';
        el.style.left = `calc(50% + ${eye.x * S}px)`;
        el.style.top = `calc(50% + ${eye.y * S}px)`;
        
        pv.appendChild(el);
    });

    const selRow = document.getElementById('eye-selector');
    selRow.innerHTML = '';
    customEyes.forEach((_, idx) => {
        let btn = document.createElement('div');
        btn.className = `eye-select-btn ${idx === selectedEyeIndex ? 'active' : ''}`;
        btn.innerText = idx + 1;
        btn.onclick = () => selectEye(idx);
        selRow.appendChild(btn);
    });

    const controls = document.getElementById('controls-area');
    if (selectedEyeIndex > -1) {
        controls.classList.add('active');
        let e = customEyes[selectedEyeIndex];
        document.getElementById('inp-w').value = e.w; document.getElementById('val-w').innerText = e.w;
        document.getElementById('inp-h').value = e.h; document.getElementById('val-h').innerText = e.h;
        document.getElementById('inp-r').value = e.r; document.getElementById('val-r').innerText = e.r;
        document.getElementById('inp-x').value = e.x; document.getElementById('val-x').innerText = e.x;
        document.getElementById('inp-y').value = e.y; document.getElementById('val-y').innerText = e.y;
    } else {
        controls.classList.remove('active');
    }
}

function selectEye(idx) { selectedEyeIndex = idx; renderDesignerUI(); }

function addEye() {
    userHasEdited = true; 
    if (customEyes.length >= 8) return; 
    // [UPDATED] Default Radius 10 (Rectangle) to match style
    customEyes.push({id: Date.now(), w:20, h:20, r:10, x:0, y:0});
    selectEye(customEyes.length - 1);
}

function deleteSelectedEye() {
    userHasEdited = true; 
    if (selectedEyeIndex === -1) return;
    customEyes.splice(selectedEyeIndex, 1);
    selectedEyeIndex = -1;
    renderDesignerUI();
}

function updateEyeParam(param, val) {
    userHasEdited = true; 
    if (selectedEyeIndex === -1) return;
    val = parseInt(val);
    let eye = customEyes[selectedEyeIndex];
    eye[param] = val;
    document.getElementById(`val-${param}`).innerText = val;

    if (document.getElementById('mirror-check').checked) {
        let partner = customEyes.find((e, i) => i !== selectedEyeIndex && Math.abs(e.x + eye.x) < 10); 
        if (partner) {
            if (param === 'x') partner.x = -val; 
            else if (param === 'y') partner.y = val; 
            else partner[param] = val; 
        }
    }
    renderDesignerUI();
}

function saveAndUpload() {
    userHasEdited = true;
    localStorage.setItem('idapp_design', JSON.stringify(customEyes));
    let dataStr = "U:" + customEyes.length;
    customEyes.forEach(e => {
        dataStr += `;${e.x},${e.y},${e.w},${e.h},${e.r}`;
    });
    send(dataStr);
    closeDesigner();
}

// --- LOGIC ---
function checkIdleStatus() {
    if (!document.body.classList.contains('offline') && (Date.now() - lastInputTime > 5000)) {
        updateVisorMood(currentHappiness);
    }
}

function updateVisorMood(happiness) {
    if(document.body.classList.contains('offline')) return;
    let v = document.getElementById('visor');
    v.className = "visor"; document.body.className = "";
    if (happiness > 60) { v.classList.add('mood-happy'); document.body.classList.add('mood-happy'); } 
    else if (happiness < 30) { v.classList.add('mood-angry'); document.body.classList.add('mood-angry'); }
}

function updateBackgroundVitals(vitals) {
    document.getElementById('bar-hap').style.width = vitals.hap + '%';
    document.getElementById('bar-eng').style.width = (100 - vitals.eng) + '%';
    document.getElementById('val-eng').innerText = (100 - vitals.eng) + '%';
}

function btnDown(e, cmd) {
    if(document.body.classList.contains('offline')) return; 
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
    } else if (state.tapCount === 2) {
        send(cmd); send(cmd); state.tapCount = 0;
    }
}

function btnUp(e, cmd) {
    if(document.body.classList.contains('offline')) return;
    e.preventDefault();
    lastInputTime = Date.now();
    if (btnState[cmd].tapTimer) clearTimeout(btnState[cmd].tapTimer); 
    if (btnState[cmd].repeat) { clearInterval(btnState[cmd].repeat); btnState[cmd].repeat = null; }
    document.getElementById('btn-' + cmd).classList.remove('pressing');
}

function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }

function openMenu() { 
    if(document.body.classList.contains('offline')) return; 
    let m = document.getElementById('menuModal');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('visible'), 10);
    send('Q'); 
}
function closeMenu() { 
    let m = document.getElementById('menuModal');
    m.classList.remove('visible');
    setTimeout(() => m.style.display = 'none', 300);
}

function forceSleep() { send('Z'); closeMenu(); document.getElementById('visor').className = "visor mood-sleep"; document.body.className = "mood-sleep"; }

// SWIPE
let startY = 0;
const container = document.getElementById('app-container');
document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive: false});
document.addEventListener('touchend', e => { 
    if(document.body.classList.contains('offline')) return; 
    if (Math.abs(startY - e.changedTouches[0].clientY) > 50) scrollToPage(startY > e.changedTouches[0].clientY ? 2 : 1); 
}, {passive: false});

function scrollToPage(p) { container.style.transform = p === 2 ? "translateY(-100dvh)" : "translateY(0)"; }

// BLE
const sUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const cRX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const cTX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
let dev, serv, charRX;

async function connectBLE() {
    try {
        dev = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'IDA' }, { namePrefix: 'IDC' }], optionalServices: [sUUID] });
        dev.addEventListener('gattserverdisconnected', onDisc);
        serv = await dev.gatt.connect();
        let svc = await serv.getPrimaryService(sUUID);
        charRX = await svc.getCharacteristic(cRX);
        let charTX = await svc.getCharacteristic(cTX);
        await charTX.startNotifications();
        charTX.addEventListener('characteristicvaluechanged', handleUpdate);
        
        document.body.classList.remove('offline'); 
        document.getElementById('status').innerText = "ONLINE";
        document.getElementById('status').style.pointerEvents = "none";
        document.getElementById('status').style.color = "#00ff88";
        
        document.getElementById('coin-box').style.display = 'block';
        document.getElementById('visor').classList.remove('mood-off');
        
        renderEyesToMainVisor();
        getWeather(); 
        
        if (userHasEdited) {
            setTimeout(() => {
                if(customEyes.length > 0) saveAndUpload();
            }, 1500);
        }

        lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}

function onDisc() {
    document.body.classList.add('offline'); 
    let s = document.getElementById('status');
    s.innerText = "OFFLINE - TAP TO CONNECT";
    s.style.pointerEvents = "all";
    s.style.color = "#888";

    document.getElementById('coin-box').style.display = 'none';
    document.getElementById('visor').className = "visor";
    document.getElementById('visor').innerHTML = '';
    
    scrollToPage(1);
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
        let idParts = data.split('|');
        if(idParts[1]) {
            document.getElementById('app-title').innerText = idParts[1].toUpperCase(); 
            document.getElementById('robot-name-input').value = idParts[1];
        }
        if(idParts[0]) document.getElementById('app-type').innerText = "TYPE: " + idParts[0].toUpperCase(); 
        if(idParts[2]) document.getElementById('val-coins').innerText = idParts[2]; 
        
        renderEyesToMainVisor();
    }
    else if (type === 'L') {
        if (!userHasEdited) {
            let parts = data.split(',');
            
            let rVal = 50; 
            if (parts.length > 4) rVal = parseInt(parts[4]);
            if (isNaN(rVal)) rVal = 50;

            let newEye = {
                id: Date.now() + Math.random(),
                x: parseInt(parts[0]) || 0,
                y: parseInt(parts[1]) || 0,
                w: parseInt(parts[2]) || 20,
                h: parseInt(parts[3]) || 20,
                r: rVal
            };
            customEyes.push(newEye);
            renderEyesToMainVisor();
        }
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
        txtDiv.style.opacity = '1';
        setTimeout(() => txtDiv.style.opacity = '0.7', 200);
        if (data === "GAME OVER" || data === "WINNER!" || data === "LOSE!") { setTimeout(() => { isGameRunning = false; }, 1000); }
    }
    else if (type === 'C') { document.getElementById('val-coins').innerText = data; }
    else if (type === 'A') { 
        currentHappiness = parseInt(data);
        initialVitalStates.hap = currentHappiness;
        document.getElementById('bar-hap').style.width = currentHappiness + "%"; 
        updateBackgroundVitals(initialVitalStates);
    }
    else if (type === 'M') { 
        let num = parseInt(data);
        let v = document.getElementById('visor');
        let b = document.body;
        v.className = "visor"; b.className = ""; 
        if (num === 1) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); }
        if (num === 2) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
        if (num === 3) { v.classList.add('mood-tired'); b.classList.add('mood-tired'); }
        if (num === 4) { v.classList.add('mood-mad'); b.classList.add('mood-mad'); }
        if (num === 0) v.classList.remove('mood-sleep'); 
        lastInputTime = Date.now(); 
    }
}