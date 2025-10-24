const vscode = require('vscode');

const RUSSIAN_LETTERS_REGEX = /[А-Яа-яЁё]/g;

const RUS_TO_LAT = {
    'а': 'a', 'А': 'A',
    'в': 'b', 'В': 'B',
    'е': 'e', 'Е': 'E',
    'к': 'k', 'К': 'K',
    'м': 'm', 'М': 'M',
    'н': 'h', 'Н': 'H',
    'о': 'o', 'О': 'O',
    'р': 'p', 'Р': 'P',
    'с': 'c', 'С': 'C',
    'т': 't', 'Т': 'T',
    'х': 'x', 'Х': 'X'
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Расширение "language-linter" активировано!');

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('languageLinter');
    context.subscriptions.push(diagnosticCollection);

    const russianDecoration = vscode.window.createTextEditorDecorationType({
        textDecoration: 'underline wavy purple'
    });

    const lintDocument = (document) => {
        if (!document || document.languageId === 'plaintext') return;

        const diagnostics = [];
        const foundChars = [];
        const ranges = [];

        let match;
        while ((match = RUSSIAN_LETTERS_REGEX.exec(document.getText())) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            diagnostics.push(new vscode.Diagnostic(
                range,
                `Обнаружен русский символ "${match[0]}"`,
                vscode.DiagnosticSeverity.Warning
            ));

            foundChars.push({ char: match[0], line: startPos.line + 1, col: startPos.character + 1 });
            ranges.push(range);
        }

        diagnosticCollection.set(document.uri, diagnostics);

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
            editor.setDecorations(russianDecoration, ranges);
        }

        if (foundChars.length > 0) {
            const preview = foundChars.slice(0, 5).map(c => `"${c.char}"(${c.line}:${c.col})`).join(', ');
            vscode.window.showWarningMessage(
                `Найдены русские символы в файле "${document.fileName}": ${preview}${foundChars.length > 5 ? ', ...' : ''}`
            );
        }
    };

    if (vscode.window.activeTextEditor) {
        lintDocument(vscode.window.activeTextEditor.document);
    }
    vscode.workspace.onDidChangeTextDocument(e => lintDocument(e.document));
    vscode.workspace.onDidOpenTextDocument(lintDocument);

    const disposable = vscode.commands.registerCommand('language-linter.checkFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) lintDocument(editor.document);
    });
    context.subscriptions.push(disposable);

    const codeActionProvider = vscode.languages.registerCodeActionsProvider('*', {
        provideCodeActions(document, range, context) {
            return context.diagnostics
                .filter(diag => diag.message.startsWith('Обнаружен русский символ'))
                .map(diag => {
                    const char = document.getText(diag.range);
                    const replacement = RUS_TO_LAT[char];
                    if (!replacement) return null;

                    const fix = new vscode.CodeAction(
                        `Заменить "${char}" на "${replacement}"`,
                        vscode.CodeActionKind.QuickFix
                    );
                    fix.edit = new vscode.WorkspaceEdit();
                    fix.edit.replace(document.uri, diag.range, replacement);
                    fix.diagnostics = [diag];
                    return fix;
                })
                .filter(Boolean);
        }
    });
    context.subscriptions.push(codeActionProvider);
}

function deactivate() {}

module.exports = { activate, deactivate };
