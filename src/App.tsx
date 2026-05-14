import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './hooks/store'
import { useStore } from './hooks/store'
import Sidebar, { MobileNav } from './components/Sidebar/Sidebar'
import AddModal from './components/AddModal/AddModal'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import Calls from './pages/Calls'
import { Toast } from './components/ui'
import styles from './App.module.scss'

function Inner() {
  const [modalOpen, setModalOpen] = useState(false)
  const { toast } = useStore()

  return (
    <div className={styles.layout}>
      <Sidebar onAddClick={() => setModalOpen(true)} />
      <main className={styles.main}>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/clients"  element={<Clients />}   />
          <Route path="/projects" element={<Projects />}  />
          <Route path="/calls"    element={<Calls />}     />
        </Routes>
      </main>
      <MobileNav onAddClick={() => setModalOpen(true)} />
      <AddModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
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
