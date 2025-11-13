import React from 'react';
import styled from 'styled-components';

const Bar = styled.header`
  height: 64px;
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e6eef8;
`;

const Title = styled.h1`
  font-size: 18px;
  margin: 0;
  color: #0f1724;
`;

const Right = styled.div`
  display:flex;
  gap: 12px;
  align-items:center;
`;

export default function Topbar(){
  return (
    <Bar>
      <Title>GFP Data Portal</Title>
      <Right>
        <input placeholder="Search country or category..." style={{padding:'8px 10px', borderRadius:8, border:'1px solid #ddd'}} />
        <div style={{width:36, height:36, borderRadius:18, background:'#0f62fe', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}>U</div>
      </Right>
    </Bar>
  )
}
