import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath('out/server.js');
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'pico-8' },
      { scheme: 'file', language: 'pico-8-lua' }
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.p8')
    }
  };

  client = new LanguageClient('pico8-directory', 'PICO-8 Directory', serverOptions, clientOptions);
  context.subscriptions.push(client);

  // Start the language client
  await client.start();

  // Set up and show status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(zap) Tokens: ?';
  statusBarItem.tooltip = 'PICO-8 token usage';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Handle token count updates from the server
  client.onNotification('pico8/tokenCount', (data: {
    fileName: string;
    count: number;
    max: number;
    remaining: number;
    files: { file: string; count: number }[];
  }) => {
    statusBarItem.text = `$(zap) ${data.count} / ${data.max}`;
  
    let longestFile = data.fileName;
    if (Array.isArray(data.files)) {
      const seen = new Set<string>();
      const decoded = data.files
      .map(f => ({
        file: decodeURIComponent(f.file),
        count: f.count
      }))
      .filter(f => f.count > 0 && !seen.has(f.file) && seen.add(f.file))
      .sort((a, b) => a.file.localeCompare(b.file));

      // Find the longest filename
      longestFile = decoded.reduce((longest, current) => 
      current.file.length > longest.length ? current.file : longest, longestFile);

      const countColumn = longestFile.length + 5; // column where count must start
      const lines: string[] = [];
  
      lines.push('**Token Usage**');
      lines.push('```');
      for (const { file, count } of decoded) {
        const countStr = count.toString();
        const dashLen = Math.max(2, countColumn - file.length - countStr.length); // Adjusted to remove extra space
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
      statusBarItem.tooltip = 'PICO-8 token usage';
    }
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
