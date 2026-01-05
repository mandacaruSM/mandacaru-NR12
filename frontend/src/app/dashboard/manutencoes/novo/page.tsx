'use client';

import ManutencaoForm from '../_Form';

export default function NovaManutencaoPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nova Manutenção</h1>
        <a className="px-3 py-2 rounded-lg shadow-md border" href="/">Início</a>
      </div>
      <ManutencaoForm mode="create" />
    </div>
  );
}
