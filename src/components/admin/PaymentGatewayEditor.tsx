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
  ArrowDown,
  QrCode,
  Upload
} from 'lucide-react';
import { compressQrImage } from '../../utils/imageCompression';

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
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(initialConfig.qrCodeImageUrl || null);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const prevTargetRef = useRef(targetLabel);
  const isDirtyRef = useRef(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

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
    setQrCodeImageUrl(initialConfig.qrCodeImageUrl || null);
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

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    setQrProcessing(true);
    try {
      const compressed = await compressQrImage(file);
      markDirty();
      setQrCodeImageUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process QR code image');
    } finally {
      setQrProcessing(false);
    }
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

    if (channels.length === 0 && !qrCodeImageUrl) {
      setErrorMsg('Please provide at least one payment channel/UPI ID or upload a QR code.');
      return;
    }

    if (qrProcessing) {
      setErrorMsg('Please wait for the QR code image to finish processing.');
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
      })),
      qrCodeImageUrl: qrCodeImageUrl || null
    });
    setSaving(false);

    if (res.success) {
      isDirtyRef.current = false;
      setIsDirty(false);
      setSuccessMsg(`Payment Gateway, QR Code & UPI IDs updated for ${targetLabel}.`);
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

      {/* Deposit Payment QR Code Upload */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-200 font-semibold">Deposit QR Code (Optional)</div>
              <div className="text-[10px] text-slate-500">
                Upload a PhonePe, GPay, Paytm, or UPI QR code image for users to scan and pay.
              </div>
            </div>
          </div>
          {qrCodeImageUrl && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              QR Active
            </span>
          )}
        </div>

        <input
          ref={qrFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleQrFileChange}
          className="hidden"
        />

        {qrCodeImageUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="bg-white p-2 rounded-xl shrink-0 shadow">
              <img
                src={qrCodeImageUrl}
                alt="Deposit Payment QR Code"
                className="w-28 h-28 object-contain"
              />
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="text-[11px] text-slate-300 font-semibold">
                QR code ready for users in Deposit Coins
              </div>
              <div className="text-[10px] text-slate-400">
                Click Save Payment Gateway below after uploading or changing your QR code.
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  disabled={qrProcessing}
                  onClick={() => qrFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  {qrProcessing ? 'Processing...' : 'Replace QR'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markDirty();
                    setQrCodeImageUrl(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove QR
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={qrProcessing}
            onClick={() => qrFileInputRef.current?.click()}
            className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/60 hover:bg-slate-900 text-slate-300 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              {qrProcessing ? 'Processing QR code...' : 'Upload Payment QR Code Image (JPG, PNG, WebP)'}
            </span>
          </button>
        )}
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
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Live Preview (What User Sees in Deposit Coins)
        </div>
        {qrCodeImageUrl && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-emerald-500/25">
            <div className="bg-white p-1.5 rounded-lg shrink-0">
              <img src={qrCodeImageUrl} alt="QR Preview" className="w-16 h-16 object-contain" />
            </div>
            <div className="text-[11px] text-slate-300">
              <div className="font-bold text-emerald-400">Scan &amp; Pay QR Code</div>
              <div className="text-[10px] text-slate-400">Shown prominently in user Deposit modal with zoom &amp; download.</div>
            </div>
          </div>
        )}
        {activePreviewChannels.length === 0 && !qrCodeImageUrl ? (
          <div className="text-[11px] text-amber-400">
            No active channels or QR code right now. Enable at least one UPI ID/channel or upload a QR code so users can deposit.
          </div>
        ) : activePreviewChannels.length > 0 ? (
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
        ) : null}
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
