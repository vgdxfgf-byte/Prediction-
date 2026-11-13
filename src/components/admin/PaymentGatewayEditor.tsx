import React, { useState, useEffect, useRef } from 'react';
import { PaymentGatewayChannel, PaymentGatewayConfig } from '../../types';
import {
  Landmark,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface PaymentGatewayEditorProps {
  initialConfig: PaymentGatewayConfig;
  targetLabel: string;
  hasCustomOverride?: boolean;
  onSave: (
    config: Omit<PaymentGatewayConfig, 'updatedAt'>
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onResetToGlobal?: () => Promise<unknown> | void;
}

const isUpiChannel = (ch: Pick<PaymentGatewayChannel, 'label' | 'value'>) =>
  ch.label.toLowerCase().includes('upi') || ch.value.includes('@');

export const PaymentGatewayEditor: React.FC<PaymentGatewayEditorProps> = ({
  initialConfig,
  targetLabel,
  hasCustomOverride,
  onSave,
  onResetToGlobal
}) => {
  const [title, setTitle] = useState(initialConfig.title);
  const [instructions, setInstructions] = useState(initialConfig.instructions || '');
  const [channels, setChannels] = useState<PaymentGatewayChannel[]>(initialConfig.channels);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const prevTargetRef = useRef(targetLabel);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    const targetChanged = prevTargetRef.current !== targetLabel;
    if (targetChanged) {
      prevTargetRef.current = targetLabel;
      isDirtyRef.current = false;
      setIsDirty(false);
      setErrorMsg('');
      setSuccessMsg('');
    } else if (isDirtyRef.current) {
      return;
    }

    setTitle(initialConfig.title);
    setInstructions(initialConfig.instructions || '');
    setChannels(initialConfig.channels.map(c => ({ ...c })));
  }, [initialConfig, targetLabel]);

  const markDirty = () => {
    isDirtyRef.current = true;
    setIsDirty(true);
  };

  const handleChannelChange = (id: string, field: keyof PaymentGatewayChannel, value: string | boolean) => {
    markDirty();
    setChannels(prev =>
      prev.map(ch => (ch.id === id ? { ...ch, [field]: value } : ch))
    );
    setErrorMsg('');
  };

  const handleAddUpiChannel = () => {
    markDirty();
    const existingUpiCount = channels.filter(isUpiChannel).length;
    setChannels(prev => [
      ...prev,
      {
        id: `gw_upi_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        label: existingUpiCount === 0 ? 'Admin UPI ID' : `UPI ID #${existingUpiCount + 1}`,
        value: '',
        enabled: true
      }
    ]);
    setErrorMsg('');
  };

  const handleAddChannel = () => {
    markDirty();
    setChannels(prev => [
      ...prev,
      {
        id: `gw_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        label: 'New Payment Method',
        value: '',
        enabled: true
      }
    ]);
    setErrorMsg('');
  };

  const handleMoveChannel = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= channels.length) return;
    markDirty();
    setChannels(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  };

  const handleRemoveChannel = (id: string) => {
    markDirty();
    setChannels(prev => prev.filter(ch => ch.id !== id));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const invalidChannel = channels.find(c => !c.label.trim() || !c.value.trim());
    if (invalidChannel) {
      setErrorMsg('Please enter both a label and UPI ID / payment details for every channel (or remove empty rows).');
      return;
    }

    if (channels.length === 0) {
      setErrorMsg('At least one payment channel or UPI ID is required.');
      return;
    }

    setSaving(true);
    const res = await onSave({
      title: title.trim() || 'Official Admin Payment Gateway',
      instructions: instructions.trim(),
      channels: channels.map(c => ({
        ...c,
        label: c.label.trim(),
        value: c.value.trim()
      }))
    });
    setSaving(false);

    if (res.success) {
      isDirtyRef.current = false;
      setIsDirty(false);
      setSuccessMsg(`Payment Gateway & UPI IDs updated for ${targetLabel}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to save payment gateway settings');
    }
  };

  const activePreviewChannels = channels.filter(c => c.enabled && c.label.trim() && c.value.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Editing Gateway For</div>
            <div className="font-bold text-white text-xs">{targetLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Unsaved Changes
            </span>
          )}
          {hasCustomOverride !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hasCustomOverride
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {hasCustomOverride ? 'Custom Override Active' : 'Using Global Default'}
            </span>
          )}

          {hasCustomOverride && onResetToGlobal && (
            <button
              type="button"
              onClick={async () => {
                isDirtyRef.current = false;
                setIsDirty(false);
                await onResetToGlobal();
                setSuccessMsg(`Reset ${targetLabel} back to Global Official Admin Payment Gateway.`);
                setTimeout(() => setSuccessMsg(''), 4000);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Use Global Default
            </button>
          )}
        </div>
      </div>

      {/* Title & Instructions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-slate-300 font-semibold block">Gateway Display Title:</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => {
              markDirty();
              setTitle(e.target.value);
            }}
            placeholder="Official Admin Payment Gateway"
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-slate-300 font-semibold block">Deposit Instructions (Optional):</label>
          <input
            type="text"
            value={instructions}
            onChange={e => {
              markDirty();
              setInstructions(e.target.value);
            }}
            placeholder="Send deposit to any active channel below..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label className="text-slate-300 font-semibold block">UPI IDs & Payment Channels Shown to User:</label>
            <span className="text-[10px] text-slate-500">
              Edit any UPI ID below, toggle visibility, or add multiple UPI IDs & payment methods.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddUpiChannel}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Add UPI ID
            </button>
            <button
              type="button"
              onClick={handleAddChannel}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Other Channel
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {channels.map((ch, idx) => {
            const upiDetected = isUpiChannel(ch);
            return (
              <div
                key={ch.id}
                className={`p-3 rounded-xl border transition space-y-2 ${
                  ch.enabled
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      upiDetected
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {upiDetected ? 'UPI ID' : `Channel #${idx + 1}`}
                    </span>
                    {['Admin UPI ID', 'PhonePe / GPay UPI', 'Paytm UPI', 'Bank / IMPS'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleChannelChange(ch.id, 'label', preset)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveChannel(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveChannel(idx, 1)}
                      disabled={idx === channels.length - 1}
                      title="Move down"
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="sm:w-1/3">
                    <input
                      type="text"
                      value={ch.label}
                      onChange={e => handleChannelChange(ch.id, 'label', e.target.value)}
                      placeholder="Label (e.g. Admin UPI ID)"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white font-semibold outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={ch.value}
                      onChange={e => handleChannelChange(ch.id, 'value', e.target.value)}
                      placeholder={upiDetected ? 'Enter any UPI ID (e.g. name@okicici or 9876543210@ybl)' : 'UPI ID / Bank Account / Wallet Address'}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleChannelChange(ch.id, 'enabled', !ch.enabled)}
                      title={ch.enabled ? 'Disable channel' : 'Enable channel'}
                      className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 text-[11px] transition cursor-pointer ${
                        ch.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {ch.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{ch.enabled ? 'Active' : 'Hidden'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(ch.id)}
                      title="Remove channel"
                      disabled={channels.length <= 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 disabled:opacity-30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview of User Deposit Screen */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Live Preview (What User Sees in Deposit Coins)
        </div>
        {activePreviewChannels.length === 0 ? (
          <div className="text-[11px] text-amber-400">
            No active channels right now. Enable at least one UPI ID or channel so users can deposit.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activePreviewChannels.map(ch => (
              <div key={ch.id} className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 truncate">{ch.label}</div>
                  <div className="font-mono font-bold text-emerald-400 text-[11px] truncate">{ch.value}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                  Copy
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="pt-1 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Payment Gateway'}</span>
        </button>
      </div>
    </form>
  );
};
