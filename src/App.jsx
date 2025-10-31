import { Link, Route, Routes } from 'react-router'
import './App.css'
import HomePage from './pages/HomePage'
import SmithChartTool from './pages/SmithChart'
import ImpedanceCalculator from "./pages/ImpedanceCalculator"
import WavePropagation from './pages/WavePropagation'

function App() {
  return(
    <Routes>
      <Route index element={<HomePage/>}/>
      <Route path='smith-chart' element={<SmithChartTool/>}/>
      <Route path='impedance-calculator' element={<ImpedanceCalculator/>}/>
      <Route path='wave-propagation' element={<WavePropagation/>}/>
    </Routes>
  )
}

export default App
