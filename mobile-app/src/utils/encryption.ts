import CryptoJS from 'crypto-js';

if (!process.env.REACT_APP_ENCRYPTION_KEY) {
  throw new Error('REACT_APP_ENCRYPTION_KEY is not set in environment variables');
}

// Get encryption key from environment variables
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

export async function encryptCredentials(username: string, password: string) {
  const data = JSON.stringify({ username, password });
  
  // Generate a random IV (16 bytes)
  const iv = CryptoJS.lib.WordArray.random(16);
  
  // Convert key from base64
  const key = CryptoJS.enc.Base64.parse(ENCRYPTION_KEY);
  
  // Encrypt with explicit parameters
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Return both the IV and encrypted data as base64
  return {
    encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64)
  };
}
