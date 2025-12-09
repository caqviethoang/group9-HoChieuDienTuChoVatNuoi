// MetaMask Integration for Firefox
let isMetaMaskInstalled = false;
let web3 = null;
let currentAccount = null;

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
        
        alert(errorMessage);
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
            } else {
                currentAccount = accounts[0];
                updateWalletUI(currentAccount);
            }
        });
        
        // Chain changed
        window.ethereum.on('chainChanged', function (chainId) {
            console.log('Chain changed:', chainId);
            // Reload page when network changes
            window.location.reload();
        });
        
        // Connect event
        window.ethereum.on('connect', function (connectInfo) {
            console.log('Connected to chain:', connectInfo.chainId);
        });
        
        // Disconnect event
        window.ethereum.on('disconnect', function (error) {
            console.log('Disconnected:', error);
            resetWalletConnection();
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
        alert('Vui lòng kết nối MetaMask trước');
        return;
    }
    
    try {
        // Chỉ hoạt động trên Goerli testnet
        const chainId = await web3.eth.getChainId();
        if (chainId !== 5) { // 5 = Goerli
            alert('Chức năng này chỉ hoạt động trên Goerli Testnet. Vui lòng chuyển sang Goerli trong MetaMask.');
            return;
        }
        
        alert('Tính năng nhận test ETH đang được phát triển.\nBạn có thể nhận test ETH miễn phí từ:\n1. https://goerli-faucet.pk910.de/\n2. https://faucet.quicknode.com/ethereum/goerli');
        
    } catch (error) {
        console.error('Error getting test ETH:', error);
    }
}

// Lưu dữ liệu lên blockchain
async function saveToBlockchain(cattleId, cattleData) {
    if (!web3 || !currentAccount) {
        alert('Vui lòng kết nối MetaMask trước!');
        return null;
    }
    
    try {
        // Địa chỉ smart contract (testnet address)
        const contractAddress = '0x44Ed14113601543DE2d6695FDF77859ff5D70219';
        
        // ABI đơn giản cho testing
        const contractABI = [
            {
                "inputs": [
                    {"internalType": "string", "name": "cattleId", "type": "string"},
                    {"internalType": "string", "name": "dataHash", "type": "string"}
                ],
                "name": "storeCattleData",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "cattleId", "type": "string"}],
                "name": "getCattleData",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Tạo hash từ dữ liệu
        const dataString = JSON.stringify(cattleData);
        const dataHash = web3.utils.sha3(dataString);
        
        // Kiểm tra gas
        const gasPrice = await web3.eth.getGasPrice();
        const gasEstimate = await contract.methods.storeCattleData(cattleId, dataHash)
            .estimateGas({ from: currentAccount });
        
        console.log(`Gas estimate: ${gasEstimate}, Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
        
        // Gửi transaction (yêu cầu user ký)
        const tx = contract.methods.storeCattleData(cattleId, dataHash);
        const txData = {
            from: currentAccount,
            gas: Math.round(gasEstimate * 1.2), // Thêm 20% buffer
            gasPrice: gasPrice
        };
        
        // Send transaction
        const receipt = await tx.send(txData);
        
        console.log('Transaction successful:', receipt);
        
        // Cập nhật hash lên backend
        await updateBlockchainHash(cattleId, dataHash);
        
        return receipt.transactionHash;
        
    } catch (error) {
        console.error('Error saving to blockchain:', error);
        
        let errorMessage = 'Lỗi khi lưu lên blockchain: ';
        if (error.code === 4001) {
            errorMessage += 'Người dùng từ chối transaction';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage += 'Không đủ ETH để trả gas fee';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        return null;
    }
}

// Cập nhật hash lên backend
async function updateBlockchainHash(cattleId, hash) {
    try {
        const response = await fetch(`${API_BASE_URL}/cattle/${cattleId}/blockchain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ blockchain_hash: hash })
        });
        
        if (response.ok) {
            console.log('Blockchain hash updated in database');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating blockchain hash:', error);
        return false;
    }
}

// Kiểm tra dữ liệu trên blockchain
async function verifyOnBlockchain(cattleId, cattleData) {
    if (!web3) {
        alert('Vui lòng kết nối MetaMask trước!');
        return false;
    }
    
    try {
        const contractAddress = '0x44Ed14113601543DE2d6695FDF77859ff5D70219';
        const contractABI = [
            {
                "inputs": [{"internalType": "string", "name": "cattleId", "type": "string"}],
                "name": "getCattleData",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Lấy hash từ blockchain
        const storedHash = await contract.methods.getCattleData(cattleId).call();
        
        // Tạo hash từ dữ liệu hiện tại
        const dataString = JSON.stringify(cattleData);
        const currentHash = web3.utils.sha3(dataString);
        
        const isVerified = storedHash === currentHash;
        
        if (isVerified) {
            alert('✓ Dữ liệu được xác minh trên blockchain!');
        } else {
            alert('✗ Dữ liệu không khớp với blockchain');
        }
        
        return isVerified;
        
    } catch (error) {
        console.error('Error verifying on blockchain:', error);
        alert('Lỗi khi xác minh trên blockchain: ' + error.message);
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
    
    const testEthBtn = document.createElement('button');
    testEthBtn.id = 'testEthBtn';
    testEthBtn.className = 'btn-test-eth';
    testEthBtn.innerHTML = '<i class="fas fa-coins"></i> Lấy Test ETH';
    testEthBtn.onclick = getTestEth;
    
    walletInfo.appendChild(testEthBtn);
}