'use client';
// App-wide toasts and modal dialogs.
//
//   const toast = useToast();      toast('Saved', 'success')
//   const ask = useDialog();       const data = await ask({ title, body: <inputs/>, confirm: 'Save' })
//                                  → object of the form's fields, or null if cancelled
//   const attempt = useAttempt();  await attempt(() => api(...), 'Done!') → result, or undefined on error
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(() => {});
const DialogContext = createContext(async () => null);

export const useToast = () => useContext(ToastContext);
export const useDialog = () => useContext(DialogContext);

export function useAttempt() {
  const toast = useToast();
  return useCallback(
    async (fn, success) => {
      try {
        const result = await fn();
        if (success) toast(typeof success === 'function' ? success(result) : success, 'success');
        return result;
      } catch (e) {
        toast(e.message, 'error');
        return undefined;
      }
    },
    [toast],
  );
}

export default function Providers({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(0);

  const toast = useCallback((message, kind = 'info') => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const ask = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ key: ++nextId.current, options, resolve });
      }),
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      <DialogContext.Provider value={ask}>
        {children}
        {dialog && (
          <ModalDialog
            key={dialog.key}
            {...dialog.options}
            onDone={(data) => {
              dialog.resolve(data);
              setDialog(null);
            }}
          />
        )}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind}`}>
              {t.message}
            </div>
          ))}
        </div>
      </DialogContext.Provider>
    </ToastContext.Provider>
  );
}

function ModalDialog({ title, body, confirm = 'Confirm', cancel = 'Cancel', kind = 'primary', wide = false, onDone }) {
  const ref = useRef(null);
  const finished = useRef(false);
  const finish = (data) => {
    if (finished.current) return;
    finished.current = true;
    onDone(data);
  };

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      style={wide ? { width: 'min(720px, calc(100vw - 32px))' } : undefined}
      onCancel={(e) => {
        e.preventDefault();
        finish(null);
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          finish(Object.fromEntries(new FormData(e.currentTarget)));
        }}
      >
        <header>
          <h2>{title}</h2>
        </header>
        <div className="dialog-body">{body}</div>
        <footer>
          {cancel && (
            <button type="button" className="btn btn-ghost" onClick={() => finish(null)}>
              {cancel}
            </button>
          )}
          {confirm && <button className={`btn btn-${kind}`}>{confirm}</button>}
        </footer>
      </form>
    </dialog>
  );
}
