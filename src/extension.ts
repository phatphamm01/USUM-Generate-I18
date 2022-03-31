import * as vscode from "vscode";
import { subscribeToDocumentChanges, TRANSLATE } from "./diagnostics";
import { generate } from "./generate";

export function activate(context: vscode.ExtensionContext) {
  const translateDiagnostics =
    vscode.languages.createDiagnosticCollection("translate");
  context.subscriptions.push(translateDiagnostics);

  subscribeToDocumentChanges(context, translateDiagnostics);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider("*", new TranslateInfo(), {
      providedCodeActionKinds: TranslateInfo.providedCodeActionKinds,
    })
  );

  const disposable = vscode.commands.registerCommand(
    "generate-i18.generateTranslateJson",
    generate
  );

  context.subscriptions.push(disposable);
}

export class TranslateInfo implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    return context.diagnostics
      .filter((diagnostic) => diagnostic.code === TRANSLATE)
      .map((diagnostic) =>
        this.createCommandCodeAction(document, diagnostic, context)
      );
  }

  private createCommandCodeAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    context: vscode.CodeActionContext
  ): vscode.CodeAction {
    const fix = this.createFix(document, diagnostic);

    return fix;
  }

  private createFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const { message, range } = diagnostic;

    const [text] = message.split(":").map((value) => value.trim());

    const fix = new vscode.CodeAction(
      `Convert to ${message}`,
      vscode.CodeActionKind.QuickFix
    );
    fix.edit = new vscode.WorkspaceEdit();

    fix.edit.replace(
      document.uri,
      new vscode.Range(
        new vscode.Position(range.start.line, range.start.character - 2),
        new vscode.Position(range.end.line, range.end.character + 2)
      ),
      `$\{t(${text})}`
    );

    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;

    return fix;
  }
}
