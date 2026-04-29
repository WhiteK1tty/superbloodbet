const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#9c0000a9');

const API = 'https://bingo-pgp-tobago-demanding.trycloudflare.com';

async function loadEvents() {
    try {
        const res = await fetch(`${API}/api/events/all`);
        const events = await res.json();
        const container = document.getElementById('events-list');
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="empty">Нет событий</div>';
            return;
        }
        container.innerHTML = events.map(e => `
            <div class="event-item">
                <div class="event-dot ${e.active ? 'dot-open' : 'dot-closed'}"></div>
                <div class="event-item-info">
                    <div class="event-item-title">${e.title}</div>
                    <div class="event-item-meta">ID: ${e.id} · ${e.options.join(', ')}</div>
                </div>
                ${e.active ? `<button class="resolve-btn" onclick="showResolve('${e.id}', ${JSON.stringify(e.options)})">Закрыть</button>` : ''}
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('events-list').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    }
}

async function createEvent() {
    const id = document.getElementById('eventId').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const options = document.getElementById('eventOptions').value.trim().split('\n').filter(o => o.trim());

    if (!id || !title || options.length < 2) {
        showToast('Заполни все поля, минимум 2 варианта');
        return;
    }

    try {
        const res = await fetch(`${API}/api/admin/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, title, options })
        });
        const data = await res.json();
        showToast(data.message || '✅ Событие создано');
        document.getElementById('eventId').value = '';
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventOptions').value = '';
        loadEvents();
    } catch (e) {
        showToast('Ошибка соединения');
    }
}

function showResolve(eventId, options) {
    const choice = prompt(`Победитель для "${eventId}"?\n\nВарианты:\n${options.join('\n')}`);
    if (!choice) return;
    resolveEvent(eventId, choice.trim());
}

async function resolveEvent(eventId, winner) {
    try {
        const res = await fetch(`${API}/api/admin/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, winner })
        });
        const data = await res.json();
        showToast(data.message || '✅ Событие закрыто');
        loadEvents();
    } catch (e) {
        showToast('Ошибка соединения');
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

loadEvents();
