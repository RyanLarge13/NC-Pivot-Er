import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import fs from "fs";
import readline from "readline";
import path from "path";
import os from "os";
import icon from "../../resources/icon.png?asset";

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 470,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  mainWindow.webContents.openDevTools();
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  const editPivot = (filePath, newContent): Promise<void> => {
    return new Promise((res, rej) => {
      const homeDir = os.homedir();
      const tmpFilePath = path.join(homeDir, `${path.basename(filePath)}.err`);
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(tmpFilePath);
      const rl = readline.createInterface({ input });
      rl.on("line", (line) => {
        if (line === "( TLPOST = 12.9075 Ref Tool Length Used By Post. )") {
          output.write(`${newContent}\n`);
        } else {
          output.write(`${line}\n`);
        }
      });
      rl.on("close", () => {
        output.end();
      });
      output.on("close", () => {
        const destFilePath = filePath;
        fs.copyFile(tmpFilePath, destFilePath, (err) => {
          if (err) {
            console.log(err);
            return rej(err);
          }
          fs.unlink(tmpFilePath, (err) => {
            if (err) {
              console.log(err);
              return rej(err);
            } else {
              console.log("File updated successfully");
              return res();
            }
          });
        });
      });
      rl.on("error", (err) => {
        console.log(err);
        rej(err);
      });
      output.on("error", (err) => {
        console.log(err);
        rej(err);
      });
    });
  };

  ipcMain.on("start-gen-files", async (event, filePathname: string) => {
    if (!filePathname || typeof filePathname !== "string") {
      return console.log("The file you provided did not have a valid path. Please try again");
    }
    const fileDir = path.dirname(filePathname);
    const fileExt = path.extname(filePathname);
    if (fileExt !== ".nc") {
      return console.log("Please provide a valid nc file");
    }
    const fileName = path.basename(filePathname, fileExt);
    const redFileName = fileName.replace("BLUE", "RED");
    const vcFileName = fileName.replace("BLUE", "VC");
    const newFileRED = path.join(fileDir, `${redFileName}${fileExt}`);
    const newFileVC = path.join(fileDir, `${vcFileName}${fileExt}`);
    try {
      fs.copyFileSync(filePathname, newFileRED);
      event.sender.send("progress-update", 10);
      fs.copyFileSync(filePathname, newFileVC);
      event.sender.send("progress-update", 20);
      await editPivot(newFileRED, "( TLPOST = 12.8708 Ref Tool Length Used By Post. )");
      event.sender.send("progress-update", 60);
      await editPivot(newFileVC, "( TLPOST = 12.79 Ref Tool Length Used By Post. )");
      event.sender.send("progress-update", 100);
      event.sender.send("finished", true, "Successfully generated files");
      console.log("Files created successfully");
    } catch (err) {
      console.log("Error parsing file and updating");
      console.log(err);
    }
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
