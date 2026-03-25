import React, { useState, useRef, useEffect } from "react";

export default function SamplePicker({ 
  availableSamples = [], 
  selectedIndices = [], 
  onSelectionChange 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSample = (idx) => {
    const isCurrentlySelected = selectedIndices.includes(idx);
    let newSelection;
    if (isCurrentlySelected) {
      newSelection = selectedIndices.filter((i) => i !== idx);
    } else {
      newSelection = [...selectedIndices, idx];
    }
    // Pass the new array back to the parent state
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    // Maps every available sample to its index
    const allIndices = availableSamples.map((_, idx) => idx);
    onSelectionChange(allIndices);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="sample-picker-wrapper" ref={dropdownRef} style={wrapperStyle}>
      <label style={labelStyle}>Samples:</label>
      
      <div style={containerStyle}>
        <div onClick={() => setIsOpen(!isOpen)} style={triggerStyle}>
          <span style={textStyle}>
            {selectedIndices.length === 0 
              ? "Select Samples..." 
              : `(${selectedIndices.length}) samples selected`}
          </span>
          <span style={{ fontSize: '10px', color: '#888' }}>{isOpen ? '▲' : '▼'}</span>
        </div>

        {isOpen && (
            <div style={dropdownStyle}>
                <div style={actionBarStyle}>
                <button type="button" onClick={selectAll} style={smallBtnStyle}>All</button>
                <button type="button" onClick={clearAll} style={smallBtnStyle}>Clear</button>
                <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
                    {availableSamples.length} total
                </span>
                </div>
                

                {availableSamples.map((name, idx) => (
                <label key={idx} 
                        style={optionStyle} 
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                    <input
                    type="checkbox"
                    checked={selectedIndices.includes(idx)}
                    onChange={() => toggleSample(idx)}
                    style={checkboxStyle}
                    />
                    <span title={name} style={sampleNameStyle}>{name}</span>
                </label>
                ))}
                
                {availableSamples.length === 0 && (
                <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
                    No samples found
                </div>
                )}
            </div>
            )}
      </div>
    </div>
  );
}

// Styles 
const wrapperStyle = { display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'inherit' };
const labelStyle = { fontWeight: '700', fontSize: '14px', color: '#333' };
const containerStyle = { position: 'relative', width: '220px' };
const triggerStyle = {
  padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px',
  background: '#fff', cursor: 'pointer', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};
const textStyle = { fontSize: '13px', color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const dropdownStyle = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
  background: '#fff', border: '1px solid #ddd', borderRadius: '6px',
  marginTop: '5px', maxHeight: '250px', overflowY: 'auto',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
};
const optionStyle = {
  display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer',
  borderBottom: '1px solid #f5f5f5', transition: 'background 0.2s'
};
const checkboxStyle = { marginRight: '10px', cursor: 'pointer', accentColor: '#328547' };
const sampleNameStyle = { fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' };
const actionBarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderBottom: '2px solid #eee',
  background: '#fcfcfc',
  position: 'sticky',
  top: 0,
  zIndex: 1
};

const smallBtnStyle = {
  padding: '2px 8px',
  fontSize: '11px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  color: '#328547', // VisuaMiTRa green
  fontWeight: '600',
  transition: 'all 0.2s'
};