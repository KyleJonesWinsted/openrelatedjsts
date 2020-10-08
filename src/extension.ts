
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let openFile = vscode.commands.registerCommand('openrelatedjsts.openFile', async () => {
		vscode.window.showInformationMessage('ran the open file command');
		const activeTextEditor = vscode.window.activeTextEditor;
		if (!activeTextEditor) { return; }
		try {
			const currentDocLang = getDocLanguage(activeTextEditor);
			const currentDocPath = activeTextEditor.document.uri.fsPath;
			const folders = vscode.workspace.workspaceFolders;
			if (!folders || folders.length < 1) { return; }
			const rootPath = folders[0].uri.fsPath;
			
			const files = await getMatchingFiles(currentDocLang, currentDocPath);
			console.log('files', files);
			if (files.length === 1) {
				const doc = await vscode.workspace.openTextDocument(files[0].path);
				vscode.window.showTextDocument(doc);
			}
			
		} catch (err) {
			console.error('Error in openFile: ', err);
			vscode.window.showErrorMessage('Error: ' + err);
		}
	});

	context.subscriptions.push(openFile);
}

function getDocLanguage(activeTextEditor: vscode.TextEditor): LanguageId {
	const currentDocLang = activeTextEditor.document.languageId;
	switch (currentDocLang) {
		case LanguageId.typescript:
			return LanguageId.typescript;
		case LanguageId.javascript:
			return LanguageId.javascript;
		default:
			throw new Error("Current file is not typescript or javascript");
	}
}

async function getMatchingFiles(currentDocLang: LanguageId, currentDocPath: string): Promise<vscode.Uri[]> {
	return new Promise(resolve => {
		let pathComponents = currentDocPath.split(/\/|\\/);
		let searchString = `**/${pathComponents[pathComponents.length - 1].split('.')[0]}**${(currentDocLang === LanguageId.typescript ? 'js' : 'ts')}`; 
		vscode.workspace.findFiles(searchString)
			.then(files => {
				resolve(files);
			});
	});
}

enum LanguageId {
	typescript = 'typescript',
	javascript = 'javascript',
}

export function deactivate() {}
