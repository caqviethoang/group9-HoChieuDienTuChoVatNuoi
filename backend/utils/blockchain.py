from web3 import Web3
import json
import os
from dotenv import load_dotenv
import hashlib

load_dotenv()

class CattlePassportBlockchain:
    def __init__(self):
        # Sử dụng MetaMask/Web3 provider
        self.provider_url = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"
        self.web3 = Web3(Web3.HTTPProvider(self.provider_url))
        
        # Địa chỉ contract (thay thế bằng contract thực tế)
        self.contract_address = os.getenv('BLOCKCHAIN_ADDRESS')
        
        # ABI của contract (cần thay thế bằng ABI thực tế)
        self.contract_abi = [
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
        ]
        
        if self.web3.is_connected():
            print("Connected to blockchain network")
            self.contract = self.web3.eth.contract(
                address=self.contract_address,
                abi=self.contract_abi
            )
        else:
            print("Failed to connect to blockchain")
            self.contract = None
    
    def generate_hash(self, cattle_data):
        """Tạo hash từ dữ liệu bò"""
        data_string = json.dumps(cattle_data, sort_keys=True)
        return hashlib.sha256(data_string.encode()).hexdigest()
    
    def store_on_blockchain(self, cattle_id, cattle_data, private_key):
        """Lưu dữ liệu lên blockchain"""
        if not self.contract:
            return None
        
        try:
            # Tạo transaction
            data_hash = self.generate_hash(cattle_data)
            
            # Tạo transaction
            transaction = self.contract.functions.storeCattleData(
                cattle_id, data_hash
            ).build_transaction({
                'from': self.web3.eth.accounts[0],
                'nonce': self.web3.eth.get_transaction_count(self.web3.eth.accounts[0]),
                'gas': 2000000,
                'gasPrice': self.web3.to_wei('50', 'gwei')
            })
            
            # Ký transaction
            signed_txn = self.web3.eth.account.sign_transaction(
                transaction, private_key=private_key
            )
            
            # Gửi transaction
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.raw_transaction)
            
            return self.web3.to_hex(tx_hash)
            
        except Exception as e:
            print(f"Error storing on blockchain: {e}")
            return None
    
    def verify_on_blockchain(self, cattle_id, cattle_data):
        """Xác minh dữ liệu trên blockchain"""
        if not self.contract:
            return False
        
        try:
            # Lấy hash từ blockchain
            stored_hash = self.contract.functions.getCattleData(cattle_id).call()
            
            # Tạo hash từ dữ liệu hiện tại
            current_hash = self.generate_hash(cattle_data)
            
            return stored_hash == current_hash
            
        except Exception as e:
            print(f"Error verifying on blockchain: {e}")
            return False

# Tạo instance
blockchain = CattlePassportBlockchain()