import {
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from "@tauri-apps/api/menu";
import { openUrl } from "@tauri-apps/plugin-opener";
import { platform } from "@tauri-apps/plugin-os";
import { t } from "i18next";

/**
 * Sets up the application menu with predefined and custom items.
 */
export async function setupAppMenu() {
  const win = await windowMenu();
  const help = await helpMenu();

  // On macOS, the "About" and "Help" menus should be integrated into the system menu bar.
  if (platform() === "macos") {
    await win.setAsWindowsMenuForNSApp();
    await help.setAsHelpMenuForNSApp();
  }

  const menu = await Menu.new({
    items: [
      await aboutMenu(),
      await fileMenu(),
      await editMenu(),
      await viewMenu(),
      win,
      help,
    ],
  });

  await menu.setAsAppMenu();
}

// --- helper functions

const isDebugMode = () => import.meta.env.DEV;
const separator = () => PredefinedMenuItem.new({ item: "Separator" });

// --- submenus

async function aboutMenu() {
  // Load the icon via the asset protocol instead of a raw path string
  // const icon = await fetch("/icons/icon.png")
  //   .then((res) => res.arrayBuffer())
  //   .then((buf) => Image.fromBytes(new Uint8Array(buf)));

  return Submenu.new({
    text: t("app.name"),
    items: [
      await PredefinedMenuItem.new({
        item: {
          About: {
            name: t("app.name"),
            version: "0.29.0",
            comments: t("app.description"),
            // icon,
          },
        },
      }),
      await MenuItem.new({
        id: "about:check_updates",
        text: t("app.menu.about.items.check_updates"),
        action: () => {},
      }),
      await MenuItem.new({
        id: "about:preferences",
        text: t("app.menu.about.items.preferences"),
        accelerator: "CmdOrCtrl+,",
        action: () => {},
      }),
      await separator(),
      await PredefinedMenuItem.new({ item: "Services" }),
      await separator(),
      await PredefinedMenuItem.new({ item: "Hide" }),
      await PredefinedMenuItem.new({ item: "HideOthers" }),
      await PredefinedMenuItem.new({ item: "ShowAll" }),
      await separator(),
      await PredefinedMenuItem.new({ item: "Quit" }),
    ],
  });
}

async function fileMenu() {
  return Submenu.new({
    text: t("app.menu.file.text"),
    items: [
      await MenuItem.new({
        id: "file:new",
        text: t("app.menu.file.items.new"),
        accelerator: "CmdOrCtrl+N",
        action: () => {},
      }),
      await MenuItem.new({
        id: "file:new_window",
        text: t("app.menu.file.items.new_window"),
        accelerator: "CmdOrCtrl+Shift+N",
        action: () => {},
      }),
      await separator(),
      await MenuItem.new({
        id: "file:open",
        text: t("app.menu.file.items.open"),
        accelerator: "CmdOrCtrl+O",
        action: () => {},
      }),
      await separator(),
      await MenuItem.new({
        id: "file:save",
        text: t("app.menu.file.items.save"),
        accelerator: "CmdOrCtrl+S",
        action: () => {},
      }),
      await MenuItem.new({
        id: "file:save_as",
        text: t("app.menu.file.items.save_as"),
        accelerator: "CmdOrCtrl+Shift+S",
        action: () => {},
      }),
      await separator(),
      await MenuItem.new({
        id: "file:import",
        text: t("app.menu.file.items.import"),
        action: () => {},
      }),
      await MenuItem.new({
        id: "file:export",
        text: t("app.menu.file.items.export"),
        action: () => {},
      }),
      await separator(),
      await MenuItem.new({
        id: "file:close_window",
        text: t("app.menu.file.items.close_window"),
        accelerator: "CmdOrCtrl+Shift+W",
        action: () => {},
      }),
      await separator(),
    ],
  });
}

async function editMenu() {
  return Submenu.new({
    text: t("app.menu.edit.text"),
    items: [
      await PredefinedMenuItem.new({ item: "Undo" }),
      await PredefinedMenuItem.new({ item: "Redo" }),
      await separator(),
      await PredefinedMenuItem.new({ item: "Cut" }),
      await PredefinedMenuItem.new({ item: "Copy" }),
      await PredefinedMenuItem.new({ item: "Paste" }),
      await separator(),
      await PredefinedMenuItem.new({ item: "SelectAll" }),
    ],
  });
}

async function viewMenu() {
  return Submenu.new({
    text: t("app.menu.view.text"),
    items: [
      await MenuItem.new({
        id: "view:zoom_in",
        text: t("app.menu.view.items.zoom_in"),
        accelerator: "CmdOrCtrl+=",
        action: () => {},
      }),
      await MenuItem.new({
        id: "view:zoom_out",
        text: t("app.menu.view.items.zoom_out"),
        accelerator: "CmdOrCtrl+-",
        action: () => {},
      }),
      await MenuItem.new({
        id: "view:zoom_reset",
        text: t("app.menu.view.items.zoom_reset"),
        accelerator: "CmdOrCtrl+0",
        action: () => {},
      }),
      await separator(),
      await MenuItem.new({
        id: "view:toggle_sidebar",
        text: t("app.menu.view.items.toggle_sidebar"),
        accelerator: "CmdOrCtrl+Shift+B",
        action: () => {},
      }),
      await MenuItem.new({
        id: "view:toggle_bottom_panel",
        text: t("app.menu.view.items.toggle_bottom_panel"),
        accelerator: "CmdOrCtrl+J",
        action: () => {},
      }),
      await MenuItem.new({
        id: "view:toggle_inspector",
        text: t("app.menu.view.items.toggle_inspector"),
        enabled: isDebugMode(),
        accelerator: "CmdOrCtrl+Option+I",
        action: () => {
          // TODO: Copilot: Open devtools by pressing CmdOrCtrl+Option+I
        },
      }),
      await separator(),
      await PredefinedMenuItem.new({ item: "Fullscreen" }),
      await separator(),
    ],
  });
}

async function windowMenu() {
  return Submenu.new({
    text: t("app.menu.window.text"),
    items: [
      await PredefinedMenuItem.new({ item: "Minimize" }),
      await PredefinedMenuItem.new({ item: "Maximize" }),
      await separator(),
      await PredefinedMenuItem.new({ item: "Fullscreen" }),
      await separator(),
    ],
  });
}

async function helpMenu() {
  // TODO: Not use hardcoded URL
  return Submenu.new({
    text: t("app.menu.help.text"),
    items: [
      await MenuItem.new({
        id: "help:bug_report",
        text: t("app.menu.help.items.bug_report"),
        action: () => {
          openUrl("https://github.com/berbicanes/apiark/issues/new");
        },
      }),
      await separator(),
      await MenuItem.new({
        id: "help:docs",
        text: t("app.menu.help.items.docs"),
        action: () => {
          openUrl("https://apiark.dev/docs");
        },
      }),
      await MenuItem.new({
        id: "help:github",
        text: t("app.menu.help.items.github"),
        action: () => {
          openUrl("https://github.com/berbicanes/apiark");
        },
      }),
      await MenuItem.new({
        id: "help:website",
        text: t("app.menu.help.items.website"),
        action: () => {
          openUrl("https://apiark.dev");
        },
      }),
    ],
  });
}
