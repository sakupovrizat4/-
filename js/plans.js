/**
 * TrainingPlans — полная база планов подготовки
 * Системы: 80/20 (поляризованный), Норвежская двойная
 * Дистанции: 5 км, 10 км, 21,1 км (полумарафон), 42,2 км (марафон)
 * Объёмы: 40 км/нед, 70 км/нед, 90+ км/нед
 */

const TrainingPlans = {

    /** Метаданные систем тренировок */
    systems: {
        '8020': {
            id: '8020',
            name: '80/20 (Поляризованный)',
            icon: '⚡',
            color: '#f59e0b',
            description: 'Метод Мэтта Фицджеральда: 80% объёма — лёгкий бег ниже АэП (зона 1–2), 20% — высокоинтенсивная работа (зона 4–5). Доказан элитными атлетами и подтверждён наукой.',
            principles: [
                '80% тренировок — комфортный темп (разговорный)',
                '20% — интервалы, темп и гоночный бег',
                'Низкая частота темповых тренировок — меньше риск перетренировки',
                'Хорошо работает для любителей и профессионалов',
            ],
            zoneDistribution: { z1: 60, z2: 20, z3: 0, z4: 15, z5: 5 }
        },
        'norwegian': {
            id: 'norwegian',
            name: 'Норвежская система',
            icon: '🇳🇴',
            color: '#3b82f6',
            description: 'Метод Ингебригтсенов и команды Norway: двойные пороговые тренировки (2× в день около АнП), высокий объём лёгкого бега, минимум VO2max работы.',
            principles: [
                'Двойные пороговые сессии 2× в неделю (утро + вечер)',
                'Интенсивность строго контролируется лактатом (~2 ммоль/л)',
                'Высокий недельный объём — основа прогресса',
                'Очень мало работы выше ПАНО (только соревнования)',
            ],
            zoneDistribution: { z1: 50, z2: 25, z3: 22, z4: 3, z5: 0 }
        }
    },

    /** Метаданные дистанций */
    distances: {
        '5k':       { label: '5 км',         weeks: 10, raceDay: 'соревновательный день — 5 км' },
        '10k':      { label: '10 км',         weeks: 12, raceDay: 'соревновательный день — 10 км' },
        'half':     { label: '21,1 км (П/М)', weeks: 16, raceDay: 'соревновательный день — полумарафон' },
        'marathon': { label: '42,2 км (М)',   weeks: 20, raceDay: 'соревновательный день — марафон' },
    },

    /** Метаданные объёмов */
    volumes: {
        'low':  { label: '40 км/нед',   base: 40,  peak: 55,  description: 'Любитель, 3–4 тренировки в неделю' },
        'mid':  { label: '70 км/нед',   base: 65,  peak: 85,  description: 'Опытный бегун, 5–6 тренировок в неделю' },
        'high': { label: '90+ км/нед',  base: 90,  peak: 115, description: 'Продвинутый, 6–7 тренировок в неделю' },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ГЕНЕРАТОРЫ НЕДЕЛЬНЫХ ШАБЛОНОВ
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Генерирует типичную неделю для системы 80/20
     * @param {number} weekKm — объём на неделю (км)
     * @param {string} phase  — 'base'|'build'|'peak'|'taper'
     * @param {string} dist   — '5k'|'10k'|'half'|'marathon'
     */
    generate8020Week(weekKm, phase, dist, weekNum) {
        const isLong     = dist === 'marathon' || dist === 'half';
        const longRatio  = { marathon: 0.30, half: 0.27, '10k': 0.23, '5k': 0.20 }[dist];
        const longKm     = Math.round(weekKm * longRatio);
        const easyKm     = Math.round(weekKm * 0.12);
        const medKm      = Math.round(weekKm * 0.15);

        // Интенсивные тренировки (20%)
        const intensiveKm = Math.round(weekKm * 0.20);
        const intervalKm  = Math.round(intensiveKm * 0.55);
        const tempoKm     = Math.round(intensiveKm * 0.45);

        const weeks = {
            base: [
                { type: 'easy',      name: 'Лёгкий бег',              distance: easyKm,     duration: Math.round(easyKm * 6.5),  description: 'Разговорный темп, ЧСС зона 1–2. Полностью восстановительно.' },
                { type: 'easy',      name: 'Лёгкий + стрейдеры',      distance: easyKm + 1, duration: Math.round((easyKm+1)*6.3), description: '4–6 стрейдеров по 20 сек в конце пробежки для активации.' },
                { type: 'intervals', name: 'Интервалы (короткие)',      distance: intervalKm, duration: Math.round(intervalKm*5.5), description: `8×400 м в зоне 5, отдых 90 сек. Разминка/заминка по ${Math.round(intervalKm*0.3)} км.` },
                { type: 'rest',      name: 'Отдых / лёгкая ходьба',    distance: 0,          duration: 0,   description: 'Полный отдых или 30 мин спокойной ходьбы.' },
                { type: 'easy',      name: 'Лёгкий бег',              distance: medKm,      duration: Math.round(medKm*6.2),  description: 'Лёгкий восстановительный. ЧСС не выше 75% от макс.' },
                { type: 'tempo',     name: 'Темповый бег (пороговый)', distance: tempoKm,    duration: Math.round(tempoKm*5.0), description: `2×15 мин в зоне 3 (АнП -5%), отдых 3 мин. Контролируйте пульс.` },
                { type: 'long',      name: 'Длинная пробежка',         distance: longKm,     duration: Math.round(longKm*6.8),  description: 'Медленный темп, зона 1–2. Основной бег на аэробную базу.' },
            ],
            build: [
                { type: 'easy',      name: 'Лёгкий бег',              distance: easyKm,     duration: Math.round(easyKm * 6.2), description: 'Лёгкий. ЧСС зона 1.' },
                { type: 'intervals', name: 'Интервалы VO2max',         distance: intervalKm, duration: Math.round(intervalKm*5.2), description: `5×1000 м в зоне 5, отдых 2 мин. Развитие МПК.` },
                { type: 'easy',      name: 'Лёгкий + ОФП',            distance: easyKm + 1, duration: Math.round((easyKm+1)*6.3), description: 'Лёгкий бег + 20 мин силовой работы (плинтусы, выпады, приседания).' },
                { type: 'rest',      name: 'Отдых',                    distance: 0,          duration: 0,   description: 'Полный отдых.' },
                { type: 'tempo',     name: 'Прогрессивный бег',        distance: medKm,      duration: Math.round(medKm*5.8),  description: 'Начало в зоне 1, финиш в зоне 3. Отличный развивающий стимул.' },
                { type: 'tempo',     name: 'Гоночный темп',            distance: tempoKm,    duration: Math.round(tempoKm*4.8), description: `3×10 мин в целевом гоночном темпе, отдых 2 мин.` },
                { type: 'long',      name: 'Длинная пробежка',         distance: longKm,     duration: Math.round(longKm*6.5),  description: 'Длинный с вставками гоночного темпа в последней трети (10–15 мин).' },
            ],
            peak: [
                { type: 'easy',      name: 'Лёгкий бег',              distance: easyKm,     duration: Math.round(easyKm * 6.0), description: 'Восстановительный.' },
                { type: 'intervals', name: 'Острые интервалы',         distance: intervalKm, duration: Math.round(intervalKm*5.0), description: `8×600 м в зоне 5, отдых 90 сек. Пиковая скорость.` },
                { type: 'easy',      name: 'Лёгкий бег',              distance: easyKm,     duration: Math.round(easyKm * 6.2), description: 'Лёгкий.' },
                { type: 'rest',      name: 'Отдых',                    distance: 0,          duration: 0,   description: 'Полный отдых.' },
                { type: 'tempo',     name: 'Пороговый бег',            distance: tempoKm,    duration: Math.round(tempoKm*4.7), description: `Непрерывный темповый бег ${tempoKm} км в зоне 3.` },
                { type: 'easy',      name: 'Лёгкий бег',              distance: easyKm - 1, duration: Math.round((easyKm-1)*6.5), description: 'Лёгкий.' },
                { type: 'long',      name: 'Пиковая длинная',          distance: longKm + 1, duration: Math.round((longKm+1)*6.5), description: 'Максимальная длинная пробежка цикла. Медленный темп, полный объём.' },
            ],
            taper: [
                { type: 'easy',      name: 'Лёгкий бег',              distance: Math.round(easyKm * 0.7), duration: Math.round(easyKm*0.7*6.5), description: 'Снижение объёма. Лёгкий темп.' },
                { type: 'intervals', name: 'Короткие ускорения',       distance: Math.round(intervalKm*0.6), duration: Math.round(intervalKm*0.6*5.5), description: '6×200 м в темпе старта. Поддержание скорости без усталости.' },
                { type: 'easy',      name: 'Лёгкий бег',              distance: Math.round(easyKm * 0.6), duration: Math.round(easyKm*0.6*6.5), description: 'Лёгкий восстановительный.' },
                { type: 'rest',      name: 'Отдых',                    distance: 0,          duration: 0,   description: 'Отдых.' },
                { type: 'easy',      name: 'Лёгкий + стрейдеры',      distance: Math.round(easyKm * 0.5), duration: Math.round(easyKm*0.5*6.3), description: '4 стрейдера по 15–20 сек. Чувство лёгкости.' },
                { type: 'rest',      name: 'Отдых / лёгкая ходьба',    distance: 0,          duration: 0,   description: 'Отдых перед стартом.' },
                { type: 'race',      name: 'СТАРТ!',                   distance: { '5k': 5, '10k': 10, 'half': 21.1, 'marathon': 42.2 }[dist], duration: 0, description: `Соревнование! Используйте всё, чему научились за цикл.` },
            ]
        };
        return weeks[phase] || weeks.base;
    },

    /**
     * Генерирует типичную неделю для Норвежской системы
     */
    generateNorwegianWeek(weekKm, phase, dist, weekNum) {
        const longRatio = { marathon: 0.28, half: 0.25, '10k': 0.22, '5k': 0.18 }[dist];
        const longKm    = Math.round(weekKm * longRatio);
        const easyKm    = Math.round(weekKm * 0.12);
        const threshKm  = Math.round(weekKm * 0.14); // пороговый объём (2 ммоль лактат)

        const weeks = {
            base: [
                { type: 'easy',   name: 'Лёгкий бег',                      distance: easyKm,      duration: Math.round(easyKm*6.5),      description: 'Восстановительный бег. ЧСС зона 1.' },
                { type: 'tempo',  name: 'Пороговый сеанс (утро)',            distance: threshKm,    duration: Math.round(threshKm*5.2),    description: `4×2 км в пороговом темпе (~2 ммоль лактат), отдых 90 сек трусцой. Это НЕ тяжело — должно ощущаться как "контролируемо тяжело".` },
                { type: 'easy',   name: 'Восстановление',                   distance: easyKm - 1,  duration: Math.round((easyKm-1)*7.0),  description: 'Очень лёгкий трусца.' },
                { type: 'tempo',  name: 'Двойной пороговый день (утро+веч)', distance: threshKm + 1, duration: Math.round((threshKm+1)*5.0), description: `Утро: 3×3 км в пороге, отдых 90 сек. Вечер: 4×1 км чуть быстрее, отдых 2 мин. Ключевая сессия недели.` },
                { type: 'rest',   name: 'Отдых / восстановление',            distance: 0,           duration: 0,                           description: 'После двойного порогового — обязательный полный отдых.' },
                { type: 'easy',   name: 'Лёгкий бег + стрейдеры',           distance: easyKm,      duration: Math.round(easyKm*6.3),      description: '6 стрейдеров по 20 сек в конце для поддержания нейромышечного тонуса.' },
                { type: 'long',   name: 'Длинная пробежка',                  distance: longKm,      duration: Math.round(longKm*6.8),      description: 'Медленный темп, зона 1–2. Аэробная база — основа всего.' },
            ],
            build: [
                { type: 'easy',   name: 'Лёгкий бег',                      distance: easyKm,      duration: Math.round(easyKm*6.2),      description: 'Восстановление.' },
                { type: 'tempo',  name: 'Пороговые интервалы',              distance: threshKm + 1, duration: Math.round((threshKm+1)*5.0), description: `5×2 км в пороге (2 ммоль/л), отдых 90 сек. Повышенный объём порогового бега.` },
                { type: 'easy',   name: 'Лёгкий + ОФП',                    distance: easyKm,      duration: Math.round(easyKm*6.3),      description: 'Лёгкий бег + 20 мин силовой (одноногие упражнения, стабилизация).' },
                { type: 'tempo',  name: 'Длинный пороговый день',           distance: threshKm + 2, duration: Math.round((threshKm+2)*5.0), description: `Утро: 2×5 км в пороге, отдых 3 мин. Вечер: 3×2 км чуть выше порога, отдых 2 мин.` },
                { type: 'rest',   name: 'Отдых',                            distance: 0,           duration: 0,                           description: 'Полный отдых.' },
                { type: 'easy',   name: 'Лёгкий бег',                      distance: easyKm + 1,  duration: Math.round((easyKm+1)*6.5), description: 'Лёгкий.' },
                { type: 'long',   name: 'Длинная пробежка',                 distance: longKm,      duration: Math.round(longKm*6.5),      description: 'С вставками марафонского темпа в середине (10–15 мин).' },
            ],
            peak: [
                { type: 'easy',   name: 'Лёгкий бег',                      distance: easyKm,      duration: Math.round(easyKm*6.0),      description: 'Восстановительный.' },
                { type: 'tempo',  name: 'Пиковые пороговые',                distance: threshKm + 2, duration: Math.round((threshKm+2)*4.9), description: `6×2 км в пороге, отдых 90 сек. Максимальный пороговый объём цикла.` },
                { type: 'easy',   name: 'Лёгкое восстановление',            distance: easyKm - 1,  duration: Math.round((easyKm-1)*7.0),  description: 'Очень лёгкий бег.' },
                { type: 'tempo',  name: 'Пиковый двойной день',             distance: threshKm + 3, duration: Math.round((threshKm+3)*4.9), description: `Утро: 3×5 км в пороге, отдых 3 мин. Вечер: 4×2 км в темпе гонки, отдых 2 мин.` },
                { type: 'rest',   name: 'Отдых',                            distance: 0,           duration: 0,                           description: 'Полный отдых.' },
                { type: 'easy',   name: 'Лёгкий бег',                      distance: easyKm,      duration: Math.round(easyKm*6.3),      description: 'Лёгкий.' },
                { type: 'long',   name: 'Пиковая длинная',                  distance: longKm + 2,  duration: Math.round((longKm+2)*6.5),  description: 'Максимальная длинная. Последняя треть в марафонском/целевом темпе.' },
            ],
            taper: [
                { type: 'easy',   name: 'Лёгкий бег',                      distance: Math.round(easyKm*0.7),      duration: Math.round(easyKm*0.7*6.5),    description: 'Снижение объёма. Сохраняем интенсивность, убираем километры.' },
                { type: 'tempo',  name: 'Лёгкий пороговый',                 distance: Math.round(threshKm*0.5),   duration: Math.round(threshKm*0.5*5.2),   description: `3×1 км в пороге, отдых 90 сек. Поддержание навыка.` },
                { type: 'easy',   name: 'Лёгкий бег',                      distance: Math.round(easyKm*0.6),      duration: Math.round(easyKm*0.6*6.5),    description: 'Лёгкий.' },
                { type: 'rest',   name: 'Отдых',                            distance: 0,           duration: 0,                           description: 'Отдых.' },
                { type: 'easy',   name: 'Лёгкий + стрейдеры',              distance: Math.round(easyKm*0.5),      duration: Math.round(easyKm*0.5*6.3),    description: '4 стрейдера по 15 сек — активация перед стартом.' },
                { type: 'rest',   name: 'Отдых',                            distance: 0,           duration: 0,                           description: 'Отдых / лёгкая прогулка.' },
                { type: 'race',   name: 'СТАРТ!',                           distance: { '5k': 5, '10k': 10, 'half': 21.1, 'marathon': 42.2 }[dist], duration: 0, description: `Норвежский старт: первая половина строго по плану, вторая — борьба.` },
            ]
        };
        return weeks[phase] || weeks.base;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ГЕНЕРАТОР ПОЛНОГО ПЛАНА
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Генерирует полный план
     * @param {string} system   '8020'|'norwegian'
     * @param {string} distance '5k'|'10k'|'half'|'marathon'
     * @param {string} volume   'low'|'mid'|'high'
     * @returns {Object}
     */
    generatePlan(system, distance, volume) {
        const sys  = this.systems[system];
        const dist = this.distances[distance];
        const vol  = this.volumes[volume];
        const totalWeeks = dist.weeks;

        // Фазы по соотношению (база/развитие/пик/снижение)
        const phaseMap = totalWeeks <= 10
            ? { base: 3, build: 4, peak: 2, taper: 1 }
            : totalWeeks <= 12
            ? { base: 4, build: 5, peak: 2, taper: 1 }
            : totalWeeks <= 16
            ? { base: 5, build: 7, peak: 3, taper: 1 }
            : { base: 6, build: 9, peak: 4, taper: 1 };

        const phases = [];
        ['base', 'build', 'peak', 'taper'].forEach(p => {
            for (let i = 0; i < phaseMap[p]; i++) phases.push(p);
        });

        // Прогрессия объёма (волновая: +10%→+10%→-20% каждые 3 нед)
        const baseKm = vol.base;
        const peakKm = vol.peak;
        const weekKms = phases.map((phase, idx) => {
            if (phase === 'taper') return Math.round(baseKm * 0.55);
            const progress = idx / (totalWeeks - 1);
            const raw = baseKm + (peakKm - baseKm) * progress;
            // Разгрузочная неделя каждые 3 недели (−25%)
            if ((idx + 1) % 3 === 0 && phase !== 'peak') return Math.round(raw * 0.75);
            return Math.round(raw);
        });

        const today = new Date();
        const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

        const planWeeks = phases.map((phase, weekIdx) => {
            const weekKm = weekKms[weekIdx];
            const generator = system === 'norwegian'
                ? this.generateNorwegianWeek.bind(this)
                : this.generate8020Week.bind(this);

            const sessions = generator(weekKm, phase, distance, weekIdx + 1);

            return sessions.map((session, dayIdx) => {
                const date = new Date(today);
                date.setDate(today.getDate() + weekIdx * 7 + dayIdx);
                return {
                    id: `${system}-${distance}-${volume}-w${weekIdx+1}-d${dayIdx+1}`,
                    weekNum: weekIdx + 1,
                    weekPhase: phase,
                    weekKm,
                    dayName: weekDays[dayIdx],
                    date: date.toISOString().slice(0, 10),
                    status: 'planned',
                    ...session
                };
            });
        });

        return {
            id: `plan-${system}-${distance}-${volume}-${Date.now()}`,
            system, distance, volume,
            name: `${sys.name} — ${dist.label} (${vol.label})`,
            totalWeeks,
            weeks: planWeeks,
            createdAt: new Date().toISOString(),
            phases: phaseMap
        };
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ОТРИСОВКА UI
    // ═══════════════════════════════════════════════════════════════════════

    renderPage() {
        const state = window._planState || { system: null, distance: null, volume: null, preview: null, view: 'select' };
        window._planState = state;

        if (state.view === 'detail' && state.preview) {
            return this.renderPlanDetail(state.preview);
        }

        return `
        <div class="page-header">
            <h1>📋 Планы подготовки</h1>
            <p>Выберите систему, дистанцию и недельный объём — получите персональный план</p>
        </div>

        <!-- Шаг 1: Система тренировок -->
        <div class="card plan-section">
            <div class="card-header"><h2>1. Система тренировок</h2></div>
            <div class="plan-system-grid">
                ${Object.values(this.systems).map(sys => `
                <div class="plan-system-card ${state.system === sys.id ? 'selected' : ''}"
                     onclick="TrainingPlans.selectSystem('${sys.id}')">
                    <div class="sys-icon" style="background:${sys.color}22;color:${sys.color}">${sys.icon}</div>
                    <div class="sys-name">${sys.name}</div>
                    <div class="sys-desc">${sys.description}</div>
                    <div class="sys-principles">
                        ${sys.principles.map(p => `<div class="sys-principle">✓ ${p}</div>`).join('')}
                    </div>
                    <div class="zone-bar-wrap">
                        <div class="zone-bar-label">Распределение по зонам</div>
                        <div class="zone-bar">
                            ${['z1','z2','z3','z4','z5'].map((z,i) => `
                            <div class="zone-seg zone-${i+1}" style="width:${sys.zoneDistribution[z]}%" title="Зона ${i+1}: ${sys.zoneDistribution[z]}%">
                                ${sys.zoneDistribution[z] > 8 ? sys.zoneDistribution[z]+'%' : ''}
                            </div>`).join('')}
                        </div>
                        <div class="zone-legend">
                            <span class="zl z1">З1</span><span class="zl z2">З2</span><span class="zl z3">З3</span><span class="zl z4">З4</span><span class="zl z5">З5</span>
                        </div>
                    </div>
                    ${state.system === sys.id ? '<div class="plan-selected-badge">✓ Выбрано</div>' : ''}
                </div>`).join('')}
            </div>
        </div>

        <!-- Шаг 2: Дистанция -->
        ${state.system ? `
        <div class="card plan-section">
            <div class="card-header"><h2>2. Целевая дистанция</h2></div>
            <div class="plan-dist-grid">
                ${Object.entries(this.distances).map(([key, d]) => `
                <div class="plan-dist-card ${state.distance === key ? 'selected' : ''}"
                     onclick="TrainingPlans.selectDistance('${key}')">
                    <div class="dist-icon">${{ '5k':'🏃','10k':'🏅','half':'🥈','marathon':'🏆' }[key]}</div>
                    <div class="dist-label">${d.label}</div>
                    <div class="dist-weeks">${d.weeks} недель</div>
                    ${state.distance === key ? '<div class="plan-selected-badge">✓</div>' : ''}
                </div>`).join('')}
            </div>
        </div>` : ''}

        <!-- Шаг 3: Объём -->
        ${state.distance ? `
        <div class="card plan-section">
            <div class="card-header"><h2>3. Недельный объём бега</h2></div>
            <div class="plan-vol-grid">
                ${Object.entries(this.volumes).map(([key, v]) => `
                <div class="plan-vol-card ${state.volume === key ? 'selected' : ''}"
                     onclick="TrainingPlans.selectVolume('${key}')">
                    <div class="vol-km">${v.label}</div>
                    <div class="vol-desc">${v.description}</div>
                    <div class="vol-range">Пик: ~${v.peak} км/нед</div>
                    ${state.volume === key ? '<div class="plan-selected-badge">✓</div>' : ''}
                </div>`).join('')}
            </div>
        </div>` : ''}

        <!-- Кнопка генерации -->
        ${state.system && state.distance && state.volume ? `
        <div style="text-align:center;margin:1.5rem 0">
            <button class="btn btn-primary btn-lg" onclick="TrainingPlans.previewPlan()" style="font-size:1.1rem;padding:.9rem 2.5rem">
                🚀 Создать план тренировок
            </button>
        </div>` : `
        <div class="plan-hint">
            ${!state.system ? '👆 Выберите систему тренировок' : !state.distance ? '👆 Выберите целевую дистанцию' : '👆 Выберите недельный объём'}
        </div>`}
        `;
    },

    renderPlanDetail(plan) {
        const sys  = this.systems[plan.system];
        const dist = this.distances[plan.distance];
        const vol  = this.volumes[plan.volume];

        const typeIcon = { easy:'🟢', long:'🔵', tempo:'🟡', intervals:'🔴', rest:'⚫', cross:'🟣', recovery:'🟢', race:'⭐', test:'🔶' };
        const phaseLabels = { base:'Базовая', build:'Развивающая', peak:'Пиковая', taper:'Снижение' };
        const phaseColors = { base:'#10b981', build:'#3b82f6', peak:'#f59e0b', taper:'#8b5cf6' };

        // Статистика плана
        const totalKm = plan.weeks.reduce((s, w) => s + w.reduce((ss, d) => ss + (d.distance || 0), 0), 0);
        const totalSessions = plan.weeks.reduce((s, w) => s + w.filter(d => d.type !== 'rest').length, 0);

        const phaseSummary = {};
        plan.weeks.forEach(w => {
            const ph = w[0].weekPhase;
            if (!phaseSummary[ph]) phaseSummary[ph] = { weeks: 0, km: 0 };
            phaseSummary[ph].weeks++;
            phaseSummary[ph].km += w.reduce((s, d) => s + (d.distance || 0), 0);
        });

        let currentPhase = null;
        const weeksHtml = plan.weeks.map((week, wIdx) => {
            const phase = week[0].weekPhase;
            const weekKm = week.reduce((s, d) => s + (d.distance || 0), 0);
            const phaseHeader = phase !== currentPhase
                ? `<div class="plan-phase-header" style="background:${phaseColors[phase]}22;border-left:4px solid ${phaseColors[phase]}">
                     <span style="color:${phaseColors[phase]};font-weight:700">${phaseLabels[phase]} фаза</span>
                   </div>`
                : '';
            currentPhase = phase;

            return `${phaseHeader}
            <div class="plan-week-card">
                <div class="plan-week-header">
                    <span class="plan-week-num">Неделя ${wIdx + 1}</span>
                    <span class="plan-week-km">${weekKm} км</span>
                    <span class="plan-week-phase" style="color:${phaseColors[phase]}">${phaseLabels[phase]}</span>
                    <button class="btn-expand" onclick="TrainingPlans.toggleWeek(${wIdx})">▼</button>
                </div>
                <div class="plan-week-sessions" id="plan-week-${wIdx}" style="display:none">
                    ${week.map(session => `
                    <div class="plan-session ${session.type}">
                        <div class="session-day">${session.dayName}</div>
                        <div class="session-type-icon">${typeIcon[session.type] || '⚪'}</div>
                        <div class="session-body">
                            <div class="session-name">${session.name}</div>
                            <div class="session-meta">
                                ${session.distance > 0 ? `<span>📏 ${session.distance} км</span>` : ''}
                                ${session.duration > 0 ? `<span>⏱ ${Training.formatDuration(session.duration)}</span>` : ''}
                            </div>
                            <div class="session-desc">${session.description}</div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="plan-detail-header">
            <button class="btn btn-ghost" onclick="TrainingPlans.backToSelect()" style="margin-bottom:1rem">← Назад к выбору</button>
            <div class="plan-detail-title">
                <span style="font-size:1.8rem">${sys.icon}</span>
                <div>
                    <h1 style="font-size:1.3rem;margin:0">${plan.name}</h1>
                    <p style="color:var(--gray-400);margin:.2rem 0">${dist.label} · ${vol.label} · ${plan.totalWeeks} недель</p>
                </div>
            </div>
        </div>

        <!-- Статистика плана -->
        <div class="card-grid" style="margin-bottom:1rem">
            <div class="stat-card highlight"><div class="stat-value">${plan.totalWeeks}</div><div class="stat-label">Недель</div></div>
            <div class="stat-card highlight"><div class="stat-value">${Math.round(totalKm)}</div><div class="stat-label">Всего км</div></div>
            <div class="stat-card highlight"><div class="stat-value">${totalSessions}</div><div class="stat-label">Тренировок</div></div>
            <div class="stat-card highlight"><div class="stat-value">${vol.peak}</div><div class="stat-label">Пик км/нед</div></div>
        </div>

        <!-- Фазы -->
        <div class="card" style="margin-bottom:1rem">
            <div class="card-header"><h2>Структура плана</h2></div>
            <div class="phase-summary-grid">
                ${Object.entries(phaseSummary).map(([ph, s]) => `
                <div class="phase-summary-card" style="border-left:4px solid ${phaseColors[ph]}">
                    <div class="phase-s-name" style="color:${phaseColors[ph]}">${phaseLabels[ph]}</div>
                    <div class="phase-s-weeks">${s.weeks} нед</div>
                    <div class="phase-s-km">${Math.round(s.km)} км</div>
                </div>`).join('')}
            </div>
        </div>

        <!-- Кнопки действий -->
        <div style="display:flex;gap:.75rem;margin-bottom:1.5rem;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="TrainingPlans.activatePlan()">✅ Применить план</button>
            <button class="btn btn-secondary" onclick="TrainingPlans.expandAll()">📖 Развернуть все недели</button>
            <button class="btn btn-secondary" onclick="TrainingPlans.collapseAll()">📋 Свернуть</button>
        </div>

        <!-- Недели плана -->
        <div class="plan-weeks-list">
            ${weeksHtml}
        </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════════════════

    selectSystem(id) {
        window._planState = { ...(window._planState || {}), system: id, distance: null, volume: null, preview: null, view: 'select' };
        App.navigate('plans');
    },

    selectDistance(id) {
        window._planState = { ...(window._planState || {}), distance: id, volume: null };
        App.navigate('plans');
    },

    selectVolume(id) {
        window._planState = { ...(window._planState || {}), volume: id };
        App.navigate('plans');
    },

    previewPlan() {
        const s = window._planState;
        if (!s.system || !s.distance || !s.volume) return;
        const plan = this.generatePlan(s.system, s.distance, s.volume);
        window._planState = { ...s, preview: plan, view: 'detail' };
        App.navigate('plans');
    },

    backToSelect() {
        window._planState = { ...(window._planState || {}), view: 'select' };
        App.navigate('plans');
    },

    toggleWeek(idx) {
        const el = document.getElementById(`plan-week-${idx}`);
        if (!el) return;
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    },

    expandAll() {
        document.querySelectorAll('[id^="plan-week-"]').forEach(el => el.style.display = 'block');
    },

    collapseAll() {
        document.querySelectorAll('[id^="plan-week-"]').forEach(el => el.style.display = 'none');
    },

    activatePlan() {
        const plan = window._planState?.preview;
        if (!plan) return;
        const user = Auth.getUser();
        if (!user) return;
        Store.savePlan(user.id, plan);
        App.toast('✅ План успешно применён! Он доступен в Календаре.', 'success');
        setTimeout(() => App.navigate('calendar'), 1200);
    }
};
