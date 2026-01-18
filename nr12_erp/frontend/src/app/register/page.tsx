"use client"

import Link from 'next/link'

/**
 * PÁGINA DESABILITADA POR SEGURANÇA
 *
 * O registro público foi desabilitado. Usuários são criados automaticamente
 * quando um Cliente ou Supervisor é cadastrado no sistema por um administrador.
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Registro Desabilitado
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            O registro público foi desabilitado por motivos de segurança.
          </p>
        </div>

        <div className="rounded-md bg-yellow-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Como obter acesso ao sistema
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="mb-2">
                  Usuários são criados automaticamente quando:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Um <strong>Cliente</strong> é cadastrado no sistema</li>
                  <li>Um <strong>Supervisor</strong> é cadastrado no sistema</li>
                </ul>
                <p className="mt-4">
                  Entre em contato com um <strong>administrador</strong> do sistema para solicitar seu acesso.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Voltar para a página de login
          </Link>
        </div>
      </div>
    </div>
  )
}
