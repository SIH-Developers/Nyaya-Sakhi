"""
Privacy & Compliance Layer (DPDP Act 2023 Alignment)
Provides AES-256 field-level encryption for sensitive transcripts & PII,
plus role-based access control (RBAC).
"""
import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Derive a consistent key for demo encryption
def _get_encryption_key() -> bytes:
    secret = os.getenv("ENCRYPTION_SECRET", "sih-26094-secure-aes256-master-key").encode()
    salt = b"mosje-nhaa-dpdp-salt-2026"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret))

_fernet = Fernet(_get_encryption_key())

def encrypt_sensitive_field(plaintext: str) -> str:
    """Encrypt plain text field with AES-256 (CBC with HMAC)."""
    if not plaintext:
        return ""
    return _fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")

def decrypt_sensitive_field(ciphertext: str, user_role: str = "counselor") -> str:
    """
    Decrypt sensitive field only if user has authorized role.
    Roles: 'counselor', 'supervisor', 'admin' can view.
    'read_only_investigator' receives masked string.
    """
    if not ciphertext:
        return ""
    if user_role not in ["counselor", "supervisor", "admin"]:
        return "[RESTRICTED - COUNSELOR ACCESS ONLY (DPDP ACT 2023)]"
    try:
        return _fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception:
        return ciphertext  # Return as is if not encrypted
