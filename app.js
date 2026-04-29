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
        container.innerHTML = `<div class="empty"><span class="empty-icon">🩸</span><span class="empty-text">Нет активных событий</span></div>`;
        return;
    }

    // Ищем featured событие, иначе берём первое
    const featured = allEvents.find(e => e.featured) || allEvents[0];
    const opt1 = featured.options[0] || '';
    const opt2 = featured.options[1] || '';
    const odd1 = featured.odds?.[opt1] ? `x${featured.odds[opt1]}` : '';
    const odd2 = featured.odds?.[opt2] ? `x${featured.odds[opt2]}` : '';
    const logo1 = featured.logos?.[opt1] || '';
    const logo2 = featured.logos?.[opt2] || '';

    let html = `
        <div class="featured-card">
            <div class="featured-inner">
                <div class="featured-team">
                    <div class="featured-logo">
                        ${logo2 ? `<img src="${logo2}" alt="${opt2}">` : '<div class="logo-placeholder"></div>'}
                    </div>
                    <div class="featured-name">${opt2}</div>
                    <div class="featured-odd">${odd2}</div>
                </div>
                <div class="featured-center">
                    <div class="featured-label">СТАВКА<br>ДНЯ</div>
                    <button class="featured-bet-btn" onclick="openFeaturedBet('${featured.id}')">Поставить</button>
                </div>
                <div class="featured-team">
                    <div class="featured-logo">
                        ${logo1 ? `<img src="${logo1}" alt="${opt1}">` : '<div class="logo-placeholder"></div>'}
                    </div>
                    <div class="featured-name">${opt1}</div>
                    <div class="featured-odd">${odd1}</div>
                </div>
            </div>
        </div>`;

    // Остальные матчи
    const others = allEvents.filter(e => e.id !== featured.id);
    if (others.length > 0) {
        html += `<div class="section-title">Ближайшие матчи</div>`;
        html += others.map(e => renderEventCard(e)).join('');
    }

    container.innerHTML = html;
}

function openFeaturedBet(eventId) {
    // Переключаемся на вкладку "все ставки" и скроллим к событию
    switchTab('events', document.querySelectorAll('.tab')[1]);
    setTimeout(() => {
        const el = document.getElementById(`amount-${eventId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

function switchTab(tab, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${tab}`).classList.add('active');
    if (tab === 'mybets') renderMyBets();
}

function showProfile() { showToast('Профиль: @' + username); }
function showSettings() { showToast('Настройки в разработке'); }

function requestDeposit() {
    tg.showPopup({
        title: 'Пополнение баланса',
        message: 'Для пополнения баланса обратитесь к администратору.\n\nВаш username: @' + username,
        buttons: [
            { id: 'copy', type: 'default', text: 'Понятно' }
        ]
    });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

init();
