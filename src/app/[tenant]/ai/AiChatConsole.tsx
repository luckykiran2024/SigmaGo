'use client';

import { useState } from 'react';
import { Sparkles, Send, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { askAiAssistantAction } from './actions';
import Link from 'next/link';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  result?: any;
  intent?: any;
}

export default function AiChatConsole({ tenant }: { tenant: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const starterChips = [
    "How many WFH approvals in the last year?",
    "What's our average approval time this quarter?",
    "Which approvals are pending the longest?",
    "Show exceptions currently in force."
  ];

  const handleSend = async (questionText: string) => {
    if (!questionText.trim() || loading) return;

    const userMsgId = Math.random().toString();
    const userMsg: Message = { id: userMsgId, sender: 'user', text: questionText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAiAssistantAction(tenant, questionText);
      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: res.result.summary,
        result: res.result,
        intent: res.intent
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'ai',
          text: err.message || 'Sorry, I ran into an issue processing your query.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Starter Question Chips */}
      <div className="bg-white border border-[#DCE5EA] rounded-xl p-4 shadow-xs space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#637587] font-sans flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0B7780]" /> Suggested Inquiries
        </span>
        <div className="flex flex-wrap gap-2">
          {starterChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={loading}
              className="text-xs font-medium text-[#182B3D] bg-[#F6F8F9] border border-[#DCE5EA] hover:border-[#0B7780] hover:bg-[#ECF6F5] px-3 py-1.5 rounded-lg transition text-left"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-3.5 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="p-10 text-center bg-white border border-[#DCE5EA] rounded-xl shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#ECF6F5] border border-[#D7ECEA] flex items-center justify-center text-[#0B7780] mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#182B3D] font-sans">Query Approval Intelligence</h3>
            <p className="text-xs text-[#526679] max-w-md mx-auto leading-relaxed">
              Select a suggested question above or type any inquiry in natural language to inspect organizational approval data deterministically.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-xl p-4 shadow-xs space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-[#17324D] text-white font-medium text-xs'
                  : 'bg-white border border-[#DCE5EA] text-[#182B3D] text-xs'
              }`}>
                <p className="font-semibold text-xs leading-relaxed">{msg.text}</p>

                {/* AI Result Card */}
                {msg.sender === 'ai' && msg.result && (
                  <div className="border-t border-[#DCE5EA] pt-3 space-y-2.5 text-xs">
                    {/* Resolved Range Badge & Template Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-medium bg-[#EEF2F4] text-[#526679] border border-[#DCE5EA] px-2 py-0.5 rounded">
                        Range: {msg.result.resolvedRange}
                      </span>
                      <span className="text-[10px] font-mono font-medium bg-[#ECF6F5] text-[#0B7780] border border-[#D7ECEA] px-2 py-0.5 rounded">
                        Template: {msg.result.templateId}
                      </span>
                    </div>

                    {/* Data Table */}
                    {msg.result.data && msg.result.data.length > 0 && (
                      <div className="overflow-x-auto border border-[#DCE5EA] rounded-lg">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#F6F8F9] text-[11px] font-semibold text-[#526679] uppercase tracking-wider border-b border-[#DCE5EA]">
                              {msg.result.columns.map((col: any) => (
                                <th key={col.key} className="px-3 py-2">{col.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAF0F2] font-medium text-xs">
                            {msg.result.data.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-[#F6F8F9]">
                                {msg.result.columns.map((col: any) => (
                                  <td key={col.key} className="px-3 py-2 font-mono text-[#182B3D]">
                                    {String(row[col.key] ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Deep Link to Approvals */}
                    {msg.result.deepLink && (
                      <div className="pt-1">
                        <Link
                          href={msg.result.deepLink}
                          className="inline-flex items-center gap-1 font-bold text-[#0B7780] hover:text-[#096A72] text-xs"
                        >
                          <span>View these requests in Approvals</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#DCE5EA] rounded-xl p-3.5 shadow-xs text-xs font-medium text-[#526679] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0B7780] animate-spin" />
              <span>Analyzing parameters and executing query template...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question (e.g. 'How many approvals this month?')..."
          disabled={loading}
          className="w-full rounded-xl border border-[#DCE5EA] bg-white py-3 pl-4 pr-12 text-xs font-medium text-[#182B3D] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] placeholder-[#637587]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-2 top-2 p-1.5 rounded-lg bg-[#17324D] text-white hover:bg-[#224564] disabled:opacity-40 transition shadow-2xs"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Security Statement Footer */}
      <div className="p-3 rounded-lg bg-[#F6F8F9] border border-[#DCE5EA] text-[11px] text-[#526679] font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Deterministic Security Guarantee: No open LLM query injection. Queries execute exclusively through server-controlled parameterized routines.</span>
        </div>
      </div>
    </div>
  );
}
