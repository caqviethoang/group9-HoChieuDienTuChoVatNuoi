// MetaMask Integration
async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            
            // Initialize Web3
            web3 = new Web3(window.ethereum);
            currentAccount = accounts[0];
            
            // Update UI
            document.getElementById('connectWalletBtn').textContent = 'Đã kết nối MetaMask';
            document.getElementById('connectWalletBtn').disabled = true;
            
            const shortAddress = currentAccount.substring(0, 6) + '...' + currentAccount.substring(currentAccount.length - 4);
            document.getElementById('walletAddress').textContent = shortAddress;
            
            // Update blockchain status
            document.getElementById('blockchainStatus').innerHTML = 
                '<span style="color: green;"><i class="fas fa-check-circle"></i> Đã kết nối</span>';
            
            // Listen for account changes
            ethereum.on('accountsChanged', function (accounts) {
                if (accounts.length === 0) {
                    // User disconnected wallet
                    resetWalletConnection();
                } else {
                    currentAccount = accounts[0];
                    const shortAddr = currentAccount.substring(0, 6) + '...' + currentAccount.substring(currentAccount.length - 4);
                    document.getElementById('walletAddress').textContent = shortAddr;
                }
            });
            
            console.log('Connected to MetaMask with account:', currentAccount);
            
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            alert('Lỗi khi kết nối MetaMask: ' + error.message);
        }
    } else {
        alert('Vui lòng cài đặt MetaMask để sử dụng tính năng blockchain!');
        window.open('https://metamask.io/download.html', '_blank');
    }
}

// Reset wallet connection
function resetWalletConnection() {
    web3 = null;
    currentAccount = null;
    
    document.getElementById('connectWalletBtn').textContent = 'Kết nối MetaMask';
    document.getElementById('connectWalletBtn').disabled = false;
    document.getElementById('walletAddress').textContent = '';
    document.getElementById('blockchainStatus').innerHTML = 
        '<span style="color: red;"><i class="fas fa-times-circle"></i> Chưa kết nối</span>';
}

// Smart Contract Interaction
async function interactWithSmartContract(cattleId, cattleData) {
    if (!web3 || !currentAccount) {
        alert('Vui lòng kết nối MetaMask trước!');
        return null;
    }
    
    try {
        // Smart contract ABI and address
        const contractAddress = '0x44Ed14113601543DE2d6695FDF77859ff5D70219';
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
            }
        ];
        
        // Create contract instance
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Generate data hash
        const dataString = JSON.stringify(cattleData, Object.keys(cattleData).sort());
        const dataHash = web3.utils.sha3(dataString);
        
        // Get transaction count for nonce
        const nonce = await web3.eth.getTransactionCount(currentAccount, 'latest');
        
        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        
        // Prepare transaction
        const tx = {
            from: currentAccount,
            to: contractAddress,
            nonce: nonce,
            gasPrice: gasPrice,
            gas: 2000000, // Adjust based on contract requirements
            data: contract.methods.storeCattleData(cattleId, dataHash).encodeABI()
        };
        
        // Sign and send transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, 'YOUR_PRIVATE_KEY'); // Note: In production, use a secure way to handle private keys
        
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        console.log('Transaction receipt:', receipt);
        
        return receipt.transactionHash;
        
    } catch (error) {
        console.error('Error interacting with smart contract:', error);
        alert('Lỗi khi tương tác với smart contract: ' + error.message);
        return null;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
        
        // Try to reconnect automatically
        ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    // Auto-connect if already connected
                    connectMetaMask();
                }
            });
    }
    
    // Connect MetaMask button
    document.getElementById('connectWalletBtn').addEventListener('click', connectMetaMask);
});