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

  // Calculated relative font scales
  const rootFontSizeRem = `${(baseFontSize / 16).toFixed(4)}rem`;
  const btnFontSizeEm = `${((baseFontSize - 1) / baseFontSize).toFixed(4)}em`;
  const arrowFontSizeEm = `${((baseFontSize - 3) / baseFontSize).toFixed(4)}em`;

  const inlineStyles = {
    wrapper: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75em', 
      fontFamily: 'inherit',
      fontSize: rootFontSizeRem 
    },
    label: { 
      fontWeight: '700', 
      fontSize: '1em', 
      color: '#333' 
    },
    container: { 
      position: 'relative', 
      width: '17.5em' 
    },
    trigger: {
      padding: '0.3125em 0.75em', 
      border: '0.0625em solid #ccc', 
      borderRadius: '0.25em',
      background: '#fff', 
      cursor: 'pointer', 
      display: 'flex', 
      height: '2em', 
      boxSizing: 'border-box',
      justifyContent: 'space-between', 
      alignItems: 'center', 
      boxShadow: '0 0.0625em 0.125em rgba(0,0,0,0.05)'
    },
    triggerText: { 
      fontSize: '1em', 
      color: '#333', 
      whiteSpace: 'nowrap', 
      overflow: 'hidden', 
      textOverflow: 'ellipsis' 
    },
    dropdown: {
      position: 'absolute', 
      top: '100%', 
      left: 0, 
      right: 0, 
      zIndex: 1000,
      background: '#fff', 
      border: '0.0625em solid #ccc', 
      borderRadius: '0.375em',
      marginTop: '0.3125em', 
      maxHeight: '18.75em', 
      overflowY: 'auto',
      boxShadow: '0 0.625em 0.9375em -0.1875em rgba(0,0,0,0.1)'
    },
    searchContainer: { 
      padding: '0.5em', 
      background: '#fcfcfc', 
      borderBottom: '0.0625em solid #eee', 
      position: 'sticky', 
      top: 0, 
      zIndex: 2 
    },
    searchInput: {
      width: '100%', 
      padding: '0.3125em 0.625em', 
      fontSize: '1em', 
      height: '1.875em',
      border: '0.0625em solid #ccc', 
      borderRadius: '0.25em', 
      outline: 'none', 
      boxSizing: 'border-box'
    },
    actionBar: { 
      display: 'flex', 
      gap: '0.5em', 
      padding: '0.375em 0.75em', 
      borderBottom: '0.0625em solid #eee', 
      background: '#fff', 
      position: 'sticky', 
      top: '2.875em', 
      zIndex: 1 
    },
    optionLabel: { 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0.5em 0.75em', 
      cursor: 'pointer', 
      borderBottom: '0.0625em solid #f9f9f9', 
      margin: 0 
    },
    sampleName: { 
      fontSize: '1em', 
      color: '#444' 
    },
    smallBtn: { 
      padding: '0.1875em 0.5em', 
      fontSize: btnFontSizeEm, 
      borderRadius: '0.25em', 
      border: '0.0625em solid #ccc', 
      background: '#fff', 
      cursor: 'pointer', 
      color: '#328547', 
      fontWeight: '600' 
    },
    checkbox: { 
      marginRight: '0.625em', 
      width: '0.875em', 
      height: '0.875em', 
      cursor: 'pointer', 
      accentColor: '#328547' 
    }
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
          <span style={{ fontSize: arrowFontSizeEm, color: '#666', marginLeft: '0.375em' }}>
            {isOpen ? '▲' : '▼'}
          </span>
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