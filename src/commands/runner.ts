import * as vscode from 'vscode';
import { runPico8WithSpawn } from 'pico8ProcessManager';

export function registerRunCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico-8.run', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      const document = editor.document;
      const filePath = document.uri.fsPath;

      if (!filePath.endsWith('.p8')) {
        vscode.window.showErrorMessage('The active file is not a .p8 file.');
        return;
      }

      await runPico8WithSpawn(filePath);
    })
  );
}
