/**
 * Autentifikatsiya va foydalanuvchi boshqaruvi
 */

const Auth = {
    // Ro'yxatdan o'tish
    register: function(userData) {
        // Validatsiya
        if (!userData.name || !userData.email || !userData.password || !userData.phone) {
            throw new Error("Barcha maydonlarni to'ldiring");
        }
        
        if (userData.password.length < 6) {
            throw new Error("Parol kamida 6 belgidan iborat bo'lishi kerak");
        }
        
        if (!this.validateEmail(userData.email)) {
            throw new Error("Noto'g'ri email formati");
        }
        
        if (!this.validatePhone(userData.phone)) {
            throw new Error("Noto'g'ri telefon raqami formati");
        }
        
        // Email bandligini tekshirish
        const existingUser = Storage.findUserByEmail(userData.email);
        if (existingUser) {
            throw new Error("Bu email allaqachon ro'yxatdan o'tgan");
        }
        
        // Foydalanuvchini saqlash
        const user = {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            phone: userData.phone,
            role: 'user'
        };
        
        const savedUser = Storage.saveUser(user);
        
        // Avtomatik login qilish
        Storage.setCurrentUser(savedUser);
        
        return savedUser;
    },
    
    // Kirish
    login: function(email, password) {
        if (!email || !password) {
            throw new Error("Email va parolni kiriting");
        }
        
        const user = Storage.findUserByEmail(email);
        
        if (!user) {
            throw new Error("Foydalanuvchi topilmadi");
        }
        
        if (user.password !== password) {
            throw new Error("Noto'g'ri parol");
        }
        
        // Login qilish
        Storage.setCurrentUser(user);
        
        return user;
    },
    
    // Chiqish
    logout: function() {
        Storage.clearCurrentUser();
        return true;
    },
    
    // Joriy foydalanuvchi
    getCurrentUser: function() {
        return Storage.getCurrentUser();
    },
    
    // Foydalanuvchi tizimdami?
    isAuthenticated: function() {
        return !!Storage.getCurrentUser();
    },
    
    // Adminmi?
    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },
    
    // Validatsiya funksiyalari
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validatePhone: function(phone) {
        const re = /^\+998\d{9}$/;
        return re.test(phone);
    },
    
    // Parolni tekshirish
    validatePassword: function(password) {
        return password.length >= 6;
    }
};

// DOM yuklanganda foydalanuvchi holatini tekshirish
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = Auth.getCurrentUser();
    const protectedPages = ['profile.html', 'admin-dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    // Himoyalangan sahifalarga kirishni nazorat qilish
    if (protectedPages.includes(currentPage)) {
        if (!Auth.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        // Admin sahifasi uchun admin huquqini tekshirish
        if (currentPage === 'admin-dashboard.html' && !Auth.isAdmin()) {
            alert('Siz admin emassiz!');
            window.location.href = 'index.html';
            return;
        }
    }
    
    // Navbar'ni yangilash
    updateNavbar();
});

// Navbar'ni foydalanuvchi ma'lumotlari bilan yangilash
function updateNavbar() {
    const currentUser = Auth.getCurrentUser();
    const navbarElement = document.getElementById('navbarNav');
    
    if (navbarElement) {
        if (currentUser) {
            navbarElement.innerHTML += `
                <div class="navbar-nav ms-auto">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="fas fa-user"></i> ${currentUser.name}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="profile.html"><i class="fas fa-user-circle"></i> Profil</a></li>
                            <li><a class="dropdown-item" href="#"><i class="fas fa-ticket-alt"></i> Mening chiptalarim</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Chiqish</a></li>
                        </ul>
                    </li>
                </div>
            `;
            
            // Chiqish tugmasi
            document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
                e.preventDefault();
                Auth.logout();
                window.location.href = 'index.html';
            });
        } else {
            navbarElement.innerHTML += `
                <div class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="login.html"><i class="fas fa-sign-in-alt"></i> Kirish</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="register.html"><i class="fas fa-user-plus"></i> Ro'yxatdan o'tish</a>
                    </li>
                </div>
            `;
        }
    }
}

// Xato habarlarini ko'rsatish
function showError(message) {
    alert(message);
}

// Muvaffaqiyat habarlarini ko'rsatish
function showSuccess(message) {
    alert(message);
}