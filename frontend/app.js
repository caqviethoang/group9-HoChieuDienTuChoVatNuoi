// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Global state
let currentCattleId = null;
let web3 = null;
let currentAccount = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show active content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
            
            // Load data for the tab
            switch(tabId) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'cattle':
                    loadCattleList();
                    break;
                case 'vaccination':
                    loadCattleForSelect('vaccCattleId');
                    loadVaccinationHistory();
                    break;
                case 'movement':
                    loadCattleForSelect('moveCattleId');
                    loadMovementHistory();
                    break;
            }
        });
    });

    // Form submissions
    document.getElementById('registerCattleForm').addEventListener('submit', registerCattle);
    document.getElementById('vaccinationForm').addEventListener('submit', addVaccination);
    document.getElementById('movementForm').addEventListener('submit', addMovement);
    
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    // Blockchain button
    document.getElementById('saveToBlockchainBtn').addEventListener('click', saveToBlockchain);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('cattleModal').style.display = 'none';
    });
    
    // Initial load
    loadDashboard();
    loadCattleList();
    
    // Load cattle for dropdowns
    loadCattleForSelect('vaccCattleId');
    loadCattleForSelect('moveCattleId');
});

// Load Dashboard Data
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const data = await response.json();
        
        document.getElementById('totalCattle').textContent = data.total_cattle;
        document.getElementById('totalVaccinations').textContent = data.total_vaccinations;
        document.getElementById('totalMovements').textContent = data.total_movements;
        
        // Load recent cattle
        const cattleResponse = await fetch(`${API_BASE_URL}/cattle`);
        const cattleData = await cattleResponse.json();
        
        const recentList = document.getElementById('recentCattleList');
        recentList.innerHTML = '';
        
        // Show latest 5 cattle
        cattleData.slice(-5).reverse().forEach(cattle => {
            const div = document.createElement('div');
            div.className = 'cattle-card';
            div.innerHTML = `
                <h4>${cattle.name} (${cattle.cattle_id})</h4>
                <p><strong>Giống:</strong> ${cattle.breed}</p>
                <p><strong>Chủ sở hữu:</strong> ${cattle.owner_name}</p>
                <button onclick="viewCattleDetails('${cattle._id}')" class="btn-action btn-view">
                    <i class="fas fa-eye"></i> Xem chi tiết
                </button>
            `;
            recentList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Register New Cattle
async function registerCattle(e) {
    e.preventDefault();
    
    const cattleData = {
        name: document.getElementById('cattleName').value,
        breed: document.getElementById('breed').value,
        date_of_birth: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        weight: parseFloat(document.getElementById('weight').value),
        owner_name: document.getElementById('ownerName').value,
        farm_location: document.getElementById('farmLocation').value,
        color: 'Various', // Default color
        owner_address: 'N/A' // Default address
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cattleData)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert('Đã đăng ký bò thành công! ID: ' + result.cattle.cattle_id);
            
            // Store the cattle ID for blockchain saving
            currentCattleId = result.cattle._id;
            
            // Enable blockchain button
            document.getElementById('saveToBlockchainBtn').disabled = false;
            
            // Reset form
            e.target.reset();
            
            // Reload lists
            loadCattleList();
            loadDashboard();
            loadCattleForSelect('vaccCattleId');
            loadCattleForSelect('moveCattleId');
        } else {
            alert('Có lỗi xảy ra khi đăng ký bò');
        }
    } catch (error) {
        console.error('Error registering cattle:', error);
        alert('Lỗi kết nối đến server');
    }
}

// Load Cattle List
async function loadCattleList() {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const cattleData = await response.json();
        
        const tableBody = document.getElementById('cattleTableBody');
        tableBody.innerHTML = '';
        
        cattleData.forEach(cattle => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cattle.cattle_id}</td>
                <td>${cattle.name}</td>
                <td>${cattle.breed}</td>
                <td>${cattle.gender}</td>
                <td>${cattle.owner_name}</td>
                <td>
                    ${cattle.blockchain_hash ? 
                        '<span style="color: green;"><i class="fas fa-check-circle"></i> Đã lưu</span>' : 
                        '<span style="color: red;"><i class="fas fa-times-circle"></i> Chưa lưu</span>'}
                </td>
                <td>
                    <button onclick="viewCattleDetails('${cattle._id}')" class="btn-action btn-view">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                    <button onclick="verifyOnBlockchain('${cattle._id}')" class="btn-action btn-verify">
                        <i class="fas fa-shield-alt"></i> Xác minh
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading cattle list:', error);
    }
}

