import { ReactNode } from "react";

interface TerminalProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Terminal({ title, children, className = "" }: TerminalProps) {
  return (
    <div className={`terminal-window ${className}`}>
      <div className="terminal-header">
        <div className="flex gap-1.5">
          <div className="terminal-dot terminal-dot-red" />
          <div className="terminal-dot terminal-dot-yellow" />
          <div className="terminal-dot terminal-dot-green" />
        </div>
        {title && (
          <span className="text-text-muted text-sm ml-3">
            ~/finance/{title}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface TerminalLineProps {
  prompt?: string;
  command?: string;
  output?: ReactNode;
  className?: string;
}

export function TerminalLine({
  prompt = "$",
  command,
  output,
  className = "",
}: TerminalLineProps) {
  return (
    <div className={`font-mono ${className}`}>
      {command && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-terminal-cyan">{prompt}</span>
          <span className="text-terminal-green">{command}</span>
          <span className="cursor-blink text-terminal-green">_</span>
        </div>
      )}
      {output && <div className="mt-2 text-text-primary">{output}</div>}
    </div>
  );
}
