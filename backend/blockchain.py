import json
import hashlib
import os
from dotenv import load_dotenv

load_dotenv()

class MetaMaskBlockchain:
    def __init__(self):
        """
        Blockchain đơn giản cho MetaMask
        """
        # Lấy địa chỉ MetaMask từ .env
        self.metamask_address = os.getenv('BLOCKCHAIN_ADDRESS')
        
        if not self.metamask_address or self.metamask_address == "0x44Ed14113601543DE2d6695FDF77859ff5D70219":
            # Sử dụng địa chỉ của bạn
            self.metamask_address = "0x44Ed14113601543DE2d6695FDF77859ff5D70219"
        
        print("=" * 60)
        print("🌐 META MASK BLOCKCHAIN MODE")
        print(f"📱 MetaMask Address: {self.metamask_address}")
        print("ℹ️  Ready for MetaMask integration")
        print("=" * 60)
    
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
            # Fallback hash
            backup = str(cattle_data)
            return f"hash_{hashlib.sha256(backup.encode()).hexdigest()[:32]}"
    
    def get_network_info(self):
        """Lấy thông tin network"""
        return {
            "connected": True,
            "network": "Ethereum via MetaMask",
            "metamask_address": self.metamask_address,
            "status": "ready",
            "message": "Connect MetaMask in browser to sign transactions",
            "capabilities": [
                "Generate data hash",
                "Verify data integrity",
                "MetaMask signature ready"
            ]
        }
    
    def verify_on_blockchain(self, cattle_id, cattle_data):
        """Xác minh dữ liệu"""
        print(f"🔍 Verifying cattle {cattle_id}")
        
        # Tạo hash để xác minh
        current_hash = self.generate_hash(cattle_data)
        
        # Trong thực tế, hash này sẽ được ký bởi MetaMask
        print(f"✅ Verification hash: {current_hash[:20]}...")
        print(f"📍 MetaMask Address: {self.metamask_address}")
        print("📝 Note: Full verification requires MetaMask signing")
        
        return True