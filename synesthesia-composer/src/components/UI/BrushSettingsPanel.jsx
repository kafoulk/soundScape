import { useBrush } from '../activeBrushContext'; 

const BrushSettingsPanel = () => {
  const { activeBrush, updateBrushSetting } = useBrush();

  // handle slider input changes
  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    const numericValue = name === 'spacing' ? parseFloat(value) : parseInt(value, 10);
    updateBrushSetting(name, numericValue);
  };

  return (
    <div style={styles.panel}>
      <h3>🖌️ Brush Settings</h3>
      
      {/* 1. Size Slider */}
      <div style={styles.controlGroup}>
        <label htmlFor="size">Size ({activeBrush.size}px)</label>
        <input
          type="range"
          id="size"
          name="size"
          min="1"
          max="100" 
          value={activeBrush.size}
          onChange={handleSliderChange}
        />
      </div>

      {/* 2. Spacing Slider */}
      <div style={styles.controlGroup}>
        <label htmlFor="spacing">Spacing ({Math.round(activeBrush.spacing * 100)}%)</label>
        <input
          type="range"
          id="spacing"
          name="spacing"
          min="0.01" 
          max="0.9"  
          step="0.01"
          value={activeBrush.spacing}
          onChange={handleSliderChange}
        />
        <p style={styles.note}>Low spacing = solid line. High spacing = stamped dots.</p>
      </div>
      
      {/* 3. Current Brush Display */}
      <p style={styles.current}>
        Active Brush: **{activeBrush.name}**
      </p>

    </div>
  );
};

const styles = {
  panel: {
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    width: '250px',
    backgroundColor: '#f9f9f9',
    margin: '10px',
    textAlign: 'left',
  },
  controlGroup: {
    marginBottom: '15px',
  },
  note: {
    fontSize: '0.75em',
    color: '#666',
    marginTop: '5px',
  },
  current: {
    fontWeight: 'bold',
    marginTop: '15px',
    borderTop: '1px dashed #ddd',
    paddingTop: '10px',
  }
};

export default BrushSettingsPanel;