/**
 * @fileoverview Encryption utilities for secure credential handling.
 * Uses AES encryption in CBC mode with PKCS7 padding for credential
 * encryption before transmission. Includes environment variable validation
 * and secure IV generation.
 */

import CryptoJS from 'crypto-js';

// Validate encryption key presence
if (!process.env.REACT_APP_ENCRYPTION_KEY) {
  throw new Error('REACT_APP_ENCRYPTION_KEY is not set in environment variables');
}

/** Encryption key from environment variables (base64 encoded) */
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

/**
 * Encrypts user credentials using AES-CBC with PKCS7 padding.
 * Features:
 * - Random IV generation for each encryption
 * - Base64 encoding of encrypted data
 * - Secure key handling from environment variables
 * 
 * @param username - User's username
 * @param password - User's password
 * @returns Object containing encrypted data and IV in base64 format
 */
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
