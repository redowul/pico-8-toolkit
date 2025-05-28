// compiler.ts
import * as vscode from 'vscode';
import { combineP8Files } from './p8Combiner';

export function registerAutoCompileCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico8-directory.autoCompile', async () => {
      const outputPath = vscode.workspace.getConfiguration('pico8Directory').get<string>('outputPath');
      if (!outputPath || outputPath.trim() === '') {
        vscode.window.showErrorMessage('No outputPath set in settings (pico8Directory.outputPath).');
        return;
      }
      await combineP8Files(context, outputPath);
    })
  );
}
