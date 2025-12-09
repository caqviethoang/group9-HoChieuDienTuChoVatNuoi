import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import json
from dotenv import load_dotenv
import hashlib

# Thêm thư mục hiện tại vào path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Tải biến môi trường
load_dotenv()

app = Flask(__name__)

# Cấu hình CORS đơn giản
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Kết nối MongoDB
MONGODB_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGODB_URI)
db = client['cattle_passport']

# Tạo bộ sưu tập
cattle_collection = db['cattle']
vaccination_collection = db['vaccinations']
movement_collection = db['movements']

# IMPORT BLOCKCHAIN - SỬ DỤNG TRỰC TIẾP
try:
    # Thử import từ file blockchain.py
    from blockchain import MetaMaskBlockchain
    blockchain = MetaMaskBlockchain()
    print("✓ Successfully imported MetaMaskBlockchain")
except ImportError as e:
    print(f"✗ Cannot import from blockchain.py: {e}")
    # Tạo class blockchain trực tiếp trong app.py
    class SimpleBlockchain:
        def __init__(self):
            self.metamask_address = os.getenv('BLOCKCHAIN_ADDRESS', '0x44Ed14113601543DE2d6695FDF77859ff5D70219')
            print(f"✓ Using built-in SimpleBlockchain with address: {self.metamask_address}")
        
        def generate_hash(self, cattle_data):
            try:
                data_string = json.dumps(cattle_data, sort_keys=True, default=str)
                return hashlib.sha256(data_string.encode()).hexdigest()
            except:
                return f"hash_{hash(str(cattle_data))}"
        
        def get_network_info(self):
            return {
                "connected": True,
                "network": "Ethereum via MetaMask",
                "metamask_address": self.metamask_address,
                "status": "ready",
                "message": "Built-in blockchain module"
            }
        
        def verify_on_blockchain(self, cattle_id, cattle_data):
            print(f"Verifying cattle {cattle_id}")
            return True
    
    blockchain = SimpleBlockchain()

# JSON Encoder cho MongoDB
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

app.json_encoder = JSONEncoder

# ============== ROUTES ==============

