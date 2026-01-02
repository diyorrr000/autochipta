/**
 * Admin Dashboard JavaScript fayli
 */

let bookingsChart = null;
let revenueChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Admin huquqlarini tekshirish
    if (!Auth.isAdmin()) {
        alert('Siz admin emassiz!');
        window.location.href = 'index.html';
        return;
    }
    
    // Sana va vaqtni yangilash
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Dashboard statistikasini yuklash
    loadDashboardStats();
    
    // Avtobuslar jadvalini yuklash
    loadBusesTable();
    
    // Bronlar jadvalini yuklash
    loadBookingsTable();
    
    // Foydalanuvchilar jadvalini yuklash
    loadUsersTable();
    
    // Chart'larni yaratish
    createCharts();
    
    // So'nggi bronlarni yuklash
    loadRecentBookings();
    
    // Event listener'lar
    setupEventListeners();
});

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

function loadDashboardStats() {
    const bookings = Storage.getBookings();
    const users = Storage.getUsers();
    const buses = Storage.getBuses();
    
    // Jami bronlar
    document.getElementById('totalBookingsStat').textContent = bookings.length;
    
    // Bugungi bronlar
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.bookingDate).toISOString().split('T')[0];
        return bookingDate === today;
    });
    document.getElementById('todayBookings').textContent = todayBookings.length;
    
    // Daromad
    let totalRevenue = 0;
    bookings.forEach(booking => {
        totalRevenue += booking.totalPrice || 0;
    });
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString() + ' so\'m';
    
    // Oylik daromad
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = bookings
        .filter(b => {
            const date = new Date(b.bookingDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    document.getElementById('monthlyRevenue').textContent = monthlyRevenue.toLocaleString() + ' so\'m';
    
    // Foydalanuvchilar
    const regularUsers = users.filter(u => u.role === 'user');
    document.getElementById('totalUsers').textContent = regularUsers.length;
    
    // Faol foydalanuvchilar (oxirgi 30 kunda bron qilgan)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUserIds = bookings
        .filter(b => new Date(b.bookingDate) > thirtyDaysAgo)
        .map(b => b.userId);
    const uniqueActiveUsers = [...new Set(activeUserIds)].length;
    document.getElementById('activeUsers').textContent = uniqueActiveUsers;
    
    // Avtobuslar
    document.getElementById('totalBuses').textContent = buses.length;
    
    // Faol avtobuslar (bo'sh o'rindiqlari bor)
    const activeBuses = buses.filter(b => b.availableSeats > 0).length;
    document.getElementById('activeBuses').textContent = activeBuses;
}

function loadBusesTable() {
    const buses = Storage.getBuses();
    const tableBody = document.getElementById('busesTable');
    
    if (buses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-bus fa-2x text-muted mb-3"></i>
                    <p>Hozircha avtobuslar mavjud emas</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    buses.forEach(bus => {
        const row = document.createElement('tr');
        const occupancy = ((bus.totalSeats - bus.availableSeats) / bus.totalSeats * 100).toFixed(0);
        
        row.innerHTML = `
            <td>${bus.id}</td>
            <td>
                <strong>${bus.from} → ${bus.to}</strong><br>
                <small class="text-muted">${bus.date}</small>
            </td>
            <td>${bus.departureTime} - ${bus.arrivalTime}</td>
            <td>
                ${bus.busNumber}<br>
                <span class="badge ${bus.busType === 'Lyuks' ? 'bg-success' : 'bg-primary'}">
                    ${bus.busType}
                </span>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 10px;">
                        <div class="progress-bar ${occupancy < 50 ? 'bg-success' : occupancy < 80 ? 'bg-warning' : 'bg-danger'}" 
                             style="width: ${occupancy}%">
                        </div>
                    </div>
                    <small>${bus.availableSeats}/${bus.totalSeats}</small>
                </div>
            </td>
            <td>
                <strong>${bus.price.toLocaleString()} so'm</strong>
            </td>
            <td>
                ${bus.availableSeats > 0 ? 
                    '<span class="badge bg-success">Faol</span>' : 
                    '<span class="badge bg-danger">Band</span>'
                }
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary edit-bus" data-bus-id="${bus.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-bus" data-bus-id="${bus.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Event listener'lar
    document.querySelectorAll('.edit-bus').forEach(btn => {
        btn.addEventListener('click', function() {
            const busId = this.getAttribute('data-bus-id');
            editBus(busId);
        });
    });
    
    document.querySelectorAll('.delete-bus').forEach(btn => {
        btn.addEventListener('click', function() {
            const busId = this.getAttribute('data-bus-id');
            deleteBus(busId);
        });
    });
}

function loadBookingsTable() {
    const bookings = Storage.getBookings();
    const buses = Storage.getBuses();
    const users = Storage.getUsers();
    
    const tableBody = document.getElementById('bookingsTable');
    
    if (bookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-ticket-alt fa-2x text-muted mb-3"></i>
                    <p>Hozircha bronlar mavjud emas</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    // Saralash (eng yangisi birinchi)
    bookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
    
    bookings.forEach(booking => {
        const bus = buses.find(b => b.id === booking.busId);
        const user = users.find(u => u.id === booking.userId);
        
        if (!bus || !user) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${booking.ticketId}</strong><br>
                <small class="text-muted">${new Date(booking.bookingDate).toLocaleDateString('uz-UZ')}</small>
            </td>
            <td>
                ${user.name}<br>
                <small class="text-muted">${user.email}</small>
            </td>
            <td>${bus.from} → ${bus.to}<br><small>${bus.date}</small></td>
            <td>${bus.departureTime}</td>
            <td>${booking.seats.join(', ')}</td>
            <td><strong>${booking.totalPrice.toLocaleString()} so'm</strong></td>
            <td>
                ${booking.status === 'confirmed' ? 
                    '<span class="badge bg-success">Tasdiqlangan</span>' : 
                    '<span class="badge bg-danger">Bekor qilingan</span>'
                }
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info view-booking" data-booking-id="${booking.id}">
                    <i class="fas fa-eye"></i>
                </button>
                ${booking.status === 'confirmed' ? `
                    <button class="btn btn-sm btn-outline-danger cancel-admin-booking" 
                            data-booking-id="${booking.id}">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Event listener'lar
    document.querySelectorAll('.view-booking').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            viewBookingDetails(bookingId);
        });
    });
    
    document.querySelectorAll('.cancel-admin-booking').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            cancelBookingAdmin(bookingId);
        });
    });
}

