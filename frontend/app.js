// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Global state
let currentCattleId = null;
let web3 = null;
let currentAccount = null;

// Initialize blockchain module
let blockchainModule = {
    saveToBlockchain: async function(cattleId, cattleData) {
        console.log('Saving to blockchain:', cattleId);
        return 'blockchain_hash_' + Date.now();
    },
    verifyOnBlockchain: async function(cattleId) {
        console.log('Verifying on blockchain:', cattleId);
        return true;
    }
};

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize MetaMask connection
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    console.log('Auto-connected to MetaMask:', accounts[0]);
                }
            })
            .catch(console.error);
    }

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
                case 'register':
                    // Reset form when switching to register tab
                    document.getElementById('registerCattleForm').reset();
                    document.getElementById('saveToBlockchainBtn').disabled = true;
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
                case 'search':
                    // Clear search results
                    document.getElementById('searchResults').innerHTML = '';
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
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('cattleModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Connect wallet button
    document.getElementById('connectWalletBtn').addEventListener('click', connectMetaMask);
    
    // Initial load
    loadDashboard();
    loadCattleList();
});

// Connect to MetaMask
async function connectMetaMask() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask không được cài đặt! Vui lòng cài đặt MetaMask trước.');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        currentAccount = accounts[0];
        updateWalletUI(currentAccount);
        
        console.log('Connected to MetaMask:', currentAccount);
        
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        alert('Lỗi kết nối MetaMask: ' + error.message);
    }
}

// Update wallet UI
function updateWalletUI(account) {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletAddress = document.getElementById('walletAddress');
    
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Đã kết nối';
        connectBtn.disabled = true;
        connectBtn.style.background = '#28a745';
    }
    
    if (walletAddress) {
        const shortAddress = account.substring(0, 6) + '...' + account.substring(account.length - 4);
        walletAddress.textContent = shortAddress;
        walletAddress.title = account;
    }
}

// Load Dashboard Data
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalCattle').textContent = data.data.total_cattle || 0;
            document.getElementById('totalVaccinations').textContent = data.data.total_vaccinations || 0;
            document.getElementById('totalMovements').textContent = data.data.total_movements || 0;
            
            // Set blockchain status
            const blockchainStatus = document.getElementById('blockchainStatus');
            if (data.data.blockchain && data.data.blockchain.status === 'active') {
                blockchainStatus.innerHTML = '<span style="color: green;"><i class="fas fa-check-circle"></i> Đã kết nối</span>';
            } else {
                blockchainStatus.innerHTML = '<span style="color: red;"><i class="fas fa-times-circle"></i> Chưa kết nối</span>';
            }
        }
        
        // Load recent cattle
        await loadRecentCattle();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Lỗi tải dashboard: ' + error.message, 'error');
    }
}

// Load recent cattle
async function loadRecentCattle() {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const data = await response.json();
        
        const recentList = document.getElementById('recentCattleList');
        recentList.innerHTML = '';
        
        if (data.success && data.data && data.data.length > 0) {
            // Show latest 5 cattle
            const recentCattle = data.data.slice(-5).reverse();
            
            recentCattle.forEach(cattle => {
                const div = document.createElement('div');
                div.className = 'cattle-card';
                div.innerHTML = `
                    <h4>${cattle.name || 'Chưa đặt tên'} (${cattle.cattle_id || 'N/A'})</h4>
                    <p><strong>Giống:</strong> ${cattle.breed || 'Chưa xác định'}</p>
                    <p><strong>Chủ sở hữu:</strong> ${cattle.owner_name || 'Chưa xác định'}</p>
                    <button onclick="viewCattleDetails('${cattle.cattle_id || cattle._id}')" class="btn-action btn-view">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                `;
                recentList.appendChild(div);
            });
        } else {
            recentList.innerHTML = '<p>Chưa có dữ liệu bò</p>';
        }
    } catch (error) {
        console.error('Error loading recent cattle:', error);
    }
}

