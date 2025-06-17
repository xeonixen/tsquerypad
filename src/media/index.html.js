const inputContainer = document.getElementById('input-container');
const outputContainer = document.getElementById('output-container');
const divider = document.getElementById('divider');
const container = document.getElementById('input-output-container');
const methodList = document.getElementById('method-list');
const outputElement = document.getElementById('output');
const runningIndicator = document.getElementById('running-indicator');
const runButton = document.getElementById('runButton');
const fileNameElement = document.getElementById('fileName');
const fileTypeElement = document.getElementById('fileType');
const vscode = acquireVsCodeApi();
const liveUpdateToggle = document.getElementById("liveUpdateToggle");
let editor;
let isDragging = false;

const VALID_RETURN_TYPE = 'UserReturnType';

let wrapperModel; // This is the hidden model used for diagnostics

function createFullWrappedCode(userCode) {
    return `
      // Dummy line to ensure this is treated as a script/module
      
      async function* __userWrapper__(): UserReturnType {
        ${userCode}
      }
      `;
}


function flattenDiagnosticMessageText(messageText) {
    if (typeof messageText === 'string') {
        return messageText;
    } else if (messageText && typeof messageText.messageText === 'string') {
        let result = messageText.messageText;
        if (messageText.next && messageText.next.length > 0) {
            for (const child of messageText.next) {
                result += '\n' + flattenDiagnosticMessageText(child);
            }
        }
        return result;
    } else {
        return '';
    }
}
function offsetToLineColumn(text, offset) {
    const lines = text.split(/\r?\n/);
    let runningLength = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for the newline char

        if (offset < runningLength + lineLength) {
            return {
                line: i + 1,           // Monaco lines are 1-based
                column: offset - runningLength + 1, // Monaco columns are 1-based
            };
        }

        runningLength += lineLength;
    }

    // If offset beyond text length, return last position
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
    };
}


function validateUserCode() {
    const userCode = editor.getValue();
    const fullCode = createFullWrappedCode(userCode);

    if (!wrapperModel) {
        wrapperModel = monaco.editor.createModel(fullCode, 'typescript');
    } else {
        wrapperModel.setValue(fullCode);
    }

    monaco.languages.typescript.getTypeScriptWorker().then(worker => {
        worker(wrapperModel.uri).then(client => {
            client.getSemanticDiagnostics(wrapperModel.uri.toString()).then(diagnostics => {
                monaco.editor.setModelMarkers(editor.getModel(), 'typescript', []);
                const markers = diagnostics.map(diag => {
                    const startPos = offsetToLineColumn(fullCode, diag.start);
                    const endPos = offsetToLineColumn(fullCode, diag.start + diag.length);

                    // 2 lines before user code starts
                    const wrapperLinesBeforeUserCode = 3; // includes declare + export + function line
                    const startLineNumber = startPos.line - wrapperLinesBeforeUserCode;
                    const endLineNumber = endPos.line - wrapperLinesBeforeUserCode;
                    const startColumn = startPos.column;
                    const endColumn = endPos.column;

                    return {
                        severity: monaco.MarkerSeverity.Error,
                        message: flattenDiagnosticMessageText(diag.messageText),
                        startLineNumber,
                        startColumn,
                        endLineNumber,
                        endColumn
                    };
                });

                monaco.editor.setModelMarkers(editor.getModel(), 'customValidator', markers);
            });
        });
    });
}

function initMonacoEditor() {
    require.config({ paths: { vs: window.monacoBasePath || './vs' } });

    require(['vs/editor/editor.main'], () => {
        const defaultCode =
            `docs[0].lines.filter(line => line.includes('')).slice(0,10)`;

        editor = monaco.editor.create(inputContainer, {
            value: defaultCode,
            language: 'typescript',
            theme: 'vs-dark',
            hover: true,
            fontSize: 14,
            minimap: { enabled: false },
        });
        loadState();
        monaco.languages.typescript.typescriptDefaults.addExtraLib(window.linqTypings, 'ts:linq.d.ts');

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            noEmit: true,
            strict: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            lib: ['es2020'],
        });

        let timeoutId = null;

        editor.onDidChangeModelContent(() => {
            validateUserCode();

            if (liveUpdateToggle.checked) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => runCode(), 300);
            }
        });
        const tsOwner = 'typescript';

        monaco.editor.onDidChangeMarkers((uris) => {
            for (const uri of uris) {
                const model = monaco.editor.getModel(uri);
                if (!model) continue;

                // Get current markers
                const allMarkers = monaco.editor.getModelMarkers({ resource: uri });

                // Filter out TypeScript-owned markers
                const filteredMarkers = allMarkers.filter(m => m.owner !== tsOwner);

                // Overwrite markers with only the non-TypeScript ones
                monaco.editor.setModelMarkers(model, tsOwner, []); // Clear TS markers
                monaco.editor.setModelMarkers(model, 'customValidator', filteredMarkers); // Restore others (if any)
                console.log("onDidChangeMarkers");
            }
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
        editor.layout();
        validateUserCode(); // initial pass
    });
}