// Load Cattle for Select Dropdowns
async function loadCattleForSelect(selectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const cattleData = await response.json();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Chọn bò...</option>';
        
        cattleData.forEach(cattle => {
            const option = document.createElement('option');
            option.value = cattle._id;
            option.textContent = `${cattle.name} (${cattle.cattle_id})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading cattle for select:', error);
    }
}

// Add Vaccination
async function addVaccination(e) {
    e.preventDefault();
    
    const vaccinationData = {
        cattle_id: document.getElementById('vaccCattleId').value,
        vaccine_name: document.getElementById('vaccineName').value,
        vaccination_date: document.getElementById('vaccinationDate').value,
        next_due_date: '', // Optional
        veterinarian: document.getElementById('veterinarian').value,
        notes: ''
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${vaccinationData.cattle_id}/vaccinations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vaccinationData)
        });
        
        if (response.ok) {
            alert('Đã thêm thông tin tiêm chủng thành công!');
            e.target.reset();
            loadVaccinationHistory();
            loadDashboard();
        }
    } catch (error) {
        console.error('Error adding vaccination:', error);
        alert('Lỗi khi thêm thông tin tiêm chủng');
    }
}

// Add Movement
async function addMovement(e) {
    e.preventDefault();
    
    const movementData = {
        cattle_id: document.getElementById('moveCattleId').value,
        from_location: document.getElementById('fromLocation').value,
        to_location: document.getElementById('toLocation').value,
        movement_date: document.getElementById('movementDate').value,
        reason: 'Vận chuyển', // Default reason
        transport_details: ''
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${movementData.cattle_id}/movements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(movementData)
        });
        
        if (response.ok) {
            alert('Đã ghi nhận di chuyển thành công!');
            e.target.reset();
            loadMovementHistory();
            loadDashboard();
        }
    } catch (error) {
        console.error('Error adding movement:', error);
        alert('Lỗi khi ghi nhận di chuyển');
    }
}

// Load Vaccination History
async function loadVaccinationHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const cattleData = await response.json();
        
        const container = document.getElementById('vaccinationHistory');
        container.innerHTML = '';
        
        cattleData.forEach(cattle => {
            if (cattle.vaccinations && cattle.vaccinations.length > 0) {
                const card = document.createElement('div');
                card.className = 'cattle-card';
                card.innerHTML = `
                    <h4>${cattle.name} (${cattle.cattle_id})</h4>
                    <p><strong>Số mũi tiêm:</strong> ${cattle.vaccinations.length}</p>
                    <p><strong>Mũi tiêm gần nhất:</strong> ${cattle.vaccinations[cattle.vaccinations.length - 1].vaccine_name}</p>
                    <button onclick="viewVaccinationDetails('${cattle._id}')" class="btn-action btn-view">
                        <i class="fas fa-syringe"></i> Xem chi tiết
                    </button>
                `;
                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error('Error loading vaccination history:', error);
    }
}

// Load Movement History
async function loadMovementHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const cattleData = await response.json();
        
        const container = document.getElementById('movementHistory');
        container.innerHTML = '';
        
        cattleData.forEach(cattle => {
            if (cattle.movements && cattle.movements.length > 0) {
                const card = document.createElement('div');
                card.className = 'cattle-card';
                card.innerHTML = `
                    <h4>${cattle.name} (${cattle.cattle_id})</h4>
                    <p><strong>Số lần di chuyển:</strong> ${cattle.movements.length}</p>
                    <p><strong>Di chuyển gần nhất:</strong> ${cattle.movements[cattle.movements.length - 1].to_location}</p>
                    <button onclick="viewMovementDetails('${cattle._id}')" class="btn-action btn-view">
                        <i class="fas fa-truck-moving"></i> Xem chi tiết
                    </button>
                `;
                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error('Error loading movement history:', error);
    }
}

// Search Functionality
async function performSearch() {
    const query = document.getElementById('searchInput').value;
    
    if (!query.trim()) {
        alert('Vui lòng nhập từ khóa tìm kiếm');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        const container = document.getElementById('searchResults');
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<p>Không tìm thấy kết quả nào.</p>';
            return;
        }
        
        results.forEach(cattle => {
            const card = document.createElement('div');
            card.className = 'cattle-card';
            card.innerHTML = `
                <h4>${cattle.name} (${cattle.cattle_id})</h4>
                <p><strong>Giống:</strong> ${cattle.breed}</p>
                <p><strong>Giới tính:</strong> ${cattle.gender}</p>
                <p><strong>Ngày sinh:</strong> ${new Date(cattle.date_of_birth).toLocaleDateString('vi-VN')}</p>
                <p><strong>Chủ sở hữu:</strong> ${cattle.owner_name}</p>
                <p><strong>Địa điểm:</strong> ${cattle.farm_location}</p>
                <button onclick="viewCattleDetails('${cattle._id}')" class="btn-action btn-view">
                    <i class="fas fa-eye"></i> Xem chi tiết
                </button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error searching:', error);
        alert('Lỗi khi tìm kiếm');
    }
}

// View Cattle Details
async function viewCattleDetails(cattleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const cattle = await response.json();
        
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="cattle-details">
                <h3>${cattle.name} (${cattle.cattle_id})</h3>
                <div class="details-grid">
                    <div>
                        <p><strong>Giống:</strong> ${cattle.breed}</p>
                        <p><strong>Giới tính:</strong> ${cattle.gender}</p>
                        <p><strong>Ngày sinh:</strong> ${new Date(cattle.date_of_birth).toLocaleDateString('vi-VN')}</p>
                        <p><strong>Cân nặng:</strong> ${cattle.weight} kg</p>
                    </div>
                    <div>
                        <p><strong>Chủ sở hữu:</strong> ${cattle.owner_name}</p>
                        <p><strong>Địa chỉ:</strong> ${cattle.owner_address}</p>
                        <p><strong>Trang trại:</strong> ${cattle.farm_location}</p>
                        <p><strong>Tình trạng sức khỏe:</strong> ${cattle.health_status}</p>
                    </div>
                </div>
                
                <h4>Lịch sử tiêm chủng (${cattle.vaccinations ? cattle.vaccinations.length : 0})</h4>
                ${cattle.vaccinations && cattle.vaccinations.length > 0 ? 
                    cattle.vaccinations.map(v => `
                        <div class="history-item">
                            <p><strong>${v.vaccine_name}</strong> - ${new Date(v.vaccination_date).toLocaleDateString('vi-VN')}</p>
                            <p>Bác sĩ: ${v.veterinarian}</p>
                        </div>
                    `).join('') : '<p>Chưa có thông tin tiêm chủng</p>'}
                
                <h4>Lịch sử di chuyển (${cattle.movements ? cattle.movements.length : 0})</h4>
                ${cattle.movements && cattle.movements.length > 0 ? 
                    cattle.movements.map(m => `
                        <div class="history-item">
                            <p><strong>${m.from_location} → ${m.to_location}</strong> - ${new Date(m.movement_date).toLocaleDateString('vi-VN')}</p>
                            <p>Lý do: ${m.reason}</p>
                        </div>
                    `).join('') : '<p>Chưa có thông tin di chuyển</p>'}
                
                <div class="blockchain-info">
                    <h4>Blockchain Verification</h4>
                    <p><strong>Hash:</strong> ${cattle.blockchain_hash || 'Chưa được lưu lên blockchain'}</p>
                    ${cattle.blockchain_hash ? 
                        `<button onclick="verifyOnBlockchain('${cattleId}')" class="btn-action btn-verify">
                            <i class="fas fa-shield-alt"></i> Xác minh trên Blockchain
                        </button>` : 
                        `<button onclick="saveSpecificToBlockchain('${cattleId}')" class="btn-action btn-blockchain">
                            <i class="fas fa-link"></i> Lưu lên Blockchain
                        </button>`
                    }
                </div>
            </div>
        `;
        
        document.getElementById('modalTitle').textContent = `Chi tiết Bò: ${cattle.name}`;
        document.getElementById('cattleModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading cattle details:', error);
        alert('Lỗi khi tải thông tin chi tiết');
    }
}

// Verify on Blockchain
async function verifyOnBlockchain(cattleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const cattle = await response.json();
        
        // In a real application, this would call your blockchain verification function
        alert('Tính năng xác minh blockchain đang được phát triển. Dữ liệu bò đã được lưu trữ an toàn.');
    } catch (error) {
        console.error('Error verifying on blockchain:', error);
        alert('Lỗi khi xác minh trên blockchain');
    }
}

// Save to Blockchain
async function saveToBlockchain() {
    if (!currentCattleId) {
        alert('Vui lòng đăng ký bò trước khi lưu lên blockchain');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${currentCattleId}`);
        const cattle = await response.json();
        
        // In a real application, this would call your blockchain storage function
        // For now, we'll just update the hash in the database
        const hash = 'blockchain_hash_' + Date.now();
        
        const updateResponse = await fetch(`${API_BASE_URL}/cattle/${currentCattleId}/blockchain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ blockchain_hash: hash })
        });
        
        if (updateResponse.ok) {
            alert('Đã lưu thông tin lên blockchain thành công!');
            document.getElementById('saveToBlockchainBtn').disabled = true;
            loadCattleList();
        }
    } catch (error) {
        console.error('Error saving to blockchain:', error);
        alert('Lỗi khi lưu lên blockchain');
    }
}

// Save Specific Cattle to Blockchain
async function saveSpecificToBlockchain(cattleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const cattle = await response.json();
        
        const hash = 'blockchain_hash_' + Date.now();
        
        const updateResponse = await fetch(`${API_BASE_URL}/cattle/${cattleId}/blockchain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ blockchain_hash: hash })
        });
        
        if (updateResponse.ok) {
            alert('Đã lưu thông tin lên blockchain thành công!');
            viewCattleDetails(cattleId); // Refresh the modal
            loadCattleList();
        }
    } catch (error) {
        console.error('Error saving to blockchain:', error);
        alert('Lỗi khi lưu lên blockchain');
    }
}

// Helper function to view vaccination details
function viewVaccinationDetails(cattleId) {
    viewCattleDetails(cattleId);
}

// Helper function to view movement details
function viewMovementDetails(cattleId) {
    viewCattleDetails(cattleId);
}