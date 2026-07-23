const Admin = {
    renderDashboard() {
        const stats = Auth.getStats();
        return `
            <div class="page-header"><h1>Админ-панель</h1><p>Управление сайтом и пользователями</p></div>
            <div class="tabs">
                <button class="tab active" onclick="Admin.switchTab('overview')">Обзор</button>
                <button class="tab" onclick="Admin.switchTab('users')">Пользователи</button>
                <button class="tab" onclick="Admin.switchTab('support')">Поддержка</button>
                <button class="tab" onclick="Admin.switchTab('analytics')">Аналитика</button>
                <button class="tab" onclick="Admin.switchTab('site-settings')">Настройки сайта</button>
                <button class="tab" onclick="Admin.switchTab('logs')">Журнал</button>
            </div>
            <div id="admin-content">
                ${this.renderOverview(stats)}
            </div>
        `;
    },

    renderOverview(stats) {
        return `
            <div class="admin-grid">
                <div class="admin-stat"><div class="stat-icon">👥</div><div class="stat-value">${stats.totalUsers}</div><div class="stat-label">Пользователей</div></div>
                <div class="admin-stat"><div class="stat-icon">⚡</div><div class="stat-value">${stats.activeUsers}</div><div class="stat-label">Активных (7 дней)</div></div>
                <div class="admin-stat"><div class="stat-icon">🏃</div><div class="stat-value">${stats.totalTrainings}</div><div class="stat-label">Тренировок</div></div>
                <div class="admin-stat"><div class="stat-icon">🔗</div><div class="stat-value">${stats.stravaConnections}</div><div class="stat-label">Strava подключений</div></div>
                <div class="admin-stat"><div class="stat-icon">📱</div><div class="stat-value">${stats.garminConnections}</div><div class="stat-label">Garmin подключений</div></div>
            </div>
        `;
    },

    renderUsers() {
        const users = Auth.getAllUsers();
        const rows = users.map(u => {
            const trainings = Store.getTrainings(u.id);
            const lastTraining = trainings.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            return `<tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-blue' : 'badge-gray'}">${u.role === 'admin' ? 'Админ' : 'Пользователь'}</span></td>
                <td><span class="badge ${u.blocked ? 'badge-red' : 'badge-green'}">${u.blocked ? 'Заблокирован' : 'Активен'}</span></td>
                <td>${trainings.length}</td>
                <td>${lastTraining ? new Date(lastTraining.date).toLocaleDateString('ru-RU') : '-'}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="Admin.toggleBlock('${u.id}')">${u.blocked ? '🔓' : '🔒'}</button>
                    <button class="btn btn-ghost btn-sm" onclick="Admin.changeRole('${u.id}')">👤</button>
                    <button class="btn btn-ghost btn-sm btn-danger" onclick="Admin.confirmDelete('${u.id}')">🗑</button>
                </td>
            </tr>`;
        }).join('');
        return `
            <div class="card">
                <div class="card-header"><h2>Пользователи (${users.length})</h2></div>
                <div class="table-wrap">
                    <table><thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th><th>Тренировок</th><th>Последняя</th><th>Действия</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--gray-400)">Нет пользователей</td></tr>'}</tbody></table>
                </div>
            </div>
        `;
    },

    renderSiteSettings() {
        const s = Store.getSettings();
        return `
            <div class="card">
                <div class="card-header"><h2>Настройки сайта</h2></div>
                <div class="form-group"><label>Название</label><input type="text" id="setting-title" value="${s.title || 'Беговой ритм'}"></div>
                <div class="form-group"><label>Описание</label><textarea id="setting-desc">${s.description || 'Персональный тренер по бегу для каждого уровня подготовки'}</textarea></div>
                <div class="form-group"><label>Instagram создателя</label><input type="text" id="setting-instagram" value="${s.instagram || 'https://www.instagram.com/rizat.sakupov/'}"></div>
                <div class="form-group"><label>Strava создателя</label><input type="text" id="setting-strava" value="${s.stravaName || 'Ризат Сакупов'}"></div>
                <div class="form-group"><label>Фото администратора</label>
                    <input type="file" id="setting-photo" accept="image/*" onchange="Admin.handlePhotoUpload(event)">
                    <div id="admin-photo-preview" style="margin-top:.5rem"><div class="creator-photo">${s.adminPhoto ? '<img src="' + s.adminPhoto + '">' : '👤'}</div></div>
                </div>
                <button class="btn btn-primary" onclick="Admin.saveSiteSettings()">Сохранить</button>
            </div>
        `;
    },

    renderLogs() {
        const logs = Auth.getLogs().reverse().slice(0, 100);
        const users = Auth.getAllUsers();
        const rows = logs.map(l => {
            const user = users.find(u => u.id === l.userId);
            return `<tr>
                <td>${new Date(l.timestamp).toLocaleString('ru-RU')}</td>
                <td>${user ? user.name : l.userId}</td>
                <td>${l.action}</td>
                <td>${l.details}</td>
            </tr>`;
        }).join('');
        return `
            <div class="card">
                <div class="card-header"><h2>Журнал действий</h2></div>
                <div class="table-wrap">
                    <table><thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Детали</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="4" style="text-align:center">Нет записей</td></tr>'}</tbody></table>
                </div>
            </div>
        `;
    },

    renderAnalytics() {
        const users = Auth.getAllUsers();
        const trainings = [];
        users.forEach(u => {
            const t = Store.getTrainings(u.id);
            trainings.push(...t);
        });
        const completed = trainings.filter(t => t.status === 'completed');
        const totalDistance = completed.reduce((s, t) => s + (t.distance || 0), 0);
        const avgDistance = completed.length > 0 ? (totalDistance / completed.length).toFixed(1) : 0;
        const assessments = completed.filter(t => t.assessment);
        const avgDifficulty = assessments.length > 0 ? (assessments.reduce((s, t) => s + (t.assessment.difficulty || 5), 0) / assessments.length).toFixed(1) : 0;
        return `
            <div class="card">
                <div class="card-header"><h2>Продуктовая аналитика</h2></div>
                <div class="admin-grid">
                    <div class="admin-stat"><div class="stat-icon">🏃</div><div class="stat-value">${completed.length}</div><div class="stat-label">Завершённых тренировок</div></div>
                    <div class="admin-stat"><div class="stat-icon">📏</div><div class="stat-value">${totalDistance.toFixed(1)}</div><div class="stat-label">Общий километраж</div></div>
                    <div class="admin-stat"><div class="stat-icon">📊</div><div class="stat-value">${avgDistance}</div><div class="stat-label">Средняя дистанция</div></div>
                    <div class="admin-stat"><div class="stat-icon">💪</div><div class="stat-value">${avgDifficulty}</div><div class="stat-label">Средняя сложность</div></div>
                </div>
                <p style="margin-top:1rem;font-size:.8rem;color:var(--gray-500)">Данные о здоровье пользователей не отображаются в аналитике.</p>
            </div>
        `;
    },

    switchTab(tab) {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        const content = document.getElementById('admin-content');
        switch (tab) {
            case 'overview': content.innerHTML = this.renderOverview(Auth.getStats()); break;
            case 'users': content.innerHTML = this.renderUsers(); break;
            case 'support': content.innerHTML = '<div class="card"><div class="card-header"><h2>Поддержка</h2></div><p style="color:var(--gray-500)">Обращения пользователей будут отображаться здесь.</p></div>'; break;
            case 'analytics': content.innerHTML = this.renderAnalytics(); break;
            case 'site-settings': content.innerHTML = this.renderSiteSettings(); break;
            case 'logs': content.innerHTML = this.renderLogs(); break;
        }
    },

    toggleBlock(userId) {
        Auth.toggleBlock(userId);
        this.switchTab('users');
        App.toast('Статус пользователя изменён', 'success');
    },

    changeRole(userId) {
        const user = Auth.getAllUsers().find(u => u.id === userId);
        if (!user) return;
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        Auth.changeUserRole(userId, newRole);
        this.switchTab('users');
        App.toast('Роль пользователя изменена', 'success');
    },

    confirmDelete(userId) {
        if (confirm('Вы уверены? Это действие необратимо.')) {
            Auth.deleteUser(userId);
            this.switchTab('users');
            App.toast('Пользователь удалён', 'success');
        }
    },

    saveSiteSettings() {
        const settings = Store.getSettings();
        settings.title = document.getElementById('setting-title').value;
        settings.description = document.getElementById('setting-desc').value;
        settings.instagram = document.getElementById('setting-instagram').value;
        settings.stravaName = document.getElementById('setting-strava').value;
        Store.saveSettings(settings);
        App.toast('Настройки сохранены', 'success');
    },

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const settings = Store.getSettings();
            settings.adminPhoto = e.target.result;
            Store.saveSettings(settings);
            document.getElementById('admin-photo-preview').innerHTML = `<div class="creator-photo"><img src="${e.target.result}"></div>`;
            App.toast('Фото обновлено', 'success');
        };
        reader.readAsDataURL(file);
    }
};
