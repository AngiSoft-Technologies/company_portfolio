import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import {
  FaSave, FaSpinner, FaUndo, FaCheckCircle, FaExclamationTriangle,
  FaPaperPlane, FaList, FaEye, FaEyeSlash, FaMicrochip, FaKey,
} from 'react-icons/fa';

const DEFAULT_CONFIG = {
  enabled: true,
  provider: 'nvidia',
  name: 'NVIDIA NIM',
  kind: 'openai',
  baseUrl: 'https://integrate.api.nvidia.com',
  apiKey: '',
  model: '',
  maxTokens: 1200,
  temperature: 0.3,
  timeoutMs: 25000,
};

const KIND_LABELS = {
  openai: 'OpenAI-compatible (chat/completions)',
  anthropic: 'Anthropic (Messages API)',
  google: 'Google Gemini (generateContent)',
};

const AIConfigAdmin = () => {
  const { colors } = useTheme();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [presets, setPresets] = useState([]);
  const [source, setSource] = useState('env');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [models, setModels] = useState([]);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const inputClass = `w-full px-4 py-3 rounded-lg border transition-all focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-slate-800 border-slate-600 text-white placeholder-slate-400`;
  const labelClass = `block text-sm font-medium mb-2 text-slate-300`;

  const setField = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const flash = (text) => {
    setMessage({ type: 'success', text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet('/admin/ai-config');
        if (data?.config) {
          setConfig((prev) => ({ ...DEFAULT_CONFIG, ...prev, ...data.config }));
        }
        setPresets(Array.isArray(data?.presets) ? data.presets : []);
        setSource(data?.source === 'db' ? 'db' : 'env');
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectPreset = (id) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      provider: preset.id,
      name: preset.name,
      kind: preset.kind || 'openai',
      baseUrl: preset.baseUrl || '',
      model: preset.defaultModel && !prev.model ? preset.defaultModel : prev.model,
      apiKey: prev.apiKey || '',
    }));
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const saved = await apiPut('/admin/ai-config', config);
      setSource('db');
      setConfig((prev) => ({ ...prev, ...(saved.config || saved) }));
      flash('AI provider configuration saved. The chatbot now uses this provider.');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiPost('/admin/ai-config/test', { config });
      setMessage({ type: res.ok ? 'success' : 'error', text: res.message || (res.ok ? 'Connected' : 'Connection failed') });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  };

  const loadModels = async () => {
    setLoadingModels(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiPost('/admin/ai-config/models', { config });
      setModels(Array.isArray(res.models) ? res.models : []);
      flash(`Loaded ${res.models.length} available model${res.models.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setModels([]);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingModels(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white">
        <FaSpinner className="animate-spin text-4xl text-cyan-500" />
        <span className="ml-3 text-lg">Loading AI configuration...</span>
      </div>
    );
  }

  return (
    <div className="ai-config-admin">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Model Providers</h1>
          <p className="text-sm mt-1 text-slate-400">
            Choose which model backend powers the AngiSoft chatbot. Works with NVIDIA NIM,
            OpenAI, Anthropic, Google Gemini, Moonshot, Groq, DeepSeek, xAI, Mistral,
            OpenRouter and any OpenAI-compatible endpoint.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              source === 'db' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            Source: {source === 'db' ? 'Dashboard config (saved)' : 'Environment (.env) variables'}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors"
          >
            <FaUndo size={14} />
            Reload
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg mb-6 border ${
            message.type === 'success'
              ? 'bg-green-500/20 border-green-500/30 text-green-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
          {message.text}
        </div>
      )}

      {/* Provider picker */}
      <div className="p-6 rounded-xl bg-slate-800/50 mb-6">
        <h2 className="text-xl font-bold mb-2 text-white">
          <FaMicrochip className="inline mr-2" /> Provider Preset
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Pick a preset to pre-fill the API endpoint &amp; model, then set your API key.
          For a custom endpoint choose “Custom (OpenAI-compatible)”.
        </p>
        <select
          value={config.provider || ''}
          onChange={(e) => selectPreset(e.target.value)}
          className={inputClass}
        >
          {presets.length === 0 && <option value="">Loading presets…</option>}
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}{preset.apiKeyEnv ? `  (env: ${preset.apiKeyEnv})` : ''}
            </option>
          ))}
        </select>
        {config.provider && (
          <p className="text-xs text-slate-500 mt-2">
            {presets.find((p) => p.id === config.provider)?.note || 'OpenAI-compatible chat completions.'}
          </p>
        )}
      </div>

      {/* Configuration form */}
      <div className="p-6 rounded-xl bg-slate-800/50 mb-6">
        <h2 className="text-xl font-bold mb-6 text-white">Configuration</h2>

        <div className="grid gap-6">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.enabled !== false}
                onChange={(e) => setField('enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
            <span className="text-sm font-medium text-slate-300">
              Chatbot AI enabled
              {config.enabled === false && <span className="ml-2 text-red-400">(falling back to rule-based replies)</span>}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Display Name</label>
              <input
                type="text"
                className={inputClass}
                value={config.name || ''}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="NVIDIA NIM"
              />
            </div>
            <div>
              <label className={labelClass}>Provider ID</label>
              <input
                type="text"
                className={inputClass}
                value={config.provider || ''}
                onChange={(e) => setField('provider', e.target.value)}
                placeholder="nvidia"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Base URL</label>
            <input
              type="text"
              className={inputClass}
              value={config.baseUrl || ''}
              onChange={(e) => setField('baseUrl', e.target.value)}
              placeholder="https://integrate.api.nvidia.com"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>API Dialect</label>
              <select
                className={inputClass}
                value={config.kind || 'openai'}
                onChange={(e) => setField('kind', e.target.value)}
              >
                {Object.entries(KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="ai-model-options"
                  className={inputClass}
                  value={config.model || ''}
                  onChange={(e) => setField('model', e.target.value)}
                  placeholder="meta/llama-3.2-11b-vision-instruct"
                />
                <button
                  onClick={loadModels}
                  disabled={loadingModels}
                  title="Fetch model list from this provider"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {loadingModels ? <FaSpinner className="animate-spin" /> : <FaList size={14} />}
                  Models
                </button>
              </div>
              <datalist id="ai-model-options">
                {models.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
              {models.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">{models.length} models advertised by this provider.</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <FaKey className="inline mr-1" /> API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className={inputClass}
                value={config.apiKey || ''}
                onChange={(e) => setField('apiKey', e.target.value)}
                placeholder="nvapi-…"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Stored encrypted-at-rest in the server database (admin-only). You can also leave this
              blank to keep using the key from the server .env (AI_API_KEY / OPENAI_API_KEY).
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Max Tokens</label>
              <input
                type="number"
                min={64}
                max={8192}
                className={inputClass}
                value={config.maxTokens || 1200}
                onChange={(e) => setField('maxTokens', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Temperature</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={2}
                className={inputClass}
                value={config.temperature ?? 0.3}
                onChange={(e) => setField('temperature', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Timeout (seconds)</label>
              <input
                type="number"
                min={1}
                max={120}
                className={inputClass}
                value={Math.round((config.timeoutMs || 25000) / 1000)}
                onChange={(e) => setField('timeoutMs', Number(e.target.value) * 1000)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={testConnection}
          disabled={testing || saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {testing ? <FaSpinner className="animate-spin" /> : <FaPaperPlane size={14} />}
          Test Connection
        </button>
        <button
          onClick={saveConfig}
          disabled={saving || testing}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50"
        >
          {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Save Configuration
        </button>
      </div>

      <div
        className="mt-6 p-4 rounded-lg text-sm"
        style={{ backgroundColor: 'rgba(0,175,255,0.06)', border: `1px solid ${colors.borderLight}` }}
      >
        <p className="text-slate-400">
          <strong className="text-slate-200">How it works:</strong> saving stores the active provider,
          model and API key (key config) in the database. The public chatbot
          (<code className="text-cyan-400">POST /api/chatbot/chat</code>) reads it on every message, so
          changes apply immediately. If chatbot replies look scripted, the provider may be unreachable and
          the bot falls back to rule-based answers — use <strong>Test Connection</strong> to confirm.
        </p>
      </div>
    </div>
  );
};

export default AIConfigAdmin;