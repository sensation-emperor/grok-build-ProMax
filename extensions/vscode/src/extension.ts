import * as vscode from 'vscode';
import { createClient, type GrokClient, type Session } from '@xai/grok-sdk';

let client: GrokClient | undefined;
let currentSession: Session | undefined;
let chatPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Grok Build extension is now active');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('grok.startSession', startSession),
    vscode.commands.registerCommand('grok.resumeSession', resumeSession),
    vscode.commands.registerCommand('grok.sendPrompt', sendPrompt),
    vscode.commands.registerCommand('grok.addContext', addContext),
    vscode.commands.registerCommand('grok.explainCode', explainCode),
    vscode.commands.registerCommand('grok.fixErrors', fixErrors),
    vscode.commands.registerCommand('grok.generateTests', generateTests),
    vscode.commands.registerCommand('grok.refactor', refactor),
    vscode.commands.registerCommand('grok.showDashboard', showDashboard),
    vscode.commands.registerCommand('grok.settings', openSettings)
  );

  // Create chat view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'grok.chatView',
      new ChatViewProvider(context.extensionUri)
    )
  );

  // Listen for editor selection changes
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(async (e) => {
      if (!e.selections[0].isEmpty) {
        // Selection changed - could show inline actions
      }
    })
  );
}

async function startSession() {
  const config = vscode.workspace.getConfiguration('grok');
  
  try {
    client = createClient({
      binaryPath: config.get('binaryPath', 'grok'),
      model: config.get('model', 'default') as any,
      permissionMode: config.get('permissionMode', 'default') as any,
      effort: config.get('effort', 'medium') as any,
      apiKey: config.get('apiKey', ''),
      verbose: true
    });

    currentSession = await client.connect();
    
    vscode.window.showInformationMessage(
      `Grok session started: ${currentSession.id.slice(0, 8)}...`
    );

    // Open chat panel
    if (!chatPanel) {
      chatPanel = vscode.window.createWebviewPanel(
        'grokChat',
        'Grok Chat',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      
      chatPanel.webview.html = getChatHtml(currentSession.id);
      
      chatPanel.onDidDispose(() => {
        chatPanel = undefined;
      });
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to start Grok session: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function resumeSession() {
  if (!client) {
    vscode.window.showWarningMessage('No Grok client connected. Start a session first.');
    return;
  }

  const sessions = await client.listSessions();
  
  const selected = await vscode.window.showQuickPick(
    sessions.map(s => ({
      label: s.name,
      description: s.status,
      detail: `Created: ${s.createdAt}`,
      sessionId: s.id
    })),
    { placeHolder: 'Select a session to resume' }
  );

  if (selected) {
    currentSession = await client.resumeSession(selected.sessionId);
    vscode.window.showInformationMessage(`Resumed session: ${selected.label}`);
  }
}

async function sendPrompt() {
  if (!currentSession) {
    vscode.window.showWarningMessage('No active session. Start one first.');
    return;
  }

  const prompt = await vscode.window.showInputBox({
    placeHolder: 'Enter your prompt...',
    prompt: 'What would you like Grok to do?',
    ignoreFocusOut: true
  });

  if (prompt) {
    const response = await currentSession.send(prompt);
    
    if (chatPanel) {
      chatPanel.webview.postMessage({
        type: 'response',
        content: response.content
      });
    } else {
      vscode.window.showInformationMessage('Response received (open chat panel to view)');
    }
  }
}

async function addContext() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  
  if (currentSession) {
    // Add file to session context
    vscode.window.showInformationMessage(`Added ${filePath} to context`);
  } else {
    vscode.window.showWarningMessage('No active session');
  }
}

async function explainCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Please select some code first');
    return;
  }

  const selectedCode = editor.document.getText(editor.selection);
  
  if (!currentSession) {
    await startSession();
  }

  if (currentSession) {
    const response = await currentSession.send(
      `Explain this code:\n\n\`\`\`${editor.document.languageId}\n${selectedCode}\n\`\`\``
    );
    
    // Show response in chat or new panel
    showResponseInPanel(response.content, 'Code Explanation');
  }
}

async function fixErrors() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Please select some code first');
    return;
  }

  const selectedCode = editor.document.getText(editor.selection);
  
  if (!currentSession) {
    await startSession();
  }

  if (currentSession) {
    const response = await currentSession.send(
      `Fix any errors in this code and explain what you changed:\n\n\`\`\`${editor.document.languageId}\n${selectedCode}\n\`\`\``
    );
    
    showResponseInPanel(response.content, 'Code Fixes');
  }
}

