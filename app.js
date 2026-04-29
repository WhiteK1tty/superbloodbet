const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || { id: 0, username: 'guest', first_name: 'Guest' };
const userId = user.id;
const username = user.username || user.first_name || 'guest';

const API = 'https://bingo-pgp-tobago-demanding.trycloudflare.com';

let myBets = JSON.parse(localStorage.getItem('myBets') || '[]');
let selectedOptions = {};
let allEvents = [];

async function init() {
    loadBalance();
    loadAllEvents();
}

async function loadBalance() {
    try {
        const res = await fetch(`${API}/api/balance?userId=${userId}`);
        const data = await res.json();
        document.getElementById('balance-value').textContent = data.balance.toFixed(0) + ' ₽';
    } catch (e) {}
}

async function loadAllEvents() {
    try {
        const res = await fetch(`${API}/api/events`);
        allEvents = await res.json() || [];
    } catch (e) {
        allEvents = [];
    }
    renderDayTab();
    renderEventsTab();
}

function renderDayTab() {
    const container = document.getElementById('page-day');
    if (allEvents.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <span class="empty-icon">🩸</span>
                <span class="empty-text">Нет активных событий</span>
            </div>`;
        return;
    }

    // Первое событие как "ставка дня"
    const featured = allEvents[0];
    const opt1 = featured.options[0] || '';
    const opt2 = featured.options[1] || '';

    let html = `
        <div class="bet-day-card">
            <div class="bet-day-title">СТАВКА<br>ДНЯ</div>
            <div class="teams-row">
                <div class="team">
                    <div class="team-logo"><div style="color:rgba(255,255,255,0.3);font-size:28px">?</div></div>
                    <div class="team-name">${opt2}</div>
                    <div class="team-coef">2. Команда</div>
                </div>
                <div class="vs-block">
                    <div class="vs-text">VS</div>
                </div>
                <div class="team">
                    <div class="team-logo"><div style="color:rgba(255,255,255,0.3);font-size:28px">?</div></div>
                    <div class="team-name">${opt1}</div>
                    <div class="team-coef">1. Команда</div>
                </div>
            </div>
        </div>`;

    // Остальные как "ближайшие матчи"
    if (allEvents.length > 0) {
        html += `<div class="section-title">Ближайшие матчи</div>`;
        html += allEvents.map(e => renderEventCard(e)).join('');
    }

    container.innerHTML = html;
}

function renderEventsTab() {
    const container = document.getElementById('page-events');
    if (allEvents.length === 0) {
        container.innerHTML = `<div class="empty"><span class="empty-icon">🩸</span><span class="empty-text">Нет активных событий</span></div>`;
        return;
    }
    container.innerHTML = allEvents.map(e => renderEventCard(e)).join('');
}

function renderEventCard(event) {
    const opts = event.options.map(opt => `
        <div class="option-btn" id="opt-${event.id}-${opt}" onclick="selectOption('${event.id}', '${opt}')">
            ${opt}
        </div>
    `).join('');

    return `
        <div class="event-card">
            <div class="event-header">
                <div class="event-title">${event.title}</div>
                <div class="event-live">LIVE</div>
            </div>
            <div class="options">${opts}</div>
            <div class="bet-row">
                <div class="amount-wrap">
                    <input class="amount-input" type="number" id="amount-${event.id}" placeholder="Сумма ставки" min="1">
                </div>
                <button class="bet-btn" onclick="placeBet('${event.id}')">Ставить</button>
            </div>
        </div>
    `;
}

function selectOption(eventId, choice) {
    if (selectedOptions[eventId]) {
        const prev = document.getElementById(`opt-${eventId}-${selectedOptions[eventId]}`);
        if (prev) prev.classList.remove('selected');
    }
    selectedOptions[eventId] = choice;
    const el = document.getElementById(`opt-${eventId}-${choice}`);
    if (el) el.classList.add('selected');
}

async function placeBet(eventId) {
    const choice = selectedOptions[eventId];
    if (!choice) { showToast('Выбери вариант'); return; }
    const amountEl = document.getElementById(`amount-${eventId}`);
    const amount = parseFloat(amountEl.value);
    if (!amount || amount <= 0) { showToast('Введи сумму'); return; }

    try {
        const res = await fetch(`${API}/api/bet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, username, eventId, choice, amount })
        });
        const data = await res.json();
        showToast(data.message || data.error);
        if (data.message && data.message.includes('✅')) {
            myBets.push({ eventId, choice, amount });
            localStorage.setItem('myBets', JSON.stringify(myBets));
            amountEl.value = '';
            loadBalance();
            renderMyBets();
        }
    } catch (e) {
        showToast('Ошибка соединения');
    }
}

function renderMyBets() {
    const container = document.getElementById('page-mybets');
    if (myBets.length === 0) {
        container.innerHTML = `<div class="empty"><span class="empty-icon">🩸</span><span class="empty-text">Ставок пока нет</span></div>`;
        return;
    }
    container.innerHTML = myBets.slice().reverse().map(b => `
        <div class="my-bet-item">
            <div class="bet-info">
                <div class="my-bet-event">Событие: ${b.eventId}</div>
                <div class="my-bet-choice">${b.choice}</div>
            </div>
            <div class="my-bet-amount">${parseFloat(b.amount).toFixed(0)} ₽</div>
        </div>
    `).join('');
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${tab}`).classList.add('active');
    if (tab === 'mybets') renderMyBets();
}

function showProfile() { showToast('Профиль: @' + username); }
function showSettings() { showToast('Настройки в разработке'); }

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

init();
