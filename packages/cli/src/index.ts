/**
 * @h1mpy-sdk/cli
 * 
 * CLI and TUI tools for M5Stack MicroPython SDK
 */

// Re-export CLI functions
export * from './cli';

// TUI components (for programmatic use)  
export { default as TUI } from './tui';
export { default as QuickTestTUI } from './quick-test-tui';

// Utility functions
export async function startTUI() {
  // Dynamic import to avoid loading React/Ink unless needed
  const { render } = await import('ink');
  const { default: TUI } = await import('./tui');
  const React = await import('react');
  
  render(React.createElement(TUI));
}

export async function startQuickTestTUI() {
  // Dynamic import to avoid loading React/Ink unless needed
  const { render } = await import('ink');
  const { default: QuickTestTUI } = await import('./quick-test-tui');
  const React = await import('react');
  
  render(React.createElement(QuickTestTUI));
}