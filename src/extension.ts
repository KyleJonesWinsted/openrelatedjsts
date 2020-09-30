
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let openFile = vscode.commands.registerCommand('openrelatedjsts.openFile', () => {
		vscode.window.showInformationMessage('ran the open file command');
		console.log('document language:', vscode.window.activeTextEditor?.document.languageId);
		console.log('document path:', vscode.window.activeTextEditor?.document.uri.fsPath);
		let folders = vscode.workspace.workspaceFolders;
		let folder;
		if (folders) { folder = folders[0]; }
		console.log('root dir:', folder?.uri.fsPath);
	});

	context.subscriptions.push(openFile);
}

export function deactivate() {}
