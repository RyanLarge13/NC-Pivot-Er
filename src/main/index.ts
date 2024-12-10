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
      const tmpFilePath = path.join(homeDir, `${path.basename(filePath)}.tmp`);
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

  const editUnwind = (filePath, amount): Promise<void> => {
    return new Promise((res, rej) => {
      const homeDir = os.homedir();
      const tmpFilePath = path.join(homeDir, `${path.basename(filePath)}.tmp`);
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(tmpFilePath);
      const rl = readline.createInterface({ input });
      let didFindLine = false;
      let prevLine = "";
      let prevX = 0;
      rl.on("line", (line) => {
        if (didFindLine) {
          const split = line.split(" ");
          const xValue = parseFloat(split[1].replace("X", ""));
          const diff = xValue - prevX;
          let updatedValue = 0;
          if (Math.abs(diff) < 2.9) {
            updatedValue = xValue;
          } else {
            if (diff > 0) {
              updatedValue = xValue + amount;
            } else {
              updatedValue = xValue - amount;
            }
          }
          // console.log(`After determining sign value updated to ${updatedValue} for X coordinate`);
          const newLine = line.replace(split[1], `X${updatedValue}`);
          // console.log(`New line to be replaced in file: ${newLine}`);
          output.write(`${newLine}\n`);
          didFindLine = false;
        } else {
          if (line === "(*** Unwind Procedure ***)") {
            const split = prevLine.split(" ");
            const stringInt = split[1].replace("X", "");
            const xValue = parseFloat(stringInt);
            // console.log(`Set previous value of X coordinate to: ${prevX} || ${xValue}`);
            prevX = xValue;
          }
          if (line === "(***  Retract Length : 3.   ***)") {
            didFindLine = true;
            const newValue = 3 + amount;
            // console.log(`Writing new value to NC file for X coordinate. New value: ${newValue}`);
            output.write(`${line.replace("3", newValue)}\n`);
          } else {
            output.write(`${line}\n`);
          }
        }
        const lineSplit = line.split(" ");
        if (lineSplit[1]) {
          if (lineSplit[1][0] === "X") {
            prevLine = line;
          }
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
    } catch (err) {
      console.log("Error parsing file and updating");
      console.log(err);
    }
  });

  // Update unwind amount
  ipcMain.on("update-unwind", async (event, filePathname, amount) => {
    if (!filePathname || typeof filePathname !== "string") {
      return console.log("The file you provided did not have a valid path. Please try again");
    }
    const fileDir = path.dirname(filePathname);
    const fileExt = path.extname(filePathname);
    if (fileExt !== ".nc") {
      return console.log("Please provide a valid nc file");
    }
    const fileName = path.basename(filePathname, fileExt);
    const newFileName = `EXTENDED_UNWIND_${amount}_` + fileName;
    const newFilePath = path.join(fileDir, `${newFileName}${fileExt}`);
    try {
      fs.copyFileSync(filePathname, newFilePath);
      event.sender.send("progress-update", 25);
      await editUnwind(newFilePath, amount);
      event.sender.send("progress-update", 100);
      event.sender.send("finished", true, "Successfully generated files");
    } catch (err) {
      console.log("Error parsing file and updating");
      console.log(err);
    }
  });

  // Load the window
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
