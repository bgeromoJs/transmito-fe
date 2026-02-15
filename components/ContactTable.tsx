
import React from 'react';
import { Contact } from '../types';

interface ContactTableProps {
  contacts: Contact[];
  onToggleContact: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
}

export const ContactTable: React.FC<ContactTableProps> = ({ contacts, onToggleContact, onToggleAll }) => {
  const allSelected = contacts.length > 0 && contacts.every(c => c.selected !== false);
  const someSelected = contacts.some(c => c.selected !== false);

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  // Fix: Ensure the ref callback returns void to avoid TypeScript error with boolean return value from assignment
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                />
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">✅</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">❌</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {contacts.map((contact) => (
              <tr 
                key={contact.id} 
                className={`transition-colors cursor-pointer ${contact.selected !== false ? 'hover:bg-blue-50/30' : 'opacity-50 grayscale bg-slate-50/30'}`}
                onClick={() => onToggleContact(contact.id)}
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={contact.selected !== false}
                    onChange={() => onToggleContact(contact.id)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">{contact.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{contact.phone}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-xs font-bold text-green-600 tabular-nums">{contact.sentCount || 0}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-xs font-bold text-red-400 tabular-nums">{contact.failCount || 0}</span>
                </td>
                <td className="px-6 py-4">
                  {contact.status === 'sent' && <span className="text-[9px] font-black uppercase text-green-600 tracking-wider">Últ. OK</span>}
                  {contact.status === 'failed' && <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">Últ. Erro</span>}
                  {!contact.status && <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">---</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden divide-y divide-slate-100">
        <div className="p-4 bg-slate-50/50 flex items-center gap-3">
            <input 
                type="checkbox" 
                checked={allSelected} 
                onChange={(e) => onToggleAll(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600"
            />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Todos</span>
        </div>
        {contacts.map((contact) => (
          <div 
            key={contact.id} 
            className={`p-4 flex items-center justify-between transition-colors ${contact.selected !== false ? 'active:bg-slate-100' : 'opacity-40 grayscale bg-slate-50'}`}
            onClick={() => onToggleContact(contact.id)}
          >
            <div className="flex items-center gap-4">
              <input 
                type="checkbox" 
                checked={contact.selected !== false}
                onChange={() => onToggleContact(contact.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-slate-300 text-blue-600"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 leading-tight">{contact.name}</span>
                <span className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">{contact.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-green-600">✅ {contact.sentCount}</span>
                <span className="text-[9px] font-bold text-red-400">❌ {contact.failCount}</span>
              </div>
              {contact.status && (
                <div className={`w-2 h-2 rounded-full ${contact.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
