import { Capture } from './capture'
import './App.css'

function App() {
  return (
    <section id="center">
      <div>
        <h1>Sinopia</h1>
        <p>Upload, photograph, or draw a gesture sketch to read its pose geometry.</p>
      </div>
      <Capture />
    </section>
  )
}

export default App
