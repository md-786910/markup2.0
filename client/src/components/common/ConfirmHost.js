import { useEffect, useState } from 'react';
import Modal from './Modal';
import { registerConfirmHost } from '../../utils/confirm';

export default function ConfirmHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => registerConfirmHost((next) => {
    setRequest((current) => {
      current?.resolve(false);
      return next;
    });
  }), []);

  const close = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  if (!request) return null;
  return (
    <Modal isOpen onClose={() => close(false)} labelledBy="confirm-title" className="max-w-sm">
      <div className="p-6">
        <h2 id="confirm-title" className="kc-heading">{request.title}</h2>
        {request.message && <p className="mt-2 text-ui text-gray-600">{request.message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-ui font-medium text-gray-700 hover:bg-gray-50"
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className={`inline-flex h-8 items-center rounded-lg px-3 text-ui font-medium text-white ${request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
