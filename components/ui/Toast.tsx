import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Icons } from './Icons';

export const ToastContainer = () => {
  const { notifications, removeNotification } = useStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {notifications.map((note) => (
        <div
          key={note.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl backdrop-blur-sm border-l-4 transform transition-all duration-300 animate-in slide-in-from-right fade-in-0 ${
            note.type === 'success' ? 'bg-green-600/95 border-green-800 text-white' :
            note.type === 'error' ? 'bg-red-600/95 border-red-800 text-white' :
            note.type === 'warning' ? 'bg-orange-500/95 border-orange-700 text-white' :
            'bg-blue-600/95 border-blue-800 text-white'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {note.type === 'success' && <Icons.Check size={20} />}
            {note.type === 'error' && <Icons.Alert size={20} />}
            {note.type === 'warning' && <Icons.Alert size={20} />}
            {note.type === 'info' && <Icons.Info size={20} />}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium leading-tight">{note.message}</p>
          </div>
          
          <button onClick={() => removeNotification(note.id)} className="ml-2 hover:opacity-75 transition shrink-0">
            <Icons.Close size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};