import { createContext, useState, useContext } from 'react';

// default structure for a brush
const defaultBrush = {
  name: "Studio Pen",
  size: 15,
  opacity: 1.0, 
  spacing: 0.1,    
  streamline: 0.8,   
  shape: 'circle',     
  texture: null,       
  pressureCurve: (p) => p * 1.5, 
};

const ActiveBrushContext = createContext();

export const useBrush = () => useContext(ActiveBrushContext);

export const ActiveBrushProvider = ({ children }) => {
  const [activeBrush, setActiveBrush] = useState(defaultBrush);

  // Function to update a specific brush setting
  const updateBrushSetting = (key, value) => {
    setActiveBrush(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ActiveBrushContext.Provider value={{ activeBrush, setActiveBrush, updateBrushSetting }}>
      {children}
    </ActiveBrushContext.Provider>
  );
};