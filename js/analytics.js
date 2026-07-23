const Analytics = {
    getWeeklyData(userId, weeks = 12) {
        const trainings = Store.getTrainings(userId).filter(t => t.status === 'completed');
        const result = [];
        const now = new Date();
        for (let w = weeks - 1; w >= 0; w--) {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay() + 1 - w * 7);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            const weekTrainings = trainings.filter(t => {
                const d = new Date(t.date);
                return d >= start && d < end;
            });
            result.push({
                label: `${start.getDate()}.${start.getMonth() + 1}`,
                distance: weekTrainings.reduce((s, t) => s + (t.distance || 0), 0),
                duration: weekTrainings.reduce((s, t) => s + (t.duration || 0), 0),
                count: weekTrainings.length,
                avgPace: weekTrainings.length > 0 ? weekTrainings.reduce((s, t) => s + (t.duration / t.distance || 0), 0) / weekTrainings.length : 0
            });
        }
        return result;
    },

    getMonthlyData(userId, months = 6) {
        const trainings = Store.getTrainings(userId).filter(t => t.status === 'completed');
        const result = [];
        const now = new Date();
        for (let m = months - 1; m >= 0; m--) {
            const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const endMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
            const monthTrainings = trainings.filter(t => {
                const d = new Date(t.date);
                return d >= month && d <= endMonth;
            });
            const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            result.push({
                label: monthNames[month.getMonth()],
                distance: monthTrainings.reduce((s, t) => s + (t.distance || 0), 0),
                duration: monthTrainings.reduce((s, t) => s + (t.duration || 0), 0),
                count: monthTrainings.length
            });
        }
        return result;
    },

    getZoneDistribution(userId) {
        const trainings = Store.getTrainings(userId).filter(t => t.status === 'completed' && t.timeInZones);
        if (trainings.length === 0) return [20, 50, 15, 10, 5];
        const totals = [0, 0, 0, 0, 0];
        trainings.forEach(t => {
            if (t.timeInZones) {
                t.timeInZones.forEach((time, i) => { if (totals[i] !== undefined) totals[i] += time; });
            }
        });
        const total = totals.reduce((s, v) => s + v, 0) || 1;
        return totals.map(t => Math.round(t / total * 100));
    },

    getComparison(userId) {
        const now = new Date();
        const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);
        const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);
        const trainings = Store.getTrainings(userId).filter(t => t.status === 'completed');
        const recent = trainings.filter(t => new Date(t.date) >= fourWeeksAgo);
        const prev = trainings.filter(t => { const d = new Date(t.date); return d >= eightWeeksAgo && d < fourWeeksAgo; });
        const rDist = recent.reduce((s, t) => s + (t.distance || 0), 0);
        const pDist = prev.reduce((s, t) => s + (t.distance || 0), 0);
        const rCount = recent.length;
        const pCount = prev.length;
        const change = pDist > 0 ? Math.round((rDist - pDist) / pDist * 100) : (rDist > 0 ? 100 : 0);
        return { recentDistance: rDist, prevDistance: pDist, recentCount: rCount, prevCount: pCount, change };
    },

    getRestingHRHistory(userId) {
        const trainings = Store.getTrainings(userId).filter(t => t.status === 'completed' && t.restingHR);
        return trainings.slice(-30).map(t => ({ date: t.date, value: t.restingHR }));
    },

    getBodyBatteryHistory(userId) {
        const trainings = Store.getTrainings(userId).filter(t => t.status === 'completed' && t.bodyBattery != null);
        return trainings.slice(-30).map(t => ({ date: t.date, value: t.bodyBattery }));
    },

    renderBarChart(data, maxValue, color = 'var(--green-500)') {
        if (!data || data.length === 0) return '<div class="chart-container"><p>Нет данных</p></div>';
        const max = maxValue || Math.max(...data.map(d => d.value || d.distance || 0), 1);
        const bars = data.map(d => {
            const v = d.value || d.distance || 0;
            const h = Math.max((v / max) * 100, 2);
            return `<div class="chart-bar" style="height:${h}%;background:${color}"><div class="chart-tooltip">${d.label}: ${typeof v === 'number' ? v.toFixed(1) : v}</div></div>`;
        }).join('');
        return `<div class="chart-bar-group" style="width:100%;justify-content:space-between">${bars}</div>
                <div style="display:flex;justify-content:space-between;width:100%;font-size:.7rem;color:var(--gray-400);padding:0 4px">
                ${data.map(d => `<span>${d.label}</span>`).join('')}
                </div>`;
    },

    renderProgressSection(userId) {
        const weekly = this.getWeeklyData(userId);
        const monthly = this.getMonthlyData(userId);
        const comparison = this.getComparison(userId);
        const prs = Store.getPersonalRecords(userId);
        const achievements = Store.getAchievements(userId);
        const weekStats = Store.getWeekStats(userId);
        const streak = Store.getStreak(userId);
        const zoneDist = this.getZoneDistribution(userId);

        const allPrsHtml = [
            { key: '1k', label: '1 км' }, { key: '5k', label: '5 км' },
            { key: '10k', label: '10 км' }, { key: 'half', label: '21,1 км' },
            { key: 'marathon', label: '42,2 км' }
        ].map(d => {
            const pr = prs[d.key];
            return `<div class="stat-card"><div class="stat-value">${pr ? Training.formatPace(pr.distance, pr.duration) + ' /км' : '--:--'}</div><div class="stat-label">${d.label}</div></div>`;
        }).join('');

        const zoneBars = zoneDist.map((pct, i) => `
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem">
                <span style="width:14px;height:14px;border-radius:50%;background:${Zones.getZoneColor(i + 1)}"></span>
                <span style="width:50px;font-size:.8rem">Зона ${i + 1}</span>
                <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%"></div></div>
                <span style="font-size:.8rem;width:35px;text-align:right">${pct}%</span>
            </div>
        `).join('');

        const achievementsHtml = achievements.length > 0 ? achievements.map(a => `
            <div class="achievement-card"><div class="achievement-icon">${a.icon}</div><div class="achievement-title">${a.title}</div><div class="achievement-desc">${a.desc}</div></div>
        `).join('') : '<p style="color:var(--gray-400);text-align:center;grid-column:1/-1">Начните тренировки, чтобы открыть достижения!</p>';

        const comparisonText = comparison.change > 0 ? `За последние 4 недели вы пробежали на ${comparison.change}% больше` : comparison.change < 0 ? `Загрузка снизилась на ${Math.abs(comparison.change)}%` : 'Нагрузка стабильна';

        return `
            <div class="page-header"><h1>Прогресс и аналитика</h1></div>
            <div class="card-grid">
                <div class="stat-card highlight"><div class="stat-value">${weekStats.distance.toFixed(1)} км</div><div class="stat-label">На этой неделе</div></div>
                <div class="stat-card highlight"><div class="stat-value">${weekStats.count}</div><div class="stat-label">Тренировок</div></div>
                <div class="stat-card highlight"><div class="stat-value">${Training.formatDuration(weekStats.duration)}</div><div class="stat-label">Время</div></div>
                <div class="stat-card highlight"><div class="stat-value">${streak} ${streak === 1 ? 'день' : 'дней'}</div><div class="stat-label">Серия</div></div>
            </div>

            <div class="card"><div class="card-header"><h2>Километраж по неделям</h2></div>${this.renderBarChart(weekly)}</div>
            <div class="card"><div class="card-header"><h2>Километраж по месяцам</h2></div>${this.renderBarChart(monthly)}</div>

            <div class="card"><div class="card-header"><h2>Сравнение периодов</h2></div>
                <p style="font-size:.95rem;margin-bottom:1rem">${comparisonText}</p>
                <div class="card-grid">
                    <div class="stat-card"><div class="stat-value">${comparison.recentDistance.toFixed(1)} км</div><div class="stat-label">Последние 4 недели</div></div>
                    <div class="stat-card"><div class="stat-value">${comparison.prevDistance.toFixed(1)} км</div><div class="stat-label">Предыдущие 4 недели</div></div>
                </div>
            </div>

            <div class="card"><div class="card-header"><h2>Распределение по пульсовым зонам</h2></div>
                <div class="zones-display">${zoneBars}</div>
            </div>

            <div class="card"><div class="card-header"><h2>Личные рекорды</h2></div>
                <div class="card-grid">${allPrsHtml}</div>
            </div>

            <div class="card"><div class="card-header"><h2>Достижения</h2></div>
                <div class="card-grid">${achievementsHtml}</div>
            </div>
        `;
    }
};
