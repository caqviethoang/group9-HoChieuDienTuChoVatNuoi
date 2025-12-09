# THAY THẾ HOÀN TOÀN PHẦN IMPORT BLOCKCHAIN TRONG app.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import json
from dotenv import load_dotenv
import hashlib

# Tải biến môi trường
load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Kết nối MongoDB
MONGODB_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGODB_URI)
db = client['cattle_passport']

# Tạo bộ sưu tập
cattle_collection = db['cattle']
vaccination_collection = db['vaccinations']
movement_collection = db['movements']
users_collection = db['users']

# SIMPLE BLOCKCHAIN CLASS - LUÔN HOẠT ĐỘNG
class SimpleBlockchain:
    def __init__(self):
        self.web3 = None
        self.network = "mock"
        self.contract_address = os.getenv('BLOCKCHAIN_ADDRESS')
        self.infura_project_id = os.getenv('INFURA_PROJECT_ID', "8a08cfac4cdf4421b4fdd480e36e1b52")
        
    def generate_hash(self, cattle_data):
        try:
            data_string = json.dumps(cattle_data, sort_keys=True, default=str)
            return hashlib.sha256(data_string.encode()).hexdigest()
        except:
            return "mock_hash_" + str(hash(str(cattle_data)))[:20]
    
    def get_network_info(self):
        return {
            "connected": False,
            "network": "mock",
            "latest_block": 0,
            "contract_address": self.contract_address,
            "infura_url": f"https://{self.network}.infura.io/v3/{self.infura_project_id}",
            "infura_project_id": self.infura_project_id
        }
    
    def verify_on_blockchain(self, cattle_id, cattle_data):
        # Mock verification - always returns True for testing
        print(f"Mock verification for cattle {cattle_id}")
        return True

# SỬ DỤNG SIMPLE BLOCKCHAIN LUÔN
blockchain = SimpleBlockchain()
print("✓ Using SimpleBlockchain (mock mode)")

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

app.json_encoder = JSONEncoder

@app.route('/')
def index():
    return jsonify({"message": "Cattle Passport API", "status": "running"})

# API cho bò
@app.route('/api/cattle', methods=['GET'])
def get_all_cattle():
    cattle = list(cattle_collection.find())
    return jsonify(cattle)

@app.route('/api/cattle/<cattle_id>', methods=['GET'])
def get_cattle(cattle_id):
    cattle = cattle_collection.find_one({"_id": ObjectId(cattle_id)})
    if cattle:
        return jsonify(cattle)
    return jsonify({"error": "Cattle not found"}), 404

@app.route('/api/cattle', methods=['POST'])
def create_cattle():
    data = request.json
    
    # Tạo ID duy nhất
    cattle_id = f"C{datetime.now().strftime('%Y%m%d')}{cattle_collection.count_documents({}) + 1:04d}"
    
    cattle_data = {
        "cattle_id": cattle_id,
        "name": data.get('name'),
        "breed": data.get('breed'),
        "date_of_birth": data.get('date_of_birth'),
        "gender": data.get('gender'),
        "color": data.get('color'),
        "weight": data.get('weight'),
        "owner_name": data.get('owner_name'),
        "owner_address": data.get('owner_address'),
        "farm_location": data.get('farm_location'),
        "created_at": datetime.now(),
        "blockchain_hash": "",  # Sẽ được cập nhật khi lưu lên blockchain
        "vaccinations": [],
        "movements": [],
        "health_status": "Healthy"
    }
    
    result = cattle_collection.insert_one(cattle_data)
    cattle_data['_id'] = str(result.inserted_id)
    
    return jsonify({
        "message": "Cattle created successfully",
        "cattle": cattle_data
    }), 201

