/* ============================================
   TaskPressure - App Logic
   Jackpot Pool System
   ============================================ */

(function () {
    'use strict';

    // --- State ---
    let tasks = [];
    let timers = {};
    let totalPoints = 0;
    let poolPoints = 0;
    let winStreak = 0;

    // --- DOM Elements ---
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const modalOverlay = document.getElementById('modalOverlay');
    const taskForm = document.getElementById('taskForm');
    const taskNameInput = document.getElementById('taskName');
    const taskTimeSlider = document.getElementById('taskTimeSlider');
    const sliderDisplay = document.getElementById('sliderDisplay');
    const btnOpenModal = document.getElementById('btnOpenModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const timeupOverlay = document.getElementById('timeupOverlay');
    const timeupTaskName = document.getElementById('timeupTaskName');
    const btnDismissTimeup = document.getElementById('btnDismissTimeup');
    const completeOverlay = document.getElementById('completeOverlay');
    const completeTaskName = document.getElementById('completeTaskName');
    const immediatePointsEl = document.getElementById('immediatePoints');
    const poolAddPointsEl = document.getElementById('poolAddPoints');
    const pointsDetail = document.getElementById('pointsDetail');
    const withdrawSection = document.getElementById('withdrawSection');
    const withdrawPoolAmount = document.getElementById('withdrawPoolAmount');
    const btnWithdraw = document.getElementById('btnWithdraw');
    const btnDismissComplete = document.getElementById('btnDismissComplete');
    const totalPointsValue = document.getElementById('totalPointsValue');
    const poolValueEl = document.getElementById('poolValue');
    const streakValueEl = document.getElementById('streakValue');
    const poolLost = document.getElementById('poolLost');
    const lostAmount = document.getElementById('lostAmount');
    const jackpotOverlay = document.getElementById('jackpotOverlay');
    const jackpotAmount = document.getElementById('jackpotAmount');
    const btnDismissJackpot = document.getElementById('btnDismissJackpot');

    // --- Audio Context ---
    let audioCtx = null;

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playBeep(frequency = 880, duration = 0.15, count = 3) {
        const ctx = getAudioCtx();
        for (let i = 0; i < count; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * (duration + 0.1));
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.1) + duration);
            osc.start(ctx.currentTime + i * (duration + 0.1));
            osc.stop(ctx.currentTime + i * (duration + 0.1) + duration);
        }
    }

    function playAlarm() {
        const ctx = getAudioCtx();
        const frequencies = [880, 1100, 880, 1100, 880];
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.2);
            osc.start(ctx.currentTime + i * 0.25);
            osc.stop(ctx.currentTime + i * 0.25 + 0.25);
        });
    }

    function playSuccess() {
        const ctx = getAudioCtx();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.35);
        });
    }

    function playJackpot() {
        const ctx = getAudioCtx();
        const notes = [523, 659, 784, 1047, 1319, 1568];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.45);
        });
    }

    function playLoss() {
        const ctx = getAudioCtx();
        const notes = [400, 300, 200];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.25);
            osc.start(ctx.currentTime + i * 0.3);
            osc.stop(ctx.currentTime + i * 0.3 + 0.3);
        });
    }

    function vibrate(pattern) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    // --- Utility ---
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function formatSliderValue(minutes) {
        if (minutes >= 60) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return m > 0 ? `${h}時間${m}分` : `${h}時間`;
        }
        return `${minutes}分`;
    }

    function calculateBasePoints(remainingSeconds) {
        return Math.floor(remainingSeconds / 60);
    }

    function getStage(remaining, total) {
        if (remaining <= 0) return 'timeup';
        const ratio = remaining / total;
        if (ratio <= 0.1) return 'critical';
        if (ratio <= 0.25) return 'danger';
        if (ratio <= 0.5) return 'warning';
        return 'normal';
    }

    function getStatusText(task) {
        if (task.completed) return '✅ 完了';
        if (task.remaining <= 0) return '⏰ タイムアップ';
        if (task.running) return '▶ カウントダウン中...';
        if (task.remaining < task.totalSeconds) return '⏸ 一時停止中';
        return '⏳ 待機中';
    }

    // --- Storage ---
    function saveTasks() {
        const data = tasks.map(t => ({
            id: t.id,
            name: t.name,
            totalSeconds: t.totalSeconds,
            remaining: t.remaining,
            running: false,
            completed: t.completed,
            earnedPoints: t.earnedPoints || 0,
            createdAt: t.createdAt
        }));
        localStorage.setItem('taskpressure_tasks', JSON.stringify(data));
    }

    function loadTasks() {
        try {
            const data = JSON.parse(localStorage.getItem('taskpressure_tasks'));
            if (Array.isArray(data)) {
                tasks = data.map(t => ({
                    ...t,
                    running: false,
                    earnedPoints: t.earnedPoints || 0
                }));
            }
        } catch (e) {
            tasks = [];
        }
    }

    function savePoints() {
        localStorage.setItem('taskpressure_points', JSON.stringify(totalPoints));
    }

    function loadPoints() {
        try {
            const data = JSON.parse(localStorage.getItem('taskpressure_points'));
            if (typeof data === 'number') {
                totalPoints = data;
            }
        } catch (e) {
            totalPoints = 0;
        }
    }

    function savePool() {
        localStorage.setItem('taskpressure_pool', JSON.stringify(poolPoints));
        localStorage.setItem('taskpressure_streak', JSON.stringify(winStreak));
    }

    function loadPool() {
        try {
            const p = JSON.parse(localStorage.getItem('taskpressure_pool'));
            if (typeof p === 'number') poolPoints = p;
            const s = JSON.parse(localStorage.getItem('taskpressure_streak'));
            if (typeof s === 'number') winStreak = s;
        } catch (e) {
            poolPoints = 0;
            winStreak = 0;
        }
    }

    function updatePointsDisplay() {
        totalPointsValue.textContent = totalPoints;
    }

    function updatePoolDisplay() {
        poolValueEl.textContent = poolPoints;
        streakValueEl.textContent = winStreak;

        // プールバッジの光彩
        const poolBadge = document.getElementById('poolBadge');
        if (poolPoints > 0) {
            poolBadge.classList.add('has-pool');
        } else {
            poolBadge.classList.remove('has-pool');
        }

        // 連勝バッジの表示
        const streakBadge = document.getElementById('streakBadge');
        if (winStreak > 0) {
            streakBadge.classList.add('active');
        } else {
            streakBadge.classList.remove('active');
        }
    }

    // --- Rendering ---
    const RING_CIRCUMFERENCE = 175.93;

    function renderTasks() {
        if (tasks.length === 0) {
            emptyState.style.display = '';
            taskList.innerHTML = '';
            return;
        }
        emptyState.style.display = 'none';

        const existingIds = new Set();
        tasks.forEach(task => existingIds.add(task.id));

        // Remove cards that no longer exist
        taskList.querySelectorAll('.task-card').forEach(card => {
            if (!existingIds.has(card.dataset.id)) {
                card.remove();
            }
        });

        tasks.forEach(task => {
            let card = taskList.querySelector(`.task-card[data-id="${task.id}"]`);
            if (!card) {
                card = createTaskCard(task);
                taskList.appendChild(card);
            }
            updateTaskCard(card, task);
        });
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.id = task.id;
        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-name">${escapeHtml(task.name)}</div>
                <div class="task-actions">
                    <button class="btn-complete" aria-label="完了" title="完了">✓</button>
                    <button class="btn-delete" aria-label="削除" title="削除">✕</button>
                </div>
            </div>
            <div class="timer-display">
                <div class="timer-ring-container">
                    <svg class="timer-ring" viewBox="0 0 60 60">
                        <circle class="timer-ring-bg" cx="30" cy="30" r="28" />
                        <circle class="timer-ring-progress" cx="30" cy="30" r="28" />
                    </svg>
                    <div class="timer-text"></div>
                </div>
                <div class="timer-info">
                    <div class="timer-countdown"></div>
                    <div class="timer-status"></div>
                </div>
                <div class="task-points-badge">
                    <span class="badge-value">${calculateBasePoints(task.remaining)}</span>
                    <span class="badge-unit">pt</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar"></div>
            </div>
            <div class="task-controls"></div>
        `;

        // Events
        card.querySelector('.btn-complete').addEventListener('click', () => completeTask(task.id));
        card.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));

        return card;
    }

    function updateTaskCard(card, task) {
        const stage = getStage(task.remaining, task.totalSeconds);

        // Update classes
        card.className = 'task-card';
        if (stage !== 'normal') card.classList.add(`stage-${stage}`);
        if (task.completed) card.classList.add('completed');

        // Timer text (percentage)
        const pct = task.totalSeconds > 0 ? Math.round((task.remaining / task.totalSeconds) * 100) : 0;
        card.querySelector('.timer-text').textContent = `${pct}%`;

        // Ring progress
        const progress = task.totalSeconds > 0 ? task.remaining / task.totalSeconds : 0;
        const offset = RING_CIRCUMFERENCE * (1 - progress);
        card.querySelector('.timer-ring-progress').style.strokeDashoffset = offset;

        // Countdown
        card.querySelector('.timer-countdown').textContent = formatTime(Math.max(0, task.remaining));

        // Status
        card.querySelector('.timer-status').textContent = getStatusText(task);

        // Points badge
        const badge = card.querySelector('.task-points-badge');
        if (task.completed) {
            badge.querySelector('.badge-value').textContent = task.earnedPoints || 0;
            badge.classList.add('earned');
        } else if (task.remaining <= 0) {
            badge.querySelector('.badge-value').textContent = '0';
            badge.classList.add('zero');
        } else {
            badge.querySelector('.badge-value').textContent = calculateBasePoints(task.remaining);
            badge.classList.remove('earned', 'zero');
        }

        // Progress bar
        const barWidth = task.totalSeconds > 0 ? (task.remaining / task.totalSeconds) * 100 : 0;
        card.querySelector('.progress-bar').style.width = `${barWidth}%`;

        // Controls
        const controlsContainer = card.querySelector('.task-controls');
        if (task.completed || task.remaining <= 0) {
            controlsContainer.innerHTML = '';
        } else if (task.running) {
            controlsContainer.innerHTML = `
                <button class="btn-control btn-pause">⏸ 一時停止</button>
                <button class="btn-control btn-reset">↺ リセット</button>
            `;
            controlsContainer.querySelector('.btn-pause').addEventListener('click', () => pauseTask(task.id));
            controlsContainer.querySelector('.btn-reset').addEventListener('click', () => resetTask(task.id));
        } else {
            controlsContainer.innerHTML = `
                <button class="btn-control btn-start">▶ スタート</button>
                <button class="btn-control btn-reset">↺ リセット</button>
            `;
            controlsContainer.querySelector('.btn-start').addEventListener('click', () => startTask(task.id));
            controlsContainer.querySelector('.btn-reset').addEventListener('click', () => resetTask(task.id));
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Task Operations ---
    function addTask(name, totalSeconds) {
        const task = {
            id: generateId(),
            name: name,
            totalSeconds: totalSeconds,
            remaining: totalSeconds,
            running: false,
            completed: false,
            earnedPoints: 0,
            createdAt: Date.now()
        };
        tasks.unshift(task);
        saveTasks();
        renderTasks();
    }

    function startTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task || task.completed || task.remaining <= 0) return;

        task.running = true;
        renderTasks();

        if (timers[id]) clearInterval(timers[id]);

        let lastWarningBeep = 0;
        timers[id] = setInterval(() => {
            task.remaining--;

            // Warning beeps
            const stage = getStage(task.remaining, task.totalSeconds);
            if (stage === 'critical' && task.remaining > 0) {
                const now = Date.now();
                if (now - lastWarningBeep > 3000) {
                    playBeep(660, 0.1, 2);
                    vibrate([100, 50, 100]);
                    lastWarningBeep = now;
                }
            }

            if (task.remaining <= 0) {
                task.remaining = 0;
                task.running = false;
                clearInterval(timers[id]);
                delete timers[id];
                onTimeUp(task);
            }

            renderTasks();
            saveTasks();
        }, 1000);
    }

    function pauseTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.running = false;
        if (timers[id]) {
            clearInterval(timers[id]);
            delete timers[id];
        }
        renderTasks();
        saveTasks();
    }

    function resetTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        pauseTask(id);
        task.remaining = task.totalSeconds;
        task.completed = false;
        task.earnedPoints = 0;
        renderTasks();
        saveTasks();
    }

    function completeTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task || task.completed) return;
        pauseTask(id);

        // Jackpot Pool calculation
        const basePts = calculateBasePoints(task.remaining);
        const immediatePts = Math.floor(basePts / 2);
        const poolPts = basePts - immediatePts; // remaining half + rounding

        task.earnedPoints = immediatePts;
        task.completed = true;

        // Add immediate points
        totalPoints += immediatePts;
        savePoints();

        // Add to pool
        poolPoints += poolPts;
        winStreak++;

        // Show completion overlay
        showCompleteOverlay(task, immediatePts, poolPts);

        // Check for jackpot (3 consecutive wins)
        if (winStreak >= 3) {
            // Delay jackpot overlay to show after complete overlay
            setTimeout(() => {
                triggerJackpot();
            }, 300);
        }

        savePool();
        updatePointsDisplay();
        updatePoolDisplay();
        renderTasks();
        saveTasks();
    }

    function triggerJackpot() {
        const amount = poolPoints;
        totalPoints += amount;
        poolPoints = 0;
        winStreak = 0;

        savePoints();
        savePool();
        updatePointsDisplay();
        updatePoolDisplay();

        // Show jackpot overlay
        jackpotAmount.textContent = `+${amount}`;
        jackpotOverlay.classList.add('active');
        playJackpot();
        vibrate([100, 50, 100, 50, 100, 50, 300]);
    }

    function withdrawPool() {
        const amount = Math.floor(poolPoints * 0.8);
        totalPoints += amount;
        poolPoints = 0;
        winStreak = 0;

        savePoints();
        savePool();
        updatePointsDisplay();
        updatePoolDisplay();

        // Close complete overlay and show feedback
        completeOverlay.classList.remove('active');
        playSuccess();
        vibrate([100, 50, 200]);
    }

    function showCompleteOverlay(task, immediatePts, poolPts) {
        completeTaskName.textContent = task.name;
        immediatePointsEl.textContent = `+${immediatePts} pt`;
        poolAddPointsEl.textContent = `+${poolPts} pt`;
        pointsDetail.textContent = `残り時間: ${formatTime(task.remaining)}`;

        // Show withdraw section if pool has points
        if (poolPoints > 0 && winStreak < 3) {
            withdrawSection.style.display = '';
            withdrawPoolAmount.textContent = poolPoints;
        } else {
            withdrawSection.style.display = 'none';
        }

        completeOverlay.classList.add('active');
        playSuccess();
        vibrate([100, 50, 100, 50, 200]);
    }

    function deleteTask(id) {
        pauseTask(id);
        tasks = tasks.filter(t => t.id !== id);
        const card = taskList.querySelector(`.task-card[data-id="${id}"]`);
        if (card) {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(60px)';
            setTimeout(() => {
                card.remove();
                renderTasks();
            }, 300);
        }
        saveTasks();
    }

    function onTimeUp(task) {
        // Pool confiscation
        const lost = poolPoints;
        poolPoints = 0;
        winStreak = 0;
        savePool();
        updatePoolDisplay();

        // Show lost amount
        if (lost > 0) {
            poolLost.style.display = '';
            lostAmount.textContent = lost;
            playLoss();
        } else {
            poolLost.style.display = 'none';
            playAlarm();
        }
        vibrate([200, 100, 200, 100, 400]);

        timeupTaskName.textContent = task.name;
        timeupOverlay.classList.add('active');
    }

    // --- Slider ---
    function updateSliderDisplay() {
        const val = parseInt(taskTimeSlider.value, 10);
        sliderDisplay.textContent = formatSliderValue(val);

        // Update slider track fill
        const min = parseInt(taskTimeSlider.min, 10);
        const max = parseInt(taskTimeSlider.max, 10);
        const pct = ((val - min) / (max - min)) * 100;
        taskTimeSlider.style.setProperty('--slider-pct', `${pct}%`);
    }

    taskTimeSlider.addEventListener('input', updateSliderDisplay);

    // --- Modal Controls ---
    function openModal() {
        modalOverlay.classList.add('active');
        taskNameInput.value = '';
        taskTimeSlider.value = 25;
        updateSliderDisplay();
        setTimeout(() => taskNameInput.focus(), 400);
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    // --- Event Listeners ---
    btnOpenModal.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // FAB長押しでポイントリセット
    let resetLongPressTimer = null;
    const fabBtn = document.getElementById('btnOpenModal');
    fabBtn.addEventListener('touchstart', (e) => {
        resetLongPressTimer = setTimeout(() => {
            e.preventDefault();
            if (confirm('ポイント・プール・連勝をすべてリセットしますか？')) {
                totalPoints = 0;
                poolPoints = 0;
                winStreak = 0;
                savePoints();
                savePool();
                updatePointsDisplay();
                updatePoolDisplay();
                vibrate([200]);
            }
        }, 1000);
    }, { passive: false });
    fabBtn.addEventListener('touchend', () => { clearTimeout(resetLongPressTimer); });
    fabBtn.addEventListener('touchmove', () => { clearTimeout(resetLongPressTimer); });

    btnDismissTimeup.addEventListener('click', () => {
        timeupOverlay.classList.remove('active');
    });

    btnDismissComplete.addEventListener('click', () => {
        completeOverlay.classList.remove('active');
    });

    btnWithdraw.addEventListener('click', () => {
        withdrawPool();
    });

    btnDismissJackpot.addEventListener('click', () => {
        jackpotOverlay.classList.remove('active');
    });

    // Form submit
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = taskNameInput.value.trim();
        if (!name) return;

        const minutes = parseInt(taskTimeSlider.value, 10);
        const total = minutes * 60;

        if (total <= 0) return;

        addTask(name, total);
        closeModal();
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (jackpotOverlay.classList.contains('active')) {
                jackpotOverlay.classList.remove('active');
            } else if (completeOverlay.classList.contains('active')) {
                completeOverlay.classList.remove('active');
            } else if (timeupOverlay.classList.contains('active')) {
                timeupOverlay.classList.remove('active');
            } else if (modalOverlay.classList.contains('active')) {
                closeModal();
            }
        }
    });

    // --- Initialize ---
    loadTasks();
    loadPoints();
    loadPool();
    updatePointsDisplay();
    updatePoolDisplay();
    updateSliderDisplay();
    renderTasks();

})();
