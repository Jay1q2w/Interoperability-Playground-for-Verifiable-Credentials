import { 
  ModuleItem, 
  ProfileItem, 
  TamperItem, 
  InteropRunRecord, 
  MatrixStats,
  IssuerId,
  WalletId,
  VerifierId,
  CredentialFormat,
  CredentialProfileId,
  TamperScenario,
  ProtocolExchangeStep
} from '../types';

const API_BASE = '/api';

export async function fetchModules(): Promise<{
  issuers: ModuleItem[];
  wallets: ModuleItem[];
  verifiers: ModuleItem[];
  profiles: Record<CredentialProfileId, ProfileItem>;
  tamperScenarios: TamperItem[];
}> {
  const res = await fetch(`${API_BASE}/config/modules`);
  if (!res.ok) throw new Error('Failed to load configuration modules');
  return res.json();
}

export async function runSingleFlow(params: {
  issuerId: IssuerId;
  walletId: WalletId;
  verifierId: VerifierId;
  format: CredentialFormat;
  profileId: CredentialProfileId;
  tamperScenario: TamperScenario;
  selectedClaims?: string[];
}): Promise<InteropRunRecord> {
  const res = await fetch(`${API_BASE}/interop/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to execute interop run');
  }
  return res.json();
}

export async function runTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: InteropRunRecord[];
}> {
  const res = await fetch(`${API_BASE}/interop/suite`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to run automated test suite');
  return res.json();
}

export async function fetchRuns(filter?: {
  issuerId?: string;
  walletId?: string;
  verifierId?: string;
  format?: string;
  outcome?: string;
}): Promise<{ count: number; runs: InteropRunRecord[] }> {
  const params = new URLSearchParams();
  if (filter?.issuerId) params.append('issuerId', filter.issuerId);
  if (filter?.walletId) params.append('walletId', filter.walletId);
  if (filter?.verifierId) params.append('verifierId', filter.verifierId);
  if (filter?.format) params.append('format', filter.format);
  if (filter?.outcome) params.append('outcome', filter.outcome);

  const res = await fetch(`${API_BASE}/matrix/runs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function fetchStats(): Promise<MatrixStats> {
  const res = await fetch(`${API_BASE}/matrix/stats`);
  if (!res.ok) throw new Error('Failed to fetch matrix stats');
  return res.json();
}

export async function clearRuns(): Promise<void> {
  await fetch(`${API_BASE}/matrix/runs`, { method: 'DELETE' });
}

export function subscribeWebSocket(
  onStep: (step: ProtocolExchangeStep) => void,
  onRunComplete: (run: InteropRunRecord) => void,
  onProgress?: (progress: { current: number; total: number }) => void
): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  let ws: WebSocket | null = null;
  let isClosed = false;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STEP_PROCESSED' && msg.payload) {
          onStep(msg.payload);
        } else if (msg.type === 'RUN_COMPLETED' && msg.payload) {
          onRunComplete(msg.payload);
        } else if (msg.type === 'SUITE_PROGRESS' && msg.payload && onProgress) {
          onProgress(msg.payload);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      if (!isClosed) {
        setTimeout(connect, 3000); // reconnect
      }
    };
  }

  connect();

  return () => {
    isClosed = true;
    if (ws) ws.close();
  };
}