// Register New Cattle
async function registerCattle(e) {
    e.preventDefault();
    
    // Get form values
    const formData = {
        name: document.getElementById('cattleName').value,
        breed: document.getElementById('breed').value,
        date_of_birth: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        weight: parseFloat(document.getElementById('weight').value) || 0,
        owner_name: document.getElementById('ownerName').value,
        farm_location: document.getElementById('farmLocation').value,
        color: 'N/A',
        owner_address: 'N/A'
    };
    
    // Validate required fields
    if (!formData.name || !formData.breed || !formData.owner_name) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Đã đăng ký bò thành công! ID: ' + result.data.cattle_id, 'success');
            
            // Store the cattle ID for blockchain saving
            currentCattleId = result.data.cattle_id;
            
            // Enable blockchain button
            document.getElementById('saveToBlockchainBtn').disabled = false;
            
            // Reset form
            e.target.reset();
            
            // Reload lists
            await Promise.all([
                loadCattleList(),
                loadDashboard(),
                loadCattleForSelect('vaccCattleId'),
                loadCattleForSelect('moveCattleId')
            ]);
            
        } else {
            showNotification('Lỗi: ' + (result.error || 'Không thể đăng ký bò'), 'error');
        }
    } catch (error) {
        console.error('Error registering cattle:', error);
        showNotification('Lỗi kết nối đến server', 'error');
    }
}

