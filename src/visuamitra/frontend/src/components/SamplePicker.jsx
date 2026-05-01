import React, { useState, useRef, useEffect, useMemo } from "react";

export default function SamplePicker({ 
  availableSamples = [], 
  selectedIndices = [], 
  onSelectionChange 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter logic: We keep the original 'idx' so selection still works
  const filteredSamples = useMemo(() => {
    return availableSamples
      .map((name, idx) => ({ name, idx }))
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [availableSamples, searchTerm]);

  const toggleSample = (idx) => {
    const isCurrentlySelected = selectedIndices.includes(idx);
    const newSelection = isCurrentlySelected
      ? selectedIndices.filter((i) => i !== idx)
      : [...selectedIndices, idx];
    onSelectionChange(newSelection);
  };

  // Smart Select All: Only selects what is visible in the search
  const selectFiltered = () => {
    const visibleIndices = filteredSamples.map(s => s.idx);
    const combined = Array.from(new Set([...selectedIndices, ...visibleIndices]));
    onSelectionChange(combined);
  };

  const clearFiltered = () => {
    const visibleIndices = filteredSamples.map(s => s.idx);
    const newSelection = selectedIndices.filter(idx => !visibleIndices.includes(idx));
    onSelectionChange(newSelection);
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
            {/* Search Input */}
            <div style={searchContainerStyle}>
              <input 
                autoFocus
                placeholder="Filter list..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInputStyle}
              />
            </div>

            {/* Contextual Action Bar */}
            <div style={actionBarStyle}>
              <button type="button" onClick={selectFiltered} style={smallBtnStyle}>
                {searchTerm ? 'Add Filtered' : 'All'}
              </button>
              {searchTerm && (
                <button type="button" onClick={clearFiltered} style={smallBtnStyle}>
                  Clear Filtered
                </button>
              )}
              <button type="button" onClick={() => onSelectionChange([])} style={{ ...smallBtnStyle, color: '#999' }}>
                Clear All
              </button>
            </div>

            {/* List items */}
            {filteredSamples.map(({ name, idx }) => (
              <label key={idx} style={optionStyle}>
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(idx)}
                  onChange={() => toggleSample(idx)}
                  style={checkboxStyle}
                />
                <span style={sampleNameStyle}>{name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const searchContainerStyle = {
  padding: '8px',
  background: '#fcfcfc',
  borderBottom: '1px solid #eee',
  position: 'sticky',
  top: 0,
  zIndex: 2
};

const searchInputStyle = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  outline: 'none',
  boxSizing: 'border-box'
};

const wrapperStyle = { display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'inherit' };
const labelStyle = { fontWeight: '700', fontSize: '14px', color: '#333' };
const containerStyle = { position: 'relative', width: '280px' };
const triggerStyle = {
  padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px',
  background: '#fff', cursor: 'pointer', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};
const textStyle = { fontSize: '13px', color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const dropdownStyle = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
  background: '#fff', border: '1px solid #ddd', borderRadius: '6px',
  marginTop: '5px', maxHeight: '300px', overflowY: 'auto',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
};
const actionBarStyle = {
  display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #eee',
  background: '#fff', position: 'sticky', top: '40px', zIndex: 1
};
const optionStyle = { display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9' };
const checkboxStyle = { marginRight: '10px', cursor: 'pointer', accentColor: '#328547' };
const sampleNameStyle = { fontSize: '12px', color: '#555' };
const smallBtnStyle = { padding: '2px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#328547', fontWeight: '600' };