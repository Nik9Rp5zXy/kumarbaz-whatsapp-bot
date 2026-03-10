// ─── Globals ───
let usersData = [];

// ─── Tab Navigation ───
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        loadTab(tab);
    });
});

// ─── Load Tab Data ───
async function loadTab(tab) {
    switch (tab) {
        case 'dashboard': return loadDashboard();
        case 'users': return loadUsers();
        case 'aliases': return loadAliases();
        case 'wanted': return loadWanted();
        case 'spam': return loadSpam();
    }
}

// ─── Dashboard ───
async function loadDashboard() {
    const res = await fetch('/api/stats');
    const stats = await res.json();

    const grid = document.getElementById('stats-grid');
    grid.innerHTML = `
        <div class="stat-card accent">
            <div class="label">Toplam Kullanıcı</div>
            <div class="value">${stats.totalUsers}</div>
        </div>
        <div class="stat-card green">
            <div class="label">Toplam Ekonomi</div>
            <div class="value">${formatMoney(stats.totalEconomy)}</div>
        </div>
        <div class="stat-card">
            <div class="label">Toplam Mesaj</div>
            <div class="value">${stats.totalMessages.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="label">Toplam Oyun</div>
            <div class="value">${(stats.totalGamesWon + stats.totalGamesLost).toLocaleString()}</div>
            <div class="sub">${stats.totalGamesWon}W / ${stats.totalGamesLost}L</div>
        </div>
        <div class="stat-card green">
            <div class="label">En Zengin</div>
            <div class="value">${stats.richest ? formatMoney(stats.richest.balance) : '-'}</div>
            <div class="sub">${stats.richest ? shortId(stats.richest.id) : '-'}</div>
        </div>
        <div class="stat-card red">
            <div class="label">En Fakir</div>
            <div class="value">${stats.poorest ? formatMoney(stats.poorest.balance) : '-'}</div>
            <div class="sub">${stats.poorest ? shortId(stats.poorest.id) : '-'}</div>
        </div>
    `;
}

// ─── Users ───
async function loadUsers() {
    const res = await fetch('/api/users');
    usersData = await res.json();
    renderUsers(usersData);
}

function renderUsers(users) {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = users.map((u, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><code>${shortId(u.id)}</code></td>
            <td><span class="badge ${u.balance >= 0 ? 'green' : 'red'}">${formatMoney(u.balance)}</span></td>
            <td>${u.msg_count || 0}</td>
            <td>${u.games_won || 0}W / ${u.games_lost || 0}L</td>
            <td>${u.spouse ? shortId(u.spouse) : '-'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-primary btn-sm" onclick="openEditUser('${encodeURIComponent(u.id)}')">Düzenle</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${encodeURIComponent(u.id)}')">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Search
document.getElementById('user-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = usersData.filter(u => u.id.toLowerCase().includes(q));
    renderUsers(filtered);
});

// ─── Aliases ───
async function loadAliases() {
    const res = await fetch('/api/aliases');
    const aliases = await res.json();
    const tbody = document.querySelector('#aliases-table tbody');
    tbody.innerHTML = aliases.map((a, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><code>${shortId(a.alias_id)}</code></td>
            <td class="arrow-cell">→</td>
            <td><code>${shortId(a.primary_id)}</code></td>
        </tr>
    `).join('');
}

// ─── Wanted ───
async function loadWanted() {
    const res = await fetch('/api/wanted');
    const list = await res.json();
    const tbody = document.querySelector('#wanted-table tbody');
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="6" style="text-align:center;color:var(--text-dim)">Aranan kimse yok</td></tr>'
        : list.map((w, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><code>${shortId(w.target_id)}</code></td>
            <td><code>${shortId(w.placed_by)}</code></td>
            <td><span class="badge yellow">${formatMoney(w.bounty)}</span></td>
            <td>${new Date(w.created_at).toLocaleString('tr-TR')}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removeWanted('${encodeURIComponent(w.target_id)}')">Kaldır</button></td>
        </tr>
    `).join('');
}

async function removeWanted(id) {
    await fetch(`/api/wanted/${id}`, { method: 'DELETE' });
    loadWanted();
}

// ─── Spam ───
async function loadSpam() {
    const res = await fetch('/api/spam');
    const logs = await res.json();
    const tbody = document.querySelector('#spam-table tbody');
    tbody.innerHTML = logs.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">Spam kaydı yok</td></tr>'
        : logs.map((l, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><code>${shortId(l.user_id)}</code></td>
            <td><span class="badge ${l.action.includes('HARD') ? 'red' : l.action.includes('SOFT') ? 'yellow' : 'blue'}">${l.action}</span></td>
            <td>${new Date(l.created_at).toLocaleString('tr-TR')}</td>
        </tr>
    `).join('');
}

// ─── Modal ───
function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

function openEditUser(encodedId) {
    const id = decodeURIComponent(encodedId);
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    openModal(`Düzenle: ${shortId(id)}`, `
        <div class="form-group">
            <label>Bakiye İşlemi</label>
            <select id="edit-action">
                <option value="add">Para Ekle</option>
                <option value="remove">Para Sil</option>
                <option value="set">Bakiye Ayarla</option>
            </select>
        </div>
        <div class="form-group">
            <label>Miktar ($)</label>
            <input type="number" id="edit-amount" value="0">
        </div>
        <button class="btn btn-primary" onclick="submitEditUser('${encodedId}')">Uygula</button>
    `);
}

async function submitEditUser(encodedId) {
    const action = document.getElementById('edit-action').value;
    const amount = parseInt(document.getElementById('edit-amount').value);

    await fetch(`/api/users/${encodedId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount })
    });

    closeModal();
    loadUsers();
    loadDashboard();
}

async function deleteUser(encodedId) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/users/${encodedId}`, { method: 'DELETE' });
    loadUsers();
    loadDashboard();
}

// ─── Helpers ───
function shortId(id) {
    if (!id) return '-';
    return id.split('@')[0];
}

function formatMoney(amt) {
    return (amt || 0).toLocaleString('tr-TR') + ' $';
}

// ─── Auto-refresh ───
setInterval(() => {
    const activeTab = document.querySelector('.nav-item.active')?.dataset.tab;
    if (activeTab) loadTab(activeTab);
}, 10000);

// Initial load
loadDashboard();
