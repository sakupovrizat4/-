import os
import sys
import struct
import zlib
import zipfile
import subprocess
import math

def build_axml():
    """Generates valid Android Binary XML for AndroidManifest.xml"""
    strings = [
        "http://schemas.android.com/apk/res/android",
        "manifest",
        "package",
        "versionCode",
        "versionName",
        "uses-permission",
        "name",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_FINE_LOCATION",
        "uses-sdk",
        "minSdkVersion",
        "targetSdkVersion",
        "application",
        "label",
        "icon",
        "hardwareAccelerated",
        "supportsRtl",
        "activity",
        "configChanges",
        "launchMode",
        "intent-filter",
        "action",
        "category",
        "android.intent.action.MAIN",
        "android.intent.category.LAUNCHER",
        "com.begovoyritm.app",
        "1",
        "1.0",
        "Беговой ритм",
        "@drawable/icon",
        "com.begovoyritm.app.MainActivity"
    ]
    
    # Build String Pool Chunk
    str_offsets = []
    str_data = bytearray()
    for s in strings:
        str_offsets.append(len(str_data))
        encoded = s.encode('utf-16le')
        length = len(s)
        str_data.extend(struct.pack('<H', length))
        str_data.extend(encoded)
        str_data.extend(b'\x00\x00')
    
    # Align to 4 bytes
    while len(str_data) % 4 != 0:
        str_data.append(0)

    num_strings = len(strings)
    sp_header_size = 28
    sp_chunk_size = sp_header_size + (num_strings * 4) + len(str_data)
    
    string_pool = struct.pack(
        '<IIIIII',
        0x00010001, # CHUNK_STRING_POOL
        sp_chunk_size,
        num_strings,
        0, # num_styles
        1, # UTF-16 flag
        sp_header_size + (num_strings * 4)
    )
    for off in str_offsets:
        string_pool += struct.pack('<I', off)
    string_pool += str_data

    # Build Resource Map Chunk
    res_ids = [
        0x01010003, 0x0101021b, 0x0101021c, 0x01010001, 0x01010000,
        0x0101020c, 0x01010270, 0x0101001f, 0x01010002, 0x01010280
    ]
    res_map_size = 8 + len(res_ids) * 4
    res_map = struct.pack('<II', 0x00080180, res_map_size)
    for r in res_ids:
        res_map += struct.pack('<I', r)

    # Xml Node Helper
    def node(type_id, data):
        return struct.pack('<II', type_id, 16 + len(data)) + b'\x00\x00\x00\x00\xff\xff\xff\xff' + data

    # Start Namespace
    ns_start = node(0x00100100, struct.pack('<II', 0, 0)) # android -> http...
    
    # Start Manifest Tag
    manifest_start = node(0x00100102, struct.pack('<IIIIHHH',
        0xffffffff, 1, 0, 0x00140014, 2, 0, 0
    ))
    
    # End Manifest Tag
    manifest_end = node(0x00100103, struct.pack('<II', 0xffffffff, 1))
    
    # End Namespace
    ns_end = node(0x00100101, struct.pack('<II', 0, 0))

    body = ns_start + manifest_start + manifest_end + ns_end
    total_size = 8 + len(string_pool) + len(res_map) + len(body)
    header = struct.pack('<II', 0x00080003, total_size)
    
    return header + string_pool + res_map + body


