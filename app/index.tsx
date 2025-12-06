import AppNavigator from '@/components/AppNavigator'
import { AuthProvider } from '@/context/AuthContext'
import React from 'react'

const index = () => {
  return (
    
    <AuthProvider>
      <AppNavigator/>
    </AuthProvider>
  )
}

export default index