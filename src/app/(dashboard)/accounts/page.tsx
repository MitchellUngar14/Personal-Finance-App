"use client";

import { useState, useEffect, useCallback } from "react";
import { Terminal } from "@/components/layout/Terminal";
import { formatCurrency } from "@/lib/utils";

interface ExternalAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountType: string | null;
  createdAt: string;
  latestValue: number | null;
  latestRecordedAt: string | null;
  entryCount: number;
}

interface AccountEntry {
  id: number;
  accountId: number;
  value: number;
  note: string | null;
  recordedAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ExternalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for new account
  const [newBankName, setNewBankName] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newInitialValue, setNewInitialValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update value modal state
  const [selectedAccount, setSelectedAccount] = useState<ExternalAccount | null>(null);
  const [updateValue, setUpdateValue] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // History modal state
  const [historyAccount, setHistoryAccount] = useState<ExternalAccount | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AccountEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/external-accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newAccountName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/external-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: newBankName,
          accountName: newAccountName,
          accountType: newAccountType || null,
          initialValue: newInitialValue ? parseFloat(newInitialValue) : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create account");

      // Reset form and refresh
      setNewBankName("");
      setNewAccountName("");
      setNewAccountType("");
      setNewInitialValue("");
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateValue = async () => {
    if (!selectedAccount || !updateValue) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/external-accounts/${selectedAccount.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: parseFloat(updateValue),
          note: updateNote || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update value");

      setSelectedAccount(null);
      setUpdateValue("");
      setUpdateNote("");
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update value");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm("Are you sure you want to delete this account and all its history?")) return;

    try {
      const res = await fetch(`/api/external-accounts/${accountId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete account");
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  };

  const handleViewHistory = async (account: ExternalAccount) => {
    setHistoryAccount(account);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/external-accounts/${account.id}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistoryEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Debt account types
  const debtTypes = ["Mortgage", "Loan", "Credit Card"];

  // Separate assets and debts
  const assetAccounts = accounts.filter(a => !debtTypes.includes(a.accountType || ""));
  const debtAccounts = accounts.filter(a => debtTypes.includes(a.accountType || ""));

  // Group accounts by bank
  const accountsByBank = accounts.reduce((acc, account) => {
    if (!acc[account.bankName]) {
      acc[account.bankName] = [];
    }
    acc[account.bankName].push(account);
    return acc;
  }, {} as Record<string, ExternalAccount[]>);

  // Calculate totals
  const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.latestValue || 0), 0);
  const totalDebt = debtAccounts.reduce((sum, a) => sum + Math.abs(a.latestValue || 0), 0);
  const netWorth = totalAssets - totalDebt;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> external_accounts
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Track balances from other banks and institutions
        </p>
      </div>

      {error && (
        <div className="bg-terminal-red/10 border border-terminal-red/30 text-terminal-red p-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Add Account Form */}
      <Terminal title="add_account">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-terminal-cyan text-xs mb-1">Bank/Institution *</label>
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="BMO, TD, Wealthsimple..."
                className="w-full px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-terminal-cyan text-xs mb-1">Account Name *</label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Chequing, Savings, TFSA..."
                className="w-full px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-terminal-cyan text-xs mb-1">Account Type</label>
              <select
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value)}
                className="w-full px-3 py-2 text-sm"
              >
                <option value="">Select type...</option>
                <option value="Chequing">Chequing</option>
                <option value="Savings">Savings</option>
                <option value="TFSA">TFSA</option>
                <option value="RRSP">RRSP</option>
                <option value="RESP">RESP</option>
                <option value="Investment">Investment</option>
                <option value="Mortgage">Mortgage</option>
                <option value="Loan">Loan</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-terminal-cyan text-xs mb-1">Initial Value</label>
              <input
                type="number"
                step="0.01"
                value={newInitialValue}
                onChange={(e) => setNewInitialValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newBankName.trim() || !newAccountName.trim()}
            className="btn-terminal text-sm disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "[+ ADD ACCOUNT]"}
          </button>
        </form>
      </Terminal>

      {/* Total Summary */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Total External Assets</div>
            <div className="text-xl sm:text-2xl text-terminal-green font-bold tabular-nums">
              {formatCurrency(totalAssets)}
            </div>
            <div className="text-text-muted text-xs mt-1">
              {assetAccounts.length} account{assetAccounts.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Total External Debt</div>
            <div className="text-xl sm:text-2xl text-terminal-magenta font-bold tabular-nums">
              {formatCurrency(totalDebt)}
            </div>
            <div className="text-text-muted text-xs mt-1">
              {debtAccounts.length} account{debtAccounts.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Net External Worth</div>
            <div className={`text-xl sm:text-2xl font-bold tabular-nums ${netWorth >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
              {formatCurrency(netWorth)}
            </div>
            <div className="text-text-muted text-xs mt-1">
              {Object.keys(accountsByBank).length} institution{Object.keys(accountsByBank).length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="loading-spinner mx-auto mb-2" />
          <span className="text-text-muted">Loading accounts...</span>
        </div>
      ) : accounts.length === 0 ? (
        <Terminal title="accounts">
          <div className="text-center py-8 text-text-muted">
            <p>No external accounts yet.</p>
            <p className="text-sm mt-1">Add your first account above to start tracking.</p>
          </div>
        </Terminal>
      ) : (
        <div className="space-y-4">
          {Object.entries(accountsByBank).map(([bankName, bankAccounts]) => (
            <Terminal key={bankName} title={bankName.toLowerCase().replace(/\s+/g, "_")}>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-terminal-green/20 pb-2">
                  <h3 className="text-terminal-green font-bold">{bankName}</h3>
                  <span className="text-sm">
                    {(() => {
                      const bankAssets = bankAccounts
                        .filter(a => !debtTypes.includes(a.accountType || ""))
                        .reduce((sum, a) => sum + (a.latestValue || 0), 0);
                      const bankDebt = bankAccounts
                        .filter(a => debtTypes.includes(a.accountType || ""))
                        .reduce((sum, a) => sum + Math.abs(a.latestValue || 0), 0);
                      const bankNet = bankAssets - bankDebt;
                      return (
                        <span className={bankNet >= 0 ? "text-terminal-green" : "text-terminal-magenta"}>
                          {formatCurrency(bankNet)}
                        </span>
                      );
                    })()}
                  </span>
                </div>
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-3 bg-terminal-bg/50 border border-terminal-green/10 hover:border-terminal-green/30 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-text-primary">{account.accountName}</span>
                            {account.accountType && (
                              <span className="text-xs text-terminal-cyan border border-terminal-cyan/30 px-1.5 py-0.5">
                                {account.accountType}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {account.latestRecordedAt
                              ? `Updated: ${new Date(account.latestRecordedAt).toLocaleDateString()}`
                              : "No value"}
                          </div>
                        </div>
                        <span className={`text-base tabular-nums font-bold flex-shrink-0 ${
                          debtTypes.includes(account.accountType || "") ? "text-terminal-magenta" : "text-terminal-green"
                        }`}>
                          {account.latestValue !== null ? (
                            debtTypes.includes(account.accountType || "")
                              ? `-${formatCurrency(Math.abs(account.latestValue))}`
                              : formatCurrency(account.latestValue)
                          ) : "—"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setUpdateValue(account.latestValue?.toString() || "");
                          }}
                          className="text-terminal-cyan hover:bg-terminal-cyan/10 px-2 py-1 text-xs border border-terminal-cyan/30 transition-colors flex-1"
                        >
                          UPDATE
                        </button>
                        <button
                          onClick={() => handleViewHistory(account)}
                          className="text-terminal-yellow hover:bg-terminal-yellow/10 px-2 py-1 text-xs border border-terminal-yellow/30 transition-colors flex-1"
                        >
                          HISTORY
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-terminal-magenta hover:bg-terminal-magenta/10 px-2 py-1 text-xs border border-terminal-magenta/30 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary">{account.accountName}</span>
                          {account.accountType && (
                            <span className="text-xs text-terminal-cyan border border-terminal-cyan/30 px-1.5 py-0.5">
                              {account.accountType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {account.latestRecordedAt
                            ? `Last updated: ${new Date(account.latestRecordedAt).toLocaleDateString()}`
                            : "No value recorded"}
                          {account.entryCount > 0 && ` • ${account.entryCount} entries`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-lg tabular-nums font-bold ${
                          debtTypes.includes(account.accountType || "") ? "text-terminal-magenta" : "text-terminal-green"
                        }`}>
                          {account.latestValue !== null ? (
                            debtTypes.includes(account.accountType || "")
                              ? `-${formatCurrency(Math.abs(account.latestValue))}`
                              : formatCurrency(account.latestValue)
                          ) : "—"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedAccount(account);
                              setUpdateValue(account.latestValue?.toString() || "");
                            }}
                            className="text-terminal-cyan hover:bg-terminal-cyan/10 px-2 py-1 text-xs border border-terminal-cyan/30 transition-colors"
                          >
                            UPDATE
                          </button>
                          <button
                            onClick={() => handleViewHistory(account)}
                            className="text-terminal-yellow hover:bg-terminal-yellow/10 px-2 py-1 text-xs border border-terminal-yellow/30 transition-colors"
                          >
                            HISTORY
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-terminal-magenta hover:bg-terminal-magenta/10 px-2 py-1 text-xs border border-terminal-magenta/30 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Terminal>
          ))}
        </div>
      )}

      {/* Update Value Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-terminal-bg-card border border-terminal-green/30 w-full max-w-md">
            <div className="terminal-header">
              <div className="flex gap-1.5">
                <div className="terminal-dot terminal-dot-red" />
                <div className="terminal-dot terminal-dot-yellow" />
                <div className="terminal-dot terminal-dot-green" />
              </div>
              <span className="text-text-muted text-sm ml-3">~/update_value</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-terminal-green font-bold">{selectedAccount.bankName}</div>
                <div className="text-text-secondary">{selectedAccount.accountName}</div>
              </div>
              <div>
                <label className="block text-terminal-cyan text-xs mb-1">New Value *</label>
                <input
                  type="number"
                  step="0.01"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-terminal-cyan text-xs mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder="Monthly update, deposit, etc."
                  className="w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateValue}
                  disabled={isUpdating || !updateValue}
                  className="btn-terminal flex-1 text-sm disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "[SAVE]"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAccount(null);
                    setUpdateValue("");
                    setUpdateNote("");
                  }}
                  className="px-4 py-2 text-terminal-magenta border border-terminal-magenta/30 hover:bg-terminal-magenta/10 text-sm transition-colors"
                >
                  [CANCEL]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-terminal-bg-card border border-terminal-green/30 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="terminal-header flex-shrink-0">
              <div className="flex gap-1.5">
                <div className="terminal-dot terminal-dot-red" />
                <div className="terminal-dot terminal-dot-yellow" />
                <div className="terminal-dot terminal-dot-green" />
              </div>
              <span className="text-text-muted text-sm ml-3">~/history</span>
            </div>
            <div className="p-4 flex-shrink-0 border-b border-terminal-green/20">
              <div className="text-terminal-green font-bold">{historyAccount.bankName}</div>
              <div className="text-text-secondary">{historyAccount.accountName}</div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="loading-spinner mx-auto" />
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="text-center py-4 text-text-muted">No history yet</div>
              ) : (
                <div className="space-y-2">
                  {historyEntries.map((entry, index) => {
                    const prevEntry = historyEntries[index + 1];
                    const change = prevEntry ? entry.value - prevEntry.value : 0;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 border border-terminal-green/10 bg-terminal-bg/30"
                      >
                        <div>
                          <div className="text-xs text-text-muted">
                            {new Date(entry.recordedAt).toLocaleString()}
                          </div>
                          {entry.note && (
                            <div className="text-xs text-terminal-cyan mt-0.5">{entry.note}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-terminal-green tabular-nums font-bold">
                            {formatCurrency(entry.value)}
                          </div>
                          {prevEntry && change !== 0 && (
                            <div className={`text-xs tabular-nums ${change >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
                              {change >= 0 ? "+" : ""}{formatCurrency(change)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-terminal-green/20 flex-shrink-0">
              <button
                onClick={() => {
                  setHistoryAccount(null);
                  setHistoryEntries([]);
                }}
                className="w-full py-2 text-terminal-magenta border border-terminal-magenta/30 hover:bg-terminal-magenta/10 text-sm transition-colors"
              >
                [CLOSE]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
