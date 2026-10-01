import React, { useState } from 'react';
import { CustomerAppScreen } from './src/screens/CustomerAppScreen';
import { DeliveryAgentAppScreen } from './src/screens/DeliveryAgentAppScreen';
import { mobileApi } from './src/services/mobileApi';

export default function App() {
  const [appMode, setAppMode] = useState<'customer' | 'rider'>('customer');
  const [currentTenant, setCurrentTenant] = useState<string>(mobileApi.getTenantId());

  const handleSwitchTenant = (tenantId: string) => {
    mobileApi.setTenantId(tenantId);
    setCurrentTenant(tenantId);
  };

  return (
    <div style={{ background: '#020617', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Demo Bar for Testing Mobile SaaS Portals */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Tenant:</span>
          <select
            value={currentTenant}
            onChange={e => handleSwitchTenant(e.target.value)}
            style={{ background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem' }}
          >
            <option value="store_royal_001">Royal Kirana (001)</option>
            <option value="store_fresh_002">Fresh Mart (002)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setAppMode('customer')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: appMode === 'customer' ? '#059669' : '#334155',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Customer App
          </button>
          <button
            onClick={() => setAppMode('rider')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: appMode === 'rider' ? '#0284c7' : '#334155',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Rider App
          </button>
        </div>
      </div>

      {/* Screen Render */}
      <div style={{ flex: 1 }}>
        {appMode === 'customer' ? <CustomerAppScreen /> : <DeliveryAgentAppScreen />}
      </div>
    </div>
  );
}
