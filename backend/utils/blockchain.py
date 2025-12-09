from web3 import Web3
import json
import os
from dotenv import load_dotenv
import hashlib

load_dotenv()

class CattlePassportBlockchain:
    def __init__(self, network="goerli"):
        """
        Khởi tạo kết nối blockchain với Infura Project ID CỤ THỂ của bạn
        """
        self.network = network
        
        # Sử dụng TRỰC TIẾP Infura Project ID của bạn
        self.infura_project_id = "8a08cfac4cdf4421b4fdd480e36e1b52"
        
        self.contract_address = os.getenv('BLOCKCHAIN_ADDRESS')
        
        # Cấu hình RPC URLs - DÙNG TRỰC TIẾP ID CỦA BẠN
        self.rpc_config = {
            "mainnet": f"https://mainnet.infura.io/v3/8a08cfac4cdf4421b4fdd480e36e1b52",
            "goerli": f"https://goerli.infura.io/v3/8a08cfac4cdf4421b4fdd480e36e1b52",
            "sepolia": f"https://sepolia.infura.io/v3/8a08cfac4cdf4421b4fdd480e36e1b52",
            "polygon": f"https://polygon-mainnet.infura.io/v3/8a08cfac4cdf4421b4fdd480e36e1b52",
            "polygon_mumbai": f"https://polygon-mumbai.infura.io/v3/8a08cfac4cdf4421b4fdd480e36e1b52"
        }
        
        # Sử dụng RPC URL dựa trên network
        self.provider_url = self.rpc_config.get(network, self.rpc_config['goerli'])
        self.web3 = Web3(Web3.HTTPProvider(self.provider_url))
        
        # ABI của contract
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
        
        self.contract = None
        self.initialize_contract()
    
    def initialize_contract(self):
        """Khởi tạo contract nếu có kết nối"""
        try:
            if self.web3.is_connected():
                print("=" * 60)
                print(f"✓ BLOCKCHAIN CONNECTION SUCCESSFUL!")
                print(f"  Network: {self.network.upper()}")
                print(f"  Infura URL: {self.provider_url}")
                print(f"  Connected: {self.web3.is_connected()}")
                print(f"  Latest Block: {self.web3.eth.block_number}")
                
                # Chỉ khởi tạo contract nếu có address hợp lệ
                if (self.contract_address and 
                    self.contract_address.startswith("0x") and 
                    len(self.contract_address) == 42):
                    
                    self.contract = self.web3.eth.contract(
                        address=self.contract_address,
                        abi=self.contract_abi
                    )
                    print(f"✓ Smart Contract Initialized!")
                    print(f"  Address: {self.contract_address}")
                    
                else:
                    print(f"⚠ No valid contract address provided")
                    print(f"  Using address from .env: {self.contract_address}")
                    print(f"  Will work in hash-generation mode only")
                
                print("=" * 60)
                
            else:
                print("✗ Failed to connect to blockchain")
                print(f"  Please check your Infura Project ID and network")
                
        except Exception as e:
            print(f"✗ Error initializing blockchain: {e}")
            print(f"  Make sure you have internet connection and valid Infura ID")
    
    def generate_hash(self, cattle_data):
        """Tạo hash SHA256 từ dữ liệu bò"""
        try:
            # Sắp xếp keys để đảm bảo hash nhất quán
            data_string = json.dumps(cattle_data, sort_keys=True, default=str)
            hash_result = hashlib.sha256(data_string.encode()).hexdigest()
            
            print(f"✓ Generated hash: {hash_result[:20]}...")
            return hash_result
            
        except Exception as e:
            print(f"✗ Error generating hash: {e}")
            return None
    
    def verify_on_blockchain(self, cattle_id, cattle_data):
        """Xác minh dữ liệu trên blockchain"""
        if not self.contract:
            print("⚠ No contract available for verification")
            return False
        
        try:
            print(f"Verifying cattle {cattle_id} on {self.network}...")
            
            # Lấy hash từ blockchain
            stored_hash = self.contract.functions.getCattleData(cattle_id).call()
            print(f"  Stored on blockchain: {stored_hash[:20]}...")
            
            # Tạo hash từ dữ liệu hiện tại
            current_hash = self.generate_hash(cattle_data)
            print(f"  Current data hash: {current_hash[:20]}...")
            
            is_valid = stored_hash == current_hash
            
            if is_valid:
                print(f"✓ VERIFICATION PASSED: Data matches blockchain")
            else:
                print(f"✗ VERIFICATION FAILED: Data does not match")
                
            return is_valid
            
        except Exception as e:
            print(f"✗ Error verifying on blockchain: {e}")
            return False
    
    def get_network_info(self):
        """Lấy thông tin network"""
        info = {
            "connected": self.web3.is_connected(),
            "network": self.network,
            "latest_block": self.web3.eth.block_number if self.web3.is_connected() else 0,
            "contract_address": self.contract_address,
            "infura_url": self.provider_url,
            "infura_project_id": self.infura_project_id
        }
        return info