import * as vscode from "vscode";
import { getTranslate } from "./language";
const translate = require("@vitalets/google-translate-api");
const _ = require("lodash");

export const TRANSLATE = "Translate";

export async function refreshDiagnostics(
  doc: vscode.TextDocument,
  translateDiagnostics: vscode.DiagnosticCollection
) {
  const { language } = vscode.workspace.getConfiguration("usum-generate-i18");

  const diagnostics: vscode.Diagnostic[] = [];

  let activeEditor = vscode.window.activeTextEditor!;

  const regEx = /(?<=\|).+?(?=\|)/gm;
  const text = activeEditor.document.getText();
  let match;

  while ((match = regEx.exec(text))) {
    if (Boolean(!match[0])) {
      continue;
    }

    if (match[0] === ".") continue;
    console.log("=====");

    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(
      match.index + match[0].length
    );

    const en = await getTranslate(match[0], language);

    const key = (en as String).split(" ").join("-").toLocaleLowerCase();

    const text = `"${key}": "${en}"`;

    diagnostics.push(
      createDiagnostic(doc, new vscode.Range(startPos, endPos), text)
    );
  }

  translateDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(
  doc: vscode.TextDocument,
  range: vscode.Range,
  message: string
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Information
  );
  diagnostic.code = TRANSLATE;
  return diagnostic;
}

export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  translateDiagnostics: vscode.DiagnosticCollection
): void {
  let timeout: NodeJS.Timer | undefined = undefined;

  let activeEditor = vscode.window.activeTextEditor;

  if (activeEditor) {
    refreshDiagnostics(activeEditor.document, translateDiagnostics);
  }

  function triggerUpdate(
    throttle: boolean = false,
    doc: vscode.TextDocument,
    translateDiagnostics: vscode.DiagnosticCollection
  ) {
    console.log(123);

    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(() => {
        refreshDiagnostics(doc, translateDiagnostics);
      }, 3000);
    } else {
      refreshDiagnostics(doc, translateDiagnostics);
    }
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (activeEditor) {
        triggerUpdate(false, activeEditor.document, translateDiagnostics);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdate(true, event.document, translateDiagnostics);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidCloseTextDocument(
    (doc) => translateDiagnostics.delete(doc.uri),
    null,
    context.subscriptions
  );
}
