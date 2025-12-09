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
CORS(app)  # Cho phép frontend kết nối
app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Kết nối MongoDB
MONGODB_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGODB_URI)
db = client['cattle_passport']

# Tạo bộ sưu tập (collections)
cattle_collection = db['cattle']
vaccination_collection = db['vaccinations']
movement_collection = db['movements']
users_collection = db['users']

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)