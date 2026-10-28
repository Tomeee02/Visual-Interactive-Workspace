import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { createRecoveryKeyWrap, createVaultKeys, decryptEntry, encryptEntry, rewrapVaultKey, unlockWithMaster, unlockWithRecovery } from '../security/vaultCrypto'

export const useVaultStore = defineStore('vault', () => {
  const config = ref(null)
  const entries = ref([])
  const vaultKey = ref(null)
  const loading = ref(false)
  const autoLockMinutes = ref(5)
  let lockTimer

  const configured = computed(() => Boolean(config.value?.configured))
  const locked = computed(() => !vaultKey.value)

  function lock() {
    clearTimeout(lockTimer)
    vaultKey.value = null
    entries.value = []
  }

  function touch() {
    if (locked.value) return
    clearTimeout(lockTimer)
    lockTimer = setTimeout(lock, autoLockMinutes.value * 60 * 1000)
  }

  async function loadConfig() {
    config.value = await api.getVault()
    const preferences = await api.getPreferences()
    autoLockMinutes.value = preferences.vaultAutoLockMinutes || 5
    return config.value
  }

  async function setup(masterPassword) {
    loading.value = true
    try {
      const created = await createVaultKeys(masterPassword)
      config.value = await api.createVault(created.config)
      vaultKey.value = created.vaultKey
      entries.value = []
      touch()
      return created.recoveryKey
    } finally {
      loading.value = false
    }
  }

  async function loadEntries() {
    const encryptedEntries = await api.getVaultEntries()
    entries.value = await Promise.all(encryptedEntries.map(entry => decryptEntry(vaultKey.value, entry)))
  }

  async function unlock(secret, recovery = false) {
    loading.value = true
    try {
      vaultKey.value = recovery
        ? await unlockWithRecovery(secret, config.value)
        : await unlockWithMaster(secret, config.value)
      await loadEntries()
      touch()
    } catch (error) {
      lock()
      throw new Error('A Vault nem oldható fel a megadott kulccsal.')
    } finally {
      loading.value = false
    }
  }

  async function createEntry(entry) {
    const id = crypto.randomUUID()
    const encrypted = await encryptEntry(vaultKey.value, id, entry)
    const saved = await api.createVaultEntry(encrypted)
    entries.value.unshift({ id: saved.id, ...entry, updatedAt: saved.updated_at })
    touch()
  }

  async function updateEntry(id, entry) {
    const encrypted = await encryptEntry(vaultKey.value, id, entry)
    const saved = await api.updateVaultEntry(id, encrypted)
    const index = entries.value.findIndex(item => item.id === id)
    entries.value[index] = { id, ...entry, updatedAt: saved.updated_at }
    touch()
  }

  async function deleteEntry(id) {
    await api.deleteVaultEntry(id)
    entries.value = entries.value.filter(entry => entry.id !== id)
    touch()
  }

  async function importEntries(importedEntries) {
    if (locked.value) throw new Error('Oldd fel előbb a Vaultot.')
    const encryptedEntries = await Promise.all(importedEntries.map(entry => {
      const id = crypto.randomUUID()
      return encryptEntry(vaultKey.value, id, entry)
    }))
    const savedEntries = []
    for (let offset = 0; offset < encryptedEntries.length; offset += 500) {
      const savedBatch = await api.createVaultEntries(encryptedEntries.slice(offset, offset + 500))
      savedEntries.push(...savedBatch)
    }
    entries.value.unshift(...savedEntries.map((saved, index) => ({ id: saved.id, ...importedEntries[index], updatedAt: saved.updated_at })))
    touch()
  }

  async function changeMasterPassword(masterPassword) {
    if (locked.value) throw new Error('Oldd fel előbb a Vaultot.')
    const wrapped = await rewrapVaultKey(vaultKey.value, masterPassword)
    config.value = await api.updateVault({ ...wrapped.config, revision: config.value.revision })
    touch()
    return wrapped.recoveryKey
  }

  async function regenerateRecoveryKey() {
    if (locked.value) throw new Error('Oldd fel előbb a Vaultot.')
    const rotated = await createRecoveryKeyWrap(vaultKey.value)
    config.value = await api.updateVault({
      recovery_wrapped_key: rotated.recoveryWrappedKey,
      revision: config.value.revision,
    })
    touch()
    return rotated.recoveryKey
  }

  return { config, entries, loading, autoLockMinutes, configured, locked, loadConfig, setup, unlock, lock, touch, createEntry, updateEntry, deleteEntry, importEntries, changeMasterPassword, regenerateRecoveryKey }
})