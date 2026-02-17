# backend/nr12/serializers.py

from rest_framework import serializers
from .models import (
    ModeloChecklist, ItemChecklist,
    ChecklistRealizado, RespostaItemChecklist,
    NotificacaoChecklist,
    # Manutenção Preventiva
    ModeloManutencaoPreventiva, ItemManutencaoPreventiva,
    ProgramacaoManutencao, ManutencaoPreventivaRealizada,
    RespostaItemManutencao
)


class ItemChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemChecklist
        fields = '__all__'


class ItemChecklistListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem"""
    class Meta:
        model = ItemChecklist
        fields = ['id', 'ordem', 'categoria', 'pergunta', 'tipo_resposta', 'obrigatorio', 'foto_obrigatoria']


class ModeloChecklistSerializer(serializers.ModelSerializer):
    tipo_equipamento_nome = serializers.CharField(
        source='tipo_equipamento.nome',
        read_only=True
    )
    total_itens = serializers.SerializerMethodField()

    class Meta:
        model = ModeloChecklist
        fields = '__all__'

    def get_total_itens(self, obj):
        return obj.itens.filter(ativo=True).count()


class ModeloChecklistDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com itens inclusos"""
    tipo_equipamento_nome = serializers.CharField(
        source='tipo_equipamento.nome',
        read_only=True
    )
    itens = ItemChecklistSerializer(many=True, read_only=True)

    class Meta:
        model = ModeloChecklist
        fields = '__all__'


class RespostaItemChecklistSerializer(serializers.ModelSerializer):
    item_pergunta = serializers.CharField(source='item.pergunta', read_only=True)
    item_categoria = serializers.CharField(source='item.categoria', read_only=True)

    class Meta:
        model = RespostaItemChecklist
        fields = '__all__'

    def validate(self, data):
        """Valida se observação é obrigatória para não conformidades"""
        item = data.get('item')
        resposta = data.get('resposta')
        observacao = data.get('observacao', '')

        if item and item.requer_observacao_nao_conforme:
            if resposta in ['NAO_CONFORME', 'NAO'] and not observacao:
                raise serializers.ValidationError({
                    'observacao': 'Observação é obrigatória para itens não conformes.'
                })

        return data


class ChecklistRealizadoSerializer(serializers.ModelSerializer):
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    operador_nome_display = serializers.SerializerMethodField(read_only=True)
    total_respostas = serializers.SerializerMethodField()
    total_nao_conformidades = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistRealizado
        fields = '__all__'

    def get_operador_nome_display(self, obj):
        """Retorna nome do operador cadastrado ou o nome em texto livre"""
        if obj.operador:
            return obj.operador.nome_completo
        return obj.operador_nome or 'Não informado'

    def get_total_respostas(self, obj):
        return obj.respostas.count()

    def get_total_nao_conformidades(self, obj):
        return obj.respostas.filter(resposta__in=['NAO_CONFORME', 'NAO']).count()


class ChecklistRealizadoDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todas as respostas"""
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    operador_nome_display = serializers.SerializerMethodField(read_only=True)
    respostas = RespostaItemChecklistSerializer(many=True, read_only=True)
    total_nao_conformidades = serializers.SerializerMethodField()
    total_respostas = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistRealizado
        fields = '__all__'

    def get_operador_nome_display(self, obj):
        """Retorna nome do operador cadastrado ou o nome em texto livre"""
        if obj.operador:
            return obj.operador.nome_completo
        return obj.operador_nome or 'Não informado'

    def get_total_respostas(self, obj):
        return obj.respostas.count()

    def get_total_nao_conformidades(self, obj):
        return obj.respostas.filter(resposta__in=['NAO_CONFORME', 'NAO']).count()


class RespostaItemChecklistCreateSerializer(serializers.Serializer):
    """Serializer simplificado para criar respostas junto com checklist"""
    item = serializers.IntegerField()
    resposta = serializers.ChoiceField(
        choices=['CONFORME', 'NAO_CONFORME', 'SIM', 'NAO', 'NA'],
        required=False,
        allow_null=True
    )
    valor_numerico = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    valor_texto = serializers.CharField(required=False, allow_blank=True, default='')
    observacao = serializers.CharField(required=False, allow_blank=True, default='')


class ChecklistRealizadoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de checklist (usado pelo bot e web)"""
    respostas = RespostaItemChecklistCreateSerializer(many=True, required=False)

    class Meta:
        model = ChecklistRealizado
        fields = [
            'modelo', 'equipamento', 'operador', 'operador_nome', 'usuario',
            'origem', 'leitura_equipamento', 'observacoes_gerais',
            'latitude', 'longitude', 'precisao_gps',
            'respostas'
        ]

    def validate(self, data):
        """
        Validação customizada para garantir que horímetro/km seja coerente
        e que OPERADOR só pode criar checklist em equipamentos autorizados.
        """
        from core.permissions import get_user_role_safe

        equipamento = data.get('equipamento')
        leitura_equipamento = data.get('leitura_equipamento')
        request = self.context.get('request')

        if equipamento and leitura_equipamento is not None:
            # Verifica a leitura atual do equipamento (pode ser None)
            leitura_atual = equipamento.leitura_atual
            if leitura_atual is not None and leitura_equipamento < leitura_atual:
                raise serializers.ValidationError({
                    'leitura_equipamento': (
                        f"A leitura informada ({leitura_equipamento}) não pode ser menor que "
                        f"a leitura atual do equipamento ({leitura_atual}). "
                        f"Tipo de medição: {equipamento.get_tipo_medicao_display()}"
                    )
                })

        # OPERADOR só pode criar checklist em equipamentos que opera
        if request and request.user:
            role = get_user_role_safe(request.user)
            if role == 'OPERADOR':
                operador = getattr(request.user, 'operador_profile', None)
                if operador and equipamento:
                    if not operador.equipamentos_autorizados.filter(id=equipamento.id).exists():
                        raise serializers.ValidationError({
                            'equipamento': 'Você não está autorizado a operar este equipamento.'
                        })

        return data

    def create(self, validated_data):
        respostas_data = validated_data.pop('respostas', [])

        # Validar geofence se coordenadas foram fornecidas
        latitude = validated_data.get('latitude')
        longitude = validated_data.get('longitude')
        equipamento = validated_data.get('equipamento')

        geofence_validado = None
        geofence_distancia = None

        if latitude and longitude and equipamento and equipamento.empreendimento:
            empreendimento = equipamento.empreendimento
            if empreendimento.latitude and empreendimento.longitude:
                from core.geolocation import validar_geofence
                dentro_do_raio, distancia = validar_geofence(
                    float(latitude), float(longitude),
                    float(empreendimento.latitude), float(empreendimento.longitude),
                    empreendimento.raio_geofence
                )
                geofence_validado = dentro_do_raio
                geofence_distancia = distancia

                # Salvar validação de geofence no checklist
                validated_data['geofence_validado'] = geofence_validado
                validated_data['geofence_distancia'] = geofence_distancia

                if not dentro_do_raio:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"Checklist fora do geofence! Equipamento {equipamento.codigo} "
                        f"no empreendimento {empreendimento.nome}. "
                        f"Distância: {distancia:.0f}m, Raio permitido: {empreendimento.raio_geofence}m"
                    )

        checklist = ChecklistRealizado.objects.create(**validated_data)

        # Criar respostas
        for resposta_data in respostas_data:
            # Converter item_id para instância de ItemChecklist
            item_id = resposta_data.pop('item')
            item = ItemChecklist.objects.get(id=item_id)

            RespostaItemChecklist.objects.create(
                checklist=checklist,
                item=item,
                **resposta_data
            )

        # Se todas as respostas foram fornecidas, finalizar automaticamente
        total_itens = checklist.modelo.itens.filter(ativo=True).count()
        if len(respostas_data) == total_itens:
            checklist.finalizar()

        return checklist


class NotificacaoChecklistSerializer(serializers.ModelSerializer):
    destinatario_username = serializers.CharField(
        source='destinatario.username',
        read_only=True
    )
    checklist_equipamento = serializers.CharField(
        source='checklist.equipamento.codigo',
        read_only=True
    )

    class Meta:
        model = NotificacaoChecklist
        fields = '__all__'


# ============================================
# SERIALIZERS ESPECÍFICOS PARA O BOT
# ============================================

class BotModeloChecklistSerializer(serializers.ModelSerializer):
    """Serializer simplificado para o bot"""
    tipo_equipamento_nome = serializers.CharField(source='tipo_equipamento.nome')
    total_itens = serializers.SerializerMethodField()

    class Meta:
        model = ModeloChecklist
        fields = ['id', 'nome', 'tipo_equipamento_nome', 'total_itens']

    def get_total_itens(self, obj):
        return obj.itens.filter(ativo=True).count()


class BotItemChecklistSerializer(serializers.ModelSerializer):
    """Serializer simplificado de item para o bot"""
    class Meta:
        model = ItemChecklist
        fields = [
            'id', 'ordem', 'categoria', 'pergunta',
            'descricao_ajuda', 'tipo_resposta',
            'obrigatorio', 'requer_observacao_nao_conforme', 'foto_obrigatoria'
        ]


