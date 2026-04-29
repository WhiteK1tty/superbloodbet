const tg = window.Telegram.WebApp;
tg.expand();

const API = 'https://bingo-pgp-tobago-demanding.trycloudflare.com';

let currentEditEvent = null;

async function loadEvents() {
    try {
        const res = await fetch(`${API}/api/events/all`);
        const events = await res.json();
        const container = document.getElementById('events-list');
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="empty"><span class="empty-text">Нет событий</span></div>';
            return;
        }
        container.innerHTML = events.map(e => `
            <div class="event-item">
                <div class="event-dot ${e.active ? 'dot-open' : 'dot-closed'}"></div>
                <div class="event-item-info">
                    <div class="event-item-title">${e.title} ${e.featured ? '⭐' : ''}</div>
                    <div class="event-item-meta">ID: ${e.id} · ${e.options.join(', ')}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
                    <button class="resolve-btn" onclick="openEdit(${JSON.stringify(e).replace(/"/g, '&quot;')})">Изменить</button>
                    ${e.active ? `<button class="resolve-btn" onclick="showResolve('${e.id}', ${JSON.stringify(e.options)})">Закрыть</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('events-list').innerHTML = '<div class="empty"><span class="empty-text">Ошибка загрузки</span></div>';
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
        showToast(data.message || '✅ Создано');
        document.getElementById('eventId').value = '';
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventOptions').value = '';
        loadEvents();
    } catch (e) {
        showToast('Ошибка соединения');
    }
}

function openEdit(event) {
    currentEditEvent = event;
    document.getElementById('edit-title').textContent = event.title;

    const fields = document.getElementById('edit-fields');
    let html = '';

    // Ставка дня
    html += `
        <div class="field">
            <label>Ставка дня</label>
            <select id="edit-featured" style="width:100%;padding:10px;border-radius:9px;border:1px solid rgba(100,0,6,0.5);background:rgba(4,0,0,0.95);color:#ff8888;font-size:15px;">
                <option value="false" ${!event.featured ? 'selected' : ''}>Нет</option>
                <option value="true" ${event.featured ? 'selected' : ''}>Да ⭐</option>
            </select>
        </div>`;

    // Для каждого варианта — коэффициент и логотип
    event.options.forEach(opt => {
        const odd = event.odds?.[opt] || '';
        const logo = event.logos?.[opt] || '';
        html += `
            <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;margin-bottom:10px;">
                <div style="font-family:'Oswald',sans-serif;color:#cc0000;font-size:13px;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">${opt}</div>
                <div class="field">
                    <label>Коэффициент</label>
                    <input type="number" step="0.01" id="odd-${opt}" value="${odd}" placeholder="1.85">
                </div>
                <div class="field">
                    <label>URL логотипа (PNG)</label>
                    <input type="text" id="logo-${opt}" value="${logo}" placeholder="https://...">
                </div>
            </div>`;
    });

    fields.innerHTML = html;
    document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
    currentEditEvent = null;
}

async function saveEvent() {
    if (!currentEditEvent) return;

    const featured = document.getElementById('edit-featured').value === 'true';
    const odds = {};
    const logos = {};

    currentEditEvent.options.forEach(opt => {
        const odd = parseFloat(document.getElementById(`odd-${opt}`)?.value);
        const logo = document.getElementById(`logo-${opt}`)?.value?.trim();
        if (!isNaN(odd) && odd > 0) odds[opt] = odd;
        if (logo) logos[opt] = logo;
    });

    try {
        const res = await fetch(`${API}/api/admin/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: currentEditEvent.id, featured, odds, logos })
        });
        const data = await res.json();
        showToast(data.message || '✅ Сохранено');
        closeModal();
        loadEvents();
    } catch (e) {
        showToast('Ошибка соединения');
    }
}

function showProfile() { showToast('Профиль администратора'); }
function showSettings() { showToast('Настройки в разработке'); }

async function doPayout() {
    const username = document.getElementById('payout-username').value.replace('@','').trim();
    const amount   = parseFloat(document.getElementById('payout-amount').value);
    const comment  = document.getElementById('payout-comment').value.trim();
    if (!username || isNaN(amount) || amount <= 0) { showToast('Заполни поля'); return; }

    try {
        const res = await fetch(`${API}/api/admin/give`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, amount })
        });
        const data = await res.json();
        showToast(data.message || data.error);
        document.getElementById('payout-username').value = '';
        document.getElementById('payout-amount').value = '';
        document.getElementById('payout-comment').value = '';
    } catch (e) { showToast('Ошибка соединения'); }
}
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
        showToast(data.message || '✅ Закрыто');
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
