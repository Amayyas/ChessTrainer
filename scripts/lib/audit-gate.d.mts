export interface Exception {
  id: string
  package: string
  reason: string
  until: string
}
export interface Advisory {
  id: string
  package: string
  severity: string
  title: string
}
export const EXCEPTIONS: Exception[]
export function advisories(report: unknown): Advisory[]
export function evaluate(
  report: unknown,
  exceptions: Exception[],
  today: string,
): { failures: string[]; excused: string[] }
