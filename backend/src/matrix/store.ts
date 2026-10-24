import fs from 'fs';
import path from 'path';
import { InteropRunRecord, VerificationStatus, CredentialFormat, IssuerId, WalletId, VerifierId } from '../types/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');

export interface MatrixFilter {
  issuerId?: IssuerId;
  walletId?: WalletId;
  verifierId?: VerifierId;
  format?: CredentialFormat;
  outcome?: VerificationStatus;
}

export interface CompatibilityCell {
  issuerId: IssuerId;
  walletId: WalletId;
  verifierId: VerifierId;
  format: CredentialFormat;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  lastOutcome: VerificationStatus;
  lastRunTimestamp: string;
}

class MatrixStore {
  private runs: InteropRunRecord[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(RUNS_FILE)) {
        const data = fs.readFileSync(RUNS_FILE, 'utf8');
        this.runs = JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load runs from disk:', err);
      this.runs = [];
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(RUNS_FILE, JSON.stringify(this.runs, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist runs to disk:', err);
    }
  }

  public addRun(run: InteropRunRecord): void {
    this.runs.unshift(run); // most recent first
    if (this.runs.length > 500) {
      this.runs.pop();
    }
    this.persist();
  }

  public getRuns(filter?: MatrixFilter): InteropRunRecord[] {
    if (!filter) return this.runs;

    return this.runs.filter(r => {
      if (filter.issuerId && r.issuer.id !== filter.issuerId) return false;
      if (filter.walletId && r.wallet.id !== filter.walletId) return false;
      if (filter.verifierId && r.verifier.id !== filter.verifierId) return false;
      if (filter.format && r.format !== filter.format) return false;
      if (filter.outcome && r.outcome !== filter.outcome) return false;
      return true;
    });
  }

  public getRunById(id: string): InteropRunRecord | undefined {
    return this.runs.find(r => r.id === id);
  }

  public clearRuns(): void {
    this.runs = [];
    this.persist();
  }

  public getMatrixStats() {
    const total = this.runs.length;
    const passed = this.runs.filter(r => r.passed).length;
    const failed = total - passed;
    const avgLatency = total > 0 
      ? Math.round(this.runs.reduce((acc, r) => acc + r.durationMs, 0) / total)
      : 0;

    // Aggregate by format
    const formatStats: Record<string, { total: number; passed: number }> = {};
    for (const r of this.runs) {
      if (!formatStats[r.format]) {
        formatStats[r.format] = { total: 0, passed: 0 };
      }
      formatStats[r.format].total++;
      if (r.passed) formatStats[r.format].passed++;
    }

    // Aggregate cells (Issuer x Wallet x Verifier x Format)
    const cellMap = new Map<string, CompatibilityCell>();
    for (const r of this.runs) {
      const key = `${r.issuer.id}|${r.wallet.id}|${r.verifier.id}|${r.format}`;
      const existing = cellMap.get(key);
      if (existing) {
        existing.totalRuns++;
        if (r.passed) existing.passedRuns++;
        else existing.failedRuns++;
      } else {
        cellMap.set(key, {
          issuerId: r.issuer.id,
          walletId: r.wallet.id,
          verifierId: r.verifier.id,
          format: r.format,
          totalRuns: 1,
          passedRuns: r.passed ? 1 : 0,
          failedRuns: r.passed ? 0 : 1,
          lastOutcome: r.outcome,
          lastRunTimestamp: r.timestamp
        });
      }
    }

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 100,
      avgLatencyMs: avgLatency,
      formatStats,
      matrixCells: Array.from(cellMap.values())
    };
  }

  public exportMarkdownReport(): string {
    const stats = this.getMatrixStats();
    let md = `# Inji Interoperability Test Matrix & Compliance Report\n\n`;
    md += `Generated on: ${new Date().toISOString()}\n\n`;
    md += `### Summary Metrics\n\n`;
    md += `- **Total Interoperability Runs**: ${stats.total}\n`;
    md += `- **Passed**: ${stats.passed}\n`;
    md += `- **Failed / Rejected Negative Tests**: ${stats.failed}\n`;
    md += `- **Pass Rate**: ${stats.passRate}%\n`;
    md += `- **Average End-to-End Latency**: ${stats.avgLatencyMs} ms\n\n`;

    md += `### Module Combinations Matrix\n\n`;
    md += `| Issuer | Wallet | Verifier | Format | Total | Pass | Fail | Last Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n`;

    for (const cell of stats.matrixCells) {
      const badge = cell.lastOutcome === 'VALID' ? '✅ PASS' : `⚠️ ${cell.lastOutcome}`;
      md += `| ${cell.issuerId} | ${cell.walletId} | ${cell.verifierId} | \`${cell.format}\` | ${cell.totalRuns} | ${cell.passedRuns} | ${cell.failedRuns} | ${badge} |\n`;
    }

    md += `\n### Recent Runs Log\n\n`;
    md += `| Timestamp | Combination | Format | Tamper Mode | Outcome | Latency |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :---: |\n`;

    for (const r of this.runs.slice(0, 20)) {
      md += `| ${r.timestamp.substring(11, 19)} | ${r.issuer.id} → ${r.wallet.id} → ${r.verifier.id} | \`${r.format}\` | \`${r.tamperScenario}\` | **${r.outcome}** | ${r.durationMs}ms |\n`;
    }

    return md;
  }
}

export const matrixStore = new MatrixStore();
