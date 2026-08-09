export class DovrutSignalService {
  // Signal is P3; keep a clear capability gate until credentials exist.
  public isConfigured(): boolean {
    return Boolean(
      process.env.SIGNAL_CLI_REST_URL ||
        process.env.SIGNAL_NUMBER ||
        process.env.SIGNAL_API_TOKEN,
    );
  }

  public async sendMessage(_recipient: string, _text: string): Promise<{ ok: boolean; reason: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        reason: "Signal אינו מוגדר עדיין — השתמשו בטלגרם לתזכורות",
      };
    }
    return {
      ok: false,
      reason: "שליחת Signal תתווסף לאחר חיבור signal-cli / API",
    };
  }
}
