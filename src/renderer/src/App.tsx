import { FaFile } from "react-icons/fa";
import Nav from "./components/Nav";
import { useState } from "react";

const App = (): JSX.Element => {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
    // console.log('dragging over')
  };

  const handleFile = (e) => {
    e.preventDefault();
    setDragOver(false);
    setLoading(true);
    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      return;
    }
    setFileName(files[0].name);
    const ipcFileHandle = (): void =>
      window.electron.ipcRenderer.send("start-gen-files", files[0].path);
    ipcFileHandle();
    window.electron.ipcRenderer.on("progress-update", (_, fileProgress) => {
      setProgress(fileProgress);
    });
    window.electron.ipcRenderer.on("finished", (_, done, message) => {
      if (done) {
        setFileName("");
        setProgress(0);
        setComplete(true);
        setLoading(false);
        setTimeout(() => {
          setComplete(false);
        }, 5000);
        console.log(message);
      }
    });
  };

  return (
    <main className="text-white flex flex-col min-h-screen justify-center items-center">
      <Nav />
      <div className="max-w-80">
        <div
          className={`w-full h-1 relative mb-3 rounded-full overflow-hidden bg-slate-700 ${fileName ? "opacity-100" : "opacity-0"}`}
        >
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full bg-lime-300 duration-200"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleFile}
          onDragLeave={() => setDragOver(false)}
          className={`bg-slate-900 rounded-lg flex flex-col justify-center items-center p-10 ${loading ? "opacity-40" : "opacity-100"} ${dragOver ? "shadow-green-400 shadow-md scale-[1.025]" : "shadow-lg scale-100"} duration-200`}
        >
          {fileName ? (
            <h1 className="text-slate-300">
              Generating Files For <span className="text-cyan-300">{fileName}</span>
            </h1>
          ) : (
            <h1 className="text-slate-300">
              Drop Your <span className="text-cyan-300">.NC</span> File Here
            </h1>
          )}
          {complete ? <h1 className="font-bold text-lime-300 text-xl">DONE! 😊</h1> : null}
          <p className="text-4xl text-white mt-8">
            <FaFile />
          </p>
        </div>
        <button className="bg-slate-900 text-slate-300 hover:bg-slate-700 duration-200 rounded-lg shadow-lg mt-5 py-3 px-10 text-center w-full">
          Open Explorer
        </button>
      </div>
    </main>
  );
};

export default App;
