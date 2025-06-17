import * as path from 'path';
import * as fs from 'fs';
import { promises as fsa } from 'fs';
import * as vscode from 'vscode';
import { defineCustomFunctions } from './media/linq';
import { extractStrings, extractStringsAsync } from './extract_strings';
import ts from 'typescript';
import { UUID } from 'crypto';

const baseDir = "out";

let linqTypingsContent: string;
let tsqueryeditors: { guid: UUID, panel: vscode.WebviewPanel, addSource: (source: IFileSource) => void }[] = [];
export function activate(context: vscode.ExtensionContext) {
    const openQueryDisposable = vscode.commands.registerCommand('tsquerypad.openQuery', (fileUri: vscode.Uri) => {
        const filePath = fileUri?.fsPath ?? vscode.window.activeTextEditor?.document?.fileName;
        const linqTypingsPath = path.join(context.extensionPath, baseDir, 'media', 'linq.d.ts');
        linqTypingsContent = fs.readFileSync(linqTypingsPath, 'utf8');
        createMonacoWebView(context, filePath);
    });
    context.subscriptions.push(openQueryDisposable);
    const addToQueryDisposable = vscode.commands.registerCommand('tsquerypad.addToQuery', (fileUri: vscode.Uri) => {
        const filePath = fileUri?.fsPath ?? vscode.window.activeTextEditor?.document?.fileName;
        const activePanel = tsqueryeditors.find(p => p.panel.active);
        if (activePanel) {
            const fName = path.basename(filePath ?? "Unknown");
            const fType = isBinaryFile(filePath ?? "text.txt") ? 'Binary' : 'Text';
            activePanel.addSource({
                fileName: fName,
                filePath: filePath,
                fileType: fType
            });
        }
    });
    context.subscriptions.push(addToQueryDisposable);
}

export function deactivate() { }

async function* streamLines(filePath: string): AsyncGenerator<string> {
    const stream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024 // Read in 64KB chunks
    });

    let leftover = '';
    for await (const chunk of stream) {
        leftover += chunk;
        let lines = leftover.split(/\r?\n/); // Split by real lines
        leftover = lines.pop()!; // Save incomplete line for next chunk
        for (const line of lines) {
            yield line;
        }
    }
    if (leftover) yield leftover; // Final line without trailing newline
    stream.close();
}

async function* getFileContentAsync(filePath: string): AsyncGenerator<string> {
    if (!filePath || !(await fileExistsAsync(filePath))) {
        throw Error("Could not read file or document");
    } else {
        const generator = isBinaryFile(filePath)
            ? extractStringsAsync(filePath)
            : streamLines(filePath);
        yield* generator;
    }
}
function getFileContent(filePath: string): string[] {
    if (!filePath || !(fileExists(filePath))) {
        throw Error("Could not read file or document");
    } else {
        return isBinaryFile(filePath) ?
            extractStrings(filePath) :
            readFileLines(filePath)
    }
}
export function readFullText(filePath: string | undefined): string {
    if (filePath && fileExists(filePath))
        return fs.readFileSync(filePath, 'utf8');
    throw new Error("File or document not found");
}

export function readFileLines(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split(/\r?\n/);
}