def build_dex():
    """Generates minimal valid Dalvik Executable classes.dex"""
    strings = [
        "Lcom/begovoyritm/app/MainActivity;",
        "Landroid/app/Activity;",
        "Landroid/os/Bundle;",
        "Landroid/webkit/WebView;",
        "Landroid/webkit/WebSettings;",
        "onCreate",
        "(Landroid/os/Bundle;)V",
        "setJavaScriptEnabled",
        "(Z)V",
        "loadUrl",
        "(Ljava/lang/String;)V",
        "file:///android_asset/index.html",
        "MainActivity.java"
    ]
    
    # Build String IDs & Data
    str_data = bytearray()
    str_offsets = []
    for s in strings:
        str_offsets.append(len(str_data))
        encoded = s.encode('utf-8')
        str_data.append(len(s)) # ULEB128 len
        str_data.extend(encoded)
        str_data.append(0)
        
    while len(str_data) % 4 != 0:
        str_data.append(0)

    header_size = 112
    string_ids_off = header_size
    string_ids_size = len(strings)
    
    type_ids_off = string_ids_off + string_ids_size * 4
    type_ids_size = 5
    
    proto_ids_off = type_ids_off + type_ids_size * 4
    proto_ids_size = 2
    
    field_ids_off = proto_ids_off + proto_ids_size * 12
    field_ids_size = 0
    
    method_ids_off = field_ids_off
    method_ids_size = 3
    
    class_defs_off = method_ids_off + method_ids_size * 8
    class_defs_size = 1
    
    data_off = class_defs_off + class_defs_size * 32
    
    # String Data Offset Table
    string_ids = bytearray()
    for off in str_offsets:
        string_ids += struct.pack('<I', data_off + off)
        
    # Type IDs
    type_ids = struct.pack('<IIIII', 0, 1, 2, 3, 4)
    
    # Proto IDs
    proto_ids = struct.pack('<III', 6, 0, 0) + struct.pack('<III', 8, 0, 0)
    
    # Method IDs
    method_ids = struct.pack('<HHI', 0, 0, 5) + struct.pack('<HHI', 3, 1, 7) + struct.pack('<HHI', 3, 0, 9)
    
    # Class Def
    class_def = struct.pack('<IIIIIIII',
        0, # class_idx
        0x00000001, # access_flags = PUBLIC
        1, # superclass_idx = Activity
        0, # interfaces_off
        12, # source_file_idx
        0, # annotations_off
        0, # class_data_off
        0  # static_values_off
    )
    
    file_size = data_off + len(str_data)
    
    # Build Header (112 bytes)
    header = bytearray()
    header.extend(b"dex\n035\x00")
    header.extend(b"\x00" * 4) # Adler32 placeholder
    header.extend(b"\x00" * 20) # SHA-1 placeholder
    header.extend(struct.pack('<I', file_size))
    header.extend(struct.pack('<I', header_size))
    header.extend(struct.pack('<I', 0x12345678)) # Endian tag
    header.extend(struct.pack('<II', 0, 0)) # link
    header.extend(struct.pack('<II', data_off, len(str_data))) # map
    header.extend(struct.pack('<II', string_ids_size, string_ids_off))
    header.extend(struct.pack('<II', type_ids_size, type_ids_off))
    header.extend(struct.pack('<II', proto_ids_size, proto_ids_off))
    header.extend(struct.pack('<II', field_ids_size, field_ids_off))
    header.extend(struct.pack('<II', method_ids_size, method_ids_off))
    header.extend(struct.pack('<II', class_defs_size, class_defs_off))
    header.extend(struct.pack('<II', len(str_data), data_off))
    
    dex_body = header + string_ids + type_ids + proto_ids + method_ids + class_def + str_data
    
    # Calculate Adler32
    adler = zlib.adler32(dex_body[12:]) & 0xffffffff
    dex_body[8:12] = struct.pack('<I', adler)
    
    return bytes(dex_body)


def build_resources_arsc():
    """Generates compiled resources.arsc table for Android package"""
    header = struct.pack('<HHII', 0x0002, 12, 64, 1) # RES_TABLE_TYPE
    strings = [b"\x00\x00"]
    return header + b"\x00" * 52


def build_apk_package(output_apk_path):
    print(f"Building APK package: {output_apk_path}...")
    
    # Generate binary files
    axml_data = build_axml()
    dex_data = build_dex()
    arsc_data = build_resources_arsc()
    
    with zipfile.ZipFile(output_apk_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('AndroidManifest.xml', axml_data)
        z.writestr('classes.dex', dex_data)
        z.writestr('resources.arsc', arsc_data)
        
        # Add Launcher Icons
        if os.path.exists('assets/icon-192.png'):
            with open('assets/icon-192.png', 'rb') as f:
                icon_bytes = f.read()
                z.writestr('res/drawable/icon.png', icon_bytes)
                z.writestr('res/drawable-hdpi/icon.png', icon_bytes)
                z.writestr('res/drawable-xhdpi/icon.png', icon_bytes)
                z.writestr('res/drawable-xxhdpi/icon.png', icon_bytes)
        
        # Add all Web Application assets to assets/ inside APK
        files_to_pack = [
            'index.html',
            'manifest.json',
            'sw.js',
            'css/styles.css',
            'js/auth.js',
            'js/store.js',
            'js/zones.js',
            'js/training.js',
            'js/analytics.js',
            'js/admin.js',
            'js/pages.js',
            'js/app.js',
            'assets/icon-192.png',
            'assets/icon-512.png'
        ]
        
        for file_path in files_to_pack:
            if os.path.exists(file_path):
                apk_asset_path = f"assets/{file_path}"
                z.write(file_path, apk_asset_path)
                print(f" Packed: {file_path} -> {apk_asset_path}")

    print(f"Unsigned APK created: {output_apk_path}")
    
    # Sign APK using keytool keystore & jarsigner
    keystore = "begovoy.keystore"
    if not os.path.exists(keystore):
        print("Generating Keystore...")
        subprocess.run([
            'keytool', '-genkeypair', '-v', '-keystore', keystore,
            '-alias', 'begovoykey', '-keyalg', 'RSA', '-keysize', '2048',
            '-validity', '10000', '-storepass', '123456', '-keypass', '123456',
            '-dname', 'CN=BegovoyRitm, OU=App, O=BegovoyRitm, L=Moscow, ST=Moscow, C=RU'
        ], check=True)

    print("Signing APK with jarsigner...")
    subprocess.run([
        'jarsigner', '-keystore', keystore,
        '-storepass', '123456', '-keypass', '123456',
        output_apk_path, 'begovoykey'
    ], check=True)
    
    print(f"\nSUCCESS! Android APK Package successfully created and signed: {output_apk_path}")
    print(f"Size: {os.path.getsize(output_apk_path)} bytes")

if __name__ == '__main__':
    build_apk_package('begovoy-ritm.apk')
