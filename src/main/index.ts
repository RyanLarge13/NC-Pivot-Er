import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import readline from 'readline'
import path from 'path'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 470,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.openDevTools()

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC file creationg and editing

  const editPivot = (filePath, newContent) => {
    return new Promise((res, rej) => {
      const tmpFilePath = `${filePath}.err`
      const input = fs.createReadStream(filePath)
      const output = fs.createWriteStream(tmpFilePath)
      const rl = readline.createInterface({ input })
      rl.on('line', (line) => {
        if (line === '( TLPOST = 12.9075 Ref Tool Length Used By Post. )') {
          output.write(`${newContent}\n`)
        } else {
          output.write(`${line}\n`)
        }
      })
      rl.on('close', () => {
        output.end()
        fs.rename(tmpFilePath, filePath, (err) => {
          if (err) {
            console.log(err)
            return rej(err)
          } else {
            console.log('complete')
            return res('')
          }
        })
      })
      rl.on('error', (err) => {
        console.log(err)
        rej(err)
      })
    })
  }

  ipcMain.on('start-gen-files', async (_, filePathname: string) => {
    if (!filePathname || typeof filePathname !== 'string') {
      return console.log('The file you provided did not have a valid path. Please try again')
    }
    const fileDir = path.dirname(filePathname)
    const fileExt = path.extname(filePathname)
    if (fileExt !== '.nc') {
      return console.log('Please provide a valid nc file')
    }
    const fileName = path.basename(filePathname, fileExt)
    const redFileName = fileName.replace('BLUE', 'RED')
    const vcFileName = fileName.replace('BLUE', 'VC')
    const newFileRED = path.join(fileDir, `${redFileName}${fileExt}`)
    const newFileVC = path.join(fileDir, `${vcFileName}${fileExt}`)
    try {
      fs.copyFileSync(filePathname, newFileRED)
      fs.copyFileSync(filePathname, newFileVC)
      await editPivot(newFileRED, '( TLPOST = 12.8708 Ref Tool Length Used By Post. )')
      await editPivot(newFileVC, '( TLPOST = 12.79 Ref Tool Length Used By Post. )')
      console.log('Files created successfully')
    } catch (err) {
      console.log('Error parsing file and updating')
      console.log(err)
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