function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}
async function fileExistsAsync(filePath: string): Promise<boolean> {
    try {
        await fsa.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function isBinaryFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return ['exe', 'dll', 'so', 'bin', 'rpa', 'img'].includes(ext);
}

function extractMethodDescriptions(typingsContent: string): { name: string, signature: string, description: string | undefined }[] {
    const methodSignatureRegex = /(?:^\s*\/\/(.*))*?(?:^\s*\/\*\s*([\s\S]*?)\*\/)*?\s*?(^\s*\w+\s*(?:<.*>)*\(.*\):[\s\S]*?;)/gm;
    const methodInfo: { name: string, signature: string, description: string | undefined }[] = [];
    let match;

    while ((match = methodSignatureRegex.exec(typingsContent)) !== null) {
        let comment = (match[1] || match[2])?.trim() ?? "";
        comment = comment.replaceAll('**', '\n').replaceAll('*', '\n');
        const signature = match[3]?.trim() ?? "";
        const name = signature.split('(')[0];
        methodInfo.push({ name, signature, description: comment });
    }

    return methodInfo.filter(m => m.signature.length > 0);
}
interface IFileSource {
    index?: number,
    fileName: string,
    filePath: string,
    fileType: string
}
function createMonacoWebView(context: vscode.ExtensionContext, filePath: string) {
    const guid = crypto.randomUUID();
    const sources: IFileSource[] = [];
    const panel = vscode.window.createWebviewPanel(
        'monacoEditor',
        'LINQ Query',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: false, // safer lifecycle management
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, baseDir, 'media'))
            ]
        }
    );

    const htmlPath = path.join(context.extensionPath, baseDir, 'media', 'index.html');
    const vsPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, baseDir, 'media', 'vs'));
    const vsUri = panel.webview.asWebviewUri(vsPathOnDisk);


    const fileName = path.basename(filePath ?? "Unknown");
    const fileType = isBinaryFile(filePath ?? "text.txt") ? 'Binary' : 'Text';
    sources.push({ index: 0, fileName: fileName, filePath: filePath, fileType: fileType });
    const methodDescriptions = extractMethodDescriptions(linqTypingsContent);
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html.replace(
        '</head>',
        `<script>
            window.monacoBasePath = "${vsUri.toString()}";
            window.linqTypings = \`${linqTypingsContent.replace(/`/g, '\\`')}\`;
            window.fileName = "${fileName}";
            window.fileType = "${fileType}";
            window.methodDescriptions = ${JSON.stringify(methodDescriptions)};
        </script>\n</head>`
    );

    html = html.replace(/(src|href)="(.+?)"/g, (match, attr, srcPath) => {
        if (srcPath.startsWith('./')) {
            const diskPath = vscode.Uri.file(path.join(context.extensionPath, baseDir, 'media', srcPath));
            const webviewUri = panel.webview.asWebviewUri(diskPath);
            return `${attr}="${webviewUri.toString()}"`;
        }
        return match;
    });


    panel.webview.html = html;

    // Listen for messages and clean up automatically on panel dispose
    const disposable = panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'execute') {
            try {
                let isAsync = true;
                defineCustomFunctions();

                let userCode = message.code.trim();

                if (!/for await/.test(userCode) && !/yield/.test(userCode)) {
                    isAsync = false;
                    if (!/return/.test(userCode))
                        userCode = `return ${userCode}`;
                }
                // }
                const docs = [];
                for (const source of sources) {
                    docs.push({
                        get lines(): string[] {
                            return getFileContent(source.filePath);
                        },
                        get linesAsync(): AsyncGenerator<string> {
                            return getFileContentAsync(source.filePath);
                        },
                        get fullText(): string {
                            return readFullText(source.filePath);
                        }
                    });
                }

                const transpiled = ts.transpile(userCode, {
                    module: ts.ModuleKind.ESNext,     // or CommonJS if you need require()
                    target: ts.ScriptTarget.ES2020,   // or ES2017 or latest
                    strict: true
                });
                const func = new Function('docs', `
                    'use strict';
                    return (async function${isAsync ? '*' : ''}() {
                        ${transpiled}
                    })();
                `);

                const result = await func(docs);

                panel.webview.postMessage({
                    command: 'output',
                    result: await parseResult(result)
                });
            } catch (err: any) {
                vscode.window.showErrorMessage(err.message);
            }
        }
    });

    // Dispose listener when panel closes
    panel.onDidDispose(() => {
        disposable.dispose();
        const c = tsqueryeditors.find(x => x.guid === guid);
        if (c)
            tsqueryeditors.splice(tsqueryeditors.indexOf(c), 1);
    }, null, context.subscriptions);

    context.subscriptions.push(panel);
    tsqueryeditors.push({
        guid: guid,
        addSource: ((s: IFileSource) =>{
            s.index = sources.length;
            sources.push(s);
            (s as any).command = 'sourceAdded';
            panel.webview.postMessage(s);
        }),
        panel: panel
    })
}
function isAsyncGenerator(obj: any): obj is AsyncGenerator<string> | AsyncGenerator<string[]> {
    return obj &&
        typeof obj[Symbol.asyncIterator] === 'function' &&
        typeof obj.next === 'function';
}

async function parseResult(result: AsyncGenerator<string[]> | AsyncGenerator<string> | string[] | string): Promise<{ type: 'string' | 'array' | 'arrayarray', data: string | string[] | string[][] }> {
    if (Array.isArray(result)) {
        if (Array.isArray(result[0]))
            return { type: 'arrayarray', data: result };
        return { type: 'array', data: result };
    }
    if (typeof (result) === 'string')
        return { type: 'string', data: result };
    if (isAsyncGenerator(result)) {
        const data = await asyncGeneratorToArray(result);
        const isArrayArray = data && data.length > 0 && Array.isArray(data[0]);
        return { type: isArrayArray ? 'arrayarray' : 'array', data: data };
    }
    // return await asyncGeneratorToString(result);
    return { type: 'string', data: String(result) };
}

async function asyncGeneratorToArray(gen: AsyncGenerator<string> | AsyncGenerator<string[]>): Promise<string[] | string[][]> {
    let result: any[] = [];
    for await (const chunk of gen) {
        result.push(chunk);
    }
    return result;
}
