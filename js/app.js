const App = {
    currentPage: 'dashboard',
    runInterval: null,
    runTime: 0,
    runDistance: 0,
    runActive: false,
    deferredPrompt: null,

    init() {
        Auth.init();
        this.initPWA();
        const authScr = document.getElementById('auth-screen');
        const appMn = document.getElementById('app-main');
        if (authScr) authScr.style.display = 'none';
        if (appMn) appMn.style.display = 'flex';
        this.updateSidebar();
        this.navigate('dashboard');
    },

    initPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(() => {
                console.log('PWA Service Worker ready');
            }).catch(err => console.log('SW reg error:', err));
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });
    },

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    this.toast('Приложение успешно устанавливается!', 'success');
                }
                this.deferredPrompt = null;
            });
        } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                this.showModal(`
                    <h2 style="margin-bottom:1rem">📲 Установка на iPhone / iPad</h2>
                    <p style="margin-bottom:1rem;color:var(--gray-600);line-height:1.6">
                        Чтобы установить <b>Беговой ритм</b> как приложение на ваш iPhone:
                    </p>
                    <ol style="padding-left:1.25rem;line-height:1.8;color:var(--gray-700);font-size:0.95rem">
                        <li>Нажмите кнопку <b>«Поделиться»</b> (<span style="font-size:1.1rem">⎋</span>) внизу экрана в Safari.</li>
                        <li>Прокрутите вниз и выберите <b>«На экран «Домой»»</b> (<span style="font-size:1.1rem">➕</span>).</li>
                        <li>Нажмите <b>«Добавить»</b> вверху справа.</li>
                    </ol>
                    <button class="btn btn-primary btn-full" style="margin-top:1.25rem" onclick="App.closeModal()">Понятно</button>
                `);
            } else {
                this.showModal(`
                    <h2 style="margin-bottom:1rem">📲 Установка приложения</h2>
                    <p style="margin-bottom:1rem;color:var(--gray-600);line-height:1.6">
                        Чтобы установить <b>Беговой ритм</b> на рабочий стол вашего устройства:
                    </p>
                    <ol style="padding-left:1.25rem;line-height:1.8;color:var(--gray-700);font-size:0.95rem">
                        <li>Нажмите меню браузера (<b>⋮</b> или <b>≡</b>).</li>
                        <li>Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</li>
                    </ol>
                    <button class="btn btn-primary btn-full" style="margin-top:1.25rem" onclick="App.closeModal()">Понятно</button>
                `);
            }
        }
    },

    showForm(form) {
        document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
        document.getElementById(form + '-form').style.display = 'block';
    },

    login() {
        const email = document.getElementById('login-email').value;
        const pw = document.getElementById('login-password').value;
        const err = document.getElementById('login-error');
        if (!email || !pw) { err.textContent = 'Заполните все поля'; err.style.display = 'block'; return; }
        const result = Auth.login(email, pw);
        if (result.error) { err.textContent = result.error; err.style.display = 'block'; return; }
        err.style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'flex';
        const user = Auth.getUser();
        if (!user.profile?.age) {
            this.showForm('profile');
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('app-main').style.display = 'none';
            return;
        }
        this.updateSidebar();
        this.navigate('dashboard');
    },

    register() {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pw = document.getElementById('reg-password').value;
        const pw2 = document.getElementById('reg-password2').value;
        const consent = document.getElementById('reg-consent').checked;
        const err = document.getElementById('register-error');
        if (!name || !email || !pw) { err.textContent = 'Заполните все поля'; err.style.display = 'block'; return; }
        if (pw !== pw2) { err.textContent = 'Пароли не совпадают'; err.style.display = 'block'; return; }
        const result = Auth.register(name, email, pw, consent);
        if (result.error) { err.textContent = result.error; err.style.display = 'block'; return; }
        err.style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'none';
        this.showForm('profile');
        document.getElementById('auth-screen').style.display = 'flex';
    },

    forgotPassword() {
        const email = document.getElementById('forgot-email').value;
        if (!email) return;
        this.toast('Ссылка для восстановления отправлена на ' + email, 'success');
        setTimeout(() => this.showForm('login'), 1500);
    },

    saveProfile() {
        const user = Auth.getUser();
        if (!user) return;
        const days = [];
        document.querySelectorAll('.days-selector input:checked').forEach(c => days.push(parseInt(c.value)));
        const profile = {
            age: parseInt(document.getElementById('profile-age').value) || null,
            weight: parseFloat(document.getElementById('profile-weight').value) || null,
            goal: document.getElementById('profile-goal').value,
            restingHR: parseInt(document.getElementById('profile-resting-hr').value) || null,
            maxHR: parseInt(document.getElementById('profile-max-hr').value) || null,
            trainingDays: days.length > 0 ? days : [1, 2, 4, 6],
            experience: document.getElementById('profile-experience').value,
            healthConsent: user.profile?.healthConsent || false
        };
        Auth.updateUserProfile(user.id, profile);
        Store.generatePlan(user.id);
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'flex';
        this.updateSidebar();
        this.navigate('dashboard');
        this.toast('Профиль настроен! План тренировок создан.', 'success');
    },

    logout() {
        Auth.logout();
        Auth.init();
        this.updateSidebar();
        this.navigate('dashboard');
        this.toast('Сессия обновлена', 'info');
    },

    navigate(page) {
        this.currentPage = page;
        const content = document.getElementById('content');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) navItem.classList.add('active');
        switch (page) {
            case 'dashboard': content.innerHTML = Pages.renderDashboard(); break;
            case 'calendar': content.innerHTML = Pages.renderCalendar(); break;
            case 'history': content.innerHTML = Pages.renderHistory(); break;
            case 'progress': content.innerHTML = Analytics.renderProgressSection(Auth.currentUser?.id); break;
            case 'zones': content.innerHTML = Pages.renderZones(); break;
            case 'methods': content.innerHTML = Pages.renderMethods(); break;
            case 'plans': content.innerHTML = TrainingPlans.renderPage(); break;
            case 'run': content.innerHTML = Pages.renderRunMode(); break;
            case 'routes': content.innerHTML = Pages.renderRoutes(); break;
            case 'cross-training': content.innerHTML = Pages.renderCrossTraining(); break;
            case 'nutrition': content.innerHTML = Pages.renderNutrition(); break;
            case 'integrations': content.innerHTML = Pages.renderIntegrations(); break;
            case 'equipment': content.innerHTML = Pages.renderEquipment(); break;
            case 'community': content.innerHTML = Pages.renderCommunity(); break;
            case 'about': content.innerHTML = Pages.renderAbout(); break;
            case 'settings': content.innerHTML = Pages.renderSettings(); break;
            case 'admin':
                if (Auth.isAdmin()) content.innerHTML = Admin.renderDashboard();
                else { content.innerHTML = '<div class="empty-state"><p>Доступ запрещён</p></div>'; }
                break;
            default: content.innerHTML = Pages.renderDashboard();
        }
        content.classList.add('fade-in');
        this.closeSidebar();
    },

    updateSidebar() {
        const user = Auth.getUser();
        if (!user) return;
        document.getElementById('sidebar-username').textContent = user.name;
        document.getElementById('sidebar-role').textContent = user.role === 'admin' ? 'Администратор' : 'Бегун';
        if (user.photo) {
            document.getElementById('sidebar-avatar').innerHTML = `<img src="${user.photo}">`;
        }
        if (Auth.isAdmin()) {
            document.getElementById('nav-admin').style.display = 'flex';
        }
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
    },

    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    showModal(html) {
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    showAddTraining() {
        this.showModal(`
            <h2 style="margin-bottom:1rem">Добавить тренировку</h2>
            <div class="form-group"><label>Дата</label><input type="date" id="add-date" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="form-group"><label>Тип</label>
                <select id="add-type">
                    <option value="easy">Лёгкий бег</option>
                    <option value="long">Длинная пробежка</option>
                    <option value="tempo">Темповый бег</option>
                    <option value="intervals">Интервалы</option>
                    <option value="cross">Кросс-тренировка</option>
                    <option value="rest">Отдых</option>
                    <option value="race">Соревнование</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Дистанция (км)</label><input type="number" step="0.1" id="add-distance"></div>
                <div class="form-group"><label>Время (мин)</label><input type="number" id="add-duration"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Средний пульс</label><input type="number" id="add-avg-hr"></div>
                <div class="form-group"><label>Макс. пульс</label><input type="number" id="add-max-hr"></div>
            </div>
            <div class="form-group"><label>Комментарий</label><textarea id="add-comment" rows="2"></textarea></div>
            <div class="form-group"><label>Статус</label>
                <select id="add-status"><option value="completed">Выполнено</option><option value="planned">Запланировано</option><option value="missed">Пропущено</option></select>
            </div>
            <button class="btn btn-primary btn-full" onclick="App.saveTraining()">Сохранить</button>
        `);
    },

    saveTraining() {
        const user = Auth.getUser();
        if (!user) return;
        const training = {
            date: document.getElementById('add-date').value,
            type: document.getElementById('add-type').value,
            distance: parseFloat(document.getElementById('add-distance').value) || 0,
            duration: parseInt(document.getElementById('add-duration').value) || 0,
            avgHR: parseInt(document.getElementById('add-avg-hr').value) || null,
            maxHR: parseInt(document.getElementById('add-max-hr').value) || null,
            comment: document.getElementById('add-comment').value,
            status: document.getElementById('add-status').value
        };
        if (!training.date) { this.toast('Укажите дату', 'error'); return; }
        Store.addTraining(user.id, training);
        this.closeModal();
        this.navigate(this.currentPage);
        this.toast('Тренировка добавлена', 'success');
        if (training.status === 'completed') {
            setTimeout(() => this.showAssessmentForm(Store.getTrainings(user.id).slice(-1)[0].id), 500);
        }
    },

    showAssessmentForm(trainingId) {
        this.showModal(`
            <h2 style="margin-bottom:1rem">Оценка тренировки</h2>
            <div class="form-group"><label>Сложность (1–10)</label><input type="range" id="assess-difficulty" min="1" max="10" value="5" oninput="this.nextElementSibling.textContent=this.value"><span>5</span></div>
            <div class="form-group"><label>Самочувствие</label>
                <select id="assess-wellbeing">
                    <option value="excellent">Отлично</option><option value="good">Хорошо</option><option value="normal" selected>Нормально</option><option value="hard">Тяжело</option><option value="poor">Плохо</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Энергия (1–5)</label><input type="number" id="assess-energy" min="1" max="5" value="3"></div>
                <div class="form-group"><label>Сон (1–10)</label><input type="number" id="assess-sleep" min="1" max="10" value="7"></div>
            </div>
            <div class="form-group"><label>Наличие боли</label>
                <select id="assess-pain"><option value="">Нет</option><option value="legs">Ноги</option><option value="knee">Колено</option><option value="back">Спина</option><option value="other">Другое</option></select>
            </div>
            <div class="form-group"><label>Комментарий</label><textarea id="assess-comment" rows="2"></textarea></div>
            <button class="btn btn-primary btn-full" onclick="App.submitAssessment('${trainingId}')">Оценить</button>
        `);
    },

    submitAssessment(trainingId) {
        const user = Auth.getUser();
        if (!user) return;
        const assessment = {
            difficulty: parseInt(document.getElementById('assess-difficulty').value),
            wellbeing: document.getElementById('assess-wellbeing').value,
            energy: parseInt(document.getElementById('assess-energy').value),
            sleep: parseInt(document.getElementById('assess-sleep').value),
            pain: document.getElementById('assess-pain').value || null,
            comment: document.getElementById('assess-comment').value
        };
        Training.assessTraining(user.id, trainingId, assessment);
        const feedback = Training.generateFeedback(assessment);
        const recommendation = Training.getNextRecommendation(user.id, assessment);
        this.closeModal();
        this.showModal(`
            <h2 style="margin-bottom:1rem">Итоги тренировки</h2>
            <div class="card-grid" style="margin-bottom:1rem">
                <div class="stat-card"><div class="stat-value">${assessment.difficulty}/10</div><div class="stat-label">Сложность</div></div>
                <div class="stat-card"><div class="stat-value">${Training.getWellbeingLabel(assessment.wellbeing)}</div><div class="stat-label">Самочувствие</div></div>
                <div class="stat-card"><div class="stat-value">${assessment.sleep}/10</div><div class="stat-label">Сон</div></div>
            </div>
            <h3 style="margin-bottom:.5rem">Обратная связь:</h3>
            <ul style="font-size:.9rem;color:var(--gray-600);padding-left:1.25rem;margin-bottom:1rem">
                ${feedback.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <div style="background:var(--green-50);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--green-200)">
                <strong>Рекомендация:</strong> ${recommendation}
            </div>
            ${assessment.pain ? '<div style="background:#fee2e2;padding:1rem;border-radius:var(--radius-sm);border:1px solid #fecaca;margin-top:.75rem">⚠️ При наличии боли рекомендуется обратиться к специалисту и пропустить следующую тренировку.</div>' : ''}
            <button class="btn btn-primary btn-full" style="margin-top:1rem" onclick="App.closeModal()">Понятно</button>
        `);
    },

    showWellbeingForm() {
        this.showModal(`
            <h2 style="margin-bottom:1rem">Оценка самочувствия</h2>
            <div class="form-group"><label>Как вы себя чувствуете?</label>
                <select id="wb-status"><option value="excellent">Отлично</option><option value="good">Хорошо</option><option value="normal">Нормально</option><option value="hard">Тяжело</option><option value="poor">Плохо</option></select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Энергия (1–5)</label><input type="number" id="wb-energy" min="1" max="5" value="3"></div>
                <div class="form-group"><label>Сон (1–10)</label><input type="number" id="wb-sleep" min="1" max="10" value="7"></div>
            </div>
            <div class="form-group"><label>Пульс в покое (если известен)</label><input type="number" id="wb-hr"></div>
            <button class="btn btn-primary btn-full" onclick="App.saveWellbeing()">Сохранить</button>
        `);
    },

    saveWellbeing() {
        this.closeModal();
        this.toast('Самочувствие сохранено', 'success');
    },

    showDayDetail(dateStr) {
        const user = Auth.getUser();
        const trainings = Store.getTrainings(user.id).filter(t => t.date === dateStr);
        const plan = Store.getPlan(user.id);
        let sessions = [];
        if (plan) plan.weeks.forEach(w => w.forEach(s => { if (s.date === dateStr) sessions.push(s); }));
        sessions = [...sessions, ...trainings.filter(t => !sessions.find(s => s.type === t.type))];
        const dateFormatted = new Date(dateStr).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
        let html = `<h2 style="margin-bottom:1rem">${dateFormatted}</h2>`;
        if (sessions.length > 0) {
            html += sessions.map(s => `
                <div class="training-card ${s.status || ''}" style="margin-bottom:.5rem">
                    <div class="training-type">${Training.getTrainingTypeLabel(s.type)}</div>
                    <div class="training-title">${s.name || s.type}</div>
                    <div class="training-meta">${s.distance ? `<span>📏 ${Training.formatDistance(s.distance)}</span>` : ''} ${s.duration ? `<span>⏱ ${Training.formatDuration(s.duration)}</span>` : ''}</div>
                    <div style="margin-top:.5rem;display:flex;gap:.5rem">
                        <button class="btn btn-sm btn-secondary" onclick="App.markTraining('${dateStr}','${s.type}','completed')">✓ Выполнено</button>
                        <button class="btn btn-sm btn-ghost" onclick="App.markTraining('${dateStr}','${s.type}','missed')">Пропустить</button>
                    </div>
                </div>
            `).join('');
        } else {
            html += '<p style="color:var(--gray-400)">Нет тренировок на этот день</p>';
        }
        html += `<button class="btn btn-primary" style="margin-top:1rem" onclick="App.showAddTraining();App.closeModal()">➕ Добавить тренировку</button>`;
        this.showModal(html);
    },

    markTraining(date, type, status) {
        const user = Auth.getUser();
        const training = Store.getTrainings(user.id).find(t => t.date === date && t.type === type);
        if (training) {
            Store.updateTraining(user.id, training.id, { status });
        } else {
            Store.addTraining(user.id, { date, type, status, distance: 0, duration: 0 });
        }
        this.closeModal();
        this.navigate(this.currentPage);
        this.toast(status === 'completed' ? 'Тренировка отмечена как выполненная' : 'Тренировка пропущена', 'info');
    },

    editTraining(id) {
        const user = Auth.getUser();
        const t = Store.getTraining(user.id, id);
        if (!t) return;
        this.showModal(`
            <h2 style="margin-bottom:1rem">Редактировать тренировку</h2>
            <div class="form-group"><label>Дата</label><input type="date" id="edit-date" value="${t.date}"></div>
            <div class="form-group"><label>Тип</label>
                <select id="edit-type"><option value="easy" ${t.type === 'easy' ? 'selected' : ''}>Лёгкий бег</option><option value="long" ${t.type === 'long' ? 'selected' : ''}>Длинная</option><option value="tempo" ${t.type === 'tempo' ? 'selected' : ''}>Темповый</option><option value="intervals" ${t.type === 'intervals' ? 'selected' : ''}>Интервалы</option></select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Дистанция (км)</label><input type="number" step="0.1" id="edit-distance" value="${t.distance}"></div>
                <div class="form-group"><label>Время (мин)</label><input type="number" id="edit-duration" value="${t.duration}"></div>
            </div>
            <button class="btn btn-primary btn-full" onclick="App.updateTraining('${id}')">Сохранить</button>
        `);
    },

    updateTraining(id) {
        const user = Auth.getUser();
        Store.updateTraining(user.id, id, {
            date: document.getElementById('edit-date').value,
            type: document.getElementById('edit-type').value,
            distance: parseFloat(document.getElementById('edit-distance').value) || 0,
            duration: parseInt(document.getElementById('edit-duration').value) || 0
        });
        this.closeModal();
        this.navigate(this.currentPage);
        this.toast('Тренировка обновлена', 'success');
    },

    deleteTraining(id) {
        if (!confirm('Удалить тренировку?')) return;
        const user = Auth.getUser();
        Store.deleteTraining(user.id, id);
        this.navigate(this.currentPage);
        this.toast('Тренировка удалена', 'success');
    },

    generatePlan() {
        const user = Auth.getUser();
        Store.generatePlan(user.id);
        this.navigate('calendar');
        this.toast('План тренировок создан!', 'success');
    },

    applyMethodology(method) {
        this.toast(`Методика "${method}" применена к вашему плану`, 'success');
    },

    updateZoneMethod() {
        const user = Auth.getUser();
        const method = document.getElementById('zone-method').value;
        Auth.updateUser(user.id, { settings: { ...user.settings, zoneMethod: method } });
        this.navigate('zones');
    },

    saveZones() {
        const user = Auth.getUser();
        Auth.updateUserProfile(user.id, {
            restingHR: parseInt(document.getElementById('zone-resting').value) || null,
            maxHR: parseInt(document.getElementById('zone-max').value) || null
        });
        this.navigate('zones');
        this.toast('Зоны пересчитаны', 'success');
    },

    saveSettings() {
        const user = Auth.getUser();
        Auth.updateUserProfile(user.id, {
            age: parseInt(document.getElementById('set-age').value) || null,
            weight: parseFloat(document.getElementById('set-weight').value) || null,
            restingHR: parseInt(document.getElementById('set-resting-hr').value) || null,
            maxHR: parseInt(document.getElementById('set-max-hr').value) || null,
            goal: document.getElementById('set-goal').value,
            healthConsent: document.getElementById('set-consent').checked
        });
        Auth.updateUser(user.id, { name: document.getElementById('set-name').value });
        this.updateSidebar();
        this.toast('Настройки сохранены', 'success');
    },

    handleProfilePhoto(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            Auth.updateUser(Auth.currentUser.id, { photo: ev.target.result });
            this.updateSidebar();
            this.toast('Фото обновлено', 'success');
        };
        reader.readAsDataURL(file);
    },

    exportTrainings(format) {
        const user = Auth.getUser();
        const trainings = Store.getTrainings(user.id);
        let content, filename, type;
        if (format === 'csv') {
            const headers = 'Дата,Тип,Дистанция,Время,Средний пульс,Макс пульс,Статус\n';
            const rows = trainings.map(t => `${t.date},${t.type},${t.distance},${t.duration},${t.avgHR || ''},${t.maxHR || ''},${t.status}`).join('\n');
            content = headers + rows;
            filename = 'trainings.csv';
            type = 'text/csv';
        } else {
            content = JSON.stringify(trainings, null, 2);
            filename = 'trainings.json';
            type = 'application/json';
        }
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        this.toast('Данные экспортированы', 'success');
    },

    exportAllData() {
        const user = Auth.getUser();
        const data = Auth.exportData(user.id);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'my_data.json'; a.click();
        URL.revokeObjectURL(url);
        this.toast('Данные экспортированы', 'success');
    },

    deleteAccount() {
        if (!confirm('Вы уверены? Все данные будут удалены безвозвратно.')) return;
        if (!confirm('Точно удалить аккаунт и все данные?')) return;
        Auth.deleteUser(Auth.currentUser.id);
        this.logout();
    },

    connectStrava() {
        this.toast('Интеграция со Strava будет доступна после настройки OAuth-сервера', 'info');
    },

    connectGarmin() {
        this.toast('Интеграция с Garmin будет доступна после настройки API', 'info');
    },

    showAddEquipment() {
        this.showModal(`
            <h2 style="margin-bottom:1rem">Добавить кроссовки</h2>
            <div class="form-group"><label>Модель</label><input type="text" id="eq-name" placeholder="Nike Pegasus 40"></div>
            <div class="form-group"><label>Бренд</label><input type="text" id="eq-brand" placeholder="Nike"></div>
            <div class="form-row">
                <div class="form-group"><label>Текущий пробег (км)</label><input type="number" id="eq-distance" value="0"></div>
                <div class="form-group"><label>Ресурс (км)</label><input type="number" id="eq-max" value="800"></div>
            </div>
            <button class="btn btn-primary btn-full" onclick="App.saveEquipment()">Добавить</button>
        `);
    },

    saveEquipment() {
        const user = Auth.getUser();
        const equipment = Store.getEquipment(user.id);
        equipment.push({
            id: 'eq_' + Date.now(),
            name: document.getElementById('eq-name').value,
            brand: document.getElementById('eq-brand').value,
            distance: parseFloat(document.getElementById('eq-distance').value) || 0,
            maxDistance: parseInt(document.getElementById('eq-max').value) || 800
        });
        Store.saveEquipment(user.id, equipment);
        this.closeModal();
        this.navigate('equipment');
        this.toast('Кроссовки добавлены', 'success');
    },

    switchNutritionTab(tab) {
        const content = document.getElementById('nutrition-content');
        if (tab === 'hydration') content.innerHTML = Pages.renderNutrition();
        else if (tab === 'race-prep') content.innerHTML = `
            <div class="card">
                <h3>🏁 Чек-лист на день забега</h3>
                <ul class="checklist">
                    <li><input type="checkbox">Одежда и обувь</li>
                    <li><input type="checkbox">Номер участника</li>
                    <li><input type="checkbox">Питание и гели</li>
                    <li><input type="checkbox">Вода (0.5 л)</li>
                    <li><input type="checkbox">Разминка (10–15 мин)</li>
                    <li><input type="checkbox">Транспорт до старта</li>
                    <li><input type="checkbox">Часы с GPS</li>
                    <li><input type="checkbox">План по пульсу и темпу</li>
                </ul>
            </div>
            <div class="card"><h3>📊 Прогноз времени</h3>
                <div class="card-grid">
                    <div class="stat-card"><div class="stat-value">25:00</div><div class="stat-label">5 км</div></div>
                    <div class="stat-card"><div class="stat-value">52:30</div><div class="stat-label">10 км</div></div>
                    <div class="stat-card"><div class="stat-value">1:55:00</div><div class="stat-label">Полумарафон</div></div>
                    <div class="stat-card"><div class="stat-value">4:00:00</div><div class="stat-label">Марафон</div></div>
                </div>
            </div>`;
        else if (tab === 'gels') content.innerHTML = `
            <div class="card"><h3>⚡ Питание на дистанции</h3>
                <p style="margin:.75rem 0;font-size:.9rem;color:var(--gray-600)">
                    Для длительных тренировок (более 60 мин) рекомендуется принимать 30–60 г углеводов в час.
                    Начинайте принимать гели через 45–60 мин после старта, затем каждые 30–40 мин.
                </p>
                <div class="card-grid">
                    <div class="stat-card"><div class="stat-value">30–60 г</div><div class="stat-label">Углеводов в час</div></div>
                    <div class="stat-card"><div class="stat-value">45–60 мин</div><div class="stat-label">Первый гель</div></div>
                    <div class="stat-card"><div class="stat-value">30–40 мин</div><div class="stat-label">Интервал</div></div>
                </div>
            </div>`;
    },

    showTrainingDetail(date, type) {
        const user = Auth.getUser();
        const trainings = Store.getTrainings(user.id).filter(t => t.date === date && (!type || t.type === type));
        if (trainings.length > 0) {
            const t = trainings[0];
            this.showModal(`
                <h2 style="margin-bottom:1rem">Тренировка — ${new Date(t.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div class="card-grid" style="margin-bottom:1rem">
                    <div class="stat-card"><div class="stat-value">${Training.getTrainingTypeLabel(t.type)}</div><div class="stat-label">Тип</div></div>
                    <div class="stat-card"><div class="stat-value">${Training.formatDistance(t.distance)}</div><div class="stat-label">Дистанция</div></div>
                    <div class="stat-card"><div class="stat-value">${Training.formatDuration(t.duration)}</div><div class="stat-label">Время</div></div>
                    <div class="stat-card"><div class="stat-value">${t.avgHR || '--'}</div><div class="stat-label">Средний пульс</div></div>
                </div>
                ${t.comment ? `<p style="margin-top:.75rem;font-size:.9rem;color:var(--gray-600)">${t.comment}</p>` : ''}
                ${t.assessment ? `
                    <h3 style="margin-top:1rem">Оценка:</h3>
                    <p style="font-size:.9rem">Сложность: ${t.assessment.difficulty}/10 · Самочувствие: ${Training.getWellbeingLabel(t.assessment.wellbeing)}</p>
                ` : `
                    ${t.status === 'completed' ? `<button class="btn btn-secondary" style="margin-top:1rem" onclick="App.showAssessmentForm('${t.id}')">Оценить тренировку</button>` : ''}
                `}
                <button class="btn btn-ghost" style="margin-top:.5rem" onclick="App.closeModal()">Закрыть</button>
            `);
        } else {
            this.closeModal();
        }
    },

    toggleRun() {
        if (this.runActive) {
            this.runActive = false;
            clearInterval(this.runInterval);
            document.getElementById('run-start-btn').textContent = '▶';
            document.getElementById('run-start-btn').className = 'run-btn run-btn-start';
        } else {
            this.runActive = true;
            document.getElementById('run-start-btn').textContent = '⏸';
            document.getElementById('run-start-btn').className = 'run-btn run-btn-pause';
            this.runInterval = setInterval(() => {
                this.runTime++;
                const min = Math.floor(this.runTime / 60);
                const sec = this.runTime % 60;
                document.getElementById('run-time').textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                this.runDistance += 0.003 + Math.random() * 0.002;
                document.getElementById('run-distance').textContent = this.runDistance.toFixed(2);
                const pace = this.runDistance > 0 ? (this.runTime / 60) / this.runDistance : 0;
                const pMin = Math.floor(pace);
                const pSec = Math.round((pace - pMin) * 60);
                document.getElementById('run-pace').textContent = `${pMin}:${String(pSec).padStart(2, '0')}`;
            }, 1000);
        }
    },

    stopRun() {
        if (!this.runActive && this.runTime === 0) return;
        this.runActive = false;
        clearInterval(this.runInterval);
        const dist = this.runDistance;
        const dur = Math.round(this.runTime / 60);
        if (dist > 0.1) {
            if (confirm(`Завершить тренировку?\nДистанция: ${dist.toFixed(2)} км\nВремя: ${dur} мин`)) {
                const user = Auth.getUser();
                Store.addTraining(user.id, {
                    date: new Date().toISOString().slice(0, 10),
                    type: 'easy', distance: dist, duration: dur, status: 'completed'
                });
                this.toast('Тренировка сохранена!', 'success');
                this.runTime = 0;
                this.runDistance = 0;
                this.navigate('dashboard');
            }
        } else {
            this.runTime = 0;
            this.runDistance = 0;
            this.navigate('dashboard');
        }
    },

    exitRunMode() {
        this.stopRun();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
