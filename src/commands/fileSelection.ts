// fileSelection.ts
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { combineP8Files } from 'p8Combiner';
import { runPico8WithSpawn } from 'pico8ProcessManager';

export function registerFileSelectionCommand(
  context: vscode.ExtensionContext,
  client: LanguageClient,
  storageKey: string
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico-8.selectFiles', async () => {
      const allFiles = await vscode.workspace.findFiles('**/*.p8');
      const stored: string[] | undefined = context.workspaceState.get(storageKey);
      const previouslySelected = new Set(stored ?? []);
      const isFirstTime = stored === undefined;

      const selectableItems = allFiles.map((uri) => ({
        label: vscode.workspace.asRelativePath(uri),
        detail: uri.fsPath,
        picked: isFirstTime ? true : previouslySelected.has(uri.fsPath),
        alwaysShow: true
      }));

      const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
      quickPick.title = 'Select PICO-8 Files';
      quickPick.placeholder = 'Toggle files to include for token counting and compilation';
      quickPick.canSelectMany = true;
      quickPick.items = selectableItems;
      quickPick.selectedItems = selectableItems.filter((item) => item.picked);
      quickPick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('file-code'),
          tooltip: 'Combine selected files to .p8'
        },
        {
          iconPath: new vscode.ThemeIcon('play'),
          tooltip: 'Compile & Run selected files'
        }
      ];

      const resolvePaths = () =>
        quickPick.selectedItems
          .map(item => item.detail ?? '')
          .filter(Boolean);

      quickPick.onDidAccept(async () => {
        const selectedPaths = resolvePaths();
        await context.workspaceState.update(storageKey, selectedPaths);
        vscode.window.showInformationMessage(`Selected ${selectedPaths.length} file(s) for PICO-8.`);
        client.sendNotification('pico8/updateSelectedFiles', selectedPaths);
        quickPick.hide();
      });

      quickPick.onDidTriggerButton(async (button) => {
        const selectedPaths = resolvePaths();
        await context.workspaceState.update(storageKey, selectedPaths);
        client.sendNotification('pico8/updateSelectedFiles', selectedPaths);

        const outputPath = vscode.workspace.getConfiguration('pico8').get<string>('outputPath');
        if (!outputPath || outputPath.trim() === '') {
          vscode.window.showErrorMessage('No outputPath set in settings (pico8.outputPath).');
          quickPick.hide();
          return;
        }

        switch (button.tooltip) {
          case 'Combine selected files to .p8':
            await combineP8Files(context);
            vscode.window.showInformationMessage('Files compiled.');
            break;

          case 'Compile & Run selected files':
            await combineP8Files(context);
            await runPico8WithSpawn(outputPath);
            break;
        }

        quickPick.hide();
      });

      quickPick.show();
    })
  );
}