function runCode() {
    if (!editor) return;

    outputElement.textContent = '';
    runningIndicator.style.display = 'block';


    vscode.postMessage({
        command: 'execute',
        code: editor.getValue()
    });
}

function setupDividerDragging() {
    divider.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'row-resize';
        e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const containerRect = container.getBoundingClientRect();
        const minHeight = 50;
        let newInputHeight = e.clientY - containerRect.top;

        if (newInputHeight < minHeight) newInputHeight = minHeight;
        if (newInputHeight > containerRect.height - minHeight - divider.offsetHeight) {
            newInputHeight = containerRect.height - minHeight - divider.offsetHeight;
        }

        inputContainer.style.height = `${newInputHeight}px`;
        outputContainer.style.height = `${containerRect.height - newInputHeight - divider.offsetHeight}px`;

        editor?.layout();
    });
}

function saveState() {
    if (!editor) return;
    vscode.setState({
        code: editor.getValue(),
        output: outputElement.innerHTML,
    });
}

function loadState() {
    const savedState = vscode.getState();
    if (savedState) {
        if (savedState.code) editor?.setValue(savedState.code);
        if (savedState.output) outputElement.innerHTML = savedState.output;
    }
}

function setupRunHandlers() {
    runButton.addEventListener('click', runCode);

    window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.command) {
            case 'clear':

                break;
            case 'sourceAdded':
                const sourceList = document.getElementById('sourceList');
                const li = document.createElement('li');
                li.innerHTML = `[${msg.index}]: <span>${msg.fileName}</span> (<span>${msg.fileType}</span>)`;
                sourceList.append(li);
                break;
            case 'output':
                switch (msg.result.type) {
                    case 'string':
                        outputElement.innerHTML = msg.result.data
                        break;
                    case 'array':
                        outputElement.innerHTML = '';
                        for (const item of msg.result.data) {
                            const el = document.createTextNode(item + '\n');
                            outputElement.appendChild(el);
                        }
                        break;
                    case 'arrayarray':
                        outputElement.innerHTML = '';
                        const tbl = document.createElement('table');
                        outputElement.appendChild(tbl);
                        for (const item of msg.result.data) {
                            const row = tbl.insertRow();
                            for (const col of item) {
                                const cell = row.insertCell();
                                cell.appendChild(document.createTextNode(col));
                            }
                        }
                        break;
                }
                runningIndicator.style.display = 'none';
                // render(msg.type, msg.result);
                saveState();
                break;
        }
    });
}

function initMethodList() {
    if (!window.methodDescriptions) return;

    window.methodDescriptions.forEach(method => {
        const listItem = document.createElement('li');
        const methodElement = document.createElement('div');
        methodElement.className = 'method-item';
        methodElement.textContent = method.name;

        const descriptionContainer = document.createElement('div');
        descriptionContainer.className = 'method-description';
        descriptionContainer.style.display = 'none';

        const signatureElement = document.createElement('div');
        signatureElement.textContent = method.signature;

        const descriptionElement = document.createElement('div');
        descriptionElement.textContent = method.description;

        descriptionContainer.appendChild(signatureElement);
        descriptionContainer.appendChild(descriptionElement);

        methodElement.addEventListener('click', () => {
            document.querySelectorAll('.method-description').forEach(desc => {
                if (desc !== descriptionContainer) {
                    desc.style.display = 'none';
                    desc.classList.remove('show');
                }
            });

            const isHidden = descriptionContainer.style.display === 'none';
            descriptionContainer.style.display = isHidden ? 'block' : 'none';
            descriptionContainer.classList.toggle('show', isHidden);
        });

        listItem.appendChild(methodElement);
        listItem.appendChild(descriptionContainer);
        methodList.appendChild(listItem);
    });
}

function initHeader() {
    fileNameElement.textContent = window.fileName;
    fileTypeElement.textContent = window.fileType;
}

function init() {
    initMethodList();
    initMonacoEditor();
    setupDividerDragging();
    setupRunHandlers();
    initHeader();
}

window.addEventListener('resize', () => {
    editor?.layout();
});

document.addEventListener('DOMContentLoaded', init);