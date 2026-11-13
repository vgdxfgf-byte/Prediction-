import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageCircle, ExternalLink, Info } from 'lucide-react';

interface WhatsAppSupportButtonProps {
  username?: string;
  variant?: 'login' | 'dashboard';
}

export const WhatsAppSupportButton: React.FC<WhatsAppSupportButtonProps> = ({
  username,
  variant = 'login'
}) => {
  const { whatsappSupport } = useApp();
  const [showUnconfiguredNotice, setShowUnconfiguredNotice] = useState(false);

  if (!whatsappSupport.enabled) return null;

  const digitsOnly = whatsappSupport.phoneNumber.replace(/\D/g, '');
  const label = whatsappSupport.buttonLabel || 'WhatsApp Support';
  const baseMessage =
    whatsappSupport.defaultMessage || 'Hello Admin, I need assistance with my ApexPredict account.';
  const finalMessage = username ? `${baseMessage} (Account: @${username})` : baseMessage;
  const waHref = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(finalMessage)}`;

  if (variant === 'dashboard') {
    if (digitsOnly.length >= 6) {
      return (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      );
    }

    return (
      <div className="relative flex-1 md:flex-none">
        <button
          type="button"
          onClick={() => {
            setShowUnconfiguredNotice(true);
            setTimeout(() => setShowUnconfiguredNotice(false), 3500);
          }}
          className="w-full px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>{label}</span>
        </button>
        {showUnconfiguredNotice && (
          <div className="absolute right-0 mt-2 w-64 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-[11px] text-slate-300 shadow-xl z-30">
            Admin has not configured a WhatsApp support number yet.
          </div>
        )}
      </div>
    );
  }

  // Login variant
  return (
    <div className="space-y-2">
      {digitsOnly.length >= 6 ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>{label}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
        </a>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowUnconfiguredNotice(prev => !prev)}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>{label}</span>
          </button>
          {showUnconfiguredNotice && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Admin has not added a WhatsApp support number yet.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
