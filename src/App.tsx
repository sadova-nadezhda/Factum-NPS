import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './hooks/store'
import Topbar from './components/Topbar/Topbar'
import AddModal from './components/AddModal/AddModal'
import Dashboard from './pages/Dashboard'
import Calls from './pages/Calls'
import { Toast } from './components/ui'
import { useStore } from './hooks/store'

function Inner() {
  const [modalOpen, setModalOpen] = useState(false)
  const { toast } = useStore()

  return (
    <>
      <Topbar onAddClick={() => setModalOpen(true)} />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calls" element={<Calls />} />
        </Routes>
      </main>
      <AddModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <Toast message={toast.message} visible={toast.visible} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Inner />
      </StoreProvider>
    </BrowserRouter>
  )
}
