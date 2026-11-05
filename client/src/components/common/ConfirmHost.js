import { useEffect, useState } from 'react';
import Modal from './Modal';
import { Button } from '../kc';
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
          <Button onClick={() => close(false)}>
            {request.cancelLabel}
          </Button>
          <Button
            autoFocus
            variant={request.danger ? 'danger' : 'primary'}
            onClick={() => close(true)}
          >
            {request.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
