import { createConnection, TextDocuments, TextDocumentSyncKind, InitializeParams, DidChangeWatchedFilesParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'path';
import * as fs from 'fs';
import { countTokensInText } from './tokenizer'; // 🆕 import tokenizer module

if (process.env.VSCODE_TEST !== 'true') {
  const connection = createConnection();
  const documents = new TextDocuments(TextDocument);
  let selectedFilePaths: Set<string> | null = null;

  const TOKEN_MAX = 8192;

  function countTokensInFile(filePath: string): { fileName: string; count: number } {
    const text = fs.readFileSync(filePath, 'utf8');
    const firstLine = text.split('\n')[0].trim();
    if (firstLine === '__gfx__') {
      return {
        fileName: path.basename(filePath), count: 0
      };
    }
    const count = countTokensInText(text);
    return { fileName: path.basename(filePath), count };
  }

  function sendTotalTokenStatus() {
    let diskCounts: { fileName: string; count: number }[] = [];

    if (selectedFilePaths && selectedFilePaths.size > 0) {
      diskCounts = [...selectedFilePaths].map(countTokensInFile);
    } else {
      const cwd = process.cwd();
      const allFiles = fs.readdirSync(cwd)
        .filter(f => f.endsWith('.p8'))
        .map(f => path.resolve(path.join(cwd, f)))
        .filter(p => fs.statSync(p).isFile());

      diskCounts = allFiles.map(countTokensInFile);
    }

    const fileCounts: Record<string, number> = {};

    for (const { fileName, count } of diskCounts) {
      fileCounts[fileName] = count;
    }

    for (const doc of documents.all()) {
      const fsPath = path.resolve(new URL(doc.uri).pathname);
      const fileName = path.basename(fsPath);

      const usingSelection = selectedFilePaths !== null;
      const shouldInclude = !usingSelection || (selectedFilePaths !== null && selectedFilePaths.has(fsPath));

      if (shouldInclude && fileName.endsWith('.p8')) {
        const text = doc.getText();
        const firstLine = text.split('\n')[0].trim();
        const count = firstLine === '__gfx__' ? 0 : countTokensInText(text);
        fileCounts[fileName] = count;
      }
    }

    const totalCount = Object.values(fileCounts).reduce((a, b) => a + b, 0);
    connection.sendNotification('pico8/tokenCount', {
      fileName: 'TOTAL',
      count: totalCount,
      max: TOKEN_MAX,
      remaining: TOKEN_MAX - totalCount,
      files: Object.entries(fileCounts).map(([file, count]) => ({ file, count }))
    });
  }

  connection.onInitialize((_params: InitializeParams) => ({
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      workspace: {
        workspaceFolders: { supported: true, changeNotifications: true },
        didChangeWatchedFiles: { dynamicRegistration: true }
      }
    }
  }));

  documents.onDidOpen(sendTotalTokenStatus);
  documents.onDidSave(sendTotalTokenStatus);
  documents.onDidChangeContent(sendTotalTokenStatus);
  connection.onDidChangeWatchedFiles(() => sendTotalTokenStatus());

  connection.onNotification('pico8/updateSelectedFiles', (paths: string[]) => {
    selectedFilePaths = new Set(paths.map(p => path.resolve(p)));
    sendTotalTokenStatus();
  });

  sendTotalTokenStatus();
  documents.listen(connection);
  connection.listen();
}
