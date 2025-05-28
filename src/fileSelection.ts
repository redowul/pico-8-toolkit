// fileSelection.ts
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { combineP8Files } from './p8Combiner';

export function registerFileSelectionCommand(
  context: vscode.ExtensionContext,
  client: LanguageClient,
  storageKey: string
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico8-directory.selectFiles', async () => {
      const allFiles = await vscode.workspace.findFiles('**/*.p8');
      const stored: string[] | undefined = context.workspaceState.get(storageKey);
      const previouslySelected = new Set(stored ?? []);
      const isFirstTime = stored === undefined;

      const selectableItems = allFiles.map(uri => ({
        label: vscode.workspace.asRelativePath(uri),
        picked: isFirstTime ? true : previouslySelected.has(uri.fsPath),
        alwaysShow: true
      }));

      const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
      quickPick.title = 'Select PICO-8 Files';
      quickPick.placeholder = 'Toggle files to include for token counting and compilation';
      quickPick.canSelectMany = true;
      quickPick.items = selectableItems;
      quickPick.selectedItems = selectableItems.filter(item => item.picked);
      quickPick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('file-code'),
          tooltip: 'Combine selected files to .p8'
        }
      ];

      const resolvePaths = () =>
        quickPick.selectedItems
          .map(item => {
            const match = allFiles.find(f => vscode.workspace.asRelativePath(f) === item.label);
            return match?.fsPath ?? '';
          })
          .filter(Boolean);

      quickPick.onDidAccept(async () => {
        const selectedPaths = resolvePaths();
        await context.workspaceState.update(storageKey, selectedPaths);
        vscode.window.showInformationMessage(`Selected ${selectedPaths.length} file(s) for PICO-8.`);
        client.sendNotification('pico8/updateSelectedFiles', selectedPaths);
        quickPick.hide();
      });

      quickPick.onDidTriggerButton(async () => {
        const selectedPaths = resolvePaths();
        await context.workspaceState.update(storageKey, selectedPaths);
        client.sendNotification('pico8/updateSelectedFiles', selectedPaths);
        await combineP8Files(context);
        quickPick.hide();
      });

      quickPick.show();
    })
  );
}
