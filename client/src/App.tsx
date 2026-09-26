import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/documents" replace />} />
        <Route path="/documents" element={<Dashboard />} />
        <Route path="/documents/:docId" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
