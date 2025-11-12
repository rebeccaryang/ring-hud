import { invoke } from '@tauri-apps/api/core';
import { openUrl as openExternal } from '@tauri-apps/plugin-opener';

export type Action =
  | { label: string; type: 'keystroke'; keys: string }
  | { label: string; type: 'shell'; cmd: string }
  | { label: string; type: 'url'; url: string };

export async function runAction(a: Action) {
  switch (a.type) {
    case 'keystroke':
      return sendKeystroke(a.keys);
    case 'shell':
      return runShell(a.cmd);
    case 'url':
      return openUrl(a.url);
  }
}

async function sendKeystroke(keys: string) {
  await invoke('run_osascript', { script: applescriptForKeys(keys) });
}

function applescriptForKeys(keys: string) {
  const map: Record<string, string> = {
    'cmd': 'command down',
    'shift': 'shift down',
    'alt': 'option down',
    'option': 'option down',
    'ctrl': 'control down',
    'control': 'control down'
  };
  const parts = keys.toLowerCase().split('+');
  const key = parts.pop()!;
  const mods = parts.map(m => map[m]).filter(Boolean).join(', ');
  const specialKey = (k: string) => {
    if (k === '=') return 'key code 24';
    if (k === '-') return 'key code 27';
    if (k === '`') return 'key code 50';
    return `keystroke "${k}"`;
  };
  const modifierClause = mods ? ` using {${mods}}` : '';
  return `
tell application "System Events"
  ${specialKey(key)}${modifierClause}
end tell
`.trim();
}

async function runShell(cmd: string) {
  await invoke('run_shell', { cmd });
}

async function openUrl(url: string) {
  await openExternal(url);
}
