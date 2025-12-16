var btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
var isGameRunning = false; 
var lastInputTime = Date.now(); 
var currentHappiness = 50; 
var initialVitalStates = { hap: 50, hun: 80, eng: 10 };

var S = 1.8; 

var hitStreak = 0;
var hitResetTimer = null;
var lastPetTime = 0;
var dragStartX = 0;
var totalDragDist = 0;
var isTouchingEye = false;

// --- DESIGNER STATE ---
var customEyes = [
    {id:0, w:36, h:48, r:10, x:-32, y:0},  
    {id:1, w:36, h:48, r:10, x:32, y:0}    
];
var customMouths = []; 
var selectedEyeIndex = -1;
var selectedMouthIndex = -1; 
var userHasEdited = false;

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    updateBackgroundVitals(initialVitalStates);
    
    const saved = localStorage.getItem('idapp_design_v2');
    if (saved) { 
        const d = JSON.parse(saved);
        if(d.eyes) customEyes = d.eyes;
        if(d.mouths) customMouths = d.mouths;
        userHasEdited = true; 
    } else {
        const oldSaved = localStorage.getItem('idapp_design');
        if(oldSaved) { customEyes = JSON.parse(oldSaved); userHasEdited = true; }
    }
    
    initVisorInteraction(); 
    getWeather(); 
    onDisc(); 
});

function initVisorInteraction() {
    const visor = document.getElementById('visor');
    
    const start = (e, clientX) => {
        dragStartX = clientX;
        totalDragDist = 0;
        // Strictly check if we started ON an eye element
        if (e.target.classList.contains('eye')) { isTouchingEye = true; } else { isTouchingEye = false; }
    };
    
    const move = (clientX, clientY) => {
        let rect = visor.getBoundingClientRect();
        
        // --- LOOK LOGIC ---
        let centerX = rect.left + rect.width / 2;
        let centerY = rect.top + rect.height / 2;
        let lookX = Math.round((clientX - centerX) / (rect.width/2) * 50);
        let lookY = Math.round((clientY - centerY) / (rect.height/2) * 30);
        if(lookX < -50) lookX = -50; if(lookX > 50) lookX = 50;
        if(lookY < -30) lookY = -30; if(lookY > 30) lookY = 30;
        
        if(Date.now() - lastPetTime > 100) { send(`J:${lookX},${lookY}`); }

        // --- PETTING LOGIC (Only if NOT touching an eye) ---
        if (!isTouchingEye) {
            let dist = Math.abs(clientX - dragStartX);
            if (dist > 3) { // Lower sensitivity slightly to catch smaller movements
                totalDragDist += dist;
                dragStartX = clientX; 
            }
            // [UPDATED] Lower threshold to 80 (was 150) for easier petting
            if (totalDragDist > 80 && Date.now() - lastPetTime > 500) {
                send('P'); // PURR
                lastPetTime = Date.now();
                totalDragDist = 0;
            }
        }
    };
    
    const end = () => {
        // If it was a TAP (very little movement)
        if (totalDragDist < 10) { 
            // [UPDATED] Only trigger "Hit/Hurt" if we actually tapped AN EYE
            if (isTouchingEye) {
                triggerEyeHit(); 
            }
        }
        setTimeout(() => send('J:0,0'), 200);
    };

    visor.addEventListener('touchstart', e => { start(e, e.touches[0].clientX); }, {passive: true});
    visor.addEventListener('touchmove', e => { move(e.touches[0].clientX, e.touches[0].clientY); }, {passive: true});
    visor.addEventListener('touchend', e => { end(); });
    visor.addEventListener('mousedown', e => { start(e, e.clientX); });
    visor.addEventListener('mousemove', e => { if(e.buttons === 1) move(e.clientX, e.clientY); });
    visor.addEventListener('mouseup', e => { end(); });
}

