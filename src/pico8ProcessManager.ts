import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { expandHome } from 'utils';

let pico8Process: ChildProcess | null = null;

export function runPico8WithSpawn(filePath: string) {
  const config = vscode.workspace.getConfiguration('pico8');
  const pico8Path = config.get<string>('pico8Path');
  if (!pico8Path) {
    vscode.window.showErrorMessage('Set pico8.pico8Path in settings first.');
    return;
  }

  const binary = expandHome(pico8Path);
  const target = expandHome(filePath);

  if (!fs.existsSync(binary) || !fs.existsSync(target)) {
    vscode.window.showErrorMessage('PICO-8 binary or target file not found.');
    return;
  }

  pico8Process = spawn(binary, ['-run', target], {
    detached: process.platform !== 'win32',
    stdio: 'ignore',
  });

  pico8Process.unref();
}

export function getPico8Process(): ChildProcess | null {
  return pico8Process;
}

export function clearPico8Process() {
  pico8Process = null;
}
