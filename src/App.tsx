import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import WorkDetail from './pages/WorkDetail'
import AdminLogin from './admin/Login'
import ChangePassword from './admin/ChangePassword'
import AdminWorkList from './admin/WorkList'
import AdminWorkEdit from './admin/WorkEdit'
import AdminSettings from './admin/Settings'
import AdminTrash from './admin/Trash'
import AdminLayout from './components/AdminLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/work/:slug" element={<WorkDetail />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/change-password" element={<ChangePassword />} />
      {/* 共享布局：后台各页切换时头部不重挂载（不整页刷新） */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminWorkList />} />
        <Route path="/admin/trash" element={<AdminTrash />} />
        <Route path="/admin/works/new" element={<AdminWorkEdit />} />
        <Route path="/admin/works/:id/edit" element={<AdminWorkEdit />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
