import * as vscode from 'vscode';

interface PrefixConfig {
    regex: RegExp;
    color: string;
    description: string;
}

export function activate(context: vscode.ExtensionContext) {
    // Define prefix configurations with colors
    const prefixConfigs: PrefixConfig[] = [
        // Responsive prefixes
        { regex: /\bsm:/g, color: '#10B981', description: 'Small screens (640px+)' },
        { regex: /\bmd:/g, color: '#3B82F6', description: 'Medium screens (768px+)' },
        { regex: /\blg:/g, color: '#8B5CF6', description: 'Large screens (1024px+)' },
        { regex: /\bxl:/g, color: '#F59E0B', description: 'Extra large screens (1280px+)' },
        { regex: /\b2xl:/g, color: '#EF4444', description: '2X large screens (1536px+)' },
        
        // State modifiers
        { regex: /\bhover:/g, color: '#EC4899', description: 'Hover state' },
        { regex: /\bfocus:/g, color: '#06B6D4', description: 'Focus state' },
        { regex: /\bactive:/g, color: '#84CC16', description: 'Active state' },
        { regex: /\bvisited:/g, color: '#A855F7', description: 'Visited state' },
        { regex: /\bdisabled:/g, color: '#6B7280', description: 'Disabled state' },
        { regex: /\bfirst:/g, color: '#F97316', description: 'First child' },
        { regex: /\blast:/g, color: '#EF4444', description: 'Last child' },
        { regex: /\beven:/g, color: '#8B5CF6', description: 'Even children' },
        { regex: /\bodd:/g, color: '#10B981', description: 'Odd children' },
        
        // Dark mode
        { regex: /\bdark:/g, color: '#374151', description: 'Dark mode' },
        
        // Print media
        { regex: /\bprint:/g, color: '#059669', description: 'Print media' },
        
        // Motion preferences
        { regex: /\bmotion-safe:/g, color: '#DC2626', description: 'Motion safe' },
        { regex: /\bmotion-reduce:/g, color: '#7C2D12', description: 'Motion reduce' }
    ];

    // Create decoration types for each prefix
    const decorationTypes = new Map<RegExp, vscode.TextEditorDecorationType>();
    
    prefixConfigs.forEach(config => {
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: config.color + '20', // Add transparency
            border: `1px solid ${config.color}`,
            borderRadius: '3px',
            color: config.color,
            fontWeight: 'bold'
        });
        decorationTypes.set(config.regex, decorationType);
    });

    // Function to update decorations
    function updateDecorations(editor: vscode.TextEditor) {
        if (!editor) return;

        const config = vscode.workspace.getConfiguration('tailwindPrefixHighlighter');
        if (!config.get('enabled')) return;

        const text = editor.document.getText();
        
        // Clear previous decorations
        decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });

        // Find class attributes in common formats
        const classPatterns = [
            /class(?:Name)?=["']([^"']*?)["']/g,  // class="..." or className="..."
            /:class=["']([^"']*?)["']/g,          // Vue :class="..."
            /class:[\w-]+=["']([^"']*?)["']/g     // Svelte class:name="..."
        ];

        const decorationsMap = new Map<vscode.TextEditorDecorationType, vscode.DecorationOptions[]>();

        // Initialize decoration arrays
        decorationTypes.forEach(decorationType => {
            decorationsMap.set(decorationType, []);
        });

        classPatterns.forEach(classPattern => {
            let match;
            while ((match = classPattern.exec(text)) !== null) {
                const classContent = match[1];
                const classStartIndex = match.index + match[0].indexOf(classContent);
                
                // Check each prefix configuration
                prefixConfigs.forEach(config => {
                    let prefixMatch;
                    const regex = new RegExp(config.regex.source, 'g');
                    
                    while ((prefixMatch = regex.exec(classContent)) !== null) {
                        const startPos = editor.document.positionAt(classStartIndex + prefixMatch.index);
                        const endPos = editor.document.positionAt(classStartIndex + prefixMatch.index + prefixMatch[0].length);
                        
                        const decoration: vscode.DecorationOptions = {
                            range: new vscode.Range(startPos, endPos),
                            hoverMessage: config.description
                        };
                        
                        const decorationType = decorationTypes.get(config.regex);
                        if (decorationType) {
                            const decorations = decorationsMap.get(decorationType) || [];
                            decorations.push(decoration);
                            decorationsMap.set(decorationType, decorations);
                        }
                    }
                });
            }
        });

        // Apply all decorations
        decorationsMap.forEach((decorations, decorationType) => {
            editor.setDecorations(decorationType, decorations);
        });
    }

    // Update decorations when the active editor changes
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        updateDecorations(activeEditor);
    }

    // Register event handlers
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            updateDecorations(activeEditor);
        }
    }, null, context.subscriptions);

    // Register command to toggle the extension
    const toggleCommand = vscode.commands.registerCommand('tailwindPrefixHighlighter.toggle', () => {
        const config = vscode.workspace.getConfiguration('tailwindPrefixHighlighter');
        const enabled = config.get('enabled');
        config.update('enabled', !enabled, vscode.ConfigurationTarget.Global);
        
        if (activeEditor) {
            if (!enabled) {
                updateDecorations(activeEditor);
            } else {
                // Clear all decorations
                decorationTypes.forEach(decorationType => {
                    activeEditor!.setDecorations(decorationType, []);
                });
            }
        }
    });

    context.subscriptions.push(toggleCommand);
}

export function deactivate() {
    // Cleanup is handled automatically by VSCode
}