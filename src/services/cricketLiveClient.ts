import type { LiveCricketDetail, LiveCricketMatch } from '../types';

export interface CricketStreamCallbacks {
  onMatches: (matches: LiveCricketMatch[], fetchedAt: string) => void;
  onDetail?: (detail: LiveCricketDetail) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export async function fetchCricketMatchesRest(): Promise<{
  matches: LiveCricketMatch[];
  fetchedAt: string;
}> {
  const res = await fetch('/api/cricket/matches');
  if (!res.ok) {
    throw new Error(`Failed to fetch live cricket matches (${res.status})`);
  }
  const data = (await res.json()) as {
    success?: boolean;
    matches?: LiveCricketMatch[];
    fetchedAt?: string;
    error?: string;
  };
  if (!data.success) {
    throw new Error(data.error || 'Cricket feed unavailable');
  }
  return {
    matches: Array.isArray(data.matches) ? data.matches : [],
    fetchedAt: data.fetchedAt || new Date().toISOString()
  };
}

export async function fetchCricketMatchDetailRest(
  leagueId: string,
  eventId: string
): Promise<LiveCricketDetail> {
  const res = await fetch(
    `/api/cricket/match/${encodeURIComponent(leagueId)}/${encodeURIComponent(eventId)}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch match scorecard (${res.status})`);
  }
  const data = (await res.json()) as {
    success?: boolean;
    detail?: LiveCricketDetail;
    error?: string;
  };
  if (!data.success || !data.detail) {
    throw new Error(data.error || 'Match scorecard unavailable');
  }
  return data.detail;
}

export class CricketLiveClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private closed = false;
  private callbacks: CricketStreamCallbacks;
  private subscribedMatch: { leagueId: string; eventId: string } | null = null;

  constructor(callbacks: CricketStreamCallbacks) {
    this.callbacks = callbacks;
  }

  start() {
    this.closed = false;
    this.connect();
  }

  stop() {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.callbacks.onConnectionChange?.(false);
  }

  subscribeMatch(leagueId: string, eventId: string) {
    this.subscribedMatch = { leagueId, eventId };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe_match', leagueId, eventId }));
    }
  }

  requestRefresh() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'refresh' }));
    }
  }

  private connect() {
    if (this.closed || typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/cricket`;

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.closed) {
          socket.close();
          return;
        }
        this.callbacks.onConnectionChange?.(true);
        if (this.subscribedMatch) {
          socket.send(
            JSON.stringify({
              type: 'subscribe_match',
              leagueId: this.subscribedMatch.leagueId,
              eventId: this.subscribedMatch.eventId
            })
          );
        }
      };

      socket.onmessage = event => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            matches?: LiveCricketMatch[];
            fetchedAt?: string;
            detail?: LiveCricketDetail;
          };
          if (msg.type === 'cricket:matches' && Array.isArray(msg.matches)) {
            this.callbacks.onMatches(msg.matches, msg.fetchedAt || new Date().toISOString());
          } else if (msg.type === 'cricket:detail' && msg.detail) {
            this.callbacks.onDetail?.(msg.detail);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = () => {
        this.callbacks.onConnectionChange?.(false);
        this.ws = null;
        if (!this.closed) {
          this.reconnectTimer = window.setTimeout(() => this.connect(), 5000);
        }
      };

      socket.onerror = () => {
        // onclose handles reconnect
      };
    } catch {
      this.callbacks.onConnectionChange?.(false);
      if (!this.closed) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 6000);
      }
    }
  }
}
