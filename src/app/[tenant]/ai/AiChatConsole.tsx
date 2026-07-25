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
    <div className="space-y-6">
      {/* Starter Question Chips */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
        <span className="text-2xs font-extrabold uppercase tracking-wider text-muted font-ibmmono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Suggested Questions
        </span>
        <div className="flex flex-wrap gap-2">
          {starterChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={loading}
              className="text-xs font-semibold text-ink bg-gray-50 border border-gray-200 hover:border-accent/40 hover:bg-accent/5 px-3 py-1.5 rounded-xl transition text-left"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-xs space-y-3">
            <Sparkles className="w-10 h-10 text-accent/40 mx-auto" />
            <h3 className="text-sm font-bold text-ink font-display">Ask anything about your approvals</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Select a suggested question above or type any query in natural language to get instant metrics and insights.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-5 shadow-xs space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-accent text-white font-medium text-sm'
                  : 'bg-white border border-gray-100 text-ink text-sm'
              }`}>
                <p className="font-semibold">{msg.text}</p>

                {/* AI Result Card */}
                {msg.sender === 'ai' && msg.result && (
                  <div className="border-t border-gray-100 pt-3 space-y-3 text-xs">
                    {/* Resolved Range Badge & Template Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-mono font-bold bg-gray-100 text-muted px-2 py-0.5 rounded">
                        Range: {msg.result.resolvedRange}
                      </span>
                      <span className="text-2xs font-mono font-bold bg-accent/10 text-accent px-2 py-0.5 rounded">
                        Template: {msg.result.templateId}
                      </span>
                    </div>

                    {/* Data Table */}
                    {msg.result.data && msg.result.data.length > 0 && (
                      <div className="overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-2xs font-extrabold text-muted uppercase tracking-wider font-ibmmono border-b border-gray-100">
                              {msg.result.columns.map((col: any) => (
                                <th key={col.key} className="px-3 py-2">{col.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 font-medium">
                            {msg.result.data.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50/50">
                                {msg.result.columns.map((col: any) => (
                                  <td key={col.key} className="px-3 py-2 font-mono text-ink">
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
                          className="inline-flex items-center gap-1 font-bold text-accent hover:underline text-xs"
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
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs text-xs font-semibold text-muted flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent animate-spin" />
              <span>Analyzing query parameters and running template...</span>
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
          className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-4 pr-12 text-sm font-medium text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-2.5 top-2.5 p-2 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-30 transition shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Security Statement Footer */}
      <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60 text-2xs text-muted font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Deterministic Security Guarantee: No AI-generated SQL. Queries execute via server-controlled, parameterized templates.</span>
        </div>
      </div>
    </div>
  );
}
