export function createSlug(input: string) {
  const normalized = input
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/[’'"“”]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || `item-${crypto.randomUUID().slice(0, 8)}`;
}

export function isSafeSlug(value: string) {
  return /^(?!-)[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(
    value,
  );
}
