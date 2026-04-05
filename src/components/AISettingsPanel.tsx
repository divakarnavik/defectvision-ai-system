import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Key, Check, X, ChevronDown, ChevronUp, Loader2, ExternalLink, Zap } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  getApiKey, setApiKey, clearApiKey,
  isAIEnabled, setAIEnabled,
  validateApiKey,
  getProvider, setProvider,
  AIProvider,
} from '../utils/aiService';

interface AISettingsPanelProps {
  onStatusChange?: (enabled: boolean) => void;
}

const PROVIDERS: { id: AIProvider; name: string; description: string; keyPrefix: string; keyUrl: string; color: string }[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash — best quality, 15 req/min free',
    keyPrefix: 'AIza',
    keyUrl: 'https://aistudio.google.com/apikey',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'groq',
    name: 'Groq (Llama 4)',
    description: 'Llama 4 Scout Vision — ultra-fast, 30 req/min free',
    keyPrefix: 'gsk_',
    keyUrl: 'https://console.groq.com/keys',
    color: 'from-orange-500 to-red-500',
  },
];

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ onStatusChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AIProvider>(getProvider());
  const [keyInput, setKeyInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const currentProviderInfo = PROVIDERS.find(p => p.id === activeProvider) || PROVIDERS[0];

  // Load state for current provider
  useEffect(() => {
    const existingKey = getApiKey(activeProvider);
    if (existingKey) {
      setKeyInput(existingKey);
      setSaved(true);
      setValidationStatus('valid');
    } else {
      setKeyInput('');
      setSaved(false);
      setValidationStatus('idle');
    }
    setErrorMsg('');
    setEnabled(isAIEnabled());
  }, [activeProvider]);

  const handleProviderChange = useCallback((provider: AIProvider) => {
    setActiveProvider(provider);
    setProvider(provider);
    // Check if this provider has a saved key
    const key = getApiKey(provider);
    if (key) {
      setEnabled(true);
      setAIEnabled(true);
      onStatusChange?.(true);
    }
  }, [onStatusChange]);

  const handleSaveKey = useCallback(async () => {
    const key = keyInput.trim();
    if (!key) {
      setErrorMsg('Please enter an API key');
      return;
    }

    setValidating(true);
    setErrorMsg('');
    setValidationStatus('idle');

    const result = await validateApiKey(key, activeProvider);

    if (result.valid) {
      setApiKey(key, activeProvider);
      setSaved(true);
      setValidationStatus('valid');
      setEnabled(true);
      setAIEnabled(true);
      onStatusChange?.(true);
    } else {
      setValidationStatus('invalid');
      setErrorMsg(result.error || 'Invalid API key');
    }

    setValidating(false);
  }, [keyInput, activeProvider, onStatusChange]);

  const handleClearKey = useCallback(() => {
    clearApiKey(activeProvider);
    setKeyInput('');
    setSaved(false);
    setValidationStatus('idle');
    setEnabled(false);
    setAIEnabled(false);
    setErrorMsg('');
    onStatusChange?.(false);
  }, [activeProvider, onStatusChange]);

  const handleToggle = useCallback(() => {
    if (!saved) return;
    const next = !enabled;
    setEnabled(next);
    setAIEnabled(next);
    onStatusChange?.(next);
  }, [enabled, saved, onStatusChange]);

  return (
    <div className="max-w-3xl mx-auto mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300',
          'border backdrop-blur-sm',
          enabled
            ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-sm shadow-violet-100'
            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            enabled
              ? `bg-gradient-to-br ${currentProviderInfo.color}`
              : 'bg-gray-300'
          )}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-sm font-semibold',
                enabled ? 'text-violet-700' : 'text-gray-600'
              )}>
                AI Analysis
              </span>
              {enabled && (
                <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                  Active
                </span>
              )}
              {enabled && (
                <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">
                  {currentProviderInfo.name}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {enabled ? `Using ${currentProviderInfo.name} for uploaded images` : 'Enable AI for smarter defect detection'}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <div className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        expanded ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'
      )}>
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              AI Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((provider) => {
                const hasKey = !!getApiKey(provider.id);
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    className={cn(
                      'relative flex flex-col items-start p-3 rounded-lg border-2 transition-all duration-200 text-left',
                      activeProvider === provider.id
                        ? 'border-violet-400 bg-violet-50/50 shadow-sm'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={cn('w-5 h-5 rounded flex items-center justify-center', `bg-gradient-to-br ${provider.color}`)}>
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{provider.name}</span>
                      {hasKey && (
                        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Key saved" />
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 leading-tight">{provider.description}</span>
                    {activeProvider === provider.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              {currentProviderInfo.name} API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    if (saved) { setSaved(false); setValidationStatus('idle'); }
                  }}
                  placeholder={currentProviderInfo.keyPrefix + '...'}
                  className={cn(
                    'w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-all',
                    'focus:outline-none focus:ring-2',
                    validationStatus === 'valid'
                      ? 'border-green-300 focus:ring-green-200 bg-green-50/50'
                      : validationStatus === 'invalid'
                        ? 'border-red-300 focus:ring-red-200 bg-red-50/50'
                        : 'border-gray-200 focus:ring-violet-200 bg-gray-50'
                  )}
                />
                {validationStatus === 'valid' && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {validationStatus === 'invalid' && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              {!saved ? (
                <button
                  onClick={handleSaveKey}
                  disabled={validating || !keyInput.trim()}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                    `bg-gradient-to-r ${currentProviderInfo.color} text-white`,
                    'hover:opacity-90',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {validating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> Save</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleClearKey}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                >
                  Remove
                </button>
              )}
            </div>
            {errorMsg && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <X className="w-3 h-3" /> {errorMsg}
              </p>
            )}
          </div>

          {/* Toggle */}
          {saved && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable AI Analysis</p>
                <p className="text-xs text-gray-400">Use {currentProviderInfo.name} for image uploads</p>
              </div>
              <button
                onClick={handleToggle}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-all duration-300',
                  enabled ? `bg-gradient-to-r ${currentProviderInfo.color}` : 'bg-gray-300'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300',
                  enabled ? 'left-[22px]' : 'left-0.5'
                )} />
              </button>
            </div>
          )}

          {/* Help link */}
          <div className="pt-2 border-t border-gray-100">
            <a
              href={currentProviderInfo.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Get a free {currentProviderInfo.name} API key
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPanel;
