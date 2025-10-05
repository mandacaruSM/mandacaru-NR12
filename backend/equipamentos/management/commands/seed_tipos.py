# backend/equipamentos/management/commands/seed_tipos.py

from django.core.management.base import BaseCommand
from equipamentos.models import TipoEquipamento


class Command(BaseCommand):
    help = 'Popula a tabela de tipos de equipamento com dados iniciais completos'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('\n🚀 Iniciando população de tipos de equipamento...\n'))

        tipos = [
            # ========================================
            # EQUIPAMENTOS DE MOVIMENTAÇÃO DE TERRA
            # ========================================
            {
                'nome': 'Escavadeira Hidráulica',
                'descricao': 'Equipamento para escavação, carregamento e movimentação de terra. Ideal para obras civis, mineração e terraplenagem.'
            },
            {
                'nome': 'Retroescavadeira',
                'descricao': 'Trator equipado com pá carregadeira frontal e escavadeira traseira. Versátil para diversos tipos de obras.'
            },
            {
                'nome': 'Pá Carregadeira',
                'descricao': 'Equipamento para carregar materiais (terra, areia, brita) em caminhões ou outros locais.'
            },
            {
                'nome': 'Motoniveladora (Patrol)',
                'descricao': 'Equipamento para nivelamento e acabamento de terrenos, muito usado em pavimentação.'
            },
            {
                'nome': 'Trator de Esteira',
                'descricao': 'Trator com esteiras para trabalho em terrenos difíceis. Usado para empurrar terra e materiais.'
            },
            {
                'nome': 'Mini Escavadeira',
                'descricao': 'Escavadeira compacta para trabalhos em espaços reduzidos e obras urbanas.'
            },
            {
                'nome': 'Skid Steer (Bob Cat)',
                'descricao': 'Carregadeira compacta de alta manobrabilidade para diversos tipos de trabalho.'
            },

            # ========================================
            # EQUIPAMENTOS DE COMPACTAÇÃO
            # ========================================
            {
                'nome': 'Rolo Compactador Vibratório',
                'descricao': 'Equipamento para compactação de solo, asfalto e bases. Disponível em diversos tamanhos.'
            },
            {
                'nome': 'Rolo Compactador Liso',
                'descricao': 'Rolo para acabamento final de pavimentação asfáltica.'
            },
            {
                'nome': 'Rolo Pé de Carneiro',
                'descricao': 'Rolo especial para compactação de solos coesivos e argilas.'
            },
            {
                'nome': 'Placa Vibratória',
                'descricao': 'Equipamento compacto manual para compactação de solos em áreas pequenas.'
            },
            {
                'nome': 'Soquete Vibratório',
                'descricao': 'Ferramenta manual para compactação de valas e locais de difícil acesso.'
            },

            # ========================================
            # EQUIPAMENTOS DE TRANSPORTE
            # ========================================
            {
                'nome': 'Caminhão Basculante',
                'descricao': 'Caminhão para transporte de materiais com caçamba basculante.'
            },
            {
                'nome': 'Caminhão Caçamba',
                'descricao': 'Caminhão para transporte de entulho e materiais diversos.'
            },
            {
                'nome': 'Caminhão Betoneira',
                'descricao': 'Caminhão para transporte de concreto usinado.'
            },
            {
                'nome': 'Caminhão Munck',
                'descricao': 'Caminhão equipado com guindaste hidráulico para carga e descarga.'
            },
            {
                'nome': 'Caminhão Prancha',
                'descricao': 'Caminhão para transporte de equipamentos pesados.'
            },
            {
                'nome': 'Caminhonete',
                'descricao': 'Veículo utilitário leve para transporte de pessoas e pequenas cargas.'
            },
            {
                'nome': 'Van',
                'descricao': 'Veículo para transporte de pessoas, materiais e ferramentas.'
            },

            # ========================================
            # EQUIPAMENTOS DE ELEVAÇÃO
            # ========================================
            {
                'nome': 'Guindaste',
                'descricao': 'Equipamento para içamento de cargas pesadas em grandes alturas.'
            },
            {
                'nome': 'Empilhadeira',
                'descricao': 'Equipamento para movimentação de paletes e cargas em armazéns e obras.'
            },
            {
                'nome': 'Plataforma Elevatória',
                'descricao': 'Equipamento para trabalho em altura com plataforma para pessoas.'
            },
            {
                'nome': 'Munck Articulado',
                'descricao': 'Guindaste articulado para montagem em caminhões.'
            },

            # ========================================
            # GERADORES E COMPRESSORES
            # ========================================
            {
                'nome': 'Gerador de Energia Diesel',
                'descricao': 'Equipamento para geração de energia elétrica através de motor diesel.'
            },
            {
                'nome': 'Gerador de Energia a Gasolina',
                'descricao': 'Gerador portátil movido a gasolina para pequenas potências.'
            },
            {
                'nome': 'Compressor de Ar',
                'descricao': 'Equipamento para geração de ar comprimido para ferramentas pneumáticas.'
            },

            # ========================================
            # EQUIPAMENTOS DE PERFURAÇÃO
            # ========================================
            {
                'nome': 'Perfuratriz de Solo',
                'descricao': 'Equipamento para perfuração de solo para fundações e estacas.'
            },
            {
                'nome': 'Perfuratriz de Rocha',
                'descricao': 'Equipamento para perfuração de rochas em mineração e obras.'
            },
            {
                'nome': 'Martelete Pneumático',
                'descricao': 'Ferramenta para quebra de concreto e rochas.'
            },

            # ========================================
            # EQUIPAMENTOS DE BRITAGEM E PENEIRAMENTO
            # ========================================
            {
                'nome': 'Britador de Mandíbulas',
                'descricao': 'Equipamento para britagem primária de rochas.'
            },
            {
                'nome': 'Britador Cônico',
                'descricao': 'Equipamento para britagem secundária e terciária.'
            },
            {
                'nome': 'Peneira Vibratória',
                'descricao': 'Equipamento para classificação granulométrica de materiais.'
            },

            # ========================================
            # EQUIPAMENTOS DE PAVIMENTAÇÃO
            # ========================================
            {
                'nome': 'Vibroacabadora de Asfalto',
                'descricao': 'Equipamento para aplicação e acabamento de massa asfáltica.'
            },
            {
                'nome': 'Fresadora de Asfalto',
                'descricao': 'Equipamento para remoção de camadas asfálticas deterioradas.'
            },
            {
                'nome': 'Distribuidor de Agregados',
                'descricao': 'Equipamento para espalhamento uniforme de agregados.'
            },

            # ========================================
            # EQUIPAMENTOS DE CONCRETO
            # ========================================
            {
                'nome': 'Bomba de Concreto Estacionária',
                'descricao': 'Equipamento fixo para bombeamento de concreto em grandes alturas.'
            },
            {
                'nome': 'Bomba de Concreto sobre Caminhão (Lança)',
                'descricao': 'Equipamento móvel com lança para bombeamento de concreto.'
            },
            {
                'nome': 'Betoneira',
                'descricao': 'Equipamento para mistura de concreto em pequenas quantidades.'
            },
            {
                'nome': 'Vibrador de Concreto',
                'descricao': 'Equipamento para adensamento de concreto durante a concretagem.'
            },

            # ========================================
            # EQUIPAMENTOS AGRÍCOLAS
            # ========================================
            {
                'nome': 'Trator Agrícola',
                'descricao': 'Trator para uso em atividades agrícolas diversas.'
            },
            {
                'nome': 'Colheitadeira',
                'descricao': 'Equipamento para colheita de grãos e cereais.'
            },
            {
                'nome': 'Pulverizador',
                'descricao': 'Equipamento para aplicação de defensivos agrícolas.'
            },

            # ========================================
            # EQUIPAMENTOS DE MINERAÇÃO
            # ========================================
            {
                'nome': 'Caminhão Fora de Estrada',
                'descricao': 'Caminhão de grande porte para transporte em mineração.'
            },
            {
                'nome': 'Escavadeira Mineradora',
                'descricao': 'Escavadeira de grande porte para operações de mineração.'
            },
            {
                'nome': 'Carregadeira de Mineração',
                'descricao': 'Pá carregadeira de grande porte para operações em minas.'
            },

            # ========================================
            # EQUIPAMENTOS DE ACABAMENTO
            # ========================================
            {
                'nome': 'Alisadora de Concreto',
                'descricao': 'Equipamento para acabamento de pisos de concreto.'
            },
            {
                'nome': 'Cortadora de Piso',
                'descricao': 'Equipamento para corte de pisos de concreto e asfalto.'
            },

            # ========================================
            # EQUIPAMENTOS DE MOVIMENTAÇÃO INTERNA
            # ========================================
            {
                'nome': 'Paleteira Manual',
                'descricao': 'Equipamento manual para movimentação de paletes.'
            },
            {
                'nome': 'Paleteira Elétrica',
                'descricao': 'Equipamento elétrico para movimentação de paletes.'
            },
            {
                'nome': 'Transpaleteira',
                'descricao': 'Equipamento para transporte de paletes em curtas distâncias.'
            },

            # ========================================
            # EQUIPAMENTOS DE LIMPEZA E MANUTENÇÃO
            # ========================================
            {
                'nome': 'Lavadora de Alta Pressão',
                'descricao': 'Equipamento para limpeza de superfícies com água pressurizada.'
            },
            {
                'nome': 'Aspirador Industrial',
                'descricao': 'Equipamento para limpeza e aspiração de resíduos industriais.'
            },
            {
                'nome': 'Varredeira Mecânica',
                'descricao': 'Equipamento para varrição de grandes áreas.'
            },

            # ========================================
            # EQUIPAMENTOS DE SOLDA E CORTE
            # ========================================
            {
                'nome': 'Máquina de Solda',
                'descricao': 'Equipamento para soldagem de peças metálicas.'
            },
            {
                'nome': 'Maçarico de Corte',
                'descricao': 'Equipamento para corte térmico de metais.'
            },

            # ========================================
            # OUTROS
            # ========================================
            {
                'nome': 'Container Escritório',
                'descricao': 'Container adaptado para uso como escritório em obra.'
            },
            {
                'nome': 'Container Almoxarifado',
                'descricao': 'Container para armazenamento de materiais e ferramentas.'
            },
            {
                'nome': 'Outros Equipamentos',
                'descricao': 'Outros tipos de equipamentos não listados nas categorias acima.'
            },
        ]

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for tipo_data in tipos:
            try:
                tipo, created = TipoEquipamento.objects.update_or_create(
                    nome=tipo_data['nome'],
                    defaults={
                        'descricao': tipo_data['descricao'],
                        'ativo': True
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Criado: {tipo.nome}')
                    )
                else:
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'  → Atualizado: {tipo.nome}')
                    )
            except Exception as e:
                skipped_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Erro ao processar "{tipo_data["nome"]}": {str(e)}')
                )

        # Resumo final
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'\n✅ FINALIZADO COM SUCESSO!\n'))
        self.stdout.write(f'  📊 Estatísticas:')
        self.stdout.write(f'     • {created_count} tipos criados')
        self.stdout.write(f'     • {updated_count} tipos atualizados')
        if skipped_count > 0:
            self.stdout.write(self.style.ERROR(f'     • {skipped_count} tipos com erro'))
        self.stdout.write(f'\n  📦 Total de tipos no banco: {TipoEquipamento.objects.count()}')
        self.stdout.write('='*60 + '\n')