async function generateTests() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Please select some code first');
    return;
  }

  const selectedCode = editor.document.getText(editor.selection);
  
  if (!currentSession) {
    await startSession();
  }

  if (currentSession) {
    const response = await currentSession.send(
      `Generate comprehensive unit tests for this code:\n\n\`\`\`${editor.document.languageId}\n${selectedCode}\n\`\`\``
    );
    
    showResponseInPanel(response.content, 'Generated Tests');
  }
}

async function refactor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Please select some code first');
    return;
  }

  const selectedCode = editor.document.getText(editor.selection);
  
  if (!currentSession) {
    await startSession();
  }

  if (currentSession) {
    const response = await currentSession.send(
      `Refactor this code to improve readability and maintainability:\n\n\`\`\`${editor.document.languageId}\n${selectedCode}\n\`\`\``
    );
    
    showResponseInPanel(response.content, 'Refactored Code');
  }
}

async function showDashboard() {
  // Open agent dashboard webview
  const dashboardPanel = vscode.window.createWebviewPanel(
    'grokDashboard',
    'Grok Agent Dashboard',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  dashboardPanel.webview.html = getDashboardHtml();
}

function openSettings() {
  vscode.commands.executeCommand(
    'workbench.action.openSettings',
    '@ext:xai.grok-build'
  );
}

function showResponseInPanel(content: string, title: string) {
  const panel = vscode.window.createWebviewPanel(
    'grokResponse',
    title,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        pre { background: var(--vscode-editor-background); padding: 15px; overflow-x: auto; }
        code { font-family: var(--vscode-editor-font-family); }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

function getChatHtml(sessionId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Grok Chat</title>
      <style>
        body { 
          font-family: var(--vscode-font-family);
          padding: 20px;
          background: var(--vscode-editor-background);
          color: var(--vscode-foreground);
        }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .assistant { background: var(--vscode-editor-inactiveSelectionBackground); }
        #input { width: 100%; padding: 10px; margin-top: 20px; }
        #send { margin-top: 10px; padding: 10px 20px; }
      </style>
    </head>
    <body>
      <h2>Grok Chat</h2>
      <div id="messages">
        <div class="message assistant">Session started: ${sessionId.slice(0, 8)}...</div>
      </div>
      <input type="text" id="input" placeholder="Type your message..." />
      <button id="send">Send</button>
      
      <script>
        const vscode = acquireVsCodeApi();
        const input = document.getElementById('input');
        const send = document.getElementById('send');
        const messages = document.getElementById('messages');
        
        send.addEventListener('click', () => {
          if (input.value.trim()) {
            vscode.postMessage({ type: 'prompt', content: input.value });
            messages.innerHTML += \`<div class="message user">\${input.value}</div>\`;
            input.value = '';
          }
        });
        
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') send.click();
        });
        
        window.addEventListener('message', event => {
          if (event.data.type === 'response') {
            messages.innerHTML += \`<div class="message assistant">\${event.data.content}</div>\`;
          }
        });
      </script>
    </body>
    </html>
  `;
}

function getDashboardHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Agent Dashboard</title>
      <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .agent-card { 
          border: 1px solid var(--vscode-widget-border);
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
        }
        .status { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        .status-working { background: #0e639c; color: white; }
        .status-idle { background: #666; color: white; }
        .status-awaiting { background: #d67f05; color: white; }
      </style>
    </head>
    <body>
      <h2>Active Agents</h2>
      <div class="agent-card">
        <h3>Main Agent</h3>
        <span class="status status-working">Working</span>
        <p>Processing request...</p>
      </div>
    </body>
    </html>
  `;
}

class ChatViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getChatHtml('pending');
  }
}

export function deactivate() {
  if (client) {
    client.disconnect();
  }
}
