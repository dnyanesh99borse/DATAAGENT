// src/context/DataContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Central DataContext for the app.
 *
 * Provides:
 * - loadedData, setLoadedData          (legacy / general-purpose full rows)
 * - loadedColumns, setLoadedColumns    (legacy / columns)
 * - fileName, setFileName              (legacy / uploaded filename)
 * - clearData()                        (clears legacy data)
 *
 * - pbixSchema, setPbixSchema          (structured schema: { fileName, tables: [...] })
 * - pbixPreview, setPbixPreview        (preview object: { [tableName]: { columns, rows, totalRows } })
 *
 * Persisted to localStorage so UI reloads keep state.
 */

const DataContext = createContext({
  // legacy
  loadedData: [],
  setLoadedData: () => {},
  loadedColumns: [],
  setLoadedColumns: () => {},
  fileName: '',
  setFileName: () => {},
  clearData: () => {},

  // pbix specific
  pbixSchema: null,
  setPbixSchema: () => {},
  pbixPreview: {},
  setPbixPreview: () => {}
});

export function DataProvider({ children }) {
  // ---------- Legacy / existing state ----------
  const [loadedData, setLoadedData] = useState(() => {
    try {
      const saved = localStorage.getItem('loadedData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loadedColumns, setLoadedColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('loadedColumns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fileName, setFileName] = useState(() => {
    try {
      return localStorage.getItem('fileName') || '';
    } catch {
      return '';
    }
  });

  // ---------- PBIX-specific state for DBConnection / app ----------
  // schema stored as { fileName, tables: [{ name, columns: [...], rowCount }, ...] } or null
  const [pbixSchema, setPbixSchema] = useState(() => {
    try {
      const raw = localStorage.getItem('pbix_extracted_schema');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // preview stored as { [tableName]: { columns: [], rows: [], totalRows: number } }
  const [pbixPreview, setPbixPreview] = useState(() => {
    try {
      const raw = localStorage.getItem('pbix_extracted_preview');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // ---------- Effects: keep localStorage in sync ----------

  // legacy
  useEffect(() => {
    try {
      localStorage.setItem('loadedData', JSON.stringify(loadedData));
    } catch {}
  }, [loadedData]);

  useEffect(() => {
    try {
      localStorage.setItem('loadedColumns', JSON.stringify(loadedColumns));
    } catch {}
  }, [loadedColumns]);

  useEffect(() => {
    try {
      localStorage.setItem('fileName', fileName || '');
    } catch {}
  }, [fileName]);

  // pbix
  useEffect(() => {
    try {
      if (pbixSchema === null) {
        localStorage.removeItem('pbix_extracted_schema');
      } else {
        localStorage.setItem('pbix_extracted_schema', JSON.stringify(pbixSchema));
      }
    } catch {}
  }, [pbixSchema]);

  useEffect(() => {
    try {
      if (!pbixPreview || Object.keys(pbixPreview).length === 0) {
        localStorage.removeItem('pbix_extracted_preview');
      } else {
        localStorage.setItem('pbix_extracted_preview', JSON.stringify(pbixPreview));
      }
    } catch {}
  }, [pbixPreview]);

  // ---------- Helpers ----------
  const clearData = () => {
    setLoadedData([]);
    setLoadedColumns([]);
    setFileName('');
    try {
      localStorage.removeItem('loadedData');
      localStorage.removeItem('loadedColumns');
      localStorage.removeItem('fileName');
    } catch {}
  };

  const clearPbix = () => {
    setPbixSchema(null);
    setPbixPreview({});
    try {
      localStorage.removeItem('pbix_extracted_schema');
      localStorage.removeItem('pbix_extracted_preview');
    } catch {}
  };

  // Export context value
  const value = {
    // legacy
    loadedData,
    setLoadedData,
    loadedColumns,
    setLoadedColumns,
    fileName,
    setFileName,
    clearData,

    // pbix specific
    pbixSchema,
    setPbixSchema,
    pbixPreview,
    setPbixPreview,
    clearPbix
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// convenience hook
export const useData = () => useContext(DataContext);
