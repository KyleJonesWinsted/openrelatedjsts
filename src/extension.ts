
import * as vscode from 'vscode';
import * as CommentJSON from 'comment-json';

export function activate(context: vscode.ExtensionContext) {

	let openFile = vscode.commands.registerCommand('openrelatedjsts.openFile', openRelated);

	context.subscriptions.push(openFile);
}

async function openRelated() {
	try {
		const { currentDocLang, currentDocPath } = getEnvironment();

		const tsConfig = await getConfigFile(currentDocPath);

		if (!tsConfig.document) {
			await openFileByNameOnly(currentDocLang, currentDocPath);
			return;
		}

		const { outDir, rootDir } = getPathsFromConfig(tsConfig);

		await openFileByPath(currentDocLang, currentDocPath, outDir, rootDir);
		
	} catch (err) {
		console.error('Error in openFile: ', err);
		vscode.window.showErrorMessage('Open Related: ' + err);
	}
}

async function openFileByPath(currentDocLang: LanguageId, currentDocPath: string, outDir: string, rootDir: string) {
	let fileExtension = '.js';
	if (currentDocLang === LanguageId.javascript) {
		const buffer = outDir;
		outDir = rootDir;
		rootDir = buffer;
		fileExtension = '.ts';
	}
	const fileExtensions = ['ts', 'js', 'd', 'map'];
	const currentDocRelativePath = currentDocPath.replace(rootDir, '').split('.');
	while (fileExtensions.includes(currentDocRelativePath[currentDocRelativePath.length - 1])) {
		currentDocRelativePath.pop();
	}
	const filePath = outDir + currentDocRelativePath.join('.') + fileExtension;
	try {
		const doc = await vscode.workspace.openTextDocument(filePath);
		vscode.window.showTextDocument(doc);
	} catch {
		try {
			if (currentDocLang === LanguageId.typescript) { throw new Error(); }
			const declarationFilePath = filePath.slice(0, filePath.length - 2) + 'd.ts';
			const doc = await vscode.workspace.openTextDocument(declarationFilePath);
			vscode.window.showTextDocument(doc);
		} catch {
			await openFileByNameOnly(currentDocLang, currentDocPath);
		}
	}
}

function getPathsFromConfig(tsConfig: IConfigFile) {
	if (!tsConfig.document) { throw new Error('Missing tsconfig.json'); }
	const json = CommentJSON.parse(tsConfig.document.getText());
	const rootPath = tsConfig.docPath;
	const paths: {[key: string]: string} = {
		outDir: json.compilerOptions?.outDir ?? '.',
		rootDir: json.compilerOptions?.rootDir ?? '.',
	};
	Object.keys(paths).forEach(key => {
		let value = paths[key];
		switch (value[0]) {
			case '.':
				paths[key] = rootPath + value.slice(1, value.length);
				break;
			case '/':
				break;
			default:
				paths[key] = rootPath + '/' + value;
		}
		if (value[0] === '.') { value = value.slice(2); };
		if (value[0] !== '/') {
			paths[key] = `${rootPath}/${value}`;
		}
	});
	return paths;
}

async function getConfigFile(currentDocPath: string): Promise<IConfigFile> {
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
	return {
		document: doc,
		docPath: pathComponents.join('/'),
	};
}

function getEnvironment(): { currentDocLang: LanguageId, currentDocPath: string } {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) { throw new Error('No currently active text editor.'); }
	const currentDocLang = getDocLanguage(activeTextEditor);
	const currentDocPath = activeTextEditor.document.uri.path;
	return { currentDocLang, currentDocPath };
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

interface IConfigFile {
	document: vscode.TextDocument | null;
	docPath: string;
}

export function deactivate() {}
