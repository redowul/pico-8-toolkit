import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { registerCommands, notifyInitialSelection } from 'commands/commands';
import { initTokenStatus, updateTokenTooltip } from 'tokenStatus';
import path from 'path';

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));
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

  client = new LanguageClient('pico-8', 'PICO-8', serverOptions, clientOptions);
  context.subscriptions.push(client);
  await client.start();

  await notifyInitialSelection(context, client);
  initTokenStatus(context);
  registerCommands(context, client);

  client.onNotification('pico8/tokenCount', updateTokenTooltip);
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
