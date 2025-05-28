import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const NON_LUA_SECTIONS = ['__gfx__', '__map__', '__sfx__', '__music__', '__label__'];

export async function combineP8Files(context: vscode.ExtensionContext, outputPath?: string): Promise<void> {
  const selectedPaths: string[] | undefined = context.workspaceState.get('pico8.selectedFiles');
  if (!selectedPaths || selectedPaths.length === 0) {
    vscode.window.showWarningMessage('No PICO-8 files selected for combination.');
    return;
  }

  const sectionData: Record<string, string> = {};
  const luaChunks: string[] = [];
  const conflicts: string[] = [];

  for (const filePath of selectedPaths) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to read ${filePath}: ${(err as Error).message}`);
      return;
    }

    const sections = splitIntoSections(content);

    // Handle __lua__
    const lua = sections['__lua__']?.trim();
    if (lua) {
      luaChunks.push(`-->8\n-- ${path.basename(filePath)}\n${lua}`);
    }

    // Handle __gfx__, __map__, etc.
    for (const section of NON_LUA_SECTIONS) {
      if (sections[section]) {
        if (sectionData[section]) {
          conflicts.push(section);
        } else {
          sectionData[section] = sections[section];
        }
      }
    }
  }

  if (conflicts.length > 0) {
    vscode.window.showErrorMessage(
      `Multiple files contain the following sections: ${conflicts.join(', ')}. Only one of each is allowed.`
    );
    return;
  }

  // Compose the output
  let finalOutput = `pico-8 cartridge // http://www.pico-8.com\nversion 36\n__lua__\n`;
  finalOutput += luaChunks.join('\n\n');

  for (const section of NON_LUA_SECTIONS) {
    if (sectionData[section]) {
      finalOutput += `\n${section}\n${sectionData[section].trim()}`;
    }
  }

  // Determine output path
  const baseDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
  let resolvedOutputPath = outputPath?.trim();

  if (!resolvedOutputPath || !resolvedOutputPath.endsWith('.p8')) {
    resolvedOutputPath = path.join(resolvedOutputPath || baseDir, 'combined.p8');
  }

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(resolvedOutputPath),
    filters: { 'PICO-8 Files': ['p8'] },
    saveLabel: 'Save Combined .p8'
  });

  if (saveUri) {
    fs.writeFileSync(saveUri.fsPath, finalOutput, 'utf8');
    vscode.window.showInformationMessage(`Combined file saved to ${saveUri.fsPath}`);
  }
}

function splitIntoSections(content: string): Record<string, string> {
  const lines = content.split('\n');
  const sections: Record<string, string[]> = {};
  let current = '__lua__'; // Default to __lua__
  sections[current] = [];

  for (const line of lines) {
    const match = line.match(/^__(\w+)__$/);
    if (match) {
      current = `__${match[1]}__`;
      sections[current] = [];
    } else {
      if (!sections[current]) sections[current] = [];
      sections[current].push(line);
    }
  }

  const joined: Record<string, string> = {};
  for (const key in sections) {
    joined[key] = sections[key].join('\n');
  }

  return joined;
}