function loadUsersTable() {
    const users = Storage.getUsers();
    const bookings = Storage.getBookings();
    
    const tableBody = document.getElementById('usersTable');
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-users fa-2x text-muted mb-3"></i>
                    <p>Hozircha foydalanuvchilar mavjud emas</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const userBookings = bookings.filter(b => b.userId === user.id);
        const totalSpent = userBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>
                ${user.name}<br>
                ${user.role === 'admin' ? 
                    '<span class="badge bg-danger">Admin</span>' : 
                    '<span class="badge bg-primary">Foydalanuvchi</span>'
                }
            </td>
            <td>${user.email}</td>
            <td>${user.phone || 'Kiritilmagan'}</td>
            <td>${user.role === 'admin' ? 'Administrator' : 'Oddiy foydalanuvchi'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString('uz-UZ')}</td>
            <td>
                ${userBookings.length} ta<br>
                <small class="text-success">${totalSpent.toLocaleString()} so'm</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary edit-user" data-user-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.role !== 'admin' ? `
                        <button class="btn btn-outline-danger delete-user" data-user-id="${user.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Event listener'lar
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            editUser(userId);
        });
    });
    
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            deleteUser(userId);
        });
    });
}

function createCharts() {
    const bookings = Storage.getBookings();
    
    // 7 kunlik bronlar statistikasi
    const last7Days = [];
    const bookingsByDay = [];
    const revenueByDay = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        last7Days.push(formatDate(date));
        
        const dayBookings = bookings.filter(b => {
            const bookingDate = new Date(b.bookingDate).toISOString().split('T')[0];
            return bookingDate === dateString;
        });
        
        bookingsByDay.push(dayBookings.length);
        revenueByDay.push(dayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0));
    }
    
    // Bookings Chart
    const bookingsCtx = document.getElementById('bookingsChart').getContext('2d');
    bookingsChart = new Chart(bookingsCtx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Kunlik bronlar',
                data: bookingsByDay,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
    
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Kunlik daromad (so\'m)',
                data: revenueByDay,
                backgroundColor: 'rgba(40, 167, 69, 0.7)',
                borderColor: 'rgb(40, 167, 69)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' so\'m';
                        }
                    }
                }
            }
        }
    });
}

