"use client";

interface FilterBarProps {
  accounts: string[];
  selectedAccount: string;
  selectedHolding: string;
  onAccountChange: (value: string) => void;
  onHoldingChange: (value: string) => void;
  onClear: () => void;
}

export function FilterBar({
  accounts,
  selectedAccount,
  selectedHolding,
  onAccountChange,
  onHoldingChange,
  onClear,
}: FilterBarProps) {
  const hasFilters = selectedAccount || selectedHolding;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-terminal-green/20">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span className="text-terminal-cyan">$</span>
        <span>filter</span>
      </div>

      {/* Account Filter */}
      <div className="flex items-center gap-2">
        <label className="text-text-muted text-sm">--account</label>
        <select
          value={selectedAccount}
          onChange={(e) => onAccountChange(e.target.value)}
          className="bg-black/50 border border-terminal-green/30 text-terminal-green
                     text-sm px-3 py-1.5 min-w-[150px]
                     focus:border-terminal-green focus:outline-none"
        >
          <option value="">All Accounts</option>
          {accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>
      </div>

      {/* Holding Filter */}
      <div className="flex items-center gap-2">
        <label className="text-text-muted text-sm">--holding</label>
        <input
          type="text"
          value={selectedHolding}
          onChange={(e) => onHoldingChange(e.target.value)}
          placeholder="Search holdings..."
          className="bg-black/50 border border-terminal-green/30 text-terminal-green
                     text-sm px-3 py-1.5 w-[180px]
                     focus:border-terminal-green focus:outline-none
                     placeholder:text-text-muted"
        />
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-terminal-magenta text-sm hover:text-terminal-magenta/80 transition-colors"
        >
          [clear]
        </button>
      )}
    </div>
  );
}
