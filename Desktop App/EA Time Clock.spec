# -*- mode: python ; coding: utf-8 -*-

import compileall
import glob
import os
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# Recursively compile all Python files before packaging
compileall.compile_dir('.')

a = Analysis(
    ['app.py'],  # Use the .py file(s) instead of .pyc files
    pathex=['.'],
    binaries=[],
    datas=[('timeclock.ico', '.')],
    hiddenimports=[
        'PyQt5.QtCore',
        'PyQt5.QtGui',
        'PyQt5.QtWebEngineWidgets',
        'PyQt5.QtNetwork',
        'PyQt5.QtWidgets',
        'PyQt5.QtWebChannel',
        'PyQt5.QtWebEngineCore',
        'PyQt5.QtPrintSupport'
        'requests'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'PyQt5.QtBluetooth',
        'PyQt5.QtNfc',
        'PyQt5.QtSensors',
        'PyQt5.QtSerialPort',
        'PyQt5.QtTextToSpeech',
        'PyQt5.QtTest',
        'PyQt5.QtPositioning',
        'PyQt5.QtQuick',
        'PyQt5.QtQuick3D',
        'PyQt5.QtWebSockets',
        'PyQt5.QtOpenGL',
        'PyQt5.QtSvg',
        'PyQt5.QtXml',
        'PyQt5.QtXmlPatterns',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=True,
)

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher
)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='EA Time Clock',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=False,  # Consider setting upx=False if startup time is slow
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False if you want a GUI-only app without console
    icon='timeclock.ico',  # Ensure the icon path is correct
)
