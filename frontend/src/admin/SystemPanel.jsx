import React, { useState, useEffect } from 'react';
import { apiGet, apiDelete, apiPut, apiPost } from '../js/httpClient';

const TABS = ['Activity Logs', 'Error Logs', 'Site Settings', 'Version & Dependencies', 'Analytics'];

const SystemPanel = ({ theme }) => {
  const [tab, setTab] = useState(TABS[0]);
  const [activityLog, setActivityLog] = useState('');
  const [errorLog, setErrorLog] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [errorFilter, setErrorFilter] = useState('');
  const [settings, setSettings] = useState(null);
  const [settingsEdit, setSettingsEdit] = useState(null);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState('');
  const [upgradeResult, setUpgradeResult] = useState(null);
  const [frontendUpgradeResult, setFrontendUpgradeResult] = useState(null);
  const [activityLogJson, setActivityLogJson] = useState([]);
  const [errorLogJson, setErrorLogJson] = useState([]);

  useEffect(() => {
    if (tab === 'Activity Logs') fetchActivityLog();
    if (tab === 'Error Logs') fetchErrorLog();
    if (tab === 'Site Settings') fetchSettings();
    if (tab === 'Version & Dependencies') fetchVersion();
    if (tab === 'Analytics') fetchAnalytics();
    // eslint-disable-next-line
  }, [tab]);

  const fetchActivityLog = async () => {
    setLoading(true);
    const res = await fetch('/api/logs/activity-log');
    setActivityLog(await res.text());
    setLoading(false);
  };
  const fetchErrorLog = async () => {
    setLoading(true);
    const res = await fetch('/api/logs/error-log');
    setErrorLog(await res.text());
    setLoading(false);
  };
  const fetchSettings = async () => {
    setLoading(true);
    const data = await apiGet('/settings');
    setSettings(data);
    setSettingsEdit(JSON.parse(JSON.stringify(data)));
    setLoading(false);
  };
  const fetchVersion = async () => {
    setLoading(true);
    const data = await apiGet('/version');
    setVersion(data);
    setLoading(false);
  };
  const clearActivityLog = async () => {
    await apiDelete('/logs/activity-log');
    setNotif('Activity log cleared');
    fetchActivityLog();
  };
  const clearErrorLog = async () => {
    await apiDelete('/logs/error-log');
    setNotif('Error log cleared');
    fetchErrorLog();
  };
  const saveSettings = async () => {
    await apiPut('/settings', settingsEdit);
    setNotif('Settings updated');
    fetchSettings();
  };
  const downloadLog = (log, name) => {
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadLogJson = (json, name) => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleUpgrade = async () => {
    setLoading(true);
    setUpgradeResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const data = await apiPost('/version/upgrade', {}, token);
      setUpgradeResult(data);
      setNotif('Backend dependencies upgraded');
      fetchVersion();
    } catch (err) {
      setUpgradeResult({ error: err.message });
      setNotif('Upgrade failed');
    }
    setLoading(false);
  };
  const handleFrontendUpgrade = async () => {
    setLoading(true);
    setFrontendUpgradeResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const data = await apiPost('/version/upgrade-frontend', {}, token);
      setFrontendUpgradeResult(data);
      setNotif('Frontend dependencies upgraded');
      fetchVersion();
    } catch (err) {
      setFrontendUpgradeResult({ error: err.message });
      setNotif('Frontend upgrade failed');
    }
    setLoading(false);
  };
  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await fetch('/api/logs/activity-log-json');
    const data = await res.json();
    setActivityLogJson(data);
    const errRes = await fetch('/api/logs/error-log-json');
    setErrorLogJson(await errRes.json());
    setLoading(false);
  };

  // Analytics calculations
  const eventCounts = {};
  const ipCounts = {};
  const userCounts = {};
  activityLogJson.forEach(log => {
    if (log.event) eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
    if (log.ip) ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
    if (log.userId) userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
  });
  const errorCount = errorLogJson.length;

  // Filtered logs
  const filteredActivityLog = activityLog
    .split('\n')
    .filter(line => line.toLowerCase().includes(activityFilter.toLowerCase()))
    .join('\n');
  const filteredErrorLog = errorLog
    .split('\n')
    .filter(line => line.toLowerCase().includes(errorFilter.toLowerCase()))
    .join('\n');

  return (
    <div className={`admin-page-container max-w-5xl mx-auto p-6 ${theme}`}>
      <h1 className="admin-section-title">System & Logs</h1>
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{t}</button>
        ))}
        <a href="/" target="_blank" rel="noopener noreferrer" className="ml-auto px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">View Public Site</a>
      </div>
      {notif && <div className="mb-4 bg-green-100 text-green-700 px-4 py-2 rounded">{notif}</div>}
      {tab === 'Activity Logs' && (
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={fetchActivityLog} className="px-3 py-1 bg-blue-500 text-white rounded">Refresh</button>
            <button onClick={clearActivityLog} className="px-3 py-1 bg-red-500 text-white rounded">Clear</button>
            <button onClick={() => downloadLog(activityLog, 'activity.log')} className="px-3 py-1 bg-gray-700 text-white rounded">Download</button>
            <button onClick={async () => {
              const res = await fetch('/api/logs/activity-log-json');
              const json = await res.json();
              downloadLogJson(json, 'activity.json');
            }} className="px-3 py-1 bg-gray-700 text-white rounded">Download JSON</button>
            <input
              type="text"
              placeholder="Search logs..."
              className="ml-4 px-2 py-1 border rounded"
              value={activityFilter}
              onChange={e => setActivityFilter(e.target.value)}
            />
          </div>
          <pre className="bg-gray-900 text-green-200 p-4 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">{loading ? 'Loading...' : filteredActivityLog}</pre>
        </div>
      )}
      {tab === 'Error Logs' && (
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={fetchErrorLog} className="px-3 py-1 bg-blue-500 text-white rounded">Refresh</button>
            <button onClick={clearErrorLog} className="px-3 py-1 bg-red-500 text-white rounded">Clear</button>
            <button onClick={() => downloadLog(errorLog, 'error.log')} className="px-3 py-1 bg-gray-700 text-white rounded">Download</button>
            <button onClick={async () => {
              const res = await fetch('/api/logs/error-log-json');
              const json = await res.json();
              downloadLogJson(json, 'error.json');
            }} className="px-3 py-1 bg-gray-700 text-white rounded">Download JSON</button>
            <input
              type="text"
              placeholder="Search logs..."
              className="ml-4 px-2 py-1 border rounded"
              value={errorFilter}
              onChange={e => setErrorFilter(e.target.value)}
            />
          </div>
          <pre className="bg-gray-900 text-red-200 p-4 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">{loading ? 'Loading...' : filteredErrorLog}</pre>
        </div>
      )}
      {tab === 'Site Settings' && settingsEdit && (
        <div>
          <div className="mb-2 text-gray-600">Edit and save site-wide settings below.</div>
          <textarea
            className="w-full h-64 p-2 border rounded font-mono"
            value={JSON.stringify(settingsEdit, null, 2)}
            onChange={e => setSettingsEdit(JSON.parse(e.target.value))}
          />
          <button onClick={saveSettings} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Save Settings</button>
        </div>
      )}
      {tab === 'Version & Dependencies' && version && (
        <div className="space-y-4">
          <div><b>Backend Name:</b> {version.backend.name}</div>
          <div><b>Backend Version:</b> {version.backend.version}</div>
          <div><b>Frontend Name:</b> {version.frontend.name}</div>
          <div><b>Frontend Version:</b> {version.frontend.version}</div>
          <div>
            <b>Backend Dependencies:</b>
            <ul className="list-disc ml-6">
              {Object.entries(version.backend.dependencies || {}).map(([dep, ver]) => (
                <li key={dep}>{dep}: {ver}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>Backend DevDependencies:</b>
            <ul className="list-disc ml-6">
              {Object.entries(version.backend.devDependencies || {}).map(([dep, ver]) => (
                <li key={dep}>{dep}: {ver}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>Frontend Dependencies:</b>
            <ul className="list-disc ml-6">
              {Object.entries(version.frontend.dependencies || {}).map(([dep, ver]) => (
                <li key={dep}>{dep}: {ver}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>Frontend DevDependencies:</b>
            <ul className="list-disc ml-6">
              {Object.entries(version.frontend.devDependencies || {}).map(([dep, ver]) => (
                <li key={dep}>{dep}: {ver}</li>
              ))}
            </ul>
          </div>
          <button onClick={handleUpgrade} className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded">Upgrade Backend Dependencies</button>
          {upgradeResult && (
            <pre className="bg-gray-900 text-yellow-200 p-4 rounded overflow-x-auto max-h-96 whitespace-pre-wrap mt-2">{JSON.stringify(upgradeResult, null, 2)}</pre>
          )}
          <button onClick={handleFrontendUpgrade} className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded">Upgrade Frontend Dependencies</button>
          {frontendUpgradeResult && (
            <pre className="bg-gray-900 text-yellow-200 p-4 rounded overflow-x-auto max-h-96 whitespace-pre-wrap mt-2">{JSON.stringify(frontendUpgradeResult, null, 2)}</pre>
          )}
        </div>
      )}
      {tab === 'Analytics' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-2">Log Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 p-4 rounded shadow">
              <b>Event Counts</b>
              <ul className="list-disc ml-4">
                {Object.entries(eventCounts).map(([event, count]) => (
                  <li key={event}>{event}: {count}</li>
                ))}
              </ul>
            </div>
            <div className="bg-green-100 p-4 rounded shadow">
              <b>Top IPs</b>
              <ul className="list-disc ml-4">
                {Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ip, count]) => (
                  <li key={ip}>{ip}: {count}</li>
                ))}
              </ul>
            </div>
            <div className="bg-purple-100 p-4 rounded shadow">
              <b>Top Users</b>
              <ul className="list-disc ml-4">
                {Object.entries(userCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([user, count]) => (
                  <li key={user}>{user}: {count}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-100 p-4 rounded shadow">
              <b>Error Count</b>
              <div className="text-2xl font-bold">{errorCount}</div>
            </div>
          </div>
          {/* Simple text-based chart for event counts */}
          <div className="mt-6">
            <b>Event Frequency Chart</b>
            <pre className="bg-gray-900 text-yellow-200 p-4 rounded overflow-x-auto max-h-64 whitespace-pre-wrap">
              {Object.entries(eventCounts).map(([event, count]) => `${event.padEnd(20)} | ${'█'.repeat(Math.min(count, 40))} (${count})`).join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemPanel; 