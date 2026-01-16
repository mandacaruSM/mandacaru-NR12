from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string
from .models import Profile, Supervisor
from cadastro.models import Cliente

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, role="ADMIN", modules_enabled=[
            "clientes","empreendimentos","equipamentos","nr12","manutencoes","abastecimentos","almoxarifado","os","orcamentos","financeiro","compras"
        ])

@receiver(post_save, sender=Supervisor)
def create_supervisor_user(sender, instance, created, **kwargs):
    """
    Cria automaticamente um usuário Django quando um Supervisor é cadastrado.
    Username: cpf do supervisor (sem pontuação)
    Password: gerada aleatoriamente e enviada por email (TODO: implementar envio)
    Role: SUPERVISOR com módulos específicos
    """
    if created and not hasattr(instance, 'user'):
        # Username baseado no CPF (remove pontuação)
        username = ''.join(filter(str.isdigit, instance.cpf))

        # Gera senha aleatória de 8 caracteres
        password = get_random_string(8)

        # Cria o usuário
        user = User.objects.create_user(
            username=username,
            email=instance.email,
            password=password,
            first_name=instance.nome_completo.split()[0] if instance.nome_completo else '',
            last_name=' '.join(instance.nome_completo.split()[1:]) if instance.nome_completo and len(instance.nome_completo.split()) > 1 else ''
        )

        # Atualiza o Profile com role SUPERVISOR e módulos específicos
        profile = user.profile
        profile.role = "SUPERVISOR"
        profile.modules_enabled = [
            "dashboard",
            "empreendimentos",
            "equipamentos",
            "abastecimentos",
            "manutencoes",
            "manutencao_preventiva",
            "nr12",
            "operadores",
            "relatorios"
        ]
        profile.save()

        # Vincula o usuário ao supervisor
        instance.user = user
        instance.save(update_fields=['user'])

        # TODO: Enviar email com credenciais
        print(f"[SUPERVISOR CRIADO] Username: {username} | Senha: {password} | Email: {instance.email}")

@receiver(post_save, sender=Cliente)
def create_cliente_user(sender, instance, created, **kwargs):
    """
    Cria automaticamente um usuário Django quando um Cliente é cadastrado.
    Username: documento do cliente (CNPJ ou CPF sem pontuação)
    Password: gerada aleatoriamente e enviada por email
    Role: CLIENTE com acesso limitado a visualização
    """
    if created and not hasattr(instance, 'user'):
        # Username baseado no documento (remove pontuação)
        username = ''.join(filter(str.isdigit, instance.documento))

        # Gera senha aleatória de 8 caracteres
        password = get_random_string(8)

        # Cria o usuário
        user = User.objects.create_user(
            username=username,
            email=instance.email_financeiro if instance.email_financeiro else f"{username}@cliente.local",
            password=password,
            first_name=instance.nome_razao.split()[0] if instance.nome_razao else '',
            last_name=' '.join(instance.nome_razao.split()[1:]) if instance.nome_razao and len(instance.nome_razao.split()) > 1 else ''
        )

        # Cria Profile com role CLIENTE
        # Por padrão, clientes têm acesso muito limitado
        Profile.objects.filter(user=user).update(
            role="CLIENTE",
            modules_enabled=[
                "dashboard",
                "empreendimentos",
                "equipamentos",
                "relatorios"
            ]
        )

        # TODO: Vincular usuário ao cliente (adicionar campo user no model Cliente)
        # instance.user = user
        # instance.save(update_fields=['user'])

        # TODO: Enviar email com credenciais
        print(f"[CLIENTE CRIADO] Username: {username} | Senha: {password} | Email: {instance.email_financeiro}")
