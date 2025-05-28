// commands.ts
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { registerFileSelectionCommand } from './fileSelection';
import { registerAutoCompileCommand } from './compiler';

const STORAGE_KEY = 'pico8.selectedFiles';

export function registerCommands(context: vscode.ExtensionContext, client: LanguageClient) {
  registerFileSelectionCommand(context, client, STORAGE_KEY);
  registerAutoCompileCommand(context);
}

export async function notifyInitialSelection(
  context: vscode.ExtensionContext,
  client: LanguageClient
) {
  const stored: string[] | undefined = context.workspaceState.get(STORAGE_KEY);
  if (stored !== undefined) {
    client.sendNotification('pico8/updateSelectedFiles', stored);
  }
}
