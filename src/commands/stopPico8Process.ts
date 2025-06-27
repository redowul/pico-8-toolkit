import * as vscode from 'vscode';
import * as os from 'os';
import { getPico8Process, clearPico8Process } from 'pico8ProcessManager';

export function registerStopCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pico-8.stop', () => {
      const processRef = getPico8Process();

      if (processRef?.pid !== undefined) {
        try {
          if (os.platform() === 'win32') {
            processRef.kill();
          } else {
            process.kill(-processRef.pid);
          }
          vscode.window.showInformationMessage('PICO-8 stopped.');
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to stop PICO-8: ${(err as Error).message}`);
        } finally {
          clearPico8Process();
        }
      } else {
        vscode.window.showWarningMessage('No running PICO-8 process found.');
      }
    })
  );
}
