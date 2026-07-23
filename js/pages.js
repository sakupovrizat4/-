const Pages = {
    renderDashboard() {
        const user = Auth.getUser();
        if (!user) return '';
        const plan = Store.getPlan(user.id);
        const nextTraining = Training.getNextTraining(user.id);
        const weekStats = Store.getWeekStats(user.id);
        const streak = Store.getStreak(user.id);
        const prs = Store.getPersonalRecords(user.id);
        const goalLabels = { '5k': '5 км', '10k': '10 км', 'half': '21,1 км', 'marathon': '42,2 км', 'health': 'Здоровье' };
        const goalDist = { '5k': 5, '10k': 10, 'half': 21.1, 'marathon': 42.2, 'health': 5 };
        const totalDistance = Store.getTrainings(user.id).filter(t => t.status === 'completed').reduce((s, t) => s + (t.distance || 0), 0);
        const gd = goalDist[user.profile?.goal] || 10;
        const progressPct = Math.min(Math.round(totalDistance / (gd * 3) * 100), 100);

        const quickActions = `
            <div class="card-grid">
                <button class="btn btn-primary" onclick="App.showAddTraining()">➕ Добавить тренировку</button>
                <button class="btn btn-secondary" onclick="App.navigate('integrations')">🔗 Подключить Strava</button>
                <button class="btn btn-secondary" onclick="App.navigate('run')">▶️ Бег сейчас</button>
                <button class="btn btn-secondary" onclick="App.showWellbeingForm()">💚 Оценить самочувствие</button>
            </div>`;

        const nextTrainingHtml = nextTraining ? `
            <div class="training-card upcoming" onclick="App.navigate('calendar')">
                <div class="training-type">${Training.getTrainingTypeLabel(nextTraining.type)}</div>
                <div class="training-title">${nextTraining.name}</div>
                <div class="training-meta">
                    <span>📅 ${new Date(nextTraining.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span>📏 ${Training.formatDistance(nextTraining.distance)}</span>
                    <span>⏱ ${Training.formatDuration(nextTraining.duration)}</span>
                </div>
            </div>` : '<div class="empty-state"><div class="empty-icon">📋</div><p>Нет запланированных тренировок.<br>Создайте план тренировок!</p></div>';

        return `
            <div class="page-header"><h1>Привет, ${user.name}! 👋</h1><p>Вот ваш обзор на сегодня</p></div>
            ${quickActions}
            <div class="card-grid" style="margin-top:1rem">
                <div class="stat-card highlight"><div class="stat-value">${weekStats.distance.toFixed(1)} км</div><div class="stat-label">На этой неделе</div></div>
                <div class="stat-card highlight"><div class="stat-value">${weekStats.count}</div><div class="stat-label">Тренировок</div></div>
                <div class="stat-card highlight"><div class="stat-value">${Training.formatDuration(weekStats.duration)}</div><div class="stat-label">Время</div></div>
                <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Дней подряд</div></div>
                <div class="stat-card"><div class="stat-value">${user.profile?.restingHR || '--'}</div><div class="stat-label">Пульс в покое</div></div>
                <div class="stat-card"><div class="stat-value">${goalLabels[user.profile?.goal] || '--'}</div><div class="stat-label">Цель</div></div>
            </div>
            <div class="card"><div class="card-header"><h2>Прогресс к цели</h2></div>
                <div style="margin-bottom:.5rem;font-size:.9rem">${goalLabels[user.profile?.goal] || 'Цель'} — ${totalDistance.toFixed(1)} км из ${gd * 3} км</div>
                <div class="progress-bar" style="height:12px"><div class="progress-fill" style="width:${progressPct}%"></div></div>
                <div style="text-align:right;font-size:.8rem;color:var(--gray-500);margin-top:.25rem">${progressPct}%</div>
            </div>
            <div class="card"><div class="card-header"><h2>Следующая тренировка</h2></div>${nextTrainingHtml}</div>
        `;
    },

    renderCalendar() {
        const user = Auth.getUser();
        if (!user) return '';
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const trainings = Store.getTrainings(user.id);
        const plan = Store.getPlan(user.id);
        let allSessions = [];
        if (plan) plan.weeks.forEach(w => allSessions.push(...w));
        trainings.forEach(t => {
            if (!allSessions.find(s => s.date === t.date)) {
                allSessions.push({ date: t.date, type: 'custom', status: t.status, name: t.type || 'Тренировка' });
            }
        });

        let cells = dayNames.map(d => `<div style="text-align:center;font-weight:600;font-size:.8rem;color:var(--gray-500);padding:.5rem">${d}</div>`).join('');
        const todayStr = now.toISOString().slice(0, 10);
        for (let i = 0; i < startOffset; i++) {
            const d = new Date(year, month, -startOffset + i + 1);
            cells += `<div class="calendar-day other-month"><span class="day-num">${d.getDate()}</span></div>`;
        }
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const session = allSessions.find(s => s.date === dateStr);
            const hasTraining = session && session.type !== 'rest' && session.type !== 'off';
            const statusClass = session?.status === 'completed' ? 'completed' : session?.status === 'missed' ? 'missed' : '';
            cells += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasTraining ? 'has-training' : ''}" onclick="App.showDayDetail('${dateStr}')">
                <span class="day-num">${d}</span>
                ${hasTraining ? `<div class="training-dot" style="background:${session.status === 'completed' ? 'var(--green-500)' : session.status === 'missed' ? 'var(--gray-400)' : 'var(--yellow-500)'}"></div>` : ''}
            </div>`;
        }
        for (let i = 1; cells.split('calendar-day').length - 1 < 42; i++) {
            const d = new Date(year, month + 1, i);
            cells += `<div class="calendar-day other-month"><span class="day-num">${d.getDate()}</span></div>`;
        }

        return `
            <div class="page-header"><h1>Календарь тренировок</h1>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="App.showAddTraining()">➕ Добавить тренировку</button>
                    ${!plan ? '<button class="btn btn-secondary" onclick="App.generatePlan()">📋 Создать план</button>' : ''}
                </div>
            </div>
            <div class="card">
                <div class="calendar-header">
                    <button class="btn btn-ghost btn-sm" onclick="App.navigate('calendar')">◀</button>
                    <h3>${monthNames[month]} ${year}</h3>
                    <button class="btn btn-ghost btn-sm" onclick="App.navigate('calendar')">▶</button>
                </div>
                <div class="calendar-grid">${cells}</div>
            </div>
            <div class="card"><div class="card-header"><h2>Тренировки на этой неделе</h2></div>
                <div id="week-trainings">${this.renderWeekTrainings(user.id)}</div>
            </div>
        `;
    },

    renderWeekTrainings(userId) {
        const plan = Store.getPlan(userId);
        const trainings = Store.getTrainings(userId);
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        let sessions = [];
        if (plan) {
            plan.weeks.forEach(w => {
                w.forEach(s => {
                    const d = new Date(s.date);
                    if (d >= startOfWeek && d < endOfWeek) sessions.push(s);
                });
            });
        }
        trainings.forEach(t => {
            const d = new Date(t.date);
            if (d >= startOfWeek && d < endOfWeek && !sessions.find(s => s.date === t.date)) {
                sessions.push({ ...t, type: t.type || 'custom', name: t.type || 'Тренировка', status: t.status });
            }
        });
        sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
        if (sessions.length === 0) return '<p style="color:var(--gray-400);text-align:center">Нет тренировок на этой неделе</p>';
        return sessions.map(s => `
            <div class="training-card ${s.status || ''}" style="margin-bottom:.5rem" onclick="App.showTrainingDetail('${s.date}', '${s.type}')">
                <div class="training-type">${Training.getTrainingTypeLabel(s.type)}</div>
                <div class="training-title">${s.name}</div>
                <div class="training-meta">
                    <span>📅 ${new Date(s.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    ${s.distance ? `<span>📏 ${Training.formatDistance(s.distance)}</span>` : ''}
                    ${s.duration ? `<span>⏱ ${Training.formatDuration(s.duration)}</span>` : ''}
                    <span class="badge ${s.status === 'completed' ? 'badge-green' : s.status === 'missed' ? 'badge-red' : 'badge-yellow'}">${s.status === 'completed' ? '✓ Выполнено' : s.status === 'missed' ? 'Пропущено' : 'Запланировано'}</span>
                </div>
            </div>
        `).join('');
    },

    renderHistory() {
        const user = Auth.getUser();
        if (!user) return '';
        const trainings = Store.getTrainings(user.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (trainings.length === 0) return `
            <div class="page-header"><h1>История тренировок</h1></div>
            <div class="empty-state"><div class="empty-icon">📋</div><p>Пока нет тренировок. Начните первую!</p></div>`;
        const rows = trainings.map(t => `
            <tr onclick="App.showTrainingDetail('${t.date}', '${t.type || 'custom'}')" style="cursor:pointer">
                <td>${new Date(t.date).toLocaleDateString('ru-RU')}</td>
                <td><span class="badge badge-green">${Training.getTrainingTypeLabel(t.type || 'custom')}</span></td>
                <td>${t.distance ? Training.formatDistance(t.distance) : '-'}</td>
                <td>${t.duration ? Training.formatDuration(t.duration) : '-'}</td>
                <td>${t.distance && t.duration ? Training.formatPace(t.distance, t.duration) + ' /км' : '-'}</td>
                <td>${t.avgHR ? t.avgHR + ' уд/мин' : '-'}</td>
                <td><span class="badge ${t.status === 'completed' ? 'badge-green' : t.status === 'missed' ? 'badge-red' : 'badge-yellow'}">${t.status === 'completed' ? '✓' : t.status === 'missed' ? '✗' : '⏳'}</span></td>
                <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.editTraining('${t.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm btn-danger" onclick="event.stopPropagation();App.deleteTraining('${t.id}')">🗑</button></td>
            </tr>
        `).join('');
        return `
            <div class="page-header"><h1>История тренировок</h1>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="App.showAddTraining()">➕ Добавить</button>
                    <button class="btn btn-outline" onclick="App.exportTrainings('csv')">📥 CSV</button>
                    <button class="btn btn-outline" onclick="App.exportTrainings('json')">📥 JSON</button>
                </div>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table><thead><tr><th>Дата</th><th>Тип</th><th>Дистанция</th><th>Время</th><th>Темп</th><th>Пульс</th><th>Статус</th><th></th></tr></thead>
                    <tbody>${rows}</tbody></table>
                </div>
            </div>`;
    },

    renderZones() {
        const user = Auth.getUser();
        if (!user) return '';
        const zoneData = Zones.calculate(user);
        const zonesHtml = zoneData.zones.map(z => `
            <div class="zone-row zone${z.zone}">
                <div class="zone-color"></div>
                <div class="zone-name">Зона ${z.zone}: ${z.name}</div>
                <div class="zone-range">${z.min}–${z.max} уд/мин</div>
                <div class="zone-desc">${z.desc} (${z.pctMin}–${z.pctMax}% HRR)</div>
            </div>
        `).join('');
        return `
            <div class="page-header"><h1>Пульс и тренировочные зоны</h1><p>Персональные зоны на основе ваших данных</p></div>
            <div class="card-grid">
                <div class="stat-card"><div class="stat-value">${zoneData.restingHR}</div><div class="stat-label">Пульс в покое</div></div>
                <div class="stat-card"><div class="stat-value">${zoneData.maxHR.value}</div><div class="stat-label">Макс. пульс ${zoneData.maxHR.approximate ? '(≈)' : ''}</div></div>
                <div class="stat-card"><div class="stat-value">${zoneData.hrr}</div><div class="stat-label">Резерв пульса</div></div>
            </div>
            <div class="card"><div class="card-header"><h2>Метод расчёта</h2></div>
                <p style="margin-bottom:.75rem;font-size:.9rem;color:var(--gray-600)">${Zones.getZoneMethodName(zoneData.method)}</p>
                <div class="zones-display">${zonesHtml}</div>
            </div>
            <div class="card"><div class="card-header"><h2>Настройка</h2></div>
                <div class="form-group"><label>Метод расчёта</label>
                    <select id="zone-method" onchange="App.updateZoneMethod()">
                        <option value="karvonen" ${zoneData.method === 'karvonen' ? 'selected' : ''}>Карвонена (рекомендуется)</option>
                        <option value="percentage" ${zoneData.method === 'percentage' ? 'selected' : ''}>% от максимального</option>
                        <option value="custom" ${zoneData.method === 'custom' ? 'selected' : ''}>Вручную</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Пульс в покое</label><input type="number" id="zone-resting" value="${zoneData.restingHR}"></div>
                    <div class="form-group"><label>Макс. пульс</label><input type="number" id="zone-max" value="${zoneData.maxHR.value}"></div>
                </div>
                <button class="btn btn-primary" onclick="App.saveZones()">Пересчитать зоны</button>
            </div>`;
    },

    renderMethods() {
        return `
            <div class="page-header"><h1>Методики тренировок</h1><p>Выберите подходящий подход для вашей подготовки</p></div>
            <div class="card-grid">
                <div class="methodology-card recommended">
                    <h3>80/20</h3>
                    <p style="margin:.5rem 0;font-size:.9rem;color:var(--gray-600)">~80% времени — лёгкий бег (зоны 1–2), ~20% — качественная работа. Рекомендуется для большинства бегунов.</p>
                    <div class="zones-display" style="margin:.75rem 0">
                        <div class="zone-row zone1"><div class="zone-color"></div><div class="zone-name">Лёгкий бег</div><div class="zone-range">80% времени</div></div>
                        <div class="zone-row zone3"><div class="zone-color" style="background:var(--green-500)"></div><div class="zone-name">Качественная работа</div><div class="zone-range">20% времени</div></div>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="App.applyMethodology('8020')">Применить</button>
                </div>
                <div class="methodology-card">
                    <h3>Поляризованная модель</h3>
                    <p style="margin:.5rem 0;font-size:.9rem;color:var(--gray-600)">Большая часть объёма — лёгкая работа, небольшая — интенсивная. Минимум времени в средней зоне.</p>
                    <div class="zones-display" style="margin:.75rem 0">
                        <div class="zone-row zone1"><div class="zone-color"></div><div class="zone-name">Низкая интенсивность</div><div class="zone-range">75–85%</div></div>
                        <div class="zone-row zone3"><div class="zone-color" style="background:var(--gray-300)"></div><div class="zone-name">Средняя (минимум)</div><div class="zone-range">5%</div></div>
                        <div class="zone-row zone5"><div class="zone-color"></div><div class="zone-name">Высокая интенсивность</div><div class="zone-range">10–20%</div></div>
                    </div>
                    <button class="btn btn-secondary btn-full" onclick="App.applyMethodology('polarized')">Применить</button>
                </div>
                <div class="methodology-card">
                    <h3>Пирамидальная модель</h3>
                    <p style="margin:.5rem 0;font-size:.9rem;color:var(--gray-600)">Много лёгкого бега → меньше умеренного → ещё меньше высокоинтенсивного. Подходит для 10 км — марафона.</p>
                    <button class="btn btn-secondary btn-full" onclick="App.applyMethodology('pyramid')">Применить</button>
                </div>
                <div class="methodology-card">
                    <h3>Норвежская система</h3>
                    <p style="margin:.5rem 0;font-size:.9rem;color:var(--gray-600)">Большой лёгкий объём + контролируемые пороговые тренировки. Вариант для продвинутого уровня.</p>
                    <span class="badge badge-yellow">Продвинутый</span>
                    <button class="btn btn-secondary btn-full" style="margin-top:.75rem" onclick="App.applyMethodology('norwegian')">Применить</button>
                </div>
            </div>`;
    },

    renderRunMode() {
        return `
            <div class="run-mode" id="run-mode">
                <div class="run-header">
                    <button class="btn btn-ghost" style="color:#fff" onclick="App.exitRunMode()">✕ Завершить</button>
                    <span style="color:var(--gray-400);font-size:.85rem">БЕГ СЕЙЧАС</span>
                    <button class="btn btn-ghost" style="color:#fff">⚙️</button>
                </div>
                <div class="run-stats">
                    <div class="run-stat"><div class="run-stat-value" id="run-time">00:00</div><div class="run-stat-label">Время</div></div>
                    <div style="display:flex;gap:3rem">
                        <div class="run-stat"><div class="run-stat-value" id="run-distance">0.00</div><div class="run-stat-label">Км</div></div>
                        <div class="run-stat"><div class="run-stat-value" id="run-pace">0:00</div><div class="run-stat-label">Темп /км</div></div>
                    </div>
                    <div class="run-stat"><div class="run-stat-value" id="run-hr">--</div><div class="run-stat-label">Пульс</div></div>
                    <div class="run-stat"><div class="run-stat-value" id="run-zone" style="font-size:1.2rem">Зона --</div><div class="run-stat-label">Текущая зона</div></div>
                </div>
                <div class="run-controls">
                    <button class="run-btn run-btn-start" id="run-start-btn" onclick="App.toggleRun()">▶</button>
                    <button class="run-btn run-btn-stop" onclick="App.stopRun()">⏹</button>
                </div>
            </div>`;
    },

    renderIntegrations() {
        const user = Auth.getUser();
        return `
            <div class="page-header"><h1>Интеграции</h1><p>Подключите устройства и сервисы</p></div>
            <div class="integration-card" style="margin-bottom:1rem">
                <div class="integration-icon">🟠</div>
                <div class="integration-info"><h3>Strava</h3><p>Импорт тренировок, пульса, маршрутов и сплитов</p></div>
                <div class="integration-status">
                    <div class="status-dot disconnected"></div>
                    <span style="font-size:.85rem;color:var(--gray-500)">Не подключено</span>
                </div>
                <button class="btn btn-primary" onclick="App.connectStrava()">Подключить Strava</button>
            </div>
            <div class="integration-card" style="margin-bottom:1rem">
                <div class="integration-icon">🟢</div>
                <div class="integration-info"><h3>Garmin Connect</h3><p>Пульс, HRV, сон, стресс, Body Battery, тренировки</p></div>
                <div class="integration-status">
                    <div class="status-dot disconnected"></div>
                    <span style="font-size:.85rem;color:var(--gray-500)">Не подключено</span>
                </div>
                <button class="btn btn-primary" onclick="App.connectGarmin()">Подключить Garmin</button>
            </div>
            <div class="integration-card">
                <div class="integration-icon">🍎</div>
                <div class="integration-info"><h3>Apple Health / Google Fit</h3><p>Синхронизация активности и показателей здоровья</p></div>
                <div class="integration-status">
                    <div class="status-dot disconnected"></div>
                    <span style="font-size:.85rem;color:var(--gray-500)">Не подключено</span>
                </div>
                <button class="btn btn-outline" onclick="App.toast('Интеграция будет доступна в следующем обновлении','info')">Скоро</button>
            </div>`;
    },

    renderRoutes() {
        const routes = [
            { name: 'Парк Горького — круг', dist: 5.2, terrain: 'Асфальт', elevation: 15, lighting: 'Хорошее', water: 'Да', safety: 'Высокий рейтинг', rating: 4.8 },
            { name: 'Лужники — набережная', dist: 10.1, terrain: 'Асфальт', elevation: 25, lighting: 'Отличное', water: 'Да', safety: 'Высокий рейтинг', rating: 4.6 },
            { name: 'Сокольники — лес', dist: 7.3, terrain: 'Грунт', elevation: 40, lighting: 'Среднее', water: 'Нет', safety: 'Хороший рейтинг', rating: 4.3 },
            { name: 'Измайловский парк', dist: 4.5, terrain: 'Смешанное', elevation: 10, lighting: 'Хорошее', water: 'Да', safety: 'Высокий рейтинг', rating: 4.5 }
        ];
        const cards = routes.map(r => `
            <div class="route-card">
                <div class="route-image">🗺️ ${r.name}</div>
                <div class="route-info">
                    <h3>${r.name}</h3>
                    <div class="route-meta">
                        <span>📏 ${r.dist} км</span><span>⛰ ${r.elevation} м</span><span>🛤 ${r.terrain}</span>
                        <span>💡 ${r.lighting}</span><span>💧 ${r.water}</span><span>⭐ ${r.rating}</span>
                    </div>
                    <p style="margin-top:.5rem;font-size:.85rem;color:var(--gray-600)">🔒 ${r.safety}</p>
                </div>
            </div>
        `).join('');
        return `
            <div class="page-header"><h1>Маршруты</h1><p>Рекомендованные маршруты для бега</p></div>
            <div class="card-grid">${cards}</div>`;
    },

    renderCrossTraining() {
        const activities = [
            { name: 'Ходьба', icon: '🚶', duration: '30–60 мин', zone: 'Зона 1', goal: 'Восстановление, активный отдых' },
            { name: 'Велотренажёр', icon: '🚴', duration: '30–45 мин', zone: 'Зона 1–2', goal: 'Кросс-тренировка без ударной нагрузки' },
            { name: 'Плавание', icon: '🏊', duration: '30–45 мин', zone: 'Зона 1–2', goal: 'Развитие выносливости, восстановление' },
            { name: 'Эллиптический тренажёр', icon: '🏋️', duration: '30–40 мин', zone: 'Зона 1–2', goal: 'Низконагрузочная кардио-тренировка' },
            { name: 'Йога', icon: '🧘', duration: '30–60 мин', zone: 'Зона 1', goal: 'Мобильность, гибкость, восстановление' },
            { name: 'Силовая тренировка', icon: '💪', duration: '30–45 мин', zone: '-', goal: 'Укрепление мышц стоп, икор, ягодиц, корпуса' }
        ];
        const cards = activities.map(a => `
            <div class="card" style="text-align:center">
                <div style="font-size:2rem;margin-bottom:.5rem">${a.icon}</div>
                <h3 style="font-size:1rem;margin-bottom:.25rem">${a.name}</h3>
                <p style="font-size:.85rem;color:var(--gray-500)">${a.goal}</p>
                <p style="font-size:.8rem;color:var(--gray-400);margin-top:.35rem">⏱ ${a.duration} · ❤️ ${a.zone}</p>
            </div>
        `).join('');
        return `
            <div class="page-header"><h1>Кросс-тренировки и восстановление</h1><p>Активности для восстановительных дней</p></div>
            <div class="card-grid">${cards}</div>
            <div class="card" style="margin-top:1rem;border-left:4px solid var(--yellow-500)">
                <h3 style="color:var(--yellow-500);margin-bottom:.5rem">⚠️ В восстановительный день не рекомендуется:</h3>
                <ul style="font-size:.9rem;color:var(--gray-600);padding-left:1.25rem">
                    <li>HIIT-тренировки</li><li>Тяжёлая силовая тренировка ног</li><li>Прыжки</li><li>Соревновательная нагрузка</li>
                </ul>
            </div>`;
    },

    renderNutrition() {
        return `
            <div class="page-header"><h1>Питание и подготовка к старту</h1></div>
            <div class="tabs">
                <button class="tab active" onclick="App.switchNutritionTab('hydration')">Гидратация</button>
                <button class="tab" onclick="App.switchNutritionTab('race-prep')">Подготовка к старту</button>
                <button class="tab" onclick="App.switchNutritionTab('gels')">Питание на дистанции</button>
            </div>
            <div id="nutrition-content">
                <div class="card">
                    <h3>💧 Напоминания о воде</h3>
                    <p style="margin:.5rem 0;font-size:.9rem;color:var(--gray-600)">Пейте 200–300 мл воды за 2 часа до тренировки и по 100–150 мл каждые 20 минут во время бега.</p>
                    <div class="card-grid">
                        <div class="stat-card"><div class="stat-value">2–3 л</div><div class="stat-label">Дневная норма</div></div>
                        <div class="stat-card"><div class="stat-value">500 мл</div><div class="stat-label">За 2 часа до бега</div></div>
                        <div class="stat-card"><div class="stat-value">150 мл</div><div class="stat-label">Каждые 20 мин</div></div>
                    </div>
                </div>
            </div>`;
    },

    renderEquipment() {
        const user = Auth.getUser();
        const equipment = Store.getEquipment(user.id);
        const rows = equipment.map(e => `
            <tr>
                <td>${e.name}</td>
                <td>${e.brand || '-'}</td>
                <td>${e.distance || 0} км</td>
                <td>${e.maxDistance || 800} км</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill ${e.distance / (e.maxDistance || 800) > 0.8 ? 'red' : ''}" style="width:${Math.min((e.distance / (e.maxDistance || 800)) * 100, 100)}%"></div>
                    </div>
                </td>
                <td>${e.distance && e.maxDistance && e.distance >= e.maxDistance ? '<span class="badge badge-red">Замена</span>' : '<span class="badge badge-green">ОК</span>'}</td>
            </tr>
        `).join('');
        return `
            <div class="page-header"><h1>Экипировка</h1>
                <div class="page-actions"><button class="btn btn-primary" onclick="App.showAddEquipment()">➕ Добавить кроссовки</button></div>
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table><thead><tr><th>Модель</th><th>Бренд</th><th>Пробег</th><th>Ресурс</th><th>Износ</th><th>Статус</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--gray-400)">Добавьте первую пару кроссовок</td></tr>'}</tbody></table>
                </div>
            </div>`;
    },

    renderCommunity() {
        return `
            <div class="page-header"><h1>Сообщество</h1><p>Бегайте вместе</p></div>
            <div class="card-grid">
                <div class="card" style="text-align:center"><div style="font-size:2rem">🏆</div><h3>Челленджи</h3><p style="font-size:.85rem;color:var(--gray-500);margin-top:.25rem">Присоединяйтесь к челленджам и соревнуйтесь</p></div>
                <div class="card" style="text-align:center"><div style="font-size:2rem">👥</div><h3>Клубы</h3><p style="font-size:.85rem;color:var(--gray-500);margin-top:.25rem">Найдите беговой клуб рядом</p></div>
                <div class="card" style="text-align:center"><div style="font-size:2rem">🤝</div><h3>Партнёры</h3><p style="font-size:.85rem;color:var(--gray-500);margin-top:.25rem">Найдите компаньона для бега</p></div>
                <div class="card" style="text-align:center"><div style="font-size:2rem">📅</div><h3>Забеги</h3><p style="font-size:.85rem;color:var(--gray-500);margin-top:.25rem">Календарь ближайших стартов</p></div>
            </div>`;
    },

    renderAbout() {
        const settings = Store.getSettings();
        return `
            <div class="page-header"><h1>О проекте</h1></div>
            <div class="card">
                <div class="about-creator">
                    <div class="creator-photo">${settings.adminPhoto ? '<img src="' + settings.adminPhoto + '">' : '👤'}</div>
                    <div class="creator-info">
                        <h3>Rizat Sakupov</h3>
                        <p>Создатель «Беговой ритм»</p>
                        <div class="creator-links">
                            <a href="https://www.instagram.com/rizat.sakupov/" target="_blank" class="creator-link">📸 Instagram</a>
                            <a href="#" class="creator-link">🏃 Strava: Ризат Сакупов</a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card">
                <h3 style="margin-bottom:.75rem">О сервисе</h3>
                <p style="font-size:.95rem;color:var(--gray-600);line-height:1.7">
                    «Беговой ритм» — персональный тренер по бегу, который адаптируется к вашей жизни.
                    План тренировок учитывает ваше самочувствие, восстановление, сон, пульс и доступное время,
                    а не требует идеального выполнения.
                </p>
                <p style="font-size:.95rem;color:var(--gray-600);line-height:1.7;margin-top:.75rem">
                    Мы не обвиняем за пропуски. Мы поддерживаем и помогаем вернуться к тренировкам
                    в удобном темпе. Ваши данные о здоровье хранятся безопасно и не передаются третьим лицам.
                </p>
                <p style="font-size:.8rem;color:var(--gray-400);margin-top:1rem">
                    Рекомендации сервиса не являются медицинским назначением. При тревожных симптомах
                    обратитесь к врачу.
                </p>
            </div>`;
    },

    renderSettings() {
        const user = Auth.getUser();
        if (!user) return '';
        const p = user.profile || {};
        return `
            <div class="page-header"><h1>Настройки</h1></div>
            <div class="card">
                <h3 style="margin-bottom:1rem">Личные данные</h3>
                <div class="form-row">
                    <div class="form-group"><label>Имя</label><input type="text" id="set-name" value="${user.name}"></div>
                    <div class="form-group"><label>Email</label><input type="email" value="${user.email}" disabled></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Возраст</label><input type="number" id="set-age" value="${p.age || ''}"></div>
                    <div class="form-group"><label>Вес (кг)</label><input type="number" id="set-weight" value="${p.weight || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Пульс в покое</label><input type="number" id="set-resting-hr" value="${p.restingHR || ''}"></div>
                    <div class="form-group"><label>Макс. пульс</label><input type="number" id="set-max-hr" value="${p.maxHR || ''}"></div>
                </div>
                <div class="form-group"><label>Цель</label>
                    <select id="set-goal">
                        <option value="5k" ${p.goal === '5k' ? 'selected' : ''}>5 км</option>
                        <option value="10k" ${p.goal === '10k' ? 'selected' : ''}>10 км</option>
                        <option value="half" ${p.goal === 'half' ? 'selected' : ''}>Полумарафон</option>
                        <option value="marathon" ${p.goal === 'marathon' ? 'selected' : ''}>Марафон</option>
                        <option value="health" ${p.goal === 'health' ? 'selected' : ''}>Здоровье</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="App.saveSettings()">Сохранить</button>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem">Фото профиля</h3>
                <div class="user-avatar" style="width:80px;height:80px;font-size:2rem;margin-bottom:.75rem">
                    ${user.photo ? '<img src="' + user.photo + '">' : '👤'}
                </div>
                <input type="file" accept="image/*" onchange="App.handleProfilePhoto(event)">
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem">Конфиденциальность</h3>
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="set-consent" ${p.healthConsent ? 'checked' : ''}>
                    <label for="set-consent">Согласие на обработку данных о здоровье</label>
                </div>
                <button class="btn btn-secondary" onclick="App.exportAllData()">📥 Экспорт данных</button>
                <button class="btn btn-danger" style="margin-left:.5rem" onclick="App.deleteAccount()">🗑 Удалить аккаунт</button>
            </div>`;
    }
};