class BotChecklistIniciarSerializer(serializers.Serializer):
    """Serializer para iniciar checklist via bot"""
    modelo_id = serializers.IntegerField()
    equipamento_id = serializers.IntegerField()
    operador_id = serializers.IntegerField()
    leitura_equipamento = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    # Geolocalização
    latitude = serializers.DecimalField(
        max_digits=12,
        decimal_places=8,
        required=False,
        allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=12,
        decimal_places=8,
        required=False,
        allow_null=True
    )
    precisao_gps = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Precisão do GPS em metros"
    )

    def validate_modelo_id(self, value):
        if not ModeloChecklist.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Modelo de checklist não encontrado ou inativo.")
        return value

    def validate_equipamento_id(self, value):
        from equipamentos.models import Equipamento
        if not Equipamento.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Equipamento não encontrado ou inativo.")
        return value

    def validate_operador_id(self, value):
        from core.models import Operador
        if not Operador.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Operador não encontrado ou inativo.")
        return value


class BotRespostaSerializer(serializers.Serializer):
    """Serializer para registrar resposta via bot"""
    checklist_id = serializers.IntegerField()
    item_id = serializers.IntegerField()
    resposta = serializers.ChoiceField(
        choices=['CONFORME', 'NAO_CONFORME', 'SIM', 'NAO', 'NA'],
        required=False,
        allow_null=True
    )
    valor_numerico = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    valor_texto = serializers.CharField(required=False, allow_blank=True)
    observacao = serializers.CharField(required=False, allow_blank=True)

    def validate_checklist_id(self, value):
        if not ChecklistRealizado.objects.filter(id=value, status='EM_ANDAMENTO').exists():
            raise serializers.ValidationError("Checklist não encontrado ou já finalizado.")
        return value

    def validate_item_id(self, value):
        if not ItemChecklist.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Item não encontrado ou inativo.")
        return value

    def validate(self, data):
        """Valida se já existe resposta para este item"""
        checklist_id = data.get('checklist_id')
        item_id = data.get('item_id')

        if RespostaItemChecklist.objects.filter(
            checklist_id=checklist_id,
            item_id=item_id
        ).exists():
            raise serializers.ValidationError("Já existe resposta para este item.")

        # Valida se observação é obrigatória
        item = ItemChecklist.objects.get(id=item_id)
        resposta = data.get('resposta')
        observacao = data.get('observacao', '')

        if item.requer_observacao_nao_conforme:
            if resposta in ['NAO_CONFORME', 'NAO'] and not observacao:
                raise serializers.ValidationError({
                    'observacao': 'Observação é obrigatória para itens não conformes.'
                })

        return data


class BotChecklistFinalizarSerializer(serializers.Serializer):
    """Serializer para finalizar checklist via bot"""
    checklist_id = serializers.IntegerField()
    observacoes_gerais = serializers.CharField(required=False, allow_blank=True)

    def validate_checklist_id(self, value):
        try:
            checklist = ChecklistRealizado.objects.get(id=value, status='EM_ANDAMENTO')
        except ChecklistRealizado.DoesNotExist:
            raise serializers.ValidationError("Checklist não encontrado ou já finalizado.")

        # Verificar se todos os itens obrigatórios foram respondidos
        total_itens_obrigatorios = checklist.modelo.itens.filter(
            ativo=True,
            obrigatorio=True
        ).count()
        total_respostas = checklist.respostas.count()

        if total_respostas < total_itens_obrigatorios:
            raise serializers.ValidationError(
                f"Checklist incompleto. Faltam {total_itens_obrigatorios - total_respostas} itens obrigatórios."
            )

        return value


# ============================================================
# SERIALIZERS: MANUTENÇÃO PREVENTIVA PROGRAMADA
# ============================================================

class ItemManutencaoPreventivaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemManutencaoPreventiva
        fields = '__all__'


class ItemManutencaoPreventivaListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem"""
    class Meta:
        model = ItemManutencaoPreventiva
        fields = ['id', 'ordem', 'categoria', 'descricao', 'tipo_resposta', 'obrigatorio']


class ModeloManutencaoPreventivaSerializer(serializers.ModelSerializer):
    tipo_equipamento_nome = serializers.CharField(
        source='tipo_equipamento.nome',
        read_only=True
    )
    tipo_medicao_display = serializers.CharField(
        source='get_tipo_medicao_display',
        read_only=True
    )
    total_itens = serializers.SerializerMethodField()

    class Meta:
        model = ModeloManutencaoPreventiva
        fields = '__all__'

    def get_total_itens(self, obj):
        return obj.itens.filter(ativo=True).count()


class ModeloManutencaoPreventivaDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com itens inclusos"""
    tipo_equipamento_nome = serializers.CharField(
        source='tipo_equipamento.nome',
        read_only=True
    )
    tipo_medicao_display = serializers.CharField(
        source='get_tipo_medicao_display',
        read_only=True
    )
    itens = ItemManutencaoPreventivaSerializer(many=True, read_only=True)

    class Meta:
        model = ModeloManutencaoPreventiva
        fields = '__all__'


class ProgramacaoManutencaoSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    modelo_intervalo = serializers.DecimalField(
        source='modelo.intervalo',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    tipo_medicao = serializers.CharField(source='modelo.tipo_medicao', read_only=True)
    tipo_medicao_display = serializers.CharField(
        source='modelo.get_tipo_medicao_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    percentual_concluido = serializers.SerializerMethodField()
    falta_para_manutencao = serializers.SerializerMethodField()

    class Meta:
        model = ProgramacaoManutencao
        fields = '__all__'

    def get_percentual_concluido(self, obj):
        """Calcula percentual de uso até a próxima manutenção"""
        if not obj.equipamento.leitura_atual:
            return 0

        leitura_atual = obj.equipamento.leitura_atual
        intervalo = obj.leitura_proxima_manutencao - obj.leitura_ultima_manutencao

        if intervalo <= 0:
            return 100

        progresso = leitura_atual - obj.leitura_ultima_manutencao
        percentual = (progresso / intervalo) * 100

        return min(max(percentual, 0), 100)  # Entre 0 e 100

    def get_falta_para_manutencao(self, obj):
        """Calcula quanto falta para a próxima manutenção"""
        if not obj.equipamento.leitura_atual:
            return obj.leitura_proxima_manutencao - obj.leitura_ultima_manutencao

        falta = obj.leitura_proxima_manutencao - obj.equipamento.leitura_atual
        return max(falta, 0)


class RespostaItemManutencaoSerializer(serializers.ModelSerializer):
    item_descricao = serializers.CharField(source='item.descricao', read_only=True)
    item_categoria = serializers.CharField(source='item.categoria', read_only=True)

    class Meta:
        model = RespostaItemManutencao
        fields = '__all__'

    def validate(self, data):
        """Valida se observação é obrigatória para não conformidades"""
        item = data.get('item')
        resposta = data.get('resposta')
        observacao = data.get('observacao', '')

        if item and item.requer_observacao_nao_conforme:
            if resposta in ['NAO_EXECUTADO', 'NAO_CONFORME'] and not observacao:
                raise serializers.ValidationError({
                    'observacao': 'Observação é obrigatória para itens não executados ou não conformes.'
                })

        return data


class ManutencaoPreventivaRealizadaSerializer(serializers.ModelSerializer):
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    tecnico_nome_display = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    resultado_geral_display = serializers.CharField(
        source='get_resultado_geral_display',
        read_only=True
    )
    total_respostas = serializers.SerializerMethodField()
    total_nao_conformidades = serializers.SerializerMethodField()

    class Meta:
        model = ManutencaoPreventivaRealizada
        fields = '__all__'

    def get_tecnico_nome_display(self, obj):
        """Retorna nome do técnico cadastrado ou o nome em texto livre"""
        if obj.tecnico:
            return obj.tecnico.nome
        return obj.tecnico_nome or 'Não informado'

    def get_total_respostas(self, obj):
        return obj.respostas.count()

    def get_total_nao_conformidades(self, obj):
        return obj.respostas.filter(resposta__in=['NAO_EXECUTADO', 'NAO_CONFORME']).count()


class ManutencaoPreventivaRealizadaDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todas as respostas"""
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    tecnico_nome_display = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    resultado_geral_display = serializers.CharField(
        source='get_resultado_geral_display',
        read_only=True
    )
    respostas = RespostaItemManutencaoSerializer(many=True, read_only=True)
    total_nao_conformidades = serializers.SerializerMethodField()
    total_respostas = serializers.SerializerMethodField()

    class Meta:
        model = ManutencaoPreventivaRealizada
        fields = '__all__'

    def get_tecnico_nome_display(self, obj):
        """Retorna nome do técnico cadastrado ou o nome em texto livre"""
        if obj.tecnico:
            return obj.tecnico.nome
        return obj.tecnico_nome or 'Não informado'

    def get_total_respostas(self, obj):
        return obj.respostas.count()

    def get_total_nao_conformidades(self, obj):
        return obj.respostas.filter(resposta__in=['NAO_EXECUTADO', 'NAO_CONFORME']).count()


class RespostaItemManutencaoCreateSerializer(serializers.Serializer):
    """Serializer simplificado para criar respostas junto com manutenção"""
    item = serializers.IntegerField()
    resposta = serializers.ChoiceField(
        choices=['EXECUTADO', 'NAO_EXECUTADO', 'CONFORME', 'NAO_CONFORME', 'NA'],
        required=False,
        allow_null=True
    )
    valor_numerico = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    valor_texto = serializers.CharField(required=False, allow_blank=True, default='')
    observacao = serializers.CharField(required=False, allow_blank=True, default='')


class ManutencaoPreventivaRealizadaCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de manutenção preventiva (usado pelo bot e web)"""
    respostas = RespostaItemManutencaoCreateSerializer(many=True, required=False)

    class Meta:
        model = ManutencaoPreventivaRealizada
        fields = [
            'programacao', 'equipamento', 'modelo', 'tecnico', 'tecnico_nome',
            'usuario', 'origem', 'leitura_equipamento', 'observacoes_gerais',
            'latitude', 'longitude', 'precisao_gps',
            'respostas'
        ]

    def create(self, validated_data):
        respostas_data = validated_data.pop('respostas', [])
        manutencao = ManutencaoPreventivaRealizada.objects.create(**validated_data)

        # Criar respostas
        for resposta_data in respostas_data:
            # Converter item_id para instância de ItemManutencaoPreventiva
            item_id = resposta_data.pop('item')
            item = ItemManutencaoPreventiva.objects.get(id=item_id)

            RespostaItemManutencao.objects.create(
                manutencao=manutencao,
                item=item,
                **resposta_data
            )

        # Se todas as respostas foram fornecidas, finalizar automaticamente
        total_itens = manutencao.modelo.itens.filter(ativo=True).count()
        if len(respostas_data) == total_itens:
            manutencao.finalizar()

        return manutencao


# ============================================
# SERIALIZERS ESPECÍFICOS PARA O BOT - MANUTENÇÃO PREVENTIVA
# ============================================

class BotModeloManutencaoPreventivaSerializer(serializers.ModelSerializer):
    """Serializer simplificado para o bot"""
    tipo_equipamento_nome = serializers.CharField(source='tipo_equipamento.nome')
    tipo_medicao_display = serializers.CharField(source='get_tipo_medicao_display')
    total_itens = serializers.SerializerMethodField()

    class Meta:
        model = ModeloManutencaoPreventiva
        fields = ['id', 'nome', 'tipo_equipamento_nome', 'tipo_medicao', 'tipo_medicao_display', 'intervalo', 'total_itens']

    def get_total_itens(self, obj):
        return obj.itens.filter(ativo=True).count()


class BotItemManutencaoPreventivaSerializer(serializers.ModelSerializer):
    """Serializer simplificado de item para o bot"""
    categoria_display = serializers.CharField(source='get_categoria_display')

    class Meta:
        model = ItemManutencaoPreventiva
        fields = [
            'id', 'ordem', 'categoria', 'categoria_display', 'descricao',
            'instrucoes', 'tipo_resposta', 'obrigatorio', 'requer_observacao_nao_conforme'
        ]


class BotProgramacaoManutencaoSerializer(serializers.ModelSerializer):
    """Serializer de programação para o bot"""
    equipamento_codigo = serializers.CharField(source='equipamento.codigo')
    modelo_nome = serializers.CharField(source='modelo.nome')
    tipo_medicao_display = serializers.CharField(source='modelo.get_tipo_medicao_display')
    status_display = serializers.CharField(source='get_status_display')
    falta_para_manutencao = serializers.SerializerMethodField()

    class Meta:
        model = ProgramacaoManutencao
        fields = [
            'id', 'equipamento_codigo', 'modelo_nome', 'tipo_medicao_display',
            'leitura_proxima_manutencao', 'status', 'status_display',
            'falta_para_manutencao'
        ]

    def get_falta_para_manutencao(self, obj):
        """Calcula quanto falta para a próxima manutenção"""
        if not obj.equipamento.leitura_atual:
            return obj.leitura_proxima_manutencao - obj.leitura_ultima_manutencao

        falta = obj.leitura_proxima_manutencao - obj.equipamento.leitura_atual
        return max(falta, 0)