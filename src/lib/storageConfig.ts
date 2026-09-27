export function getMaxAccountStorageMb(): number {
  const envVal =
    process.env.MAX_ACCOUNT_STORAGE_MB ||
    process.env.NEXT_PUBLIC_MAX_ACCOUNT_STORAGE_MB;
  const parsed = parseInt(envVal || '50', 10);
  return isNaN(parsed) || parsed <= 0 ? 50 : parsed;
}

export function getMaxAccountStorageBytes(): number {
  return getMaxAccountStorageMb() * 1024 * 1024;
}
