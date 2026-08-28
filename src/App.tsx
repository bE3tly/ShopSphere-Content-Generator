/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Copy, RefreshCw, AlertTriangle } from 'lucide-react';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Copy, RefreshCw, AlertTriangle, Info, ArrowUp } from 'lucide-react';

export default function App() {
  const [formData, setFormData] = useState({
    what_are_we_promoting: '',
    things_to_mention: [] as string[],
    what_do_you_need: 'Product Description',
    how_should_it_sound: 'Professional',
    who_are_you_talking_to: '',
    where_will_it_go: 'Website',
    how_long: 'Quick'
  });
  const [factInput, setFactInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [editableBody, setEditableBody] = useState('');
  const [generationId, setGenerationId] = useState(0); // Renamed from scrollTrigger
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStates, setCopyStates] = useState<{ cta: boolean; all: boolean }>({ cta: false, all: false });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('dismissedTooltip')) {
      setShowTooltip(true);
    }
  }, []);

  const ResultsContainer = ({ result, editableBody, setEditableBody, generationId }: { result: any, editableBody: string, setEditableBody: (v: string) => void, generationId: number }) => {
    const resultsRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (generationId > 0 && resultsRef.current) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }, [generationId]);
    
    const extractFlags = (text: string): string[] => {
      const regex = /\[VERIFY: (.*?)\]/g;
      const flags = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
          flags.push(match[1]);
      }
      return flags;
    };

    const allFlags = Array.from(new Set([
        ...result.verification_flags,
        ...extractFlags(result.body),
        ...extractFlags(result.cta),
        ...result.headlines.flatMap(extractFlags)
    ]));

    return (
      <motion.div ref={resultsRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result.headlines.map((h: string, i: number) => (
            <div key={i} className="p-4 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:border-lime-500 transition">{RenderBody(h)}</div>
          ))}
        </div>
        
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
          <p className="italic text-slate-500 mb-4">Why this tone: {result.tone_notes}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {result.keywords.map((kw: string) => (
              <span key={kw} className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs">#{kw}</span>
            ))}
          </div>
          <EditableBody body={editableBody} setBody={setEditableBody} />
        </div>
        
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Suggested CTA</label>
              <div className="text-lg font-medium">{RenderBody(result.cta)}</div>
            </div>
            <button className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg text-sm text-slate-300" onClick={() => copyToClipboard(result.cta, 'cta')}>{copyStates.cta ? 'Copied!' : <><Copy size={16} /> Copy</>}</button>
        </div>

        <div className="bg-amber-500/5 p-6 rounded-xl border border-amber-500/20">
          <h3 className="text-amber-300 font-bold mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-400" /> Double-check these before posting</h3>
          {allFlags.length > 0 ? (
            <ul className="space-y-2">
              {allFlags.map((flag: string, i: number) => (
                <li key={i} className="text-amber-950 text-sm bg-amber-200/50 p-3 rounded-lg border border-amber-400/50">"{flag}"</li>
              ))}
            </ul>
          ) : (
            <div className="text-emerald-400 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> ✅ Nothing needs extra review — this is ready to use.</div>
          )}
        </div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-slate-800 px-6 py-3 rounded-lg" onClick={handleCopyAll}>{copyStates.all ? 'Copied!' : <><Copy size={18} /> Copy All</>}</button>
          <button className="flex items-center gap-2 bg-lime-400 text-slate-950 px-6 py-3 rounded-lg" onClick={handleSubmit}><RefreshCw size={18} /> Regenerate</button>
        </div>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-4 bg-lime-400 text-slate-950 rounded-full shadow-lg hover:bg-lime-300 transition-all z-50"
          aria-label="Back to top"
        >
          <ArrowUp size={24} />
        </button>
      </motion.div>
    );
  };

  const dismissTooltip = () => {
    setShowTooltip(false);
    localStorage.setItem('dismissedTooltip', 'true');
  };

  const copyToClipboard = async (text: string, type: 'cta' | 'all') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopyStates(prev => ({ ...prev, [type]: false })), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getCleanBody = (text: string) => {
    return text.replace(/\[VERIFY: (.*?)\]/g, '$1');
  };

  const handleCopyAll = () => {
    const fullContent = [
      result.headlines[0],
      '',
      getCleanBody(editableBody),
      '',
      result.cta,
      '',
      result.keywords.map((kw: string) => `#${kw}`).join(' ')
    ].join('\n');
    
    copyToClipboard(fullContent, 'all');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const url = '/api/generate';
    console.log(`Fetching from: ${window.location.origin}${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      setResult(data);
      setEditableBody(data.body);
      setGenerationId(prev => prev + 1); // Trigger scroll
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError("Request timed out — check your connection or try again");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
      console.error("Generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const addFact = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && factInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({ ...prev, things_to_mention: [...prev.things_to_mention, factInput.trim()] }));
      setFactInput('');
    }
  };

  const removeFact = (index: number) => {
    setFormData(prev => ({ ...prev, things_to_mention: prev.things_to_mention.filter((_, i) => i !== index) }));
  };

    const RenderBody = (text: string) => {
      const parts = text.split(/\[VERIFY: (.*?)\]/g);
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return `<span class="bg-amber-200/50 text-amber-950 px-1 rounded border-b-2 border-amber-400"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline mr-1 text-amber-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>${part}</span>`;
        }
        return part;
      }).join('');
    };

  const EditableBody = ({ body, setBody }: { body: string, setBody: (val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEdit = () => {
      if (isEditing) {
        // Switching to preview mode
        setBody(textareaRef.current?.value || body);
      }
      setIsEditing(!isEditing);
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Content Body</h3>
          <button 
            onClick={toggleEdit}
            className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded hover:bg-slate-700 transition"
          >
            {isEditing ? 'Save Changes' : 'Edit Text'}
          </button>
        </div>
        
        {isEditing ? (
          <textarea 
            ref={textareaRef}
            defaultValue={body}
            className="w-full p-4 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none transition h-64 text-slate-200 leading-relaxed"
          />
        ) : (
          <div 
            className="text-slate-200 leading-relaxed whitespace-pre-line p-4 bg-slate-800 rounded-lg border border-slate-700" 
            dangerouslySetInnerHTML={{ __html: RenderBody(body) }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">ShopSphere <span className="text-lime-400">Content Generator</span></h1>
        <p className="text-slate-400 mb-8">Premium marketing content, instantly.</p>

        {showTooltip && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-start gap-4 mb-8 text-sm text-slate-300">
            <Info className="text-lime-400 flex-shrink-0" size={20} />
            <p>This tool highlights claims like numbers or guarantees so you can quickly verify them — it's not an error, just an extra safety check.</p>
            <button onClick={dismissTooltip} className="ml-auto text-slate-500 hover:text-white"><X size={16} /></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">What are you selling or promoting?</label>
            <input type="text" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none transition" placeholder="e.g. Homemade shea butter" value={formData.what_are_we_promoting} onChange={e => setFormData({...formData, what_are_we_promoting: e.target.value})} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">What should we definitely mention?</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.things_to_mention.map((fact, i) => (
                <span key={i} className="bg-lime-950 text-lime-300 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-lime-800">
                  {fact} <X size={14} className="cursor-pointer" onClick={() => removeFact(i)} />
                </span>
              ))}
            </div>
            <input type="text" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none transition" placeholder="Add fact & press Enter" value={factInput} onChange={e => setFactInput(e.target.value)} onKeyDown={addFact} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['what_do_you_need', 'how_should_it_sound', 'where_will_it_go', 'how_long'].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium mb-2 text-slate-300">{field.replace(/_/g, ' ')}</label>
                <select className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none transition" value={formData[field as keyof typeof formData]} onChange={e => setFormData({...formData, [field]: e.target.value})}>
                  {field === 'what_do_you_need' && ['Product Description', 'Promotional Email', 'Article', 'Social Post', 'Campaign Copy'].map(opt => <option key={opt}>{opt}</option>)}
                  {field === 'how_should_it_sound' && ['Professional', 'Friendly', 'Playful', 'Premium', 'Urgent', 'Simple'].map(opt => <option key={opt}>{opt}</option>)}
                  {field === 'where_will_it_go' && ['Website', 'Email', 'Instagram', 'Facebook', 'General'].map(opt => <option key={opt}>{opt}</option>)}
                  {field === 'how_long' && ['Quick', 'Medium', 'Detailed'].map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Who is this for?</label>
            <input type="text" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none transition" placeholder="e.g. eco-conscious young professionals" value={formData.who_are_you_talking_to} onChange={e => setFormData({...formData, who_are_you_talking_to: e.target.value})} required />
          </div>

          <button type="submit" className="w-full bg-lime-400 text-slate-950 font-bold py-4 rounded-xl hover:bg-lime-300 transition text-lg">Generate Content</button>
        </form>

        {error && (
          <div className="mt-8 p-4 bg-red-950/50 border border-red-900 text-red-200 rounded-xl">
            {error}
          </div>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 text-slate-400">
              <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              Generating...
            </motion.div>
          )}

          {result && (
            <ResultsContainer 
              result={result} 
              editableBody={editableBody} 
              setEditableBody={setEditableBody} 
              generationId={generationId} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