function loadRecentBookings() {
    const bookings = Storage.getBookings();
    const buses = Storage.getBuses();
    const users = Storage.getUsers();
    
    const container = document.getElementById('recentBookings');
    
    // Oxirgi 5 ta bron
    const recentBookings = bookings
        .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
        .slice(0, 5);
    
    if (recentBookings.length === 0) {
        container.innerHTML = `
            <div class="list-group-item">
                <div class="text-center py-3">
                    <i class="fas fa-ticket-alt fa-2x text-muted mb-3"></i>
                    <p class="mb-0">Hozircha bronlar yo'q</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    recentBookings.forEach(booking => {
        const bus = buses.find(b => b.id === booking.busId);
        const user = users.find(u => u.id === booking.userId);
        
        if (!bus || !user) return;
        
        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action';
        item.href = '#';
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${bus.from} → ${bus.to}</h6>
                <small class="text-muted">${new Date(booking.bookingDate).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'})}</small>
            </div>
            <p class="mb-1">
                <small>${user.name} | ${booking.seats.length} ta o'rindiq</small>
            </p>
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-success">${booking.totalPrice.toLocaleString()} so'm</small>
                <span class="badge ${booking.status === 'confirmed' ? 'bg-success' : 'bg-danger'}">
                    ${booking.status === 'confirmed' ? 'Tasdiqlangan' : 'Bekor qilingan'}
                </span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function setupEventListeners() {
    // Chiqish
    document.getElementById('adminLogoutBtn').addEventListener('click', function() {
        Auth.logout();
        window.location.href = 'index.html';
    });
    
    // Avtobus qo'shish
    document.getElementById('saveBusBtn').addEventListener('click', function() {
        addNewBus();
    });
    
    // Hisobot yaratish
    document.getElementById('generateReportBtn').addEventListener('click', function() {
        generateReport();
    });
    
    // Barcha ma'lumotlarni tozalash
    document.getElementById('clearAllDataBtn').addEventListener('click', function() {
        if (confirm('HAQIQATAN HAM BARCHA MA\'LUMOTLARNI O\'CHIRMOQCHIMISIZ?\nBu amalni bekor qilib bo\'lmaydi!')) {
            if (confirm('Bu barcha foydalanuvchilar, avtobuslar va bronlarni o\'chiradi. Aniq davom etmoqchimisiz?')) {
                Storage.clearAll();
                alert('Barcha ma\'lumotlar tozalandi!');
                location.reload();
            }
        }
    });
    
    // Bron filtrlari
    document.getElementById('applyBookingFilters').addEventListener('click', function() {
        applyBookingFilters();
    });
    
    // Avtobus formasi uchun bugungi sana
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('busDate').value = today;
    document.getElementById('busDate').min = today;
}

function addNewBus() {
    const busData = {
        from: document.getElementById('busFrom').value.trim(),
        to: document.getElementById('busTo').value.trim(),
        date: document.getElementById('busDate').value,
        departureTime: document.getElementById('departureTime').value,
        arrivalTime: document.getElementById('arrivalTime').value,
        busNumber: document.getElementById('busNumber').value.trim(),
        busType: document.getElementById('busType').value,
        company: document.getElementById('busCompany').value.trim(),
        totalSeats: parseInt(document.getElementById('totalSeats').value),
        price: parseInt(document.getElementById('busPrice').value),
        availableSeats: parseInt(document.getElementById('availableSeats').value),
        notes: document.getElementById('busNotes').value.trim()
    };
    
    // Validatsiya
    if (!busData.from || !busData.to) {
        alert('Marshrutni to\'liq kiriting!');
        return;
    }
    
    if (busData.from === busData.to) {
        alert('Boshlang\'ich va tugash nuqtalari bir xil bo\'lmasligi kerak!');
        return;
    }
    
    if (busData.availableSeats > busData.totalSeats) {
        alert('Bo\'sh o\'rindiqlar soni jami o\'rindiqlardan ko\'p bo\'lishi mumkin emas!');
        return;
    }
    
    // Avtobusni saqlash
    Storage.saveBus(busData);
    
    // Formani tozalash va modalni yopish
    document.getElementById('addBusForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('addBusModal')).hide();
    
    // Yangilash
    loadBusesTable();
    loadDashboardStats();
    
    alert('Avtobus muvaffaqiyatli qo\'shildi!');
}

function editBus(busId) {
    const buses = Storage.getBuses();
    const bus = buses.find(b => b.id == busId);
    
    if (!bus) {
        alert('Avtobus topilmadi!');
        return;
    }
    
    // Modalni form bilan to'ldirish
    document.getElementById('busFrom').value = bus.from;
    document.getElementById('busTo').value = bus.to;
    document.getElementById('busDate').value = bus.date;
    document.getElementById('departureTime').value = bus.departureTime;
    document.getElementById('arrivalTime').value = bus.arrivalTime;
    document.getElementById('busNumber').value = bus.busNumber;
    document.getElementById('busType').value = bus.busType;
    document.getElementById('busCompany').value = bus.company || '';
    document.getElementById('totalSeats').value = bus.totalSeats;
    document.getElementById('busPrice').value = bus.price;
    document.getElementById('availableSeats').value = bus.availableSeats;
    document.getElementById('busNotes').value = bus.notes || '';
    
    // Save tugmasini o'zgartirish
    const saveBtn = document.getElementById('saveBusBtn');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Yangilash';
    saveBtn.onclick = function() {
        updateBus(busId);
    };
    
    // Modalni ochish
    const modal = new bootstrap.Modal(document.getElementById('addBusModal'));
    modal.show();
}

function updateBus(busId) {
    const updatedData = {
        from: document.getElementById('busFrom').value.trim(),
        to: document.getElementById('busTo').value.trim(),
        date: document.getElementById('busDate').value,
        departureTime: document.getElementById('departureTime').value,
        arrivalTime: document.getElementById('arrivalTime').value,
        busNumber: document.getElementById('busNumber').value.trim(),
        busType: document.getElementById('busType').value,
        company: document.getElementById('busCompany').value.trim(),
        totalSeats: parseInt(document.getElementById('totalSeats').value),
        price: parseInt(document.getElementById('busPrice').value),
        availableSeats: parseInt(document.getElementById('availableSeats').value),
        notes: document.getElementById('busNotes').value.trim()
    };
    
    // Yangilash
    if (Storage.updateBus(parseInt(busId), updatedData)) {
        bootstrap.Modal.getInstance(document.getElementById('addBusModal')).hide();
        loadBusesTable();
        loadDashboardStats();
        alert('Avtobus muvaffaqiyatli yangilandi!');
    } else {
        alert('Avtobusni yangilashda xatolik!');
    }
    
    // Save tugmasini asl holatiga qaytarish
    const saveBtn = document.getElementById('saveBusBtn');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Saqlash';
    saveBtn.onclick = function() {
        addNewBus();
    };
}

function deleteBus(busId) {
    if (confirm(`Avtobusni o'chirishni tasdiqlaysizmi?\nBu amalni bekor qilib bo'lmaydi.`)) {
        if (Storage.deleteBus(parseInt(busId))) {
            loadBusesTable();
            loadDashboardStats();
            alert('Avtobus muvaffaqiyatli o\'chirildi!');
        } else {
            alert('Avtobusni o\'chirishda xatolik!');
        }
    }
}

function viewBookingDetails(bookingId) {
    const bookings = Storage.getBookings();
    const buses = Storage.getBuses();
    const users = Storage.getUsers();
    
    const booking = bookings.find(b => b.id == bookingId);
    const bus = buses.find(b => b.id === booking.busId);
    const user = users.find(u => u.id === booking.userId);
    
    if (!booking || !bus || !user) {
        alert('Ma\'lumotlar topilmadi!');
        return;
    }
    
    const modalHTML = `
        <div class="modal fade" id="bookingDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-ticket-alt"></i> Chipta tafsilotlari</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Yo'lovchi ma'lumotlari</h6>
                                <p><strong>Ism:</strong> ${user.name}</p>
                                <p><strong>Email:</strong> ${user.email}</p>
                                <p><strong>Telefon:</strong> ${user.phone || 'Kiritilmagan'}</p>
                                <p><strong>Bron sanasi:</strong> ${new Date(booking.bookingDate).toLocaleString('uz-UZ')}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Sayohat ma'lumotlari</h6>
                                <p><strong>Marshrut:</strong> ${bus.from} → ${bus.to}</p>
                                <p><strong>Sana va vaqt:</strong> ${bus.date} | ${bus.departureTime}</p>
                                <p><strong>Avtobus:</strong> ${bus.busNumber} (${bus.busType})</p>
                                <p><strong>Chipta ID:</strong> ${booking.ticketId}</p>
                            </div>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <h6>O'rindiqlar</h6>
                                <div class="d-flex flex-wrap gap-2">
                                    ${booking.seats.map(seat => 
                                        `<span class="badge bg-primary p-2">${seat}</span>`
                                    ).join('')}
                                </div>
                                <p class="mt-2">Jami: ${booking.seats.length} ta o'rindiq</p>
                            </div>
                            <div class="col-md-6">
                                <h6>To'lov ma'lumotlari</h6>
                                <p><strong>Umumiy summa:</strong> ${booking.totalPrice.toLocaleString()} so'm</p>
                                <p><strong>To'lov usuli:</strong> ${booking.paymentMethod || 'Onlayn'}</p>
                                <p><strong>To'lov holati:</strong> ${booking.paymentStatus || 'To\'langan'}</p>
                                <p><strong>Bron holati:</strong> ${booking.status === 'confirmed' ? 'Tasdiqlangan' : 'Bekor qilingan'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Yopish</button>
                        <button type="button" class="btn btn-primary" onclick="printBooking(${bookingId})">
                            <i class="fas fa-print"></i> Chop etish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
    modal.show();
    
    document.getElementById('bookingDetailsModal').addEventListener('hidden.bs.modal', function() {
        modalContainer.remove();
    });
}

function printBooking(bookingId) {
    // Chop etish funksiyasi
    window.print();
}

function cancelBookingAdmin(bookingId) {
    if (confirm('Haqiqatan ham bronni bekor qilmoqchimisiz?\nBu amalni bekor qilib bo\'lmaydi.')) {
        const bookings = Storage.getBookings();
        const bookingIndex = bookings.findIndex(b => b.id == bookingId);
        
        if (bookingIndex !== -1) {
            bookings[bookingIndex].status = 'cancelled';
            localStorage.setItem('bookings', JSON.stringify(bookings));
            
            // O'rindiqlarni bo'shatish
            const bus = Storage.getBuses().find(b => b.id === bookings[bookingIndex].busId);
            if (bus) {
                const updatedBus = {
                    ...bus,
                    availableSeats: bus.availableSeats + bookings[bookingIndex].seats.length
                };
                Storage.updateBus(bus.id, updatedBus);
            }
            
            loadBookingsTable();
            loadDashboardStats();
            loadRecentBookings();
            
            alert('Bron muvaffaqiyatli bekor qilindi!');
        }
    }
}

function applyBookingFilters() {
    const dateFilter = document.getElementById('filterBookingDate').value;
    const statusFilter = document.getElementById('filterBookingStatus').value;
    
    // Filtrlash logikasi
    // (Bu yerda jadvalni qayta yuklash kerak, lekin soddalik uchun alert)
    alert(`Filtrlar qo'llandi:\nSana: ${dateFilter || 'Hammasi'}\nHolat: ${statusFilter || 'Hammasi'}`);
    
    // Haqiqiy loyihada bu yerda filterBooks() funksiyasi chaqiriladi
}

function generateReport() {
    const bookings = Storage.getBookings();
    const users = Storage.getUsers();
    const buses = Storage.getBuses();
    
    const reportData = {
        generatedDate: new Date().toISOString(),
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
        totalUsers: users.filter(u => u.role === 'user').length,
        totalBuses: buses.length,
        
        // Kunlik statistika (oxirgi 7 kun)
        dailyStats: []
    };
    
    // 7 kunlik statistika
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayBookings = bookings.filter(b => {
            const bookingDate = new Date(b.bookingDate).toISOString().split('T')[0];
            return bookingDate === dateString;
        });
        
        reportData.dailyStats.push({
            date: dateString,
            bookings: dayBookings.length,
            revenue: dayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
        });
    }
    
    // Report faylini yaratish
    const reportContent = `
        ONLINE CHIPTA - ADMIN HISOBOTI
        ==============================
        Hisobot sanasi: ${new Date().toLocaleString('uz-UZ')}
        
        UMUMIY STATISTIKA:
        ------------------
        Jami bronlar: ${reportData.totalBookings}
        Jami daromad: ${reportData.totalRevenue.toLocaleString()} so'm
        Jami foydalanuvchilar: ${reportData.totalUsers}
        Jami avtobuslar: ${reportData.totalBuses}
        
        KUNLIK STATISTIKA (Oxirgi 7 kun):
        ---------------------------------
        ${reportData.dailyStats.map(day => `
        Sana: ${day.date}
        Bronlar: ${day.bookings} ta
        Daromad: ${day.revenue.toLocaleString()} so'm
        --------------------------------
        `).join('')}
        
        TOP AVTOBUSLAR:
        ---------------
        ${buses.slice(0, 5).map(bus => `
        Marshrut: ${bus.from} → ${bus.to}
        Bandlik: ${Math.round(((bus.totalSeats - bus.availableSeats) / bus.totalSeats) * 100)}%
        Daromad: ${bookings.filter(b => b.busId === bus.id).reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()} so'm
        --------------------------------
        `).join('')}
        
        TOP FOYDALANUVCHILAR:
        ---------------------
        ${users.slice(0, 5).map(user => {
            const userBookings = bookings.filter(b => b.userId === user.id);
            return `
        Foydalanuvchi: ${user.name}
        Email: ${user.email}
        Bronlar: ${userBookings.length} ta
        Sarflangan: ${userBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()} so'm
        --------------------------------
        `;
        }).join('')}
        
        Hisobot Online Chipta tizimi tomonidan avtomatik yaratildi.
        Telefon: +998 90 123 45 67
        Email: admin@onlinechipta.uz
    `;
    
    // Faylni yuklab olish
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onlinechipta-hisobot-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Hisobot muvaffaqiyatli yaratildi va yuklab olindi!');
}

