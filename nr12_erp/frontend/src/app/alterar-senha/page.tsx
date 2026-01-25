"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function AlterarSenhaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Validações
    if (!formData.senha_atual) {
      setError('Digite sua senha atual')
      setLoading(false)
      return
    }

    if (formData.nova_senha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    if (formData.nova_senha !== formData.confirmar_senha) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (formData.senha_atual === formData.nova_senha) {
      setError('A nova senha deve ser diferente da senha atual')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: formData.senha_atual,
          new_password: formData.nova_senha
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setFormData({
          senha_atual: '',
          nova_senha: '',
          confirmar_senha: ''
        })

        // Redireciona após 2 segundos
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.detail || 'Erro ao alterar senha')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <h1 className="text-2xl font-bold text-white">Alterar Senha</h1>
          <p className="text-blue-100 mt-1">Mantenha sua conta segura atualizando sua senha regularmente</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Usuário:</p>
            <p className="text-base font-semibold text-gray-900">{user?.username}</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">✓</span>
                <div>
                  <p className="text-sm font-semibold text-green-900">Senha alterada com sucesso!</p>
                  <p className="text-xs text-green-700 mt-1">Você será redirecionado para o dashboard...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Senha Atual */}
            <div>
              <label htmlFor="senha_atual" className="block text-sm font-medium text-gray-700 mb-2">
                Senha Atual *
              </label>
              <input
                type="password"
                id="senha_atual"
                name="senha_atual"
                value={formData.senha_atual}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua senha atual"
                disabled={loading || success}
                required
              />
            </div>

            {/* Nova Senha */}
            <div>
              <label htmlFor="nova_senha" className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha *
              </label>
              <input
                type="password"
                id="nova_senha"
                name="nova_senha"
                value={formData.nova_senha}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                disabled={loading || success}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmar_senha" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                id="confirmar_senha"
                name="confirmar_senha"
                value={formData.confirmar_senha}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite a nova senha novamente"
                disabled={loading || success}
                required
                minLength={6}
              />
            </div>

            {/* Security Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Dicas de Segurança:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Use pelo menos 8 caracteres para maior segurança</li>
                <li>• Combine letras maiúsculas, minúsculas, números e símbolos</li>
                <li>• Não use informações pessoais óbvias</li>
                <li>• Não reutilize senhas de outras contas</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loading || success}
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Problemas para alterar sua senha?</strong>
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Se você esqueceu sua senha atual, entre em contato com o administrador do sistema para realizar o reset.
        </p>
      </div>
    </div>
  )
}
