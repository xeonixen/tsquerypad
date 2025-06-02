import * as path from 'path';
import * as fs from 'fs';
import { promises as fsa } from 'fs';
import * as vscode from 'vscode';
import { defineCustomFunctions } from './media/linq';
import { extractStrings, extractStringsAsync } from './extract_strings';
import * as ts from 'typescript';
import * as readline from 'readline';
const baseDir = "out";
let linqTypingsContent: string;
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('tsquerypad.openQuery', (fileUri: vscode.Uri) => {
        const filePath = fileUri?.fsPath;
        const originalDocument = vscode.window.activeTextEditor?.document;
        const linqTypingsPath = path.join(context.extensionPath, baseDir, 'media', 'linq.d.ts');
        linqTypingsContent = fs.readFileSync(linqTypingsPath, 'utf8');
        createMonacoWebView(context, filePath, originalDocument);
    });

    context.subscriptions.push(disposable);
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

async function* getFileContentAsync(filePath: string | undefined, originalDocument: vscode.TextDocument | undefined): AsyncGenerator<string> {
    if (!filePath || !(await fileExistsAsync(filePath))) {
        if (!originalDocument)
            throw Error("Could not read file or document");

        for (let i = 0; i < originalDocument.lineCount; i++) {
            yield originalDocument.lineAt(i).text;
        }
    } else {
        const generator = isBinaryFile(filePath)
            ? extractStringsAsync(filePath)
            : streamLines(filePath);
        yield* generator;
    }
}
function getFileContent(filePath: string | undefined, originalDocument: vscode.TextDocument | undefined): string[] {
    if (!filePath || !(fileExists(filePath))) {
        if (!originalDocument)
            throw Error("Could not read file or document");
        return originalDocument.getText().split('\n');
    } else {
        return isBinaryFile(filePath) ?
            extractStrings(filePath) :
            readFileLines(filePath)
    }
}
export function readFullText(filePath: string | undefined, originalDocument: vscode.TextDocument | undefined): string {
    if (originalDocument)
        return originalDocument.getText();
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
    const methodSignatureRegex = /(?:^\s*\/\/(.*))*?(?:^\s*\/\*\s*([\s\S]*?)\*\/)*?\s*?(^\s*\w+\s*(?:<.*>)*\(.*\):\s\S*?;)/gm;
    const methodInfo: { name: string, signature: string, description: string | undefined }[] = [];
    let match;

    while ((match = methodSignatureRegex.exec(typingsContent)) !== null) {
        const comment = (match[1] || match[2])?.trim() ?? "";
        const signature = match[3]?.trim() ?? "";
        const name = signature.split('(')[0];
        methodInfo.push({ name, signature, description: comment });
    }

    return methodInfo.filter(m => m.signature.length > 0);
}

function createMonacoWebView(context: vscode.ExtensionContext, filePath: string | undefined, originalDocument: vscode.TextDocument | undefined) {
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


    const fileName = path.basename(filePath ?? originalDocument?.fileName ?? "Unknown");
    const fileType = isBinaryFile(filePath ?? originalDocument?.fileName ?? "text.txt") ? 'Binary' : 'Text';
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
        if (srcPath.startsWith('./vs')) {
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


                // const returnType = getReturnTypeFromFile(userCode, linqTypingsContent);
                // if (returnType === 'void') {

                if (!/return/.test(userCode) && !/for await/.test(userCode) && !/yield/.test(userCode)) {
                    isAsync = false;
                    userCode = `return ${userCode}`;
                }
                // }
                const doc = {
                    get lines(): string[] {
                        return getFileContent(filePath, originalDocument);
                    },
                    get linesAsync(): AsyncGenerator<string> {
                        return getFileContentAsync(filePath, originalDocument);
                    },
                    get fullText(): string {
                        return readFullText(filePath, originalDocument);
                    }
                };
                // const lines = await getFileContent(filePath, originalDocument);
                const transpiled = ts.transpile(userCode, {
                    module: ts.ModuleKind.ESNext,     // or CommonJS if you need require()
                    target: ts.ScriptTarget.ES2020,   // or ES2017 or latest
                    strict: true
                });
                const func = new Function('doc', `
                    'use strict';
                    return (async function${isAsync ? '*' : ''}() {
                        ${transpiled}
                    })();
                `);
                const result = await func(doc);

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
    }, null, context.subscriptions);

    context.subscriptions.push(panel);
}
function isAsyncGenerator(obj: any): obj is AsyncGenerator<string> {
    return obj &&
        typeof obj[Symbol.asyncIterator] === 'function' &&
        typeof obj.next === 'function';
}
async function parseResult(result: AsyncGenerator<string> | string[] | string): Promise<string> {
    if (Array.isArray(result))
        return result.join('\n');
    if (typeof (result) === 'string')
        return result;
    if (isAsyncGenerator(result))
        return await asyncGeneratorToString(result);
    return String(result);
}
async function asyncGeneratorToString(gen: AsyncGenerator<string>): Promise<string> {
    let result = [];
    let chunkCount = 0;
    console.time(`await chunk(line) number ${chunkCount}`);
    for await (const chunk of gen) {
        result.push(chunk);
        console.timeEnd(`await chunk(line) number ${chunkCount}`);
        chunkCount++;
        console.time(`await chunk(line) number ${chunkCount}`);
    }
    return result.join('\n');
}

function getReturnTypeFromFile(sourceCode: string, customDeclarings: string): string | undefined {
    // Create a virtual file map (you can also write to disk if needed)
    const fileName = 'supertemp.ts';
    const dFileName = 'superlinq.d.ts';
    sourceCode = `
  function test(){
    ${sourceCode}
  }
  `;
    const sourceFiles = new Map<string, string>([
        [fileName, sourceCode],
        [dFileName, customDeclarings],
    ]);

    // Create default host to delegate to for system files, std libs, etc.
    const defaultHost = ts.createCompilerHost({});

    // Override only fileExists and readFile to provide in-memory files
    const host: ts.CompilerHost = {
        ...defaultHost,
        fileExists: (fileName) => sourceFiles.has(fileName) || defaultHost.fileExists(fileName),
        readFile: (fileName) => sourceFiles.get(fileName) ?? defaultHost.readFile(fileName),
        getSourceFile: (fileName, languageVersionOrOptions, err) => {
            const sf = sourceFiles.get(fileName);
            return sf ?
                ts.createSourceFile(fileName, sf, ts.ScriptTarget.Latest, true) :
                defaultHost.getSourceFile(fileName, languageVersionOrOptions, err);
        }
        // Don't override getSourceFile — defaultHost uses readFile internally
    };

    // Create a program using the default host (includes standard lib)
    const program = ts.createProgram({
        rootNames: [fileName, dFileName],
        options: {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.CommonJS,

        },
        host: host,
    });

    const checker = program.getTypeChecker();

    let returnType: string | undefined;

    const sf = program.getSourceFile(fileName);
    const dSf = program.getSourceFile(dFileName);
    if (!sf || !dSf) return undefined;

    ts.forEachChild(sf, function visit(node) {
        if (
            ts.isFunctionDeclaration(node) &&
            node.name?.text === 'test' &&
            node.body
        ) {
            const signature = checker.getSignatureFromDeclaration(node);
            if (signature) {
                const type = checker.getReturnTypeOfSignature(signature);
                returnType = checker.typeToString(type);
            }
        }
        ts.forEachChild(node, visit);
    });

    return returnType;
}



function test() {
    const lines: string[] = [];
    const userFn: () => string | string[] =
        () => {
            return lines.filter(x => x.includes("TODO"));
        };
}