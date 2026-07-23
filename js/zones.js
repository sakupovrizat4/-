const Zones = {
    calculate(user) {
        const p = user.profile || {};
        const age = p.age || 30;
        const restingHR = p.restingHR || 60;
        let maxHR = p.maxHR;
        if (!maxHR) {
            maxHR = Math.round(208 - 0.7 * age);
            maxHR = { value: maxHR, source: 'calculated', approximate: true };
        } else {
            maxHR = { value: maxHR, source: user.settings?.maxHRSource || 'manual', approximate: false };
        }
        const method = user.settings?.zoneMethod || 'karvonen';
        const hrr = maxHR.value - restingHR;
        let zones = [];
        if (method === 'karvonen') {
            zones = [
                { zone: 1, name: 'Восстановление', min: Math.round(restingHR + hrr * 0.50), max: Math.round(restingHR + hrr * 0.60), desc: 'Очень лёгкая нагрузка', pctMin: 50, pctMax: 60 },
                { zone: 2, name: 'Аэробная выносливость', min: Math.round(restingHR + hrr * 0.60), max: Math.round(restingHR + hrr * 0.70), desc: 'Основной лёгкий бег', pctMin: 60, pctMax: 70 },
                { zone: 3, name: 'Умеренная', min: Math.round(restingHR + hrr * 0.70), max: Math.round(restingHR + hrr * 0.80), desc: 'Темповый бег', pctMin: 70, pctMax: 80 },
                { zone: 4, name: 'Пороговая', min: Math.round(restingHR + hrr * 0.80), max: Math.round(restingHR + hrr * 0.90), desc: 'Интервалы и пороговая работа', pctMin: 80, pctMax: 90 },
                { zone: 5, name: 'Максимальная', min: Math.round(restingHR + hrr * 0.90), max: maxHR.value, desc: 'Короткие интенсивные отрезки', pctMin: 90, pctMax: 100 }
            ];
        } else if (method === 'percentage') {
            zones = [
                { zone: 1, name: 'Восстановление', min: Math.round(maxHR.value * 0.50), max: Math.round(maxHR.value * 0.60), desc: 'Очень лёгкая нагрузка', pctMin: 50, pctMax: 60 },
                { zone: 2, name: 'Аэробная выносливость', min: Math.round(maxHR.value * 0.60), max: Math.round(maxHR.value * 0.70), desc: 'Основной лёгкий бег', pctMin: 60, pctMax: 70 },
                { zone: 3, name: 'Умеренная', min: Math.round(maxHR.value * 0.70), max: Math.round(maxHR.value * 0.80), desc: 'Темповый бег', pctMin: 70, pctMax: 80 },
                { zone: 4, name: 'Пороговая', min: Math.round(maxHR.value * 0.80), max: Math.round(maxHR.value * 0.90), desc: 'Интервалы и пороговая работа', pctMin: 80, pctMax: 90 },
                { zone: 5, name: 'Максимальная', min: Math.round(maxHR.value * 0.90), max: maxHR.value, desc: 'Короткие интенсивные отрезки', pctMin: 90, pctMax: 100 }
            ];
        } else {
            zones = [
                { zone: 1, name: 'Восстановление', min: restingHR + 10, max: restingHR + 30, desc: 'Очень лёгкая нагрузка', pctMin: 0, pctMax: 0 },
                { zone: 2, name: 'Аэробная выносливость', min: restingHR + 30, max: restingHR + 50, desc: 'Основной лёгкий бег', pctMin: 0, pctMax: 0 },
                { zone: 3, name: 'Умеренная', min: restingHR + 50, max: restingHR + 70, desc: 'Темповый бег', pctMin: 0, pctMax: 0 },
                { zone: 4, name: 'Пороговая', min: restingHR + 70, max: restingHR + 85, desc: 'Интервалы и пороговая работа', pctMin: 0, pctMax: 0 },
                { zone: 5, name: 'Максимальная', min: restingHR + 85, max: maxHR.value, desc: 'Короткие интенсивные отрезки', pctMin: 0, pctMax: 0 }
            ];
        }
        return { zones, restingHR, maxHR, hrr, method };
    },

    getZoneForHR(hr, zones) {
        for (const z of zones) {
            if (hr >= z.min && hr <= z.max) return z;
        }
        if (hr < zones[0].min) return zones[0];
        return zones[zones.length - 1];
    },

    getZoneColor(zone) {
        const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
        return colors[zone - 1] || '#6b7280';
    },

    getZoneMethodName(method) {
        const names = { karvonen: 'Метод Карвонена (резерв пульса)', percentage: 'Процент от максимального пульса', custom: 'Пороговый пульс / лабораторный тест' };
        return names[method] || method;
    }
};
