'use client';

import AbastecimentoForm from '../_Form';

export default function NovoAbastecimentoPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Novo Abastecimento</h1>
        <a className="px-3 py-2 rounded-lg shadow-md border border-gray-300 text-gray-700 hover:bg-gray-50" href="/dashboard">Início</a>
      </div>
      <AbastecimentoForm mode="create" />
    </div>
  );
}