function triggerEyeHit() {
    hitStreak++;
    if (hitResetTimer) clearTimeout(hitResetTimer);
    hitResetTimer = setTimeout(() => { hitStreak = 0; }, 2000); // 2s to chain hits

    // If tapped 4 times quickly (Streak > 3), get MAD
    if (hitStreak > 3) { 
        send('A'); // Angry
        hitStreak = 0; 
    } else { 
        send('B'); // Hurt/Wince (New Logic)
    }
}

async function getWeather() {
    const wDiv = document.getElementById('weather-widget');
    if (!navigator.geolocation) { wDiv.innerText = "NO GPS"; return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`);
            const data = await res.json();
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            let desc = "CLEAR"; let type = 0;
            if (code > 50 && code < 70) { desc = "RAIN"; type = 1; }
            else if (code >= 70) { desc = "SNOW"; type = 1; }
            wDiv.innerText = `${desc} ${temp}°C`;
            
            // Only send if we are connected
            if(charRX) {
                // Send weather data to robot
                send(`W:${temp},${type}`);
                console.log(`Weather Synced: ${desc} ${temp}°C`);
            }
        } catch (e) { wDiv.innerText = "OFFLINE"; }
    });
}

function openDesigner() { document.getElementById('designerModal').style.display = 'flex'; renderDesignerUI(); }
function closeDesigner() { document.getElementById('designerModal').style.display = 'none'; renderEyesToMainVisor(); }

function renameRobot() {
    let name = document.getElementById('robot-name-input').value;
    if(name && name.length > 0) {
        send('N:' + name);
        document.getElementById('app-title').innerText = name.toUpperCase();
        closeDesigner();
    }
}

function loadPreset(name) {
    userHasEdited = true; 
    customMouths = []; 
    if(name === 'incy') {
        customEyes = [{id:0, w:36, h:48, r:10, x:-32, y:0}, {id:1, w:36, h:48, r:10, x:32, y:0}];
    }
    else if(name === 'glitch') {
        customEyes = [{id:0, w:14, h:28, r:0, x:-25, y:-8}, {id:1, w:28, h:14, r:0, x:25, y:8}, {id:2, w:7, h:7, r:50, x:0, y:0}];
    }
    else if(name === 'weaver') {
        customEyes = [{id:0, w:15, h:15, r:50, x:-36, y:0}, {id:1, w:25, h:25, r:50, x:-16, y:0},
                      {id:2, w:25, h:25, r:50, x:16, y:0}, {id:3, w:15, h:15, r:50, x:36, y:0}];
    }
    else if(name === 'cyclops') {
        customEyes = [{id:0, w:40, h:40, r:50, x:0, y:0}];
        customMouths = [{id:1, w:20, h:5, r:2, x:0, y:30}]; 
    }
    selectedEyeIndex = -1; selectedMouthIndex = -1;
    renderDesignerUI(); renderEyesToMainVisor(); 
}

function renderEyesToMainVisor() {
    const v = document.getElementById('visor');
    v.innerHTML = '';
    if(document.body.classList.contains('offline')) return;

    const draw = (obj, isMouth) => {
        let el = document.createElement('div');
        el.className = 'eye';
        el.style.width = (obj.w * S) + 'px'; el.style.height = (obj.h * S) + 'px';
        el.style.borderRadius = (obj.r * S) + 'px';
        el.style.left = `calc(50% + ${obj.x * S}px)`; el.style.top = `calc(50% + ${obj.y * S}px)`;
        v.appendChild(el);
    }
    customEyes.forEach(e => draw(e, false));
    customMouths.forEach(m => draw(m, true));
}

function renderDesignerUI() {
    const pv = document.getElementById('preview-visor');
    pv.innerHTML = '';
    
    customEyes.forEach((eye, idx) => {
        let el = document.createElement('div'); el.className = 'eye';
        if (selectedEyeIndex === idx) el.style.border = "1px solid #fff"; 
        el.style.width = (eye.w * S) + 'px'; el.style.height = (eye.h * S) + 'px';
        el.style.borderRadius = (eye.r * S) + 'px';
        el.style.left = `calc(50% + ${eye.x * S}px)`; el.style.top = `calc(50% + ${eye.y * S}px)`;
        pv.appendChild(el);
    });

    customMouths.forEach((mouth, idx) => {
        let el = document.createElement('div'); el.className = 'eye';
        if (selectedMouthIndex === idx) { el.style.border = "1px solid #f05"; el.style.background = "#502"; }
        el.style.width = (mouth.w * S) + 'px'; el.style.height = (mouth.h * S) + 'px';
        el.style.borderRadius = (mouth.r * S) + 'px';
        el.style.left = `calc(50% + ${mouth.x * S}px)`; el.style.top = `calc(50% + ${mouth.y * S}px)`;
        pv.appendChild(el);
    });

    const eyeRow = document.getElementById('eye-selector'); eyeRow.innerHTML = '';
    customEyes.forEach((_, idx) => {
        let btn = document.createElement('div');
        btn.className = `eye-select-btn ${idx === selectedEyeIndex ? 'active' : ''}`;
        btn.innerText = (idx + 1); btn.onclick = () => selectEye(idx);
        eyeRow.appendChild(btn);
    });

    const mouthRow = document.getElementById('mouth-selector'); mouthRow.innerHTML = '';
    customMouths.forEach((_, idx) => {
        let btn = document.createElement('div');
        btn.className = `mouth-select-btn ${idx === selectedMouthIndex ? 'active' : ''}`;
        btn.innerText = (idx + 1); btn.onclick = () => selectMouth(idx);
        mouthRow.appendChild(btn);
    });

    const controls = document.getElementById('controls-area');
    let obj = selectedEyeIndex > -1 ? customEyes[selectedEyeIndex] : (selectedMouthIndex > -1 ? customMouths[selectedMouthIndex] : null);

    if (obj) {
        controls.classList.add('active');
        document.getElementById('inp-w').value = obj.w; document.getElementById('val-w').innerText = obj.w;
        document.getElementById('inp-h').value = obj.h; document.getElementById('val-h').innerText = obj.h;
        document.getElementById('inp-r').value = obj.r; document.getElementById('val-r').innerText = obj.r;
        document.getElementById('inp-x').value = obj.x; document.getElementById('val-x').innerText = obj.x;
        document.getElementById('inp-y').value = obj.y; document.getElementById('val-y').innerText = obj.y;
    } else {
        controls.classList.remove('active');
    }
}

function selectEye(idx) { selectedEyeIndex = idx; selectedMouthIndex = -1; renderDesignerUI(); }
function selectMouth(idx) { selectedMouthIndex = idx; selectedEyeIndex = -1; renderDesignerUI(); }

function addEye() {
    userHasEdited = true; if (customEyes.length >= 8) return; 
    customEyes.push({id: Date.now(), w:20, h:20, r:10, x:0, y:0});
    selectEye(customEyes.length - 1);
}

function addMouth() {
    userHasEdited = true; if (customMouths.length >= 3) return;
    customMouths.push({id: Date.now(), w:20, h:6, r:2, x:0, y:20});
    selectMouth(customMouths.length - 1);
}

function deleteSelectedObj() {
    userHasEdited = true; 
    if (selectedEyeIndex > -1) { customEyes.splice(selectedEyeIndex, 1); selectedEyeIndex = -1; }
    else if (selectedMouthIndex > -1) { customMouths.splice(selectedMouthIndex, 1); selectedMouthIndex = -1; }
    renderDesignerUI();
}

function updateEyeParam(param, val) {
    userHasEdited = true; 
    val = parseInt(val);
    let obj = selectedEyeIndex > -1 ? customEyes[selectedEyeIndex] : (selectedMouthIndex > -1 ? customMouths[selectedMouthIndex] : null);
    if (!obj) return;
    
    obj[param] = val;
    document.getElementById(`val-${param}`).innerText = val;

    if (selectedEyeIndex > -1 && document.getElementById('mirror-check').checked) {
        let partner = customEyes.find((e, i) => i !== selectedEyeIndex && Math.abs(e.x + obj.x) < 10); 
        if (partner) {
            if (param === 'x') partner.x = -val; else if (param === 'y') partner.y = val; else partner[param] = val; 
        }
    }
    renderDesignerUI();
}

function saveAndUpload() {
    userHasEdited = true;
    const design = { eyes: customEyes, mouths: customMouths };
    localStorage.setItem('idapp_design_v2', JSON.stringify(design));
    let dataStr = `U:${customEyes.length},${customMouths.length}`;
    customEyes.forEach(e => { dataStr += `;${e.x},${e.y},${e.w},${e.h},${e.r}`; });
    customMouths.forEach(m => { dataStr += `;${m.x},${m.y},${m.w},${m.h},${m.r}`; });
    send(dataStr);
    closeDesigner();
}

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
    else if (happiness > 90) { v.classList.add('mood-love'); document.body.classList.add('mood-love'); } // Added mood-love if needed
}

function updateBackgroundVitals(vitals) {
    document.getElementById('bar-hap').style.width = vitals.hap + '%';
    let barHun = document.querySelector('.fill-p'); if(barHun) barHun.style.width = vitals.hun + '%';
    document.getElementById('bar-eng').style.width = (100 - vitals.eng) + '%';
    document.getElementById('val-eng').innerText = (100 - vitals.eng) + '%';
}

function updateVitalsDisplay(hap, hun, eng) {
    if(hap !== null) { document.getElementById('val-hap').innerText = hap + "%"; document.getElementById('bar-hap').style.width = hap + "%"; currentHappiness = parseInt(hap); updateVisorMood(currentHappiness); }
    if(hun !== null) { let barHun = document.querySelector('.fill-p'); if(barHun) barHun.style.width = hun + "%"; }
    if(eng !== null) { let barEng = document.getElementById('bar-eng'); if(barEng) { barEng.style.width = eng + "%"; document.getElementById('val-eng').innerText = eng + "%"; } }
}

function btnDown(e, cmd) {
    if(document.body.classList.contains('offline')) return; 
    e.preventDefault(); lastInputTime = Date.now(); 
    let state = btnState[cmd]; if (state.repeat) return; 
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
    if(document.body.classList.contains('offline')) return; e.preventDefault(); lastInputTime = Date.now();
    if (btnState[cmd].tapTimer) clearTimeout(btnState[cmd].tapTimer); 
    if (btnState[cmd].repeat) { clearInterval(btnState[cmd].repeat); btnState[cmd].repeat = null; }
    document.getElementById('btn-' + cmd).classList.remove('pressing');
}

function startGame(id) { send(id); isGameRunning = true; closeMenu(); lastInputTime = Date.now(); }
function stopGame() { send('X'); isGameRunning = false; closeMenu(); lastInputTime = Date.now(); }
function openMenu() { if(document.body.classList.contains('offline')) return; let m = document.getElementById('menuModal'); m.style.display = 'flex'; setTimeout(() => m.classList.add('visible'), 10); send('Q'); }
function closeMenu() { let m = document.getElementById('menuModal'); m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); }

let startY = 0; const container = document.getElementById('app-container');
document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive: false});
document.addEventListener('touchend', e => { if(document.activeElement === document.getElementById('visor')) return; if(document.body.classList.contains('offline')) return; if (Math.abs(startY - e.changedTouches[0].clientY) > 50) scrollToPage(startY > e.changedTouches[0].clientY ? 2 : 1); }, {passive: false});
function scrollToPage(p) { container.style.transform = p === 2 ? "translateY(-100dvh)" : "translateY(0)"; }

var sUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; 
var cRX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; 
var cTX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
var dev, serv, charRX;

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

        // [UPDATED] SYNC SEQUENCE
        // 1. Sync Time first and WAIT
        await syncTime();

        // 2. Small breathing room for BLE (300ms)
        await new Promise(r => setTimeout(r, 300));

        // 3. Sync Weather
        getWeather(); 
        
        renderEyesToMainVisor(); 
        if (userHasEdited) { setTimeout(() => { if(customEyes.length > 0) saveAndUpload(); }, 1500); }
        lastInputTime = Date.now(); 
    } catch (e) { console.log(e); }
}

function onDisc() {
    document.body.classList.add('offline'); 
    let s = document.getElementById('status'); s.innerText = "OFFLINE - TAP TO CONNECT"; s.style.pointerEvents = "all"; s.style.color = "#888";
    document.getElementById('coin-box').style.display = 'none';
    document.getElementById('visor').className = "visor"; document.getElementById('visor').innerHTML = '';
    scrollToPage(1);
}

// [NEW] CLOCK FUNCTIONS
function startClockMode() {
    syncTime(); 
    setTimeout(() => {
        send('4'); 
        isGameRunning = true; 
        closeMenu();
    }, 300);
}

// [UPDATED] MADE ASYNC TO PREVENT OVERLAP
async function syncTime() {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    // Return the promise so we can await it
    await send(`T:${h}:${m}`);
    console.log(`Time Synced: ${h}:${m}`);
}

async function send(cmd) { if(!charRX) return; if (navigator.vibrate) navigator.vibrate(15); await charRX.writeValue(new TextEncoder().encode(cmd)); }

function handleUpdate(event) {
    let val = new TextDecoder().decode(event.target.value);
    let parts = val.split(':'); let type = parts[0]; let data = parts[1];

    if (type === 'I') { 
        let idParts = data.split('|');
        if(idParts[1]) { document.getElementById('app-title').innerText = idParts[1].toUpperCase(); document.getElementById('robot-name-input').value = idParts[1]; }
        if(idParts[0]) document.getElementById('app-type').innerText = "TYPE: " + idParts[0].toUpperCase(); 
        if(idParts[2]) document.getElementById('val-coins').innerText = idParts[2]; 
        if(idParts.length >= 12) { updateVitalsDisplay(idParts[9], idParts[10], idParts[11]); }
        renderEyesToMainVisor();
    }
    else if (type === 'A') { updateVitalsDisplay(data, null, null); }
    else if (type === 'N') { updateVitalsDisplay(null, data, null); }
    else if (type === 'E') { updateVitalsDisplay(null, null, data); }
    else if (type === 'L') {
        if (!userHasEdited) {
            let parts = data.split(',');
            let rVal = 50; if (parts.length > 4) rVal = parseInt(parts[4]);
            let newEye = { id: Date.now() + Math.random(), x: parseInt(parts[0])||0, y: parseInt(parts[1])||0, w: parseInt(parts[2])||20, h: parseInt(parts[3])||20, r: rVal };
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
        txtDiv.innerText = data; txtDiv.style.opacity = '1';
        if (data === "GAME OVER" || data === "WINNER!" || data.startsWith("WINNER") || data.includes("JACKPOT") || data === "LOSE!" || data.startsWith("TIME:") || data.includes("ms")) { 
            setTimeout(() => { isGameRunning = false; txtDiv.style.opacity = '0'; setTimeout(() => txtDiv.innerText = "", 500); }, 3000); 
        } else { setTimeout(() => txtDiv.style.opacity = '0.7', 200); }
    }
    else if (type === 'C') { document.getElementById('val-coins').innerText = data; }
    else if (type === 'M') { 
        let num = parseInt(data); let v = document.getElementById('visor'); let b = document.body;
        v.className = "visor"; b.className = ""; 
        if (num === 1) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); }
        if (num === 2) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
        if (num === 3) { v.classList.add('mood-tired'); b.classList.add('mood-tired'); }
        if (num === 4) { v.classList.add('mood-mad'); b.classList.add('mood-mad'); }
        if (num === 0) v.classList.remove('mood-sleep'); 
        lastInputTime = Date.now(); 
    }
}