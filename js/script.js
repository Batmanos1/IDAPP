const btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
let isGameRunning = false; 
let lastInputTime = Date.now(); 
let currentHappiness = 50; 
const initialVitalStates = { hap: 50, hun: 80, eng: 10 };

// --- DESIGNER STATE ---
let customEyes = [
    {id:0, w:25, h:25, r:50, x:-50, y:0},  // Left Outer
    {id:1, w:35, h:35, r:50, x:-20, y:0},  // Left Inner
    {id:2, w:35, h:35, r:50, x:20, y:0},   // Right Inner
    {id:3, w:25, h:25, r:50, x:50, y:0}    // Right Outer
];
let selectedEyeIndex = -1;

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    updateBackgroundVitals(initialVitalStates);
    
    const saved = localStorage.getItem('idapp_design');
    if (saved) { customEyes = JSON.parse(saved); }
    
    getWeather(); 
    onDisc(); // DEFAULT: Trigger OFFLINE state on load
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

function loadPreset(name) {
    if(name === 'incy') {
        customEyes = [
            {id:0, w:25, h:25, r:50, x:-50, y:0}, 
            {id:1, w:35, h:35, r:50, x:-20, y:0},
            {id:2, w:35, h:35, r:50, x:20, y:0},   
            {id:3, w:25, h:25, r:50, x:50, y:0}
        ];
    }
    else if(name === 'glitch') {
        customEyes = [
            {id:0, w:20, h:40, r:0, x:-35, y:-10},
            {id:1, w:40, h:20, r:0, x:35, y:10},
            {id:2, w:10, h:10, r:50, x:0, y:0}
        ];
    }
    else if(name === 'weaver') {
        customEyes = [
            {id:0, w:15, h:15, r:50, x:-40, y:-20}, {id:1, w:15, h:15, r:50, x:40, y:-20},
            {id:2, w:25, h:25, r:50, x:-20, y:-10}, {id:3, w:25, h:25, r:50, x:20, y:-10},
            {id:4, w:10, h:10, r:50, x:-30, y:20},  {id:5, w:10, h:10, r:50, x:30, y:20}
        ];
    }
    else if(name === 'cyclops') {
        customEyes = [
            {id:0, w:55, h:55, r:50, x:0, y:0}
        ];
    }
    selectedEyeIndex = -1; 
    renderDesignerUI(); 
    renderEyesToMainVisor(); 
}

function renderEyesToMainVisor() {
    const v = document.getElementById('visor');
    v.innerHTML = '';
    // Double Check: Do not render if offline
    if(document.body.classList.contains('offline')) return;

    customEyes.forEach(eye => {
        let el = document.createElement('div');
        el.className = 'eye';
        el.style.width = eye.w + 'px';
        el.style.height = eye.h + 'px';
        el.style.borderRadius = eye.r + '%';
        el.style.left = `calc(50% + ${eye.x}px)`;
        el.style.top = `calc(50% + ${eye.y}px)`;
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
        el.style.width = eye.w + 'px';
        el.style.height = eye.h + 'px';
        el.style.borderRadius = eye.r + '%';
        el.style.left = `calc(50% + ${eye.x}px)`;
        el.style.top = `calc(50% + ${eye.y}px)`;
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
    if (customEyes.length >= 8) return; 
    customEyes.push({id: Date.now(), w:30, h:30, r:50, x:0, y:0});
    selectEye(customEyes.length - 1);
}

function deleteSelectedEye() {
    if (selectedEyeIndex === -1) return;
    customEyes.splice(selectedEyeIndex, 1);
    selectedEyeIndex = -1;
    renderDesignerUI();
}

function updateEyeParam(param, val) {
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
    if(document.body.classList.contains('offline')) return; // Disable when offline
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
    if(document.body.classList.contains('offline')) return; // Disable menu when offline
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
    if(document.body.classList.contains('offline')) return; // Disable swipe when offline
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
        
        // SUCCESS: "Boot Up" the UI
        document.body.classList.remove('offline'); // <--- LIFE!
        document.getElementById('status').innerText = "ONLINE";
        document.getElementById('status').style.pointerEvents = "none";
        document.getElementById('status').style.color = "#00ff88";
        
        document.getElementById('coin-box').style.display = 'block';
        document.getElementById('visor').classList.remove('mood-off');
        
        renderEyesToMainVisor();
        getWeather(); 
        lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}

function onDisc() {
    // DISCONNECT: Kill the UI
    document.body.classList.add('offline'); // <--- DEATH
    
    let s = document.getElementById('status');
    s.innerText = "OFFLINE - TAP TO CONNECT";
    s.style.pointerEvents = "all";
    s.style.color = "#888";

    document.getElementById('coin-box').style.display = 'none';
    document.getElementById('visor').className = "visor";
    
    // Clear the eyes
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
        if(idParts[1]) document.getElementById('app-title').innerText = idParts[1].toUpperCase(); 
        if(idParts[0]) document.getElementById('app-type').innerText = "TYPE: " + idParts[0].toUpperCase(); 
        if(idParts[2]) document.getElementById('val-coins').innerText = idParts[2]; 
        
        customEyes = [];
        renderEyesToMainVisor();
    }
    else if (type === 'L') {
        let parts = data.split(',');
        let newEye = {
            id: Date.now() + Math.random(),
            x: parseInt(parts[0]),
            y: parseInt(parts[1]),
            w: parseInt(parts[2]),
            h: parseInt(parts[3]),
            r: parseInt(parts[4])
        };
        customEyes.push(newEye);
        renderEyesToMainVisor();
        localStorage.setItem('idapp_design', JSON.stringify(customEyes));
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
