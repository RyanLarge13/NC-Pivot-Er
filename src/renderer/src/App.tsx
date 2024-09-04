import { FaFile } from 'react-icons/fa'
import Nav from './components/Nav'

const App = (): JSX.Element => {
  const handleDragOver = (e) => {
    e.preventDefault()
    // console.log('dragging over')
  }

  const handleFile = (e) => {
    e.preventDefault()
    const files: File[] = Array.from(e.dataTransfer.files)
    if (files.length > 1) {
      return
    }
    const ipcFileHandle = (): void =>
      window.electron.ipcRenderer.send('start-gen-files', files[0].path)
    ipcFileHandle()
  }

  return (
    <main className="text-white flex flex-col min-h-screen justify-center items-center">
      <Nav />
      <div
        onDragOver={handleDragOver}
        onDrop={handleFile}
        className="bg-slate-900 rounded-lg shadow-lg flex flex-col justify-center items-center p-10"
      >
        <h1 className="text-slate-300">
          Drop Your <span className="text-cyan-300">.NC</span> File Here
        </h1>
        <p className="text-4xl text-white mt-8">
          <FaFile />
        </p>
      </div>
      <button className="bg-slate-900 text-slate-300 hover:bg-slate-700 duration-200 rounded-lg shadow-lg mt-5 py-3 px-10 text-center">
        Open Explorer
      </button>
    </main>
  )
}

export default App
