import { uIOhook, UiohookKey } from "uiohook-napi";
import { HostClipboard } from "../shortcuts/HostClipboard";
import { pressKeysToCopyItemText } from "../shortcuts/Shortcuts";
import { GameConfig } from "../host-files/GameConfig";
import { ServerEvents } from "../server";

import * as net from "net";

const SOCKET_PATH = "/tmp/input_daemon.sock";

const ACTION_DELAY = 100;

let IS_ACTIVE = false;
let CURRENT_MODS: string[] = [];
let SEARCH_MODE = "ANY";

function sendCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`> Отправка: ${command}`);

    const client = net.createConnection({ path: SOCKET_PATH });

    client.on("end", () => {
      resolve();
    });

    client.on("error", (err) => {
      console.error(`Connection error: ${SOCKET_PATH}`);
      reject(err);
    });

    client.on("connect", () => {
      client.end(command + "\n");
    });
  });
}

async function sleep(delay: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(() => res(), delay);
  });
}

async function mousePress(x: number, y: number, btn = 1): Promise<void> {
  const cmd = btn === 1 ? "CLICK_ABS" : "CLICK_RIGHT_ABS";

  await sendCommand(`${cmd} ${x} ${y}`);
  return sleep(ACTION_DELAY);
}

async function toggleShift(dir: "down" | "up" = "down") {
  await sendCommand(`${dir === "down" ? "KEY_DOWN" : "KEY_UP"} 42`);
  return sleep(ACTION_DELAY);
}

export function setupAltCrafting(server: ServerEvents) {
  server.onEventAnyClient("CLIENT->MAIN::user-action", (payload) => {
    if (payload.action === "alt-crafting-update") {
      CURRENT_MODS = payload.mods;
      SEARCH_MODE = payload.mode ?? "ANY";
    }
  });
}

export function stopCrafting() {
  IS_ACTIVE = false;
}

export async function startCrafting(
  clipboard: HostClipboard,
  gameConfig: GameConfig,
) {
  IS_ACTIVE = true;
  let ALT_SELECTED = true;

  const reset = async () => {
    const x = 2000;
    const y = 800;
    const delta = Math.round(Math.random() * 10);

    await mousePress(x + delta, y + delta);
  };

  const clickItem = async () => {
    await mousePress(1920 + 464, 550);
  };

  const clickAlt = async () => {
    await mousePress(1920 + 150, 370, 2);
  };

  const clickAug = async () => {
    await mousePress(1920 + 300, 440, 2);
  };

  const testItem = (clip: string, MOD = "ANY") => {
    console.dir(CURRENT_MODS);

    const predicate = () => {
      const p = (mod: string) => new RegExp(mod.toLowerCase()).test(clip);

      return CURRENT_MODS.length === 0 || MOD === "ANY"
        ? CURRENT_MODS.some(p)
        : CURRENT_MODS.every((mods) => mods.split("||").some(p));
    };
    return !IS_ACTIVE || predicate();
  };

  await toggleShift("down");
  uIOhook.keyToggle(UiohookKey.Shift, "down");

  const loop: () => Promise<null | void> = async () => {
    pressKeysToCopyItemText(undefined, gameConfig.showModsKey);

    return clipboard
      .readItemText()
      .then((clipboard) => {
        clipboard = clipboard.toLowerCase();

        if (testItem(clipboard, SEARCH_MODE)) {
          return null;
        } else if (
          !clipboard.includes("prefix") ||
          !clipboard.includes("suffix")
        ) {
          ALT_SELECTED = false;
          return clickAug()
            .then(() => clickAug())
            .then(() => clickItem())
            .then(() => loop());
        } else {
          if (ALT_SELECTED) {
            return clickItem().then(() => loop());
          } else {
            ALT_SELECTED = true;
            return clickAlt()
              .then(() => clickAlt())
              .then(() => clickItem())
              .then(() => loop());
          }
        }
      })
      .catch((err) => {
        console.log(err);
        toggleShift("up");
      });
  };

  loop().then(() => toggleShift("up")); //uIOhook.keyToggle(UiohookKey.Shift, 'up'));
}
