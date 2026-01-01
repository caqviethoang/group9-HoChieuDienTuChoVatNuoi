// MetaMask Integration for Firefox
let isMetaMaskInstalled = false;
let web3 = null;
let currentAccount = null;

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Kiểm tra MetaMask
function checkMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        isMetaMaskInstalled = true;
        console.log('✓ MetaMask is installed');
        return true;
    } else {
        console.log('✗ MetaMask is not installed');
        
        // Hiển thị thông báo trên giao diện
        const walletSection = document.querySelector('.wallet-info');
        if (walletSection) {
            const warning = document.createElement('div');
            warning.className = 'metaMask-warning';
            warning.innerHTML = `
                <p><i class="fas fa-exclamation-triangle"></i> MetaMask chưa được cài đặt!</p>
                <a href="https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/" 
                   target="_blank" 
                   class="btn-install">
                    <i class="fas fa-download"></i> Cài đặt MetaMask cho Firefox
                </a>
            `;
            walletSection.appendChild(warning);
        }
        return false;
    }
}

// Kết nối MetaMask
async function connectMetaMask() {
    if (!checkMetaMask()) {
        alert('Vui lòng cài đặt MetaMask extension cho Firefox trước!');
        return;
    }
    
    try {
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        // Khởi tạo Web3
        web3 = new Web3(window.ethereum);
        currentAccount = accounts[0];
        
        // Update UI
        updateWalletUI(currentAccount);
        
        // Lắng nghe sự kiện thay đổi account
        setupEventListeners();
        
        console.log('✓ Connected to MetaMask:', currentAccount);
        
        // Kiểm tra network
        await checkNetwork();
        
        // Show success notification
        showNotification('Đã kết nối thành công với MetaMask!', 'success');
        
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        
        // Hiển thị thông báo lỗi chi tiết
        let errorMessage = 'Lỗi kết nối MetaMask: ';
        if (error.code === 4001) {
            errorMessage += 'Người dùng từ chối kết nối';
        } else if (error.code === -32002) {
            errorMessage += 'Đang chờ xử lý yêu cầu trước đó';
        } else {
            errorMessage += error.message;
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Cập nhật giao diện ví
function updateWalletUI(account) {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletAddress = document.getElementById('walletAddress');
    const blockchainStatus = document.getElementById('blockchainStatus');
    
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Đã kết nối';
        connectBtn.disabled = true;
        connectBtn.style.background = '#28a745';
    }
    
    if (walletAddress) {
        const shortAddress = account.substring(0, 6) + '...' + account.substring(account.length - 4);
        walletAddress.textContent = shortAddress;
        walletAddress.title = account; // Hiển thị đầy đủ khi hover
        walletAddress.style.cursor = 'pointer';
        
        // Add click to copy functionality
        walletAddress.onclick = () => {
            navigator.clipboard.writeText(account).then(() => {
                showNotification('Đã sao chép địa chỉ vào clipboard!', 'success');
            });
        };
    }
    
    if (blockchainStatus) {
        blockchainStatus.innerHTML = 
            '<span style="color: green;"><i class="fas fa-check-circle"></i> Đã kết nối</span>';
    }
}

// Thiết lập event listeners
function setupEventListeners() {
    if (window.ethereum) {
        // Account changed
        window.ethereum.on('accountsChanged', function (accounts) {
            console.log('Accounts changed:', accounts);
            if (accounts.length === 0) {
                // User disconnected wallet
                resetWalletConnection();
                showNotification('Ví MetaMask đã ngắt kết nối', 'warning');
            } else {
                currentAccount = accounts[0];
                updateWalletUI(currentAccount);
                showNotification('Đã chuyển sang tài khoản mới: ' + currentAccount.substring(0, 10) + '...', 'info');
            }
        });
        
        // Chain changed
        window.ethereum.on('chainChanged', function (chainId) {
            console.log('Chain changed:', chainId);
            const networkName = getNetworkName(parseInt(chainId, 16));
            showNotification(`Đã chuyển sang mạng: ${networkName}`, 'info');
            // Reload page when network changes
            setTimeout(() => window.location.reload(), 1000);
        });
        
        // Connect event
        window.ethereum.on('connect', function (connectInfo) {
            console.log('Connected to chain:', connectInfo.chainId);
        });
        
        // Disconnect event
        window.ethereum.on('disconnect', function (error) {
            console.log('Disconnected:', error);
            resetWalletConnection();
            showNotification('MetaMask đã ngắt kết nối', 'error');
        });
    }
}

// Kiểm tra network
async function checkNetwork() {
    if (!web3) return;
    
    try {
        const chainId = await web3.eth.getChainId();
        const networkName = getNetworkName(chainId);
        
        console.log(`Connected to network: ${networkName} (${chainId})`);
        
        // Kiểm tra nếu không phải Mainnet
        if (chainId !== 1) {
            showNetworkWarning(networkName);
        }
        
    } catch (error) {
        console.error('Error checking network:', error);
    }
}

// Lấy tên network từ chainId
function getNetworkName(chainId) {
    const networks = {
        1: 'Ethereum Mainnet',
        3: 'Ropsten Testnet',
        4: 'Rinkeby Testnet',
        5: 'Goerli Testnet',
        42: 'Kovan Testnet',
        11155111: 'Sepolia Testnet',
        1337: 'Localhost',
        5777: 'Ganache'
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
}

// Hiển thị cảnh báo network
function showNetworkWarning(networkName) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'network-warning';
    warningDiv.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p><i class="fas fa-info-circle"></i> 
            Đang kết nối đến: <strong>${networkName}</strong></p>
            <p><small>Đây là mạng test, không sử dụng tiền thật!</small></p>
        </div>
    `;
    
    const walletInfo = document.querySelector('.wallet-info');
    if (walletInfo) {
        walletInfo.appendChild(warningDiv);
    }
}

// Reset kết nối
function resetWalletConnection() {
    web3 = null;
    currentAccount = null;
    
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletAddress = document.getElementById('walletAddress');
    const blockchainStatus = document.getElementById('blockchainStatus');
    
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Kết nối MetaMask';
        connectBtn.disabled = false;
        connectBtn.style.background = '#f0b90b';
    }
    
    if (walletAddress) {
        walletAddress.textContent = '';
        walletAddress.title = '';
        walletAddress.style.cursor = 'default';
        walletAddress.onclick = null;
    }
    
    if (blockchainStatus) {
        blockchainStatus.innerHTML = 
            '<span style="color: red;"><i class="fas fa-times-circle"></i> Chưa kết nối</span>';
    }
    
    // Xóa cảnh báo network
    const networkWarning = document.querySelector('.network-warning');
    if (networkWarning) {
        networkWarning.remove();
    }
    
    console.log('Wallet connection reset');
}

// Lấy test ETH cho mạng test (chỉ hoạt động trên testnet)
async function getTestEth() {
    if (!currentAccount) {
        showNotification('Vui lòng kết nối MetaMask trước', 'warning');
        return;
    }
    
    try {
        const chainId = await web3.eth.getChainId();
        const networkName = getNetworkName(chainId);
        
        showNotification(`Tính năng nhận test ETH đang được phát triển. Bạn đang kết nối đến: ${networkName}`, 'info');
        
    } catch (error) {
        console.error('Error getting test ETH:', error);
        showNotification('Lỗi khi kiểm tra mạng: ' + error.message, 'error');
    }
}

// Lưu dữ liệu bò lên blockchain thông qua backend
async function saveCattleToBlockchain(cattleId) {
    if (!currentAccount) {
        showNotification('Vui lòng kết nối MetaMask trước!', 'warning');
        return null;
    }
    
    try {
        showNotification('Đang lưu dữ liệu lên blockchain...', 'info');
        
        // Lấy thông tin bò từ backend
        const cattleResponse = await fetch(`${API_BASE_URL}/cattle/${cattleId}`);
        const cattleData = await cattleResponse.json();
        
        if (!cattleData.success) {
            throw new Error('Không tìm thấy thông tin bò');
        }
        
        // Tạo message để ký
        const timestamp = new Date().toISOString();
        const message = `Cattle Passport: ${cattleId}\nTimestamp: ${timestamp}\nData Hash: ${cattleData.data.blockchain_hash || 'N/A'}`;
        
        // Yêu cầu chữ ký từ MetaMask
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, currentAccount],
        });
        
        // Gửi chữ ký lên backend
        const response = await fetch(`${API_BASE_URL}/blockchain/sign`, {
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
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✓ Đã lưu và ký dữ liệu lên blockchain thành công!', 'success');
            return result;
        } else {
            throw new Error(result.error || 'Lỗi khi lưu lên blockchain');
        }
        
    } catch (error) {
        console.error('Error saving to blockchain:', error);
        
        let errorMessage = 'Lỗi khi lưu lên blockchain: ';
        if (error.code === 4001) {
            errorMessage += 'Người dùng từ chối ký';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage += 'Không đủ ETH để trả gas fee';
        } else {
            errorMessage += error.message;
        }
        
        showNotification(errorMessage, 'error');
        return null;
    }
}

// Xác minh dữ liệu trên blockchain
async function verifyCattleOnBlockchain(cattleId) {
    if (!currentAccount) {
        showNotification('Vui lòng kết nối MetaMask trước!', 'warning');
        return false;
    }
    
    try {
        showNotification('Đang xác minh trên blockchain...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/blockchain/verify/${cattleId}`);
        const result = await response.json();
        
        if (result.success) {
            if (result.verified) {
                showNotification('✓ Dữ liệu đã được xác minh trên blockchain!', 'success');
                return true;
            } else {
                showNotification('⚠ Dữ liệu chưa được xác minh trên blockchain', 'warning');
                return false;
            }
        } else {
            throw new Error(result.error || 'Lỗi xác minh');
        }
        
    } catch (error) {
        console.error('Error verifying on blockchain:', error);
        showNotification('Lỗi khi xác minh trên blockchain: ' + error.message, 'error');
        return false;
    }
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing blockchain module...');
    
    // Kiểm tra MetaMask
    checkMetaMask();
    
    // Thử kết nối tự động nếu đã từng kết nối
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    console.log('Auto-connecting to MetaMask...');
                    connectMetaMask();
                }
            })
            .catch(error => {
                console.error('Auto-connect error:', error);
            });
    }
    
    // Thêm nút lấy test ETH
    addTestEthButton();
});

// Thêm nút lấy test ETH
function addTestEthButton() {
    const walletInfo = document.querySelector('.wallet-info');
    if (!walletInfo) return;
    
    // Check if button already exists
    if (document.getElementById('testEthBtn')) return;
    
    const testEthBtn = document.createElement('button');
    testEthBtn.id = 'testEthBtn';
    testEthBtn.className = 'btn-test-eth';
    testEthBtn.innerHTML = '<i class="fas fa-coins"></i> Lấy Test ETH';
    testEthBtn.onclick = getTestEth;
    testEthBtn.style.marginLeft = '10px';
    
    walletInfo.appendChild(testEthBtn);
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Check if notification function exists in app.js
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback notification
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
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add animation keyframes
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
`;
document.head.appendChild(style);

// Make functions globally available
window.connectMetaMask = connectMetaMask;
window.getTestEth = getTestEth;
window.saveCattleToBlockchain = saveCattleToBlockchain;
window.verifyCattleOnBlockchain = verifyCattleOnBlockchain;