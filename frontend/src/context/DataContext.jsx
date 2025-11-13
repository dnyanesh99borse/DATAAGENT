// import React, { createContext, useContext, useState } from 'react';

// const DataContext = createContext();

// export function DataProvider({ children }) {
//   const [loadedData, setLoadedData] = useState([]);        // full rows
//   const [loadedColumns, setLoadedColumns] = useState([]);  // columns
//   const [fileName, setFileName] = useState('');            // uploaded file name

//   const clearData = () => {
//     setLoadedData([]);
//     setLoadedColumns([]);
//     setFileName('');
//   };

//   return (
//     <DataContext.Provider value={{
//       loadedData, setLoadedData,
//       loadedColumns, setLoadedColumns,
//       fileName, setFileName,
//       clearData
//     }}>
//       {children}
//     </DataContext.Provider>
//   );
// }

// export const useData = () => useContext(DataContext);










import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  // Load from localStorage if exists, else empty
  const [loadedData, setLoadedData] = useState(() => {
    const saved = localStorage.getItem('loadedData');
    return saved ? JSON.parse(saved) : [];
  });

  const [loadedColumns, setLoadedColumns] = useState(() => {
    const saved = localStorage.getItem('loadedColumns');
    return saved ? JSON.parse(saved) : [];
  });

  const [fileName, setFileName] = useState(() => {
    return localStorage.getItem('fileName') || '';
  });

  // Whenever data changes, save it to localStorage
  useEffect(() => {
    localStorage.setItem('loadedData', JSON.stringify(loadedData));
  }, [loadedData]);

  useEffect(() => {
    localStorage.setItem('loadedColumns', JSON.stringify(loadedColumns));
  }, [loadedColumns]);

  useEffect(() => {
    localStorage.setItem('fileName', fileName);
  }, [fileName]);

  const clearData = () => {
    setLoadedData([]);
    setLoadedColumns([]);
    setFileName('');
    localStorage.removeItem('loadedData');
    localStorage.removeItem('loadedColumns');
    localStorage.removeItem('fileName');
  };

  return (
    <DataContext.Provider value={{
      loadedData, setLoadedData,
      loadedColumns, setLoadedColumns,
      fileName, setFileName,
      clearData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
