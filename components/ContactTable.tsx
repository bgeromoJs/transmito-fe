
import React from 'react';
import { Contact } from '../types';

interface ContactTableProps {
  contacts: Contact[];
}

export const ContactTable: React.FC<ContactTableProps> = ({ contacts }) => {
  return (
    <div className="w-full">
      {/* Desktop View: Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {contacts.map((contact, index) => (
              <tr key={contact.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-slate-300 italic">{index + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {contact.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{contact.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {contact.phone}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View: Cards */}
      <div className="sm:hidden divide-y divide-slate-100">
        {contacts.map((contact, index) => (
          <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                {contact.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 leading-tight">{contact.name}</span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">{contact.phone}</span>
              </div>
            </div>
            <div className="text-[10px] font-black text-slate-200 italic">
              #{index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
