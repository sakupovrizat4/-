const Training = {
    getWeekNumber(date) {
        const d = new Date(date);
        const start = new Date(d.getFullYear(), 0, 1);
        const diff = d - start;
        return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
    },

    getUpcoming(userId) {
        const plan = Store.getPlan(userId);
        if (!plan) return null;
        const today = new Date().toISOString().slice(0, 10);
        for (const week of plan.weeks) {
            for (const session of week) {
                if (session.date >= today && session.status === 'planned') {
                    return session;
                }
            }
        }
        return null;
    },

    getNextTraining(userId) {
        const plan = Store.getPlan(userId);
        if (!plan) return null;
        const today = new Date().toISOString().slice(0, 10);
        for (const week of plan.weeks) {
            for (const session of week) {
                if (session.date >= today && session.status === 'planned') return session;
            }
        }
        return null;
    },

    assessTraining(userId, trainingId, assessment) {
        const trainings = Store.getTrainings(userId);
        const idx = trainings.findIndex(t => t.id === trainingId);
        if (idx === -1) return false;
        trainings[idx].assessment = {
            ...assessment,
            completedAt: new Date().toISOString()
        };
        trainings[idx].status = 'completed';
        Store.saveTrainings(userId, trainings);
        this.checkAdaptation(userId, assessment);
        return true;
    },

    checkAdaptation(userId, assessment) {
        if (!assessment) return;
        const user = Auth.getUser();
        if (!user) return;
        if (assessment.difficulty >= 8 || assessment.wellbeing === 'poor' || assessment.sleep < 4 || assessment.pain) {
            const reason = this.getAdaptationReason(assessment);
            Store.adaptPlan(userId, reason, 'simplify');
            const trainings = Store.getTrainings(userId);
            const recent = trainings.filter(t => {
                const d = new Date(t.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return d >= weekAgo && t.assessment;
            });
            const avgDifficulty = recent.reduce((s, t) => s + (t.assessment?.difficulty || 5), 0) / (recent.length || 1);
            if (avgDifficulty > 7) {
                Store.addNotification(userId, {
                    title: 'Рекомендация',
                    message: 'Средняя сложность тренировок высокая. Рекомендуется снизить нагрузку на следующей неделе.',
                    type: 'warning'
                });
            }
        }
    },

    getAdaptationReason(assessment) {
        const reasons = [];
        if (assessment.difficulty >= 8) reasons.push('высокая сложность тренировки');
        if (assessment.wellbeing === 'poor' || assessment.wellbeing === 'terrible') reasons.push('плохое самочувствие');
        if (assessment.sleep && assessment.sleep < 4) reasons.push('недостаточный сон');
        if (assessment.pain) reasons.push('боль или дискомфорт');
        if (assessment.energy && assessment.energy <= 2) reasons.push('низкий уровень энергии');
        const mainReason = reasons[0] || 'изменение состояния';
        return `План адаптирован: ${mainReason}. Интенсивные тренировки заменены лёгким бегом или отдыхом для восстановления.`;
    },

    generateFeedback(assessment, planned, actual) {
        const feedback = [];
        if (actual && planned) {
            const diff = ((actual.distance - planned.distance) / planned.distance * 100).toFixed(0);
            if (diff > 10) feedback.push(`Вы превысили плановую дистанцию на ${diff}%`);
            else if (diff < -10) feedback.push(`Дистанция меньше плановой на ${Math.abs(diff)}%, но это нормально`);
        }
        if (assessment.difficulty <= 3) feedback.push('Тренировка далась легко — можно немного увеличить нагрузку на следующей');
        else if (assessment.difficulty <= 6) feedback.push('Хорошая работа! Нагрузка подобрана правильно');
        else if (assessment.difficulty <= 8) feedback.push('Тренировка была тяжёлой. Рекомендуется восстановительный день');
        else feedback.push('Тренировка была очень тяжёлой. Лучше взять день отдыха');
        if (assessment.wellbeing === 'poor' || assessment.wellbeing === 'terrible') {
            feedback.push('При плохом самочувствии лучше заменить интенсивную тренировку лёгкой пробежкой или отдыхом');
        }
        if (assessment.pain) {
            feedback.push('При наличии боли рекомендуется обратиться к специалисту и пропустить следующую тренировку');
        }
        if (assessment.sleep && assessment.sleep < 5) {
            feedback.push('Недостаточный сон влияет на восстановление. Попробуйте выспаться перед следующей тренировкой');
        }
        return feedback;
    },

    getNextRecommendation(userId, assessment) {
        if (assessment.difficulty >= 8 || assessment.wellbeing === 'poor') {
            return 'Рекомендуется лёгкий бег или день отдыха';
        }
        if (assessment.difficulty <= 3 && assessment.wellbeing === 'excellent') {
            return 'Самочувствие отличное, можно увеличить нагрузку';
        }
        return 'Следуйте плану тренировок';
    },

    formatDuration(minutes) {
        if (!minutes) return '0 мин';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        if (h === 0) return `${m} мин`;
        return `${h} ч ${m} мин`;
    },

    formatPace(distance, duration) {
        if (!distance || !duration) return '--:--';
        const paceMin = (duration / distance);
        const min = Math.floor(paceMin);
        const sec = Math.round((paceMin - min) * 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    },

    formatDistance(d) {
        if (!d) return '0 км';
        return d.toFixed(1) + ' км';
    },

    getTrainingTypeLabel(type) {
        const types = {
            easy: 'Лёгкий бег', long: 'Длинная пробежка', tempo: 'Темповый бег',
            intervals: 'Интервалы', rest: 'Отдых', cross: 'Кросс-тренировка',
            recovery: 'Восстановление', race: 'Соревнование', test: 'Тест/Контрольная'
        };
        return types[type] || type;
    },

    getWellbeingLabel(w) {
        const labels = { excellent: 'Отлично', good: 'Хорошо', normal: 'Нормально', hard: 'Тяжело', poor: 'Плохо', terrible: 'Очень плохо' };
        return labels[w] || w;
    },

    getWellbeingBadge(w) {
        const cls = { excellent: 'badge-green', good: 'badge-green', normal: 'badge-yellow', hard: 'badge-yellow', poor: 'badge-red', terrible: 'badge-red' };
        return cls[w] || 'badge-gray';
    }
};