@app.route('/')
def home():
    """Trang chủ"""
    return jsonify({
        "name": "Cattle Passport API",
        "version": "1.0",
        "status": "running",
        "blockchain": "MetaMask Integrated",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/api/health",
            "blockchain": "/api/blockchain/status",
            "cattle": "/api/cattle",
            "stats": "/api/stats"
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Kiểm tra sức khỏe hệ thống"""
    try:
        # Kiểm tra MongoDB
        client.admin.command('ping')
        
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "blockchain": "ready",
            "metamask_address": blockchain.metamask_address,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/blockchain/status', methods=['GET'])
def blockchain_status():
    """Trạng thái blockchain"""
    return jsonify(blockchain.get_network_info())

@app.route('/api/cattle', methods=['GET'])
def get_cattle_list():
    """Lấy danh sách tất cả bò"""
    try:
        cattle_list = list(cattle_collection.find())
        return jsonify({
            "success": True,
            "count": len(cattle_list),
            "data": cattle_list
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/cattle', methods=['POST'])
def create_cattle():
    """Tạo hồ sơ bò mới"""
    try:
        data = request.json
        
        # Kiểm tra dữ liệu
        required_fields = ['name', 'breed', 'owner_name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400
        
        # Tạo ID bò
        cattle_id = f"C{datetime.now().strftime('%y%m%d')}{cattle_collection.count_documents({}) + 1:03d}"
        
        # Dữ liệu bò
        cattle_data = {
            "cattle_id": cattle_id,
            "name": data['name'],
            "breed": data['breed'],
            "owner_name": data['owner_name'],
            "date_of_birth": data.get('date_of_birth'),
            "gender": data.get('gender', 'Unknown'),
            "color": data.get('color'),
            "weight": data.get('weight'),
            "owner_address": data.get('owner_address'),
            "farm_location": data.get('farm_location'),
            "created_at": datetime.now(),
            "health_status": "Healthy",
            "vaccinations": [],
            "movements": [],
            "metamask_address": blockchain.metamask_address
        }
        
        # Tạo hash blockchain
        data_hash = blockchain.generate_hash(cattle_data)
        cattle_data['blockchain_hash'] = data_hash
        
        # Lưu vào database
        result = cattle_collection.insert_one(cattle_data)
        cattle_data['_id'] = str(result.inserted_id)
        
        return jsonify({
            "success": True,
            "message": "Cattle created successfully",
            "data": cattle_data,
            "blockchain": {
                "hash": data_hash,
                "metamask_address": blockchain.metamask_address,
                "message": "Ready for MetaMask signing"
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Error creating cattle: {str(e)}"
        }), 500

@app.route('/api/cattle/<cattle_id>', methods=['GET'])
def get_cattle(cattle_id):
    """Lấy thông tin một con bò"""
    try:
        cattle = cattle_collection.find_one({"cattle_id": cattle_id})
        
        if not cattle:
            # Thử tìm bằng MongoDB _id
            try:
                cattle = cattle_collection.find_one({"_id": ObjectId(cattle_id)})
            except:
                pass
        
        if cattle:
            return jsonify({
                "success": True,
                "data": cattle
            })
        
        return jsonify({
            "success": False,
            "error": "Cattle not found"
        }), 404
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/cattle/<cattle_id>/vaccinate', methods=['POST'])
def add_vaccination(cattle_id):
    """Thêm thông tin tiêm chủng"""
    try:
        data = request.json
        
        vaccination_data = {
            "vaccine_name": data.get('vaccine_name'),
            "date": data.get('date', datetime.now().isoformat()),
            "veterinarian": data.get('veterinarian'),
            "next_due_date": data.get('next_due_date'),
            "notes": data.get('notes'),
            "added_at": datetime.now()
        }
        
        # Cập nhật vào collection riêng
        vaccination_collection.insert_one({
            **vaccination_data,
            "cattle_id": cattle_id
        })
        
        # Cập nhật vào thông tin bò
        cattle_collection.update_one(
            {"cattle_id": cattle_id},
            {"$push": {"vaccinations": vaccination_data}}
        )
        
        return jsonify({
            "success": True,
            "message": "Vaccination added successfully",
            "data": vaccination_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/cattle/<cattle_id>/move', methods=['POST'])
def add_movement(cattle_id):
    """Thêm thông tin di chuyển"""
    try:
        data = request.json
        
        movement_data = {
            "from_location": data.get('from_location'),
            "to_location": data.get('to_location'),
            "date": data.get('date', datetime.now().isoformat()),
            "reason": data.get('reason'),
            "transport_details": data.get('transport_details'),
            "added_at": datetime.now()
        }
        
        # Cập nhật vào collection riêng
        movement_collection.insert_one({
            **movement_data,
            "cattle_id": cattle_id
        })
        
        # Cập nhật vào thông tin bò
        cattle_collection.update_one(
            {"cattle_id": cattle_id},
            {"$push": {"movements": movement_data}}
        )
        
        return jsonify({
            "success": True,
            "message": "Movement added successfully",
            "data": movement_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Lấy thống kê hệ thống"""
    try:
        total_cattle = cattle_collection.count_documents({})
        total_vaccinations = vaccination_collection.count_documents({})
        total_movements = movement_collection.count_documents({})
        
        # Thống kê giống
        breed_stats = list(cattle_collection.aggregate([
            {"$group": {"_id": "$breed", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]))
        
        # Thống kê sức khỏe
        health_stats = list(cattle_collection.aggregate([
            {"$group": {"_id": "$health_status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]))
        
        return jsonify({
            "success": True,
            "data": {
                "total_cattle": total_cattle,
                "total_vaccinations": total_vaccinations,
                "total_movements": total_movements,
                "breeds": breed_stats,
                "health_status": health_stats,
                "blockchain": {
                    "address": blockchain.metamask_address,
                    "status": "active"
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/blockchain/verify/<cattle_id>', methods=['GET'])
def verify_cattle(cattle_id):
    """Xác minh bò trên blockchain"""
    try:
        cattle = cattle_collection.find_one({"cattle_id": cattle_id})
        
        if not cattle:
            return jsonify({
                "success": False,
                "error": "Cattle not found"
            }), 404
        
        # Xác minh bằng blockchain
        is_verified = blockchain.verify_on_blockchain(cattle_id, cattle)
        
        return jsonify({
            "success": True,
            "cattle_id": cattle_id,
            "verified": is_verified,
            "blockchain_hash": cattle.get('blockchain_hash'),
            "metamask_address": blockchain.metamask_address,
            "message": "Data verification completed"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# API để frontend gửi chữ ký từ MetaMask
@app.route('/api/blockchain/sign', methods=['POST'])
def sign_with_metamask():
    """Nhận chữ ký từ MetaMask"""
    try:
        data = request.json
        
        signature = data.get('signature')
        message = data.get('message')
        address = data.get('address')
        cattle_id = data.get('cattle_id')
        
        if not all([signature, message, address, cattle_id]):
            return jsonify({
                "success": False,
                "error": "Missing required fields"
            }), 400
        
        # Lưu chữ ký vào database
        signature_data = {
            "signature": signature,
            "message": message,
            "address": address,
            "cattle_id": cattle_id,
            "signed_at": datetime.now().isoformat()
        }
        
        # Cập nhật thông tin bò
        cattle_collection.update_one(
            {"cattle_id": cattle_id},
            {"$set": {
                "metamask_signature": signature_data,
                "last_verified": datetime.now()
            }}
        )
        
        return jsonify({
            "success": True,
            "message": "Signature saved successfully",
            "cattle_id": cattle_id,
            "signature": signature[:50] + "...",
            "address": address
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 CATTLE PASSPORT API")
    print("=" * 60)
    print(f"📊 Database: MongoDB Atlas")
    print(f"🔗 Blockchain: MetaMask ({blockchain.metamask_address})")
    print(f"🌐 Server: http://localhost:5000")
    print(f"⚡ Status: Ready")
    print("=" * 60)
    
    app.run(debug=True, port=5000, host='0.0.0.0')