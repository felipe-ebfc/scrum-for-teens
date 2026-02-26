import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  showSampleTasks: boolean;
  setShowSampleTasks: (show: boolean) => void;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  showSampleTasks: false,
  setShowSampleTasks: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSampleTasks, setShowSampleTasks] = useState(() => {
    // Load from localStorage or default to false
    const saved = localStorage.getItem('showSampleTasks');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleShowSampleTasks = (show: boolean) => {
    setShowSampleTasks(show);
    localStorage.setItem('showSampleTasks', JSON.stringify(show));
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        showSampleTasks,
        setShowSampleTasks: handleShowSampleTasks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
