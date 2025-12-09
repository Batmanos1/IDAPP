const btnState = { L: { repeat: null, tapCount: 0, tapTimer: null }, R: { repeat: null, tapCount: 0, tapTimer: null } };
let isGameRunning = false; 

let lastInputTime = Date.now();
let currentHappiness = 50; 

const initialVitalStates = { hap: 50, hun: 80, eng: 10 };

window.addEventListener('load', () => { 
    setInterval(checkIdleStatus, 1000); 
    // We don't need updateBackgroundVitals initially anymore, CSS handles defaults
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
    
    // Updates global theme based on happiness
    if (happiness >= 90) { v.classList.add('mood-love'); b.classList.add('mood-love'); }
    else if (happiness > 60) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); } 
    else if (happiness < 30) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
}

function updateBackgroundVitals(vitals) {
    // This function used to redraw the background.
    // Now, we update the status bars, but the background "Aurora" 
    // is controlled purely by CSS variables in the mood classes.
    document.getElementById('bar-hap').style.width = vitals.hap + '%';
    document.getElementById('bar-eng').style.width = (100 - vitals.eng) + '%';
    document.getElementById('val-eng').innerText = (100 - vitals.eng) + '%';
}

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
    } else if (state.tapCount === 2) {
        send(cmd); send(cmd); state.tapCount = 0;
    }
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

function openMenu() { 
    document.getElementById('menuModal').style.display = 'flex'; 
    send('Q'); 
    let gameContent = document.getElementById('cat-games');
    gameContent.style.maxHeight = gameContent.scrollHeight + "px";
}
function closeMenu() { document.getElementById('menuModal').style.display = 'none'; }

function toggleCat(id) { 
    const content = document.getElementById('cat-' + id);
    if (content.style.maxHeight) { content.style.maxHeight = null; } else { 
        let allContent = document.querySelectorAll('.cat-content');
        allContent.forEach(c => c.style.maxHeight = null);
        content.style.maxHeight = content.scrollHeight + "px"; 
    }
}
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
        dev = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'IDA' }], optionalServices: [sUUID] });
        dev.addEventListener('gattserverdisconnected', onDisc);
        serv = await dev.gatt.connect();
        let svc = await serv.getPrimaryService(sUUID);
        charRX = await svc.getCharacteristic(cRX);
        let charTX = await svc.getCharacteristic(cTX);
        await charTX.startNotifications();
        charTX.addEventListener('characteristicvaluechanged', handleUpdate);
        
        // --- VISUAL CONNECTION EFFECTS ---
        document.getElementById('status').innerText = "ONLINE";
        document.getElementById('status').classList.add('on');
        document.getElementById('connectOverlay').style.display = 'none';
        document.getElementById('coin-box').style.display = 'block';
        document.getElementById('visor').classList.remove('mood-off');
        
        // AWAKEN THE AURORA
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
    
    // KILL THE AURORA
    document.getElementById('nebula-bg').classList.remove('alive');
    
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
        document.getElementById('app-title').innerText = idParts[1].toUpperCase(); 
        document.getElementById('app-type').innerText = "TYPE: " + idParts[0].toUpperCase(); 
        if(idParts[2]) document.getElementById('val-coins').innerText = idParts[2]; 
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
        if (num === 1) { v.classList.add('mood-happy'); b.classList.add('mood-happy'); }
        if (num === 2) { v.classList.add('mood-angry'); b.classList.add('mood-angry'); }
        if (num === 3) { v.classList.add('mood-tired'); b.classList.add('mood-tired'); }
        if (num === 5) { v.classList.add('mood-love'); b.classList.add('mood-love'); } 
        if (num === 0) v.classList.remove('mood-sleep'); 
        lastInputTime = Date.now(); 
    }
}