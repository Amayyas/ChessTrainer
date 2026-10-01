export interface HeaderRule {
  for: string
  values: Record<string, string>
}
export function parseHeaderRules(toml: string): HeaderRule[]
export function matches(pattern: string, path: string): boolean
export function headersFor(rules: HeaderRule[], path: string): Record<string, string>
