from rest_framework import serializers
from django.db.models import Max
from .models import Manutencao, AnexoManutencao, ManutencaoTipo

class AnexoManutencaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoManutencao
        fields = ['id', 'arquivo', 'nome_original', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class ManutencaoSerializer(serializers.ModelSerializer):
    anexos = AnexoManutencaoSerializer(many=True, required=False, read_only=True)
    anexos_upload = serializers.ListField(
        child=serializers.FileField(),
        write_only=True, required=False
    )

    equipamento_nome = serializers.CharField(source='equipamento.__str__', read_only=True)
    tecnico_nome = serializers.SerializerMethodField(read_only=True)

    def get_tecnico_nome(self, obj):
        """Retorna nome do técnico ou None"""
        if obj.tecnico:
            return str(obj.tecnico)
        return None

    class Meta:
        model = Manutencao
        fields = [
            'id', 'equipamento', 'equipamento_nome',
            'tipo', 'data', 'horimetro',
            'tecnico', 'tecnico_nome',
            'descricao', 'observacoes',
            'proxima_manutencao',
            'anexos', 'anexos_upload',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'anexos']

    def validate(self, attrs):
        # regra do horímetro: não pode diminuir para o mesmo equipamento
        equipamento = attrs.get('equipamento') or getattr(self.instance, 'equipamento', None)
        horimetro = attrs.get('horimetro') or getattr(self.instance, 'horimetro', None)
        if equipamento and horimetro is not None:
            qs = Manutencao.objects.filter(equipamento=equipamento)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            ultimo = qs.aggregate(max_h=Max('horimetro'))['max_h']
            if ultimo is not None and horimetro < ultimo:
                raise serializers.ValidationError({
                    'horimetro': f'O horímetro ({horimetro}) não pode ser menor que o último registrado ({ultimo}).'
                })

        # se preventiva, exige proxima_manutencao opcional? -> aqui: permitido vazio, mas se vier, ok
        tipo = attrs.get('tipo') or getattr(self.instance, 'tipo', None)
        if tipo == ManutencaoTipo.PREVENTIVA:
            # Nada obrigatório aqui, mas você pode exigir se quiser:
            # if not attrs.get('proxima_manutencao') and not (self.instance and self.instance.proxima_manutencao):
            #     raise serializers.ValidationError({'proxima_manutencao': 'Informe a próxima manutenção para preventiva.'})
            pass

        return attrs

    def create(self, validated_data):
        anexos_files = validated_data.pop('anexos_upload', [])
        manutencao = super().create(validated_data)
        for f in anexos_files:
            AnexoManutencao.objects.create(
                manutencao=manutencao, arquivo=f, nome_original=getattr(f, 'name', '')
            )
        return manutencao

    def update(self, instance, validated_data):
        anexos_files = validated_data.pop('anexos_upload', [])
        manutencao = super().update(instance, validated_data)
        for f in anexos_files:
            AnexoManutencao.objects.create(
                manutencao=manutencao, arquivo=f, nome_original=getattr(f, 'name', '')
            )
        return manutencao
