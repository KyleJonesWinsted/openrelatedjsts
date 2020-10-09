
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let openFile = vscode.commands.registerCommand('openrelatedjsts.openFile', openRelated);

	context.subscriptions.push(openFile);
}

async function openRelated() {
	vscode.window.showInformationMessage('ran the open file command');
	try {
		const { currentDocLang, currentDocPath, rootPath } = getEnvironment();

		const configFile: vscode.TextDocument | null = await getConfigFile(currentDocPath);

		console.log('configfile', configFile);

		if (!configFile) {
			await openFileByNameOnly(currentDocLang, currentDocPath);
			return;
		}

		const { outDir, rootDir } = getPathsFromConfig(configFile, rootPath);

		console.log('outdir', outDir, 'rootdir', rootDir);

		// openFileByPath(currentDocLang, currentDocPath, outDir);
		
	} catch (err) {
		console.error('Error in openFile: ', err);
		vscode.window.showErrorMessage('Error: ' + err);
	}
}

function openFileByPath(currentDocLang: LanguageId, currentDocPath: string, outDir: string, rootDir: string) {

}

function getPathsFromConfig(configFile: vscode.TextDocument, rootPath: string) {
	const json = JSON.parse(configFile.getText());
	const paths: {[key: string]: string} = {
		outDir: json.compilerOptions?.outDir ?? '.',
		rootDir: json.compilerOptions?.rootDir ?? '.',
	};
	Object.keys(paths).forEach(key => {
		const value = paths[key];
		if (value[0] === '.') {
			paths[key] = rootPath + value.slice(1, value.length);
		}
	});
	return paths;
}

async function getConfigFile(currentDocPath: string): Promise<vscode.TextDocument | null> {
	let pathComponents = currentDocPath.split('/');
	let doc: vscode.TextDocument | null = null;
	while (pathComponents.length > 0 && doc === null) {
		const searchString = `${pathComponents.join('/')}/tsconfig.json`;
		try {
			doc = await vscode.workspace.openTextDocument(searchString);
		} catch (err) {
			pathComponents.pop();
			continue;
		}
	}
	return doc;
}

function getEnvironment(): { currentDocLang: LanguageId, currentDocPath: string, rootPath: string } {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) { throw new Error('No currently active text editor.'); }
	const currentDocLang = getDocLanguage(activeTextEditor);
	const currentDocPath = activeTextEditor.document.uri.fsPath;
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length < 1) { throw new Error('Unable to open current workspace folder'); }
	const rootPath = folders[0].uri.fsPath;
	return { currentDocLang, currentDocPath, rootPath };
}

async function openFileByNameOnly(currentDocLang: LanguageId, currentDocPath: string) {
	const files = await getMatchingFiles(currentDocLang, currentDocPath);
	if (files.length > 1) {
		throw new Error('Found too many potential matches.');
	} else if (files.length < 1) {
		throw new Error('Could not find matching file.');
	} else {
		const doc = await vscode.workspace.openTextDocument(files[0].path);
		vscode.window.showTextDocument(doc);
	}
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
	let pathComponents = currentDocPath.split('/');
	let searchString = `**/${pathComponents[pathComponents.length - 1].split('.')[0]}**${(currentDocLang === LanguageId.typescript ? 'js' : 'ts')}`; 
	const files = await vscode.workspace.findFiles(searchString);
	return files;
}

enum LanguageId {
	typescript = 'typescript',
	javascript = 'javascript',
}

export function deactivate() {}