@app.route('/api/cattle/<cattle_id>', methods=['PUT'])
def update_cattle(cattle_id):
    data = request.json
    
    update_data = {key: data[key] for key in data if key != '_id'}
    
    result = cattle_collection.update_one(
        {"_id": ObjectId(cattle_id)},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        return jsonify({"message": "Cattle updated successfully"})
    return jsonify({"error": "Cattle not found"}), 404

# API cho tiêm chủng
@app.route('/api/cattle/<cattle_id>/vaccinations', methods=['POST'])
def add_vaccination(cattle_id):
    data = request.json
    
    vaccination_data = {
        "cattle_id": cattle_id,
        "vaccine_name": data.get('vaccine_name'),
        "vaccination_date": data.get('vaccination_date'),
        "next_due_date": data.get('next_due_date'),
        "veterinarian": data.get('veterinarian'),
        "notes": data.get('notes'),
        "created_at": datetime.now()
    }
    
    # Thêm vào bộ sưu tập tiêm chủng
    vaccination_collection.insert_one(vaccination_data)
    
    # Cập nhật bò
    cattle_collection.update_one(
        {"_id": ObjectId(cattle_id)},
        {"$push": {"vaccinations": vaccination_data}}
    )
    
    return jsonify({
        "message": "Vaccination added successfully",
        "vaccination": vaccination_data
    }), 201

# API cho di chuyển
@app.route('/api/cattle/<cattle_id>/movements', methods=['POST'])
def add_movement(cattle_id):
    data = request.json
    
    movement_data = {
        "cattle_id": cattle_id,
        "from_location": data.get('from_location'),
        "to_location": data.get('to_location'),
        "movement_date": data.get('movement_date'),
        "reason": data.get('reason'),
        "transport_details": data.get('transport_details'),
        "created_at": datetime.now()
    }
    
    # Thêm vào bộ sưu tập di chuyển
    movement_collection.insert_one(movement_data)
    
    # Cập nhật bò
    cattle_collection.update_one(
        {"_id": ObjectId(cattle_id)},
        {"$push": {"movements": movement_data}}
    )
    
    return jsonify({
        "message": "Movement added successfully",
        "movement": movement_data
    }), 201

# API cho blockchain hash
@app.route('/api/cattle/<cattle_id>/blockchain', methods=['POST'])
def update_blockchain_hash(cattle_id):
    data = request.json
    blockchain_hash = data.get('blockchain_hash')
    
    if not blockchain_hash:
        return jsonify({"error": "Blockchain hash is required"}), 400
    
    result = cattle_collection.update_one(
        {"_id": ObjectId(cattle_id)},
        {"$set": {"blockchain_hash": blockchain_hash}}
    )
    
    if result.modified_count > 0:
        return jsonify({"message": "Blockchain hash updated successfully"})
    return jsonify({"error": "Cattle not found"}), 404

# API tìm kiếm
@app.route('/api/cattle/search', methods=['GET'])
def search_cattle():
    query = request.args.get('q', '')
    
    if not query:
        return jsonify([])
    
    # Tìm kiếm theo ID hoặc tên
    results = list(cattle_collection.find({
        "$or": [
            {"cattle_id": {"$regex": query, "$options": "i"}},
            {"name": {"$regex": query, "$options": "i"}},
            {"owner_name": {"$regex": query, "$options": "i"}}
        ]
    }))
    
    return jsonify(results)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total_cattle = cattle_collection.count_documents({})
    total_vaccinations = vaccination_collection.count_documents({})
    total_movements = movement_collection.count_documents({})
    
    # Phân phối giống
    breed_distribution = list(cattle_collection.aggregate([
        {"$group": {"_id": "$breed", "count": {"$sum": 1}}}
    ]))
    
    return jsonify({
        "total_cattle": total_cattle,
        "total_vaccinations": total_vaccinations,
        "total_movements": total_movements,
        "breed_distribution": breed_distribution
    })

# THÊM CÁC API BLOCKCHAIN
@app.route('/api/blockchain/status', methods=['GET'])
def get_blockchain_status():
    """Lấy trạng thái kết nối blockchain"""
    if blockchain:
        info = blockchain.get_network_info()
        return jsonify(info)
    else:
        return jsonify({
            "connected": False,
            "network": "none",
            "message": "Blockchain module not available"
        })

@app.route('/api/blockchain/generate-hash', methods=['POST'])
def generate_blockchain_hash():
    """Tạo hash cho dữ liệu bò"""
    if not blockchain:
        return jsonify({"error": "Blockchain module not available"}), 500
    
    data = request.json
    cattle_data = data.get('cattle_data')
    cattle_id = data.get('cattle_id')
    
    if not cattle_data or not cattle_id:
        return jsonify({"error": "Missing cattle_data or cattle_id"}), 400
    
    try:
        data_hash = blockchain.generate_hash(cattle_data)
        if data_hash:
            return jsonify({
                "success": True,
                "cattle_id": cattle_id,
                "data_hash": data_hash,
                "network": blockchain.network
            })
        else:
            return jsonify({"error": "Failed to generate hash"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/blockchain/verify', methods=['POST'])
def verify_on_blockchain():
    """Xác minh dữ liệu trên blockchain"""
    if not blockchain or not hasattr(blockchain, 'verify_on_blockchain'):
        return jsonify({"error": "Blockchain verification not available"}), 500
    
    data = request.json
    cattle_data = data.get('cattle_data')
    cattle_id = data.get('cattle_id')
    
    if not cattle_data or not cattle_id:
        return jsonify({"error": "Missing cattle_data or cattle_id"}), 400
    
    try:
        is_valid = blockchain.verify_on_blockchain(cattle_id, cattle_data)
        return jsonify({
            "success": True,
            "cattle_id": cattle_id,
            "verified": is_valid,
            "network": blockchain.network
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/blockchain/test', methods=['GET'])
def test_blockchain_connection():
    """Test kết nối blockchain"""
    try:
        if blockchain and hasattr(blockchain, 'web3') and blockchain.web3:
            is_connected = blockchain.web3.is_connected()
            
            if is_connected:
                info = {
                    "status": "connected",
                    "network": blockchain.network,
                    "latest_block": blockchain.web3.eth.block_number,
                    "chain_id": blockchain.web3.eth.chain_id,
                    "gas_price": str(blockchain.web3.eth.gas_price),
                    "contract_address": blockchain.contract_address,
                    "infura_url": f"https://{blockchain.network}.infura.io/v3/{blockchain.infura_project_id}",
                    "message": f"Successfully connected to {blockchain.network} via Infura"
                }
                return jsonify(info)
            else:
                return jsonify({
                    "status": "disconnected",
                    "message": "Cannot connect to blockchain"
                }), 500
        else:
            return jsonify({
                "status": "no_module",
                "message": "Blockchain module not initialized"
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)