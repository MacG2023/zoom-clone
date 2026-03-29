import { ipcMain } from 'electron';

let nutjs: typeof import('@nut-tree-fork/nut-js') | null = null;

async function getNutJs() {
  if (!nutjs) {
    nutjs = await import('@nut-tree-fork/nut-js');
    nutjs.mouse.config.autoDelayMs = 0;
    nutjs.keyboard.config.autoDelayMs = 0;
  }
  return nutjs;
}

export function setupRemoteControlExecutor(): void {
  ipcMain.handle('execute-remote-control', async (_event, controlEvent) => {
    try {
      const { mouse, keyboard, Point, Button, Key } = await getNutJs();

      switch (controlEvent.type) {
        case 'mouse-move': {
          await mouse.setPosition(new Point(controlEvent.x, controlEvent.y));
          break;
        }
        case 'mouse-click': {
          await mouse.setPosition(new Point(controlEvent.x, controlEvent.y));
          const btn = controlEvent.button === 'left' ? Button.LEFT : Button.RIGHT;
          await mouse.click(btn);
          break;
        }
        case 'mouse-scroll': {
          await mouse.scrollDown(controlEvent.deltaY);
          break;
        }
        case 'key-down': {
          const key = mapKey(controlEvent.key, Key);
          if (key !== undefined) {
            await keyboard.pressKey(key);
          }
          break;
        }
        case 'key-up': {
          const key = mapKey(controlEvent.key, Key);
          if (key !== undefined) {
            await keyboard.releaseKey(key);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Remote control execution error:', err);
    }
  });
}

function mapKey(key: string, Key: any): number | undefined {
  const keyMap: Record<string, string> = {
    'Enter': 'Return',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'Escape': 'Escape',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    ' ': 'Space',
    'Delete': 'Delete',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
  };

  const mapped = keyMap[key] || key;

  if (Key[mapped] !== undefined) return Key[mapped];
  if (Key[mapped.toUpperCase()] !== undefined) return Key[mapped.toUpperCase()];

  if (key.length === 1) {
    const upper = key.toUpperCase();
    if (Key[upper] !== undefined) return Key[upper];
  }

  return undefined;
}
