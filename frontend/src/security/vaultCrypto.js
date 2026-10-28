import { argon2id } from 'hash-wasm'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const CRYPTO_VERSION = 1

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

async function importAesKey(bytes) {
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', true, ['encrypt', 'decrypt'])
}

async function deriveMasterKey(password, kdf) {
  const bytes = await argon2id({
    password,
    salt: fromBase64(kdf.salt),
    parallelism: kdf.parallelism,
    iterations: kdf.iterations,
    memorySize: kdf.memorySize,
    hashLength: 32,
    outputType: 'binary',
  })
  return importAesKey(bytes)
}

async function encryptBytes(key, bytes, additionalData) {
  const nonce = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData }, key, bytes)
  return { ciphertext: toBase64(new Uint8Array(ciphertext)), nonce: toBase64(nonce) }
}

async function decryptBytes(key, envelope, additionalData) {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.nonce), additionalData },
    key,
    fromBase64(envelope.ciphertext),
  )
}

function wrapAad(kind) {
  return encoder.encode(`visual-workspace:v${CRYPTO_VERSION}:${kind}`)
}

export async function createVaultKeys(masterPassword) {
  const vaultKeyBytes = randomBytes(32)
  const vaultKey = await importAesKey(vaultKeyBytes)
  const recoveryKeyBytes = randomBytes(32)
  const recoveryKey = await importAesKey(recoveryKeyBytes)
  const kdf = { name: 'argon2id', salt: toBase64(randomBytes(16)), iterations: 3, memorySize: 19456, parallelism: 1 }
  const masterKey = await deriveMasterKey(masterPassword, kdf)

  return {
    vaultKey,
    recoveryKey: toBase64(recoveryKeyBytes),
    config: {
      crypto_version: CRYPTO_VERSION,
      kdf,
      master_wrapped_key: await encryptBytes(masterKey, vaultKeyBytes, wrapAad('master-key')),
      recovery_wrapped_key: await encryptBytes(recoveryKey, vaultKeyBytes, wrapAad('recovery-key')),
    },
  }
}

export async function unlockWithMaster(masterPassword, config) {
  const masterKey = await deriveMasterKey(masterPassword, config.kdf)
  const vaultKeyBytes = await decryptBytes(masterKey, config.master_wrapped_key, wrapAad('master-key'))
  return importAesKey(vaultKeyBytes)
}

export async function unlockWithRecovery(recoveryKeyValue, config) {
  const recoveryKey = await importAesKey(fromBase64(recoveryKeyValue.trim()))
  const vaultKeyBytes = await decryptBytes(recoveryKey, config.recovery_wrapped_key, wrapAad('recovery-key'))
  return importAesKey(vaultKeyBytes)
}

export async function rewrapVaultKey(vaultKey, masterPassword) {
  const rawVaultKey = new Uint8Array(await crypto.subtle.exportKey('raw', vaultKey))
  const recoveryKeyBytes = randomBytes(32)
  const recoveryKey = await importAesKey(recoveryKeyBytes)
  const kdf = { name: 'argon2id', salt: toBase64(randomBytes(16)), iterations: 3, memorySize: 19456, parallelism: 1 }
  const masterKey = await deriveMasterKey(masterPassword, kdf)
  return {
    recoveryKey: toBase64(recoveryKeyBytes),
    config: {
      crypto_version: CRYPTO_VERSION,
      kdf,
      master_wrapped_key: await encryptBytes(masterKey, rawVaultKey, wrapAad('master-key')),
      recovery_wrapped_key: await encryptBytes(recoveryKey, rawVaultKey, wrapAad('recovery-key')),
    },
  }
}

export async function createRecoveryKeyWrap(vaultKey) {
  const rawVaultKey = new Uint8Array(await crypto.subtle.exportKey('raw', vaultKey))
  const recoveryKeyBytes = randomBytes(32)
  const recoveryKey = await importAesKey(recoveryKeyBytes)
  return {
    recoveryKey: toBase64(recoveryKeyBytes),
    recoveryWrappedKey: await encryptBytes(recoveryKey, rawVaultKey, wrapAad('recovery-key')),
  }
}

export async function encryptEntry(vaultKey, id, entry) {
  const envelope = await encryptBytes(vaultKey, encoder.encode(JSON.stringify(entry)), wrapAad(`entry:${id}`))
  return { id, ...envelope, crypto_version: CRYPTO_VERSION }
}

export async function decryptEntry(vaultKey, encryptedEntry) {
  const bytes = await decryptBytes(vaultKey, encryptedEntry, wrapAad(`entry:${encryptedEntry.id}`))
  return { id: encryptedEntry.id, ...JSON.parse(decoder.decode(bytes)), updatedAt: encryptedEntry.updated_at }
}