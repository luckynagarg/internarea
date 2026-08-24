import React, { useEffect, useState } from "react";
import { useT } from '@/i18n/runtime';

type FriendLike = {
  _id: string;
  name: string | null;
  nickname: string | null;
};

type Props = {
  open: boolean;
  friend: FriendLike | null;
  onClose: () => void;
  onSave: (nickname: string) => Promise<void> | void;
  saving?: boolean;
};

export default function NicknameModal({ open, friend, onClose, onSave, saving }: Props) {
  const { t } = useT();
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);


  useEffect(() => {
    if (!open) return;
    setValue(friend?.nickname || "");
    setLocalError(null);
  }, [open, friend]);

  if (!open || !friend) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-5">
        <div className="text-lg font-semibold text-gray-900 mb-3">{t('common.editNickname')}</div>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('common.editNickname')}
          className="w-full border rounded-lg px-3 py-2 text-sm text-black"
          maxLength={50}
        />

        {localError ? <div className="text-sm text-red-600 mt-2">{localError}</div> : null}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
            onClick={() => onClose()}
            disabled={!!saving}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
            onClick={async () => {
              setLocalError(null);
              try {
                const next = value.trim();
                if (next.length > 50) {
                  setLocalError(t('common.error'));
                  return;
                }
                await onSave(next);
                onClose();
              } catch (e: any) {
                setLocalError(e?.message || t('common.error'));
              }
            }}
            disabled={!!saving}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
