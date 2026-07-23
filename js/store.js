const Store = {
    getTrainings(userId) {
        try {
            return JSON.parse(localStorage.getItem('br_trainings_' + userId) || '[]');
        } catch { return []; }
    },

    saveTrainings(userId, trainings) {
        localStorage.setItem('br_trainings_' + userId, JSON.stringify(trainings));
    },

    addTraining(userId, training) {
        const trainings = this.getTrainings(userId);
        training.id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        training.createdAt = new Date().toISOString();
        trainings.push(training);
        this.saveTrainings(userId, trainings);
        return training;
    },

    updateTraining(userId, trainingId, updates) {
        const trainings = this.getTrainings(userId);
        const idx = trainings.findIndex(t => t.id === trainingId);
        if (idx === -1) return false;
        trainings[idx] = { ...trainings[idx], ...updates };
        this.saveTrainings(userId, trainings);
        return trainings[idx];
    },

    deleteTraining(userId, trainingId) {
        let trainings = this.getTrainings(userId);
        trainings = trainings.filter(t => t.id !== trainingId);
        this.saveTrainings(userId, trainings);
    },

    getTraining(userId, trainingId) {
        return this.getTrainings(userId).find(t => t.id === trainingId) || null;
    },

    getPlan(userId) {
        try {
            return JSON.parse(localStorage.getItem('br_plan_' + userId) || 'null');
        } catch { return null; }
    },

    savePlan(userId, plan) {
        localStorage.setItem('br_plan_' + userId, JSON.stringify(plan));
    },

    getZones(userId) {
        try {
            return JSON.parse(localStorage.getItem('br_zones_' + userId) || 'null');
        } catch { return null; }
    },

    saveZones(userId, zones) {
        localStorage.setItem('br_zones_' + userId, JSON.stringify(zones));
    },

    getEquipment(userId) {
        try {
            return JSON.parse(localStorage.getItem('br_equipment_' + userId) || '[]');
        } catch { return []; }
    },

    saveEquipment(userId, equipment) {
        localStorage.setItem('br_equipment_' + userId, JSON.stringify(equipment));
    },

    getSettings() {
        try {
            return JSON.parse(localStorage.getItem('br_site_settings') || '{}');
        } catch { return {}; }
    },

    saveSettings(settings) {
        localStorage.setItem('br_site_settings', JSON.stringify(settings));
    },

    getNotifications(userId) {
        try {
            return JSON.parse(localStorage.getItem('br_notifications_' + userId) || '[]');
        } catch { return []; }
    },

    addNotification(userId, notification) {
        const notifs = this.getNotifications(userId);
        notification.id = 'n_' + Date.now();
        notification.read = false;
        notification.createdAt = new Date().toISOString();
        notifs.unshift(notification);
        localStorage.setItem('br_notifications_' + userId, JSON.stringify(notifs));
    },

    getStreak(userId) {
        const trainings = this.getTrainings(userId).filter(t => t.status === 'completed');
        if (trainings.length === 0) return 0;
        const dates = [...new Set(trainings.map(t => t.date))].sort().reverse();
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        for (let i = 0; i < 365; i++) {
            const ds = checkDate.toISOString().slice(0, 10);
            if (dates.includes(ds)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0) {
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
            } else {
                break;
            }
        }
        return streak;
    },

    getWeekStats(userId) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const trainings = this.getTrainings(userId).filter(t => {
            return t.status === 'completed' && new Date(t.date) >= startOfWeek;
        });
        return {
            count: trainings.length,
            distance: trainings.reduce((s, t) => s + (t.distance || 0), 0),
            duration: trainings.reduce((s, t) => s + (t.duration || 0), 0)
        };
    },

    getPersonalRecords(userId) {
        const trainings = this.getTrainings(userId).filter(t => t.status === 'completed');
        const prs = {};
        const distances = [
            { key: '1k', min: 0.8, max: 1.3 },
            { key: '5k', min: 4.5, max: 5.5 },
            { key: '10k', min: 9, max: 11 },
            { key: 'half', min: 20, max: 22.5 },
            { key: 'marathon', min: 41, max: 43 }
        ];
        distances.forEach(d => {
            const matching = trainings.filter(t => t.distance >= d.min && t.distance <= d.max);
            if (matching.length > 0) {
                const best = matching.reduce((b, t) => {
                    const pace = t.duration / t.distance;
                    const bPace = b.duration / b.distance;
                    return pace < bPace ? t : b;
                });
                prs[d.key] = { distance: best.distance, duration: best.duration, pace: best.duration / best.distance, date: best.date };
            }
        });
        return prs;
    },

    getAchievements(userId) {
        const trainings = this.getTrainings(userId).filter(t => t.status === 'completed');
        const achievements = [];
        if (trainings.length >= 1) achievements.push({ key: 'first_run', title: 'Первая пробежка', icon: '🏃', desc: 'Вы завершили первую тренировку' });
        if (trainings.some(t => t.distance >= 5)) achievements.push({ key: 'first_5k', title: 'Первые 5 км', icon: '🎯', desc: 'Вы пробежали 5 км' });
        if (trainings.some(t => t.distance >= 10)) achievements.push({ key: 'first_10k', title: 'Первые 10 км', icon: '🏅', desc: 'Вы пробежали 10 км' });
        if (trainings.some(t => t.distance >= 21)) achievements.push({ key: 'first_half', title: 'Первый полумарафон', icon: '🥇', desc: 'Вы пробежали 21,1 км' });
        if (trainings.some(t => t.distance >= 42)) achievements.push({ key: 'first_marathon', title: 'Первый марафон', icon: '🏆', desc: 'Вы пробежали 42,2 км' });
        const weeks = new Set(trainings.map(t => {
            const d = new Date(t.date);
            d.setDate(d.getDate() - d.getDay());
            return d.toISOString().slice(0, 10);
        }));
        if (weeks.size >= 4) achievements.push({ key: '4_weeks', title: '4 недели регулярных тренировок', icon: '🔥', desc: 'Вы тренируетесь уже 4 недели' });
        if (trainings.length >= 30) achievements.push({ key: '30_runs', title: '30 тренировок', icon: '⭐', desc: 'Вы провели 30 тренировок' });
        return achievements;
    },

    generatePlan(userId) {
        const user = Auth.getUser();
        if (!user || !user.profile) return null;
        const p = user.profile;
        const goalDistances = { '5k': 5, '10k': 10, 'half': 21.1, 'marathon': 42.2, 'health': 5 };
        const goalDist = goalDistances[p.goal] || 10;
        const days = p.trainingDays || [1, 2, 4, 6];
        const weeks = p.goal === 'marathon' ? 16 : p.goal === 'half' ? 12 : 8;
        const plan = { startDate: new Date().toISOString().slice(0, 10), weeks: [], goal: p.goal, goalDistance: goalDist };
        const weekTemplates = {
            beginner: [
                { type: 'easy', name: 'Лёгкий бег', distance: 3, duration: 25 },
                { type: 'rest', name: 'Отдых', distance: 0, duration: 0 },
                { type: 'easy', name: 'Лёгкий бег', distance: 4, duration: 30 },
                { type: 'rest', name: 'Отдых', distance: 0, duration: 0 },
                { type: 'tempo', name: 'Темповый бег', distance: 3, duration: 22 },
                { type: 'rest', name: 'Отдых', distance: 0, duration: 0 },
                { type: 'long', name: 'Длинная пробежка', distance: 6, duration: 45 }
            ],
            intermediate: [
                { type: 'easy', name: 'Лёгкий бег', distance: 5, duration: 35 },
                { type: 'intervals', name: 'Интервалы', distance: 6, duration: 40 },
                { type: 'rest', name: 'Отдых', distance: 0, duration: 0 },
                { type: 'tempo', name: 'Темповый бег', distance: 7, duration: 42 },
                { type: 'easy', name: 'Лёгкий бег', distance: 5, duration: 35 },
                { type: 'rest', name: 'Отдых', distance: 0, duration: 0 },
                { type: 'long', name: 'Длинная пробежка', distance: 12, duration: 72 }
            ],
            advanced: [
                { type: 'easy', name: 'Лёгкий бег', distance: 8, duration: 50 },
                { type: 'intervals', name: 'Интервалы', distance: 10, duration: 55 },
                { type: 'easy', name: 'Восстановительный бег', distance: 6, duration: 40 },
                { type: 'tempo', name: 'Темповый бег', distance: 10, duration: 50 },
                { type: 'easy', name: 'Лёгкий бег', distance: 8, duration: 50 },
                { type: 'cross', name: 'Кросс-тренировка', distance: 0, duration: 45 },
                { type: 'long', name: 'Длинная пробежка', distance: 18, duration: 100 }
            ]
        };
        const exp = p.experience || 'intermediate';
        const template = weekTemplates[exp] || weekTemplates.intermediate;
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        for (let w = 0; w < weeks; w++) {
            const weekPlan = [];
            const start = new Date(plan.startDate);
            start.setDate(start.getDate() + w * 7);
            const intensity = w < weeks * 0.7 ? 1 + (w / (weeks * 0.7)) * 0.5 : 1.75 - ((w - weeks * 0.7) / (weeks * 0.3)) * 0.5;
            template.forEach((session, i) => {
                const sessionDate = new Date(start);
                sessionDate.setDate(start.getDate() + i);
                const dateStr = sessionDate.toISOString().slice(0, 10);
                weekPlan.push({
                    ...session,
                    distance: Math.round(session.distance * intensity * 10) / 10,
                    duration: Math.round(session.duration * intensity),
                    date: dateStr,
                    dayName: dayNames[sessionDate.getDay()],
                    status: 'planned',
                    week: w + 1
                });
            });
            plan.weeks.push(weekPlan);
        }
        this.savePlan(userId, plan);
        return plan;
    },

    adaptPlan(userId, reason, changeType) {
        const plan = this.getPlan(userId);
        if (!plan || !plan.weeks.length) return;
        const user = Auth.getUser();
        Auth.logAction(userId, 'plan_adapt', 'Адаптация плана: ' + reason);
        const notifications = this.getNotifications(userId);
        this.addNotification(userId, {
            title: 'План адаптирован',
            message: reason,
            type: 'info'
        });
    }
};
