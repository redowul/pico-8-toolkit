import * as vscode from 'vscode';
import { combineP8Files } from 'p8Combiner';
import { runPico8WithSpawn } from 'pico8ProcessManager';
import { expandHome } from 'utils';

export function registerCompileAndRunCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico-8.compileAndRun', async () => {
      const outputPath = vscode.workspace.getConfiguration('pico8').get<string>('outputPath');
      if (!outputPath || outputPath.trim() === '') {
        vscode.window.showErrorMessage('No outputPath set in settings (pico8.outputPath).');
        return;
      }
      const expanded = expandHome(outputPath);
      await combineP8Files(context, expanded);
      await runPico8WithSpawn(expanded);
    })
  );
}