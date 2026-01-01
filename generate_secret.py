import secrets
import os

# Tạo secret key
secret_key = secrets.token_hex(32)

print("="*50)
print("FLASK_SECRET_KEY tạo thành công:")
print("="*50)
print(f"FLASK_SECRET_KEY={secret_key}")
print("="*50)

# Tự động cập nhật vào file .env
env_file = '.env'
if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    # Cập nhật hoặc thêm FLASK_SECRET_KEY
    updated = False
    new_lines = []
    for line in lines:
        if line.startswith('FLASK_SECRET_KEY='):
            new_lines.append(f'FLASK_SECRET_KEY={secret_key}\n')
            updated = True
        else:
            new_lines.append(line)
    
    if not updated:
        new_lines.append(f'\nFLASK_SECRET_KEY={secret_key}\n')
    
    with open(env_file, 'w') as f:
        f.writelines(new_lines)
    print(f"Đã cập nhật vào file {env_file}")
else:
    print(f"Tạo file {env_file} với secret key...")
    with open(env_file, 'w') as f:
        f.write(f'FLASK_SECRET_KEY={secret_key}\n')
        f.write('MONGODB_URI=mongodb+srv://Hoang:<db_password>@cluster0.ybv37se.mongodb.net/cattle_passport?retryWrites=true&w=majority\n')
        f.write('BLOCKCHAIN_ADDRESS=0x44Ed14113601543DE2d6695FDF77859ff5D70219\n')
    print(f"Đã tạo file {env_file}")