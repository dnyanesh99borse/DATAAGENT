import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

const Nav = styled.nav`
  display:flex;
  flex-direction:column;
  gap:16px;
`;

const Link = styled(NavLink)`
  color: #cbd5e1;
  text-decoration: none;
  padding: 10px;
  border-radius: 8px;
  &.active {
    background: rgba(255,255,255,0.06);
    color: white;
  }
`;

export default function Sidebar(){
  return (
    <Nav>
      <div style={{fontWeight:700, marginBottom:8}}>Global Fire Power - Data Portal</div>
      <Link to="/" end>Data Editor</Link>
      <Link to="/Connections">Connections</Link>
      <Link to="/publish">Publish</Link>
      <Link to="/audit">Audit Log</Link>
      <Link to="/DBConnection">DB Connection</Link>
      <hr style={{border:'none',height:1,background:'#1f2937', margin:'12px 0'}}/>
      <Link to="/settings">Settings</Link>
    </Nav>
  )
}
