#!/usr/bin/env python3
import subprocess
import hashlib
import binascii
from datetime import datetime, timedelta

def create_keystore_with_fingerprint(target_sha1):
    """Google'ın istediği SHA1 fingerprint ile keystore oluştur"""
    
    # Target SHA1: 60:66:22:5A:EB:43:FC:63:61:56:F6:06:1A:F4:85:02:C7:F8:9C:60
    target_bytes = binascii.unhexlify(target_sha1.replace(':', ''))
    
    # Keystore oluştur
    cmd = [
        'keytool', '-genkey', '-v',
        '-keystore', 'android/app/universe-upload.keystore',
        '-alias', 'universe-upload',
        '-keyalg', 'RSA',
        '-keysize', '2048',
        '-validity', '10000',
        '-storepass', 'universe123',
        '-keypass', 'universe123',
        '-dname', 'CN=Universe,OU=Mobile,O=Universe,L=Istanbul,C=TR'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        print("Keystore oluşturuldu:", result.stdout)
        
        # SHA1 kontrol et
        check_cmd = [
            'keytool', '-list', '-v',
            '-keystore', 'android/app/universe-upload.keystore',
            '-alias', 'universe-upload',
            '-storepass', 'universe123'
        ]
        
        check_result = subprocess.run(check_cmd, capture_output=True, text=True)
        
        # SHA1 çıkar
        for line in check_result.stdout.split('\n'):
            if 'SHA1:' in line:
                actual_sha1 = line.split('SHA1:')[1].strip()
                print(f"Oluşturulan SHA1: {actual_sha1}")
                print(f"Hedef SHA1: {target_sha1}")
                return actual_sha1 == target_sha1
                
    except Exception as e:
        print(f"Hata: {e}")
        return False

if __name__ == "__main__":
    target_sha1 = "60:66:22:5A:EB:43:FC:63:61:56:F6:06:1A:F4:85:02:C7:F8:9C:60"
    success = create_keystore_with_fingerprint(target_sha1)
    print(f"Başarılı: {success}")
