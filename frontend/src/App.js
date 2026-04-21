import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadData from './pages/LoadData';
import DataEditor from './pages/DataEditor';
import Connections from './pages/Connections';
import Publish from './pages/Publish';
import Audit from './pages/Audit';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import styled from 'styled-components';

import DBConnection from './pages/DBConnection'
import { DataProvider } from './context/DataContext';

const AppLayout = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr;
  height: 100vh;
  gap: 16px;
`;

const SidebarWrap = styled.div`
  grid-row: 1 / span 2;
  grid-column: 1;
  background: #0f1724;
  color: white;
  padding: 20px;
`;

const Main = styled.main`
  grid-column: 2;
  grid-row: 2;
  padding: 10px;
  overflow: auto;
`;

export default function App() {
  return (
    <DataProvider>
      <AppLayout>
        <SidebarWrap>
          <Sidebar />
        </SidebarWrap>
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          <Topbar />
        </div>
        <Main>
          <Routes>
            <Route path="/" element={<LoadData />} />
            <Route path="/editor" element={<DataEditor />} />
            <Route path="/Connections" element={<Connections />} />
            <Route path="/publish" element={<Publish />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/DBConnection" element={<DBConnection/>} />
          </Routes>
        </Main>
      </AppLayout>
    </DataProvider>
  );
}


