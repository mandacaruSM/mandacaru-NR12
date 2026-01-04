'use client';

import TecnicoForm from '../_Form';

export default function NovoTecnicoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Novo Técnico 👨‍🔧</h1>
      </div>

      <TecnicoForm mode="create" />
    </div>
  );
}
