const vscode = require('vscode');

function activate(context) {
    vscode.window.showInformationMessage('Привет, удачной разработки!');
}

module.exports = { activate };