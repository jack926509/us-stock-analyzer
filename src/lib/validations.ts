/**
 * 驗證股票代碼格式：1-5 個大寫英文字母
 * 所有接受 symbol 參數的 API Route 必須先呼叫此函式
 */
export function validateSymbol(symbol: unknown): symbol is string {
  if (typeof symbol !== "string") return false
  return /^[A-Z]{1,5}$/.test(symbol)
}

/**
 * 將輸入的 symbol 正規化為大寫並驗證
 * 回傳正規化後的 symbol，若無效則回傳 null
 */
export function normalizeSymbol(input: unknown): string | null {
  if (typeof input !== "string") return null
  const upper = input.trim().toUpperCase()
  return validateSymbol(upper) ? upper : null
}
