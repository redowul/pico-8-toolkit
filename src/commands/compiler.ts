import * as vscode from 'vscode';
import { combineP8Files } from 'p8Combiner';

export function registerCompileCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico-8.compile', async () => {
      const outputPath = vscode.workspace.getConfiguration('pico8').get<string>('outputPath');
      if (!outputPath || outputPath.trim() === '') {
        vscode.window.showErrorMessage('No outputPath set in settings (pico8.outputPath).');
        return;
      }
      await combineP8Files(context, outputPath);
    })
  );
}