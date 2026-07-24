const Auth = {
    init() {
        this.seedDatabase();
        this.currentUser = this.loadSession();
        if (!this.currentUser) {
            const users = this.getUsers();
            if (users.length > 0) {
                this.saveSession({ id: users[0].id, email: users[0].email });
                this.currentUser = this.loadSession();
            }
        }
        if (this.currentUser) {
            const authScr = document.getElementById('auth-screen');
            const appMn = document.getElementById('app-main');
            if (authScr) authScr.style.display = 'none';
            if (appMn) appMn.style.display = 'flex';
        }
    },

    seedDatabase() {
        const users = this.getUsers();
        if (users.length === 0) {
            const user = {
                id: 'u_sakupov_001',
                name: 'Rizat Sakupov',
                email: 'sakupovrizat4@gmail.com',
                password: this.hashPassword('48526480r'),
                role: 'admin',
                consent: true,
                emailVerified: true,
                createdAt: new Date().toISOString(),
                profile: {
                    age: 28, weight: 72, goal: 'half', restingHR: 58,
                    maxHR: 192, trainingDays: [1, 2, 4, 6], experience: 'intermediate',
                    healthConsent: true
                },
                settings: { maxHRSource: 'manual', zoneMethod: 'karvonen', units: 'metric' },
                photo: null,
                blocked: false
            };
            this.saveUsers([user]);
            this.logAction(user.id, 'seed', 'Пользователь добавлен в базу данных');
        }
    },

    loadSession() {
        try {
            const s = localStorage.getItem('br_session');
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    },

    saveSession(user) {
        localStorage.setItem('br_session', JSON.stringify(user));
        this.currentUser = user;
    },

    getUsers() {
        try {
            return JSON.parse(localStorage.getItem('br_users') || '[]');
        } catch { return []; }
    },

    saveUsers(users) {
        localStorage.setItem('br_users', JSON.stringify(users));
    },

    hashPassword(pw) {
        let h = 0;
        for (let i = 0; i < pw.length; i++) {
            h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
        }
        return 'h_' + Math.abs(h).toString(36);
    },

    register(name, email, password, consent) {
        const users = this.getUsers();
        if (users.find(u => u.email === email.toLowerCase())) {
            return { error: 'Пользователь с таким email уже существует' };
        }
        if (password.length < 6) {
            return { error: 'Пароль должен содержать минимум 6 символов' };
        }
        const user = {
            id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: this.hashPassword(password),
            role: users.length === 0 ? 'admin' : 'user',
            consent: consent,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            profile: {
                age: null, weight: null, goal: 'half', restingHR: null,
                maxHR: null, trainingDays: [1, 2, 4, 6], experience: 'intermediate',
                healthConsent: consent
            },
            settings: {
                maxHRSource: 'calculated',
                zoneMethod: 'karvonen',
                units: 'metric'
            },
            photo: null,
            blocked: false
        };
        users.push(user);
        this.saveUsers(users);
        this.saveSession({ id: user.id, email: user.email });
        this.logAction(user.id, 'register', 'Регистрация нового пользователя');
        return { success: true, user };
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email.toLowerCase().trim());
        if (!user) return { error: 'Пользователь не найден' };
        if (user.blocked) return { error: 'Аккаунт заблокирован. Обратитесь к администратору.' };
        if (user.password !== this.hashPassword(password)) {
            return { error: 'Неверный пароль' };
        }
        this.saveSession({ id: user.id, email: user.email });
        this.logAction(user.id, 'login', 'Вход в систему');
        return { success: true, user };
    },

    logout() {
        if (this.currentUser) {
            this.logAction(this.currentUser.id, 'logout', 'Выход из системы');
        }
        localStorage.removeItem('br_session');
        this.currentUser = null;
    },

    getUser() {
        if (!this.currentUser) return null;
        const users = this.getUsers();
        return users.find(u => u.id === this.currentUser.id) || null;
    },

    updateUser(userId, updates) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return false;
        users[idx] = { ...users[idx], ...updates };
        this.saveUsers(users);
        this.logAction(userId, 'update_profile', 'Обновление профиля');
        return true;
    },

    updateUserProfile(userId, profileUpdates) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return false;
        users[idx].profile = { ...users[idx].profile, ...profileUpdates };
        this.saveUsers(users);
        return true;
    },

    deleteUser(userId) {
        let users = this.getUsers();
        users = users.filter(u => u.id !== userId);
        this.saveUsers(users);
        const trainings = JSON.parse(localStorage.getItem('br_trainings_' + userId) || '[]');
        localStorage.removeItem('br_trainings_' + userId);
        localStorage.removeItem('br_plan_' + userId);
        localStorage.removeItem('br_zones_' + userId);
        localStorage.removeItem('br_equipment_' + userId);
        this.logAction(userId, 'delete_user', 'Удаление аккаунта');
        return true;
    },

    getAllUsers() {
        return this.getUsers();
    },

    toggleBlock(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return false;
        user.blocked = !user.blocked;
        this.saveUsers(users);
        this.logAction(userId, user.blocked ? 'block' : 'unblock', (user.blocked ? 'Блокировка' : 'Разблокировка') + ' аккаунта');
        return user.blocked;
    },

    changeUserRole(userId, role) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return false;
        user.role = role;
        this.saveUsers(users);
        this.logAction(userId, 'change_role', 'Смена роли на ' + role);
        return true;
    },

    logAction(userId, action, details) {
        const logs = JSON.parse(localStorage.getItem('br_logs') || '[]');
        logs.push({
            userId, action, details,
            timestamp: new Date().toISOString()
        });
        if (logs.length > 500) logs.splice(0, logs.length - 500);
        localStorage.setItem('br_logs', JSON.stringify(logs));
    },

    getLogs() {
        return JSON.parse(localStorage.getItem('br_logs') || '[]');
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    getStats() {
        const users = this.getUsers();
        const allTrainings = [];
        users.forEach(u => {
            const t = JSON.parse(localStorage.getItem('br_trainings_' + u.id) || '[]');
            allTrainings.push(...t);
        });
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const activeUsers = users.filter(u => {
            const t = JSON.parse(localStorage.getItem('br_trainings_' + u.id) || '[]');
            return t.some(tr => tr.date > weekAgo);
        });
        return {
            totalUsers: users.length,
            activeUsers: activeUsers.length,
            totalTrainings: allTrainings.length,
            stravaConnections: 0,
            garminConnections: 0
        };
    },

    exportData(userId) {
        const user = this.getUsers().find(u => u.id === userId);
        const trainings = JSON.parse(localStorage.getItem('br_trainings_' + userId) || '[]');
        return JSON.stringify({ user, trainings }, null, 2);
    },

    forcePasswordReset(userId, newPw) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return false;
        user.password = this.hashPassword(newPw);
        this.saveUsers(users);
        return true;
    }
};
