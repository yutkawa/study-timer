let totalSeconds = 25 * 60;
let remainingSeconds = 25 * 60;
let timerInterval = null;
let isRunning = false;
let isPaused = false;
let warningCount = 0;

let audioCtx = null;
let pipitInterval = null;

// Initialize Audio Context on user action
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Preset selection handler
function setPresetTime(minutes) {
    document.getElementById('customMinutes').value = minutes;
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText === `${minutes}分`) {
            btn.classList.add('active');
        }
    });
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
}

function handleCustomInput(value) {
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
    let mins = parseInt(value, 10);
    if (isNaN(mins) || mins <= 0) mins = 1;
    totalSeconds = mins * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
}

// Update time display text and progress bar
function updateDisplay() {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    document.getElementById('timeDisplay').innerText = timeStr;
    document.title = isRunning ? `(${timeStr}) 勉強タイマー` : '勉強タイマー Focus Shield';

    // Update progress bar
    const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

// Play repeating "Pi-Pit" (ピーピッ) sound
function playPiPitSound() {
    if (!audioCtx) return;

    function tone(freq, startTime, duration) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    const now = audioCtx.currentTime;
    // First "Pi"
    tone(880, now, 0.08); // A5
    // Second "Pit"
    tone(1760, now + 0.1, 0.12); // A6
}

function startPiPitLoop() {
    initAudio();
    if (pipitInterval) clearInterval(pipitInterval);
    playPiPitSound();
    pipitInterval = setInterval(playPiPitSound, 800);
}

function stopPiPitLoop() {
    if (pipitInterval) {
        clearInterval(pipitInterval);
        pipitInterval = null;
    }
}

// Play completion chime
function playCompletionSound() {
    initAudio();
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
        gain.gain.setValueAtTime(0.25, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.5);
    });
}

// Start Timer
function startTimer() {
    initAudio();
    const customVal = parseInt(document.getElementById('customMinutes').value, 10);
    if (!isNaN(customVal) && customVal > 0) {
        totalSeconds = customVal * 60;
        remainingSeconds = totalSeconds;
    }

    warningCount = 0;
    document.getElementById('warningCount').innerText = '0';
    document.getElementById('warningCounter').classList.add('hidden');

    isRunning = true;
    isPaused = false;
    document.getElementById('pauseBtn').innerText = '一時停止';
    document.getElementById('headerStatus').innerText = '実行中';

    // Show Timer Screen
    document.getElementById('timerContainer').classList.remove('hidden');

    // Request Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    updateDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
}

// Main countdown tick
function tick() {
    if (isPaused) return;

    if (remainingSeconds > 0) {
        remainingSeconds--;
        updateDisplay();
    } else {
        clearInterval(timerInterval);
        isRunning = false;
        playCompletionSound();
        alert('🎉 時間になりました！お疲れ様でした！');
        resetTimer();
    }
}

// Toggle Pause/Resume
function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    if (isPaused) {
        pauseBtn.innerText = '再開';
        document.getElementById('headerStatus').innerText = '一時停止中';
    } else {
        pauseBtn.innerText = '一時停止';
        document.getElementById('headerStatus').innerText = '実行中';
    }
}

// Confirm Reset
function confirmReset() {
    if (confirm('タイマーを終了してセットアップ画面に戻りますか？')) {
        resetTimer();
    }
}

// Reset UI state
function resetTimer() {
    clearInterval(timerInterval);
    stopPiPitLoop();
    isRunning = false;
    isPaused = false;
    
    document.getElementById('timerContainer').classList.add('hidden');
    document.getElementById('warningModal').classList.add('hidden');
    document.getElementById('headerStatus').innerText = '準備中';

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    document.title = '勉強タイマー Focus Shield';
}

// Handle Page Visibility Change (Tab or App switch detection)
document.addEventListener('visibilitychange', () => {
    if (isRunning && document.hidden) {
        warningCount++;
        document.getElementById('warningCount').innerText = warningCount;
        document.getElementById('warningCounter').classList.remove('hidden');
        document.getElementById('warningModal').classList.remove('hidden');

        // Trigger repeating "Pi-Pit" sound loop
        startPiPitLoop();
    }
});

// Dismiss Warning Modal
function dismissWarning() {
    stopPiPitLoop();
    document.getElementById('warningModal').classList.add('hidden');
}
