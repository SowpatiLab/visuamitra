import React, { useState, useRef, useEffect, useMemo } from "react";

export default function SamplePicker({ 
  availableSamples = [], 
  selectedIndices = [], 
  onSelectionChange,
  baseFontSize = 13 
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

  const inlineStyles = {
    wrapper: { display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'inherit' },
    label: { fontWeight: '700', fontSize: `${baseFontSize}px`, color: '#333' },
    container: { position: 'relative', width: '280px' },
    trigger: {
      padding: '5px 12px', border: '1px solid #ccc', borderRadius: '4px',
      background: '#fff', cursor: 'pointer', display: 'flex', height: '32px', boxSizing: 'border-box',
      justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    triggerText: { fontSize: `${baseFontSize}px`, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    dropdown: {
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
      background: '#fff', border: '1px solid #ccc', borderRadius: '6px',
      marginTop: '5px', maxHeight: '300px', overflowY: 'auto',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
    },
    searchContainer: { padding: '8px', background: '#fcfcfc', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 2 },
    searchInput: {
      width: '100%', padding: '5px 10px', fontSize: `${baseFontSize}px`, height: '30px',
      border: '1px solid #ccc', borderRadius: '4px', outline: 'none', boxSizing: 'border-box'
    },
    actionBar: { display: 'flex', gap: '8px', padding: '6px 12px', borderBottom: '1px solid #eee', background: '#fff', position: 'sticky', top: '46px', zIndex: 1 },
    optionLabel: { display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9', margin: 0 },
    sampleName: { fontSize: `${baseFontSize}px`, color: '#444' },
    smallBtn: { padding: '3px 8px', fontSize: `${baseFontSize - 1}px`, borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', color: '#328547', fontWeight: '600' },
    checkbox: { marginRight: '10px', width: '14px', height: '14px', cursor: 'pointer', accentColor: '#328547' }
  };

  return (
    <div className="sample-picker-wrapper" ref={dropdownRef} style={inlineStyles.wrapper}>
      <label style={inlineStyles.label}>Samples:</label>
      
      <div style={inlineStyles.container}>
        <div onClick={() => setIsOpen(!isOpen)} style={inlineStyles.trigger}>
          <span style={inlineStyles.triggerText}>
            {selectedIndices.length === 0 
              ? "Select Samples..." 
              : `(${selectedIndices.length}) samples selected`}
          </span>
          <span style={{ fontSize: `${baseFontSize - 3}px`, color: '#666', marginLeft: '6px' }}>{isOpen ? '▲' : '▼'}</span>
        </div>

        {isOpen && (
          <div style={inlineStyles.dropdown}>
            {/* Search Input */}
            <div style={inlineStyles.searchContainer}>
              <input 
                autoFocus
                placeholder="Filter list..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={inlineStyles.searchInput}
              />
            </div>

            {/* Contextual Action Bar */}
            <div style={inlineStyles.actionBar}>
              <button type="button" onClick={selectFiltered} style={inlineStyles.smallBtn}>
                {searchTerm ? 'Add Filtered' : 'All'}
              </button>
              {searchTerm && (
                <button type="button" onClick={clearFiltered} style={inlineStyles.smallBtn}>
                  Clear Filtered
                </button>
              )}
              <button type="button" onClick={() => onSelectionChange([])} style={{ ...inlineStyles.smallBtn, color: '#888' }}>
                Clear All
              </button>
            </div>

            {/* List items */}
            {filteredSamples.map(({ name, idx }) => (
              <label key={idx} style={inlineStyles.optionLabel}>
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(idx)}
                  onChange={() => toggleSample(idx)}
                  style={inlineStyles.checkbox}
                />
                <span style={inlineStyles.sampleName}>{name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}