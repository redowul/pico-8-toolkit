import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function initTokenStatus(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(debug-breakpoint-log-unverified) Tokens: ?';
  statusBarItem.tooltip = 'Click to choose which .p8 files are counted';
  statusBarItem.command = 'pico8-directory.selectFiles'; // ← link to the file selection command
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function updateTokenTooltip(data: {
  fileName: string;
  count: number;
  max: number;
  remaining: number;
  files: { file: string; count: number }[];
}) {
  statusBarItem.text = `$(debug-breakpoint-log-unverified) ${data.count} / ${data.max}`;

  let longestFile = data.fileName;
  if (Array.isArray(data.files)) {
    const seen = new Set<string>();
    const decoded = data.files
      .map(f => ({ file: decodeURIComponent(f.file), count: f.count }))
      .filter(f => f.count > 0 && !seen.has(f.file) && seen.add(f.file))
      .sort((a, b) => a.file.localeCompare(b.file));

    longestFile = decoded.reduce((longest, current) =>
      current.file.length > longest.length ? current.file : longest, longestFile);

    const countColumn = longestFile.length + 5;
    const lines: string[] = [];

    lines.push('**PICO-8 Token Usage**');
    lines.push('```');
    for (const { file, count } of decoded) {
      const countStr = count.toString();
      const dashLen = Math.max(2, countColumn - file.length - countStr.length);
      const dashes = '-'.repeat(dashLen);
      lines.push(`${file} ${dashes} ${countStr}`);
    }
    lines.push('```');
    lines.push('');
    lines.push('\n---\n');
    lines.push(`**Total:** ${data.count.toLocaleString()} / ${data.max.toLocaleString()}`);
    lines.push(`**Remaining:** ${data.remaining.toLocaleString()} (${Math.floor((data.remaining / data.max) * 100)}%)`);

    const markdown = new vscode.MarkdownString(lines.join('\n'));
    markdown.supportHtml = false;
    markdown.isTrusted = false;
    statusBarItem.tooltip = markdown;
  } else {
    statusBarItem.tooltip = 'Click to choose which .p8 files are counted';
  }
}