function editUser(userId) {
    const users = Storage.getUsers();
    const user = users.find(u => u.id == userId);
    
    if (!user) {
        alert('Foydalanuvchi topilmadi!');
        return;
    }
    
    const modalHTML = `
        <div class="modal fade" id="editUserModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-user-edit"></i> Foydalanuvchini tahrirlash</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <div class="mb-3">
                                <label for="editUserName" class="form-label">Ism</label>
                                <input type="text" class="form-control" id="editUserName" 
                                       value="${user.name}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editUserEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="editUserEmail" 
                                       value="${user.email}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editUserPhone" class="form-label">Telefon</label>
                                <input type="tel" class="form-control" id="editUserPhone" 
                                       value="${user.phone || ''}" pattern="^\+998\d{9}$">
                            </div>
                            <div class="mb-3">
                                <label for="editUserRole" class="form-label">Rol</label>
                                <select class="form-select" id="editUserRole">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>Foydalanuvchi</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bekor qilish</button>
                        <button type="button" class="btn btn-primary" id="saveUserChangesBtn">
                            <i class="fas fa-save"></i> Saqlash
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
    
    // Saqlash tugmasi
    document.getElementById('saveUserChangesBtn').addEventListener('click', function() {
        saveUserChanges(userId);
    });
    
    document.getElementById('editUserModal').addEventListener('hidden.bs.modal', function() {
        modalContainer.remove();
    });
}

function saveUserChanges(userId) {
    const users = Storage.getUsers();
    const userIndex = users.findIndex(u => u.id == userId);
    
    if (userIndex !== -1) {
        users[userIndex].name = document.getElementById('editUserName').value;
        users[userIndex].email = document.getElementById('editUserEmail').value;
        users[userIndex].phone = document.getElementById('editUserPhone').value;
        users[userIndex].role = document.getElementById('editUserRole').value;
        
        localStorage.setItem('users', JSON.stringify(users));
        
        // Joriy foydalanuvchini yangilash agar o'zi bo'lsa
        const currentUser = Auth.getCurrentUser();
        if (currentUser.id == userId) {
            Auth.setCurrentUser(users[userIndex]);
        }
        
        // Modalni yopish
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        
        // Yangilash
        loadUsersTable();
        loadDashboardStats();
        
        alert('Foydalanuvchi muvaffaqiyatli yangilandi!');
    }
}

function deleteUser(userId) {
    if (confirm(`Foydalanuvchini o'chirishni tasdiqlaysizmi?\nBu foydalanuvchining barcha bronlari ham o'chiriladi.`)) {
        const users = Storage.getUsers();
        const user = users.find(u => u.id == userId);
        
        if (user.role === 'admin') {
            alert('Administratorlarni o\'chirib bo\'lmaydi!');
            return;
        }
        
        // Foydalanuvchini o'chirish
        const filteredUsers = users.filter(u => u.id != userId);
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        
        // Foydalanuvchining bronlarini o'chirish
        const bookings = Storage.getBookings();
        const filteredBookings = bookings.filter(b => b.userId != userId);
        localStorage.setItem('bookings', JSON.stringify(filteredBookings));
        
        loadUsersTable();
        loadBookingsTable();
        loadDashboardStats();
        
        alert('Foydalanuvchi muvaffaqiyatli o\'chirildi!');
    }
}

// Yordamchi funksiyalar
function formatDate(date) {
    return date.toLocaleDateString('uz-UZ', { 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatCurrency(amount) {
    return amount.toLocaleString('uz-UZ') + ' so\'m';
}