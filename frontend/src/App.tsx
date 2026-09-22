import React, { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/')

  return (
    <AppLayout
      currentPath={currentPath}
      isAdmin={true}
      userEmail="test@wealthflow.local"
      userRole="User"
      onNavigate={(path) => setCurrentPath(path)}
      onLogout={() => console.log('Logout clicked')}
    >
      <DashboardPage />
    </AppLayout>
  )
}

export default App
