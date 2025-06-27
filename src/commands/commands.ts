import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { registerFileSelectionCommand } from './fileSelection';
import { registerCompileCommand } from 'commands/compiler';
import { registerRunCommand } from 'commands/runner';
import { registerCompileAndRunCommand } from 'commands/compileAndRun';
import { registerStopCommand } from 'commands/stopPico8Process';

const STORAGE_KEY = 'pico8.selectedFiles';

export function registerCommands(context: vscode.ExtensionContext, client: LanguageClient) {
  registerFileSelectionCommand(context, client, STORAGE_KEY);
  registerCompileCommand(context);
  registerRunCommand(context);
  registerCompileAndRunCommand(context);
  registerStopCommand(context);
}

export async function notifyInitialSelection(
  context: vscode.ExtensionContext,
  client: LanguageClient
) {
  const stored: string[] | undefined = context.workspaceState.get('pico8.selectedFiles');
  if (stored !== undefined) {
    client.sendNotification('pico8/updateSelectedFiles', stored);
  }
}