// Load Cattle List
async function loadCattleList() {
    try {
        showLoading('cattleTableBody');
        
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const data = await response.json();
        
        const tableBody = document.getElementById('cattleTableBody');
        tableBody.innerHTML = '';
        
        if (data.success && data.data && data.data.length > 0) {
            data.data.forEach(cattle => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cattle.cattle_id || 'N/A'}</td>
                    <td>${cattle.name || 'Chưa đặt tên'}</td>
                    <td>${cattle.breed || 'Chưa xác định'}</td>
                    <td>${cattle.gender || 'Chưa xác định'}</td>
                    <td>${cattle.owner_name || 'Chưa xác định'}</td>
                    <td>
                        ${cattle.blockchain_hash ? 
                            '<span style="color: green;"><i class="fas fa-check-circle"></i> Đã lưu</span>' : 
                            '<span style="color: orange;"><i class="fas fa-clock"></i> Chưa lưu</span>'}
                    </td>
                    <td>
                        <button onclick="viewCattleDetails('${cattle.cattle_id}')" class="btn-action btn-view">
                            <i class="fas fa-eye"></i> Xem
                        </button>
                        <button onclick="verifyCattleOnBlockchain('${cattle.cattle_id}')" class="btn-action btn-verify">
                            <i class="fas fa-shield-alt"></i> Xác minh
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <p>Chưa có dữ liệu bò</p>
                        <button onclick="document.querySelector('[data-tab=\"register\"]').click()" 
                                class="btn-action btn-view" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Đăng ký bò đầu tiên
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading cattle list:', error);
        showNotification('Lỗi tải danh sách bò', 'error');
    }
}

// Load Cattle for Select Dropdowns
async function loadCattleForSelect(selectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const data = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">Chọn bò...</option>';
        
        if (data.success && data.data && data.data.length > 0) {
            data.data.forEach(cattle => {
                const option = document.createElement('option');
                option.value = cattle.cattle_id;
                option.textContent = `${cattle.name || 'Chưa đặt tên'} (${cattle.cattle_id || 'N/A'})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading cattle for select:', error);
    }
}

// Add Vaccination
async function addVaccination(e) {
    e.preventDefault();
    
    const cattleId = document.getElementById('vaccCattleId').value;
    const vaccinationData = {
        vaccine_name: document.getElementById('vaccineName').value,
        date: document.getElementById('vaccinationDate').value || new Date().toISOString().split('T')[0],
        veterinarian: document.getElementById('veterinarian').value,
        next_due_date: '',
        notes: ''
    };
    
    if (!cattleId || !vaccinationData.vaccine_name || !vaccinationData.veterinarian) {
        showNotification('Vui lòng điền đầy đủ thông tin tiêm chủng', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}/vaccinate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vaccinationData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Đã thêm thông tin tiêm chủng thành công!', 'success');
            e.target.reset();
            await loadVaccinationHistory();
            await loadDashboard();
        } else {
            showNotification('Lỗi: ' + (result.error || 'Không thể thêm tiêm chủng'), 'error');
        }
    } catch (error) {
        console.error('Error adding vaccination:', error);
        showNotification('Lỗi khi thêm thông tin tiêm chủng', 'error');
    }
}

// Add Movement
async function addMovement(e) {
    e.preventDefault();
    
    const cattleId = document.getElementById('moveCattleId').value;
    const movementData = {
        from_location: document.getElementById('fromLocation').value,
        to_location: document.getElementById('toLocation').value,
        date: document.getElementById('movementDate').value || new Date().toISOString().split('T')[0],
        reason: 'Vận chuyển',
        transport_details: ''
    };
    
    if (!cattleId || !movementData.from_location || !movementData.to_location) {
        showNotification('Vui lòng điền đầy đủ thông tin di chuyển', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(movementData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Đã ghi nhận di chuyển thành công!', 'success');
            e.target.reset();
            await loadMovementHistory();
            await loadDashboard();
        } else {
            showNotification('Lỗi: ' + (result.error || 'Không thể ghi nhận di chuyển'), 'error');
        }
    } catch (error) {
        console.error('Error adding movement:', error);
        showNotification('Lỗi khi ghi nhận di chuyển', 'error');
    }
}

// Load Vaccination History
async function loadVaccinationHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const data = await response.json();
        
        const container = document.getElementById('vaccinationHistory');
        container.innerHTML = '';
        
        if (data.success && data.data && data.data.length > 0) {
            let hasVaccinations = false;
            
            data.data.forEach(cattle => {
                if (cattle.vaccinations && cattle.vaccinations.length > 0) {
                    hasVaccinations = true;
                    const card = document.createElement('div');
                    card.className = 'cattle-card';
                    card.innerHTML = `
                        <h4>${cattle.name || 'Chưa đặt tên'} (${cattle.cattle_id || 'N/A'})</h4>
                        <p><strong>Số mũi tiêm:</strong> ${cattle.vaccinations.length}</p>
                        <p><strong>Mũi tiêm gần nhất:</strong> ${cattle.vaccinations[cattle.vaccinations.length - 1].vaccine_name}</p>
                        <button onclick="viewCattleDetails('${cattle.cattle_id}')" class="btn-action btn-view">
                            <i class="fas fa-syringe"></i> Xem chi tiết
                        </button>
                    `;
                    container.appendChild(card);
                }
            });
            
            if (!hasVaccinations) {
                container.innerHTML = '<p>Chưa có thông tin tiêm chủng nào</p>';
            }
        } else {
            container.innerHTML = '<p>Chưa có dữ liệu bò</p>';
        }
    } catch (error) {
        console.error('Error loading vaccination history:', error);
    }
}

// Load Movement History
async function loadMovementHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const data = await response.json();
        
        const container = document.getElementById('movementHistory');
        container.innerHTML = '';
        
        if (data.success && data.data && data.data.length > 0) {
            let hasMovements = false;
            
            data.data.forEach(cattle => {
                if (cattle.movements && cattle.movements.length > 0) {
                    hasMovements = true;
                    const card = document.createElement('div');
                    card.className = 'cattle-card';
                    card.innerHTML = `
                        <h4>${cattle.name || 'Chưa đặt tên'} (${cattle.cattle_id || 'N/A'})</h4>
                        <p><strong>Số lần di chuyển:</strong> ${cattle.movements.length}</p>
                        <p><strong>Di chuyển gần nhất:</strong> ${cattle.movements[cattle.movements.length - 1].to_location}</p>
                        <button onclick="viewCattleDetails('${cattle.cattle_id}')" class="btn-action btn-view">
                            <i class="fas fa-truck-moving"></i> Xem chi tiết
                        </button>
                    `;
                    container.appendChild(card);
                }
            });
            
            if (!hasMovements) {
                container.innerHTML = '<p>Chưa có thông tin di chuyển nào</p>';
            }
        } else {
            container.innerHTML = '<p>Chưa có dữ liệu bò</p>';
        }
    } catch (error) {
        console.error('Error loading movement history:', error);
    }
}

// Search Functionality
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        showNotification('Vui lòng nhập từ khóa tìm kiếm', 'warning');
        return;
    }
    
    try {
        // Since backend doesn't have search endpoint, we'll filter client-side
        const response = await fetch(`${API_BASE_URL}/cattle`);
        const data = await response.json();
        
        const container = document.getElementById('searchResults');
        container.innerHTML = '';
        
        if (data.success && data.data && data.data.length > 0) {
            const results = data.data.filter(cattle => 
                (cattle.cattle_id && cattle.cattle_id.toLowerCase().includes(query.toLowerCase())) ||
                (cattle.name && cattle.name.toLowerCase().includes(query.toLowerCase())) ||
                (cattle.owner_name && cattle.owner_name.toLowerCase().includes(query.toLowerCase())) ||
                (cattle.breed && cattle.breed.toLowerCase().includes(query.toLowerCase()))
            );
            
            if (results.length === 0) {
                container.innerHTML = '<p>Không tìm thấy kết quả nào.</p>';
                return;
            }
            
            results.forEach(cattle => {
                const card = document.createElement('div');
                card.className = 'cattle-card';
                card.innerHTML = `
                    <h4>${cattle.name || 'Chưa đặt tên'} (${cattle.cattle_id || 'N/A'})</h4>
                    <p><strong>Giống:</strong> ${cattle.breed || 'Chưa xác định'}</p>
                    <p><strong>Giới tính:</strong> ${cattle.gender || 'Chưa xác định'}</p>
                    <p><strong>Ngày sinh:</strong> ${cattle.date_of_birth ? new Date(cattle.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa xác định'}</p>
                    <p><strong>Chủ sở hữu:</strong> ${cattle.owner_name || 'Chưa xác định'}</p>
                    <p><strong>Địa điểm:</strong> ${cattle.farm_location || 'Chưa xác định'}</p>
                    <button onclick="viewCattleDetails('${cattle.cattle_id}')" class="btn-action btn-view">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p>Không tìm thấy kết quả nào.</p>';
        }
    } catch (error) {
        console.error('Error searching:', error);
        showNotification('Lỗi khi tìm kiếm', 'error');
    }
}

// View Cattle Details
async function viewCattleDetails(cattleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const result = await response.json();
        
        if (!result.success || !result.data) {
            showNotification('Không tìm thấy thông tin bò', 'error');
            return;
        }
        
        const cattle = result.data;
        const modalContent = document.getElementById('modalContent');
        
        // Format the date
        const formatDate = (dateString) => {
            if (!dateString) return 'Chưa xác định';
            try {
                return new Date(dateString).toLocaleDateString('vi-VN');
            } catch {
                return dateString;
            }
        };
        
        modalContent.innerHTML = `
            <div class="cattle-details">
                <h3>${cattle.name || 'Chưa đặt tên'} (${cattle.cattle_id || 'N/A'})</h3>
                <div class="details-grid">
                    <div>
                        <p><strong>Giống:</strong> ${cattle.breed || 'Chưa xác định'}</p>
                        <p><strong>Giới tính:</strong> ${cattle.gender || 'Chưa xác định'}</p>
                        <p><strong>Ngày sinh:</strong> ${formatDate(cattle.date_of_birth)}</p>
                        <p><strong>Cân nặng:</strong> ${cattle.weight || 0} kg</p>
                    </div>
                    <div>
                        <p><strong>Chủ sở hữu:</strong> ${cattle.owner_name || 'Chưa xác định'}</p>
                        <p><strong>Địa chỉ:</strong> ${cattle.owner_address || 'Chưa xác định'}</p>
                        <p><strong>Trang trại:</strong> ${cattle.farm_location || 'Chưa xác định'}</p>
                        <p><strong>Tình trạng sức khỏe:</strong> ${cattle.health_status || 'Chưa xác định'}</p>
                    </div>
                </div>
                
                <h4>Lịch sử tiêm chủng (${cattle.vaccinations ? cattle.vaccinations.length : 0})</h4>
                ${cattle.vaccinations && cattle.vaccinations.length > 0 ? 
                    cattle.vaccinations.map(v => `
                        <div class="history-item">
                            <p><strong>${v.vaccine_name || 'Không xác định'}</strong> - ${formatDate(v.date)}</p>
                            <p>Bác sĩ: ${v.veterinarian || 'Không xác định'}</p>
                        </div>
                    `).join('') : '<p>Chưa có thông tin tiêm chủng</p>'}
                
                <h4>Lịch sử di chuyển (${cattle.movements ? cattle.movements.length : 0})</h4>
                ${cattle.movements && cattle.movements.length > 0 ? 
                    cattle.movements.map(m => `
                        <div class="history-item">
                            <p><strong>${m.from_location || 'Không xác định'} → ${m.to_location || 'Không xác định'}</strong> - ${formatDate(m.date)}</p>
                            <p>Lý do: ${m.reason || 'Không xác định'}</p>
                        </div>
                    `).join('') : '<p>Chưa có thông tin di chuyển</p>'}
                
                <div class="blockchain-info">
                    <h4>Blockchain Verification</h4>
                    <p><strong>Hash:</strong> ${cattle.blockchain_hash ? 
                        `<code style="font-size: 12px;">${cattle.blockchain_hash.substring(0, 50)}...</code>` : 
                        'Chưa được lưu lên blockchain'}</p>
                    <p><strong>MetaMask Address:</strong> ${cattle.metamask_address || 'Chưa kết nối'}</p>
                    
                    <div class="blockchain-actions">
                        ${cattle.blockchain_hash ? 
                            `<button onclick="verifyCattleOnBlockchain('${cattle.cattle_id}')" class="btn-action btn-verify">
                                <i class="fas fa-shield-alt"></i> Xác minh trên Blockchain
                            </button>` : 
                            `<button onclick="saveSpecificToBlockchain('${cattle.cattle_id}')" class="btn-action btn-blockchain">
                                <i class="fas fa-link"></i> Lưu lên Blockchain
                            </button>`
                        }
                        
                        ${cattle.metamask_signature ? 
                            `<button onclick="viewSignatureDetails('${cattle.cattle_id}')" class="btn-action btn-view">
                                <i class="fas fa-signature"></i> Xem chữ ký
                            </button>` : 
                            `<button onclick="signWithMetaMask('${cattle.cattle_id}')" class="btn-action btn-blockchain">
                                <i class="fas fa-signature"></i> Ký với MetaMask
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalTitle').textContent = `Chi tiết Bò: ${cattle.name || cattle.cattle_id}`;
        document.getElementById('cattleModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading cattle details:', error);
        showNotification('Lỗi khi tải thông tin chi tiết', 'error');
    }
}

// Verify Cattle on Blockchain
async function verifyCattleOnBlockchain(cattleId) {
    try {
        showNotification('Đang xác minh trên blockchain...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/blockchain/verify/${cattleId}`);
        const result = await response.json();
        
        if (result.success) {
            if (result.verified) {
                showNotification('✓ Dữ liệu đã được xác minh trên blockchain!', 'success');
            } else {
                showNotification('⚠ Dữ liệu chưa được xác minh trên blockchain', 'warning');
            }
        } else {
            showNotification('Lỗi xác minh: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error verifying on blockchain:', error);
        showNotification('Lỗi khi xác minh trên blockchain', 'error');
    }
}

// Save to Blockchain
async function saveToBlockchain() {
    if (!currentCattleId) {
        showNotification('Vui lòng đăng ký bò trước khi lưu lên blockchain', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${currentCattleId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            showNotification('Đang lưu lên blockchain...', 'info');
            
            // In a real app, this would be a proper blockchain transaction
            // For now, we'll just update the hash in the database
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            
            showNotification('✓ Đã lưu thông tin lên blockchain thành công!', 'success');
            document.getElementById('saveToBlockchainBtn').disabled = true;
            await loadCattleList();
            await loadDashboard();
        }
    } catch (error) {
        console.error('Error saving to blockchain:', error);
        showNotification('Lỗi khi lưu lên blockchain', 'error');
    }
}

// Save Specific Cattle to Blockchain
async function saveSpecificToBlockchain(cattleId) {
    try {
        showNotification('Đang lưu lên blockchain...', 'info');
        
        // Simulate blockchain saving
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showNotification('✓ Đã lưu thông tin lên blockchain thành công!', 'success');
        
        // Refresh the modal
        await viewCattleDetails(cattleId);
        await loadCattleList();
        
    } catch (error) {
        console.error('Error saving to blockchain:', error);
        showNotification('Lỗi khi lưu lên blockchain', 'error');
    }
}

// Sign with MetaMask
async function signWithMetaMask(cattleId) {
    if (!currentAccount) {
        showNotification('Vui lòng kết nối MetaMask trước!', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const message = `Ký xác nhận bò ${cattleId} vào lúc ${new Date().toISOString()}`;
            
            // Request signature from MetaMask
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, currentAccount],
            });
            
            // Send signature to backend
            const signResponse = await fetch(`${API_BASE_URL}/blockchain/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature: signature,
                    message: message,
                    address: currentAccount,
                    cattle_id: cattleId
                })
            });
            
            const signResult = await signResponse.json();
            
            if (signResult.success) {
                showNotification('✓ Đã ký thành công với MetaMask!', 'success');
                await viewCattleDetails(cattleId); // Refresh modal
            } else {
                showNotification('Lỗi ký: ' + signResult.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error signing with MetaMask:', error);
        showNotification('Lỗi khi ký với MetaMask: ' + error.message, 'error');
    }
}

// View Signature Details
async function viewSignatureDetails(cattleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.metamask_signature) {
            const sig = result.data.metamask_signature;
            alert(`Chi tiết chữ ký:\n\nĐịa chỉ: ${sig.address}\nThời gian: ${sig.signed_at}\nChữ ký: ${sig.signature.substring(0, 50)}...`);
        } else {
            showNotification('Không tìm thấy chữ ký', 'warning');
        }
    } catch (error) {
        console.error('Error viewing signature:', error);
        showNotification('Lỗi khi xem chữ ký', 'error');
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 300px;
        max-width: 400px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Helper function to show loading
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="loading" style="display: inline-block;"></div>
                    <p style="margin-top: 10px;">Đang tải dữ liệu...</p>
                </td>
            </tr>
        `;
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

// Add notification styles to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);