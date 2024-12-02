import secrets
import base64

def generate_key():
    # Generate a 32-byte (256-bit) random key
    key = secrets.token_bytes(32)
    # Convert to base64 for storage
    key_b64 = base64.b64encode(key).decode('utf-8')
    print("Generated encryption key (save this in your .env files):")
    print(key_b64)

if __name__ == '__main__':
    generate_key()
