import type { Prediction } from '../types';

export function isClosingTimePassed(closingTime: string, nowMs: number = Date.now()): boolean {
  const ts = new Date(closingTime).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts <= nowMs;
}

export function isMarketBettingOpen(
  prediction: Pick<Prediction, 'status' | 'closingTime'>,
  nowMs: number = Date.now()
): boolean {
  return prediction.status === 'open' && !isClosingTimePassed(prediction.closingTime, nowMs);
}

export function toLocalDatetimeInputValue(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatCountdownToClose(closingTime: string, nowMs: number = Date.now()): string {
  const ts = new Date(closingTime).getTime();
  if (!Number.isFinite(ts)) return 'Scheduled';
  const diff = ts - nowMs;
  if (diff <= 0) return 'Closed · Betting Paused';

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  if (mins > 0) return `${mins}m ${secs}s left`;
  return `${secs}s left`;
}